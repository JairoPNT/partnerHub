import "server-only";

import { z } from "zod";

import { publicationBackfillPreviewService } from "@/server/services/publicationBackfillPreviewService";
import { publicationJobService } from "@/server/services/publicationJobService";
import { wakePublicationJobWorker } from "@/server/services/publicationJobWorkerService";

const HASH = /^[0-9a-f]{64}$/;
export const PUBLICATION_BACKFILL_APPLY_MODE = "APPLY_REVIEWED_PUBLICATION_BACKFILL" as const;
export const PUBLICATION_BACKFILL_CONFIRMATION = "ENQUEUE_REVIEWED_PUBLICATION_BACKFILL" as const;

export const publicationBackfillApplyInputSchema = z.object({
  mode: z.literal(PUBLICATION_BACKFILL_APPLY_MODE),
  confirmation: z.literal(PUBLICATION_BACKFILL_CONFIRMATION),
  expectedPlanHash: z.string().regex(HASH)
}).strict();

type EcosystemType = "PRODUCT" | "BUSINESS" | "PERSONAL_BRAND";
type Candidate = {
  siteId: string;
  ecosystemType: EcosystemType;
  publicHost: string;
  intentHash: string;
  sourceHash: string;
  targetHash: string;
  masterPackageHash: string;
  approvalHash: string;
};
type Preview = {
  planHash: string;
  summary: {
    targets: number;
    candidates: number;
    alreadyCurrent: number;
    alreadyScheduled: number;
    retryRequired: number;
    blocked: number;
  };
  planMaterial: { candidates: Candidate[] };
};
type Job = {
  id: string;
  status: "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
  intent: {
    siteId: string;
    ecosystemType: EcosystemType;
    publicHost: string;
  };
};
type Dependencies = {
  preview: () => Promise<Preview>;
  enqueueReviewed: (
    input: { siteId: string },
    requestedBySubject: string,
    expectedIntentHash: string
  ) => Promise<{ created: boolean; job: Job }>;
  wake: () => void;
};
type SafeBackfillEnqueueFailureCode =
  | "PUBLICATION_BACKFILL_ENQUEUE_FAILED"
  | "PUBLICATION_BACKFILL_JOB_IDENTITY_MISMATCH"
  | "PUBLICATION_BACKFILL_RETRY_NOT_AUTHORIZED"
  | "PUBLICATION_JOB_BUSY"
  | "PUBLICATION_JOB_CORRUPT"
  | "PUBLICATION_JOB_EXPECTED_INTENT_HASH_INVALID"
  | "PUBLICATION_JOB_IDEMPOTENCY_CONFLICT"
  | "PUBLICATION_JOB_REQUESTOR_MISSING"
  | "PUBLICATION_JOB_REVIEWED_INTENT_DRIFT"
  | "PUBLICATION_JOB_SOURCE_OR_TARGET_INVALID"
  | "PUBLICATION_JOB_SOURCE_OR_TARGET_MISSING"
  | "PUBLICATION_JOB_MASTER_PACKAGE_MISSING"
  | "PUBLICATION_JOB_SOURCE_TARGET_IDENTITY_MISMATCH";

const defaultDependencies: Dependencies = {
  preview: publicationBackfillPreviewService.preview,
  enqueueReviewed: publicationJobService.enqueueReviewed,
  wake: () => { void wakePublicationJobWorker(); }
};

function safeJob(job: Job) {
  return {
    id: job.id,
    siteId: job.intent.siteId,
    ecosystemType: job.intent.ecosystemType,
    publicHost: job.intent.publicHost,
    status: job.status
  };
}

function matchesCandidate(job: Job, candidate: Candidate) {
  return job.id === candidate.intentHash &&
    job.intent.siteId === candidate.siteId &&
    job.intent.ecosystemType === candidate.ecosystemType &&
    job.intent.publicHost === candidate.publicHost;
}

function safeEnqueueFailureCode(error: unknown): SafeBackfillEnqueueFailureCode {
  if (!(error instanceof Error)) return "PUBLICATION_BACKFILL_ENQUEUE_FAILED";
  switch (error.message) {
    case "PUBLICATION_BACKFILL_JOB_IDENTITY_MISMATCH":
    case "PUBLICATION_BACKFILL_RETRY_NOT_AUTHORIZED":
    case "PUBLICATION_JOB_BUSY":
    case "PUBLICATION_JOB_CORRUPT":
    case "PUBLICATION_JOB_EXPECTED_INTENT_HASH_INVALID":
    case "PUBLICATION_JOB_IDEMPOTENCY_CONFLICT":
    case "PUBLICATION_JOB_REQUESTOR_MISSING":
    case "PUBLICATION_JOB_REVIEWED_INTENT_DRIFT":
    case "PUBLICATION_JOB_SOURCE_OR_TARGET_INVALID":
    case "PUBLICATION_JOB_SOURCE_OR_TARGET_MISSING":
    case "PUBLICATION_JOB_MASTER_PACKAGE_MISSING":
    case "PUBLICATION_JOB_SOURCE_TARGET_IDENTITY_MISMATCH":
      return error.message;
    default:
      return "PUBLICATION_BACKFILL_ENQUEUE_FAILED";
  }
}

export function createPublicationBackfillExecutorService(dependencies: Dependencies = defaultDependencies) {
  async function apply(rawInput: z.input<typeof publicationBackfillApplyInputSchema>, requestedBySubject: string) {
    const input = publicationBackfillApplyInputSchema.parse(rawInput);
    if (!requestedBySubject.trim()) throw new Error("PUBLICATION_BACKFILL_REQUESTOR_MISSING");

    const preview = await dependencies.preview();
    if (preview.planHash !== input.expectedPlanHash) throw new Error("PUBLICATION_BACKFILL_PLAN_HASH_MISMATCH");
    if (preview.summary.candidates !== preview.planMaterial.candidates.length) {
      throw new Error("PUBLICATION_BACKFILL_PREVIEW_INVALID");
    }

    const candidates = [...preview.planMaterial.candidates]
      .sort((left, right) => left.siteId.localeCompare(right.siteId) || left.ecosystemType.localeCompare(right.ecosystemType));
    const jobs: ReturnType<typeof safeJob>[] = [];
    let createdJobs = 0;
    let existingJobs = 0;

    for (const candidate of candidates) {
      try {
        const result = await dependencies.enqueueReviewed(
          { siteId: candidate.siteId },
          requestedBySubject,
          candidate.intentHash
        );
        if (!matchesCandidate(result.job, candidate)) throw new Error("PUBLICATION_BACKFILL_JOB_IDENTITY_MISMATCH");
        if (result.job.status === "FAILED" || result.job.status === "CANCELLED") {
          throw new Error("PUBLICATION_BACKFILL_RETRY_NOT_AUTHORIZED");
        }
        jobs.push(safeJob(result.job));
        if (result.created) createdJobs += 1;
        else existingJobs += 1;
      } catch (error) {
        const failureCode = safeEnqueueFailureCode(error);
        const partial = jobs.length > 0;
        if (jobs.some((job) => job.status === "QUEUED" || job.status === "RUNNING")) dependencies.wake();
        return {
          requestId: "CDX-20260902-008" as const,
          mode: PUBLICATION_BACKFILL_APPLY_MODE,
          changed: createdJobs > 0,
          blocked: true as const,
          blockedReasons: partial
            ? ["PUBLICATION_BACKFILL_PARTIAL_ENQUEUE", failureCode] as const
            : [failureCode] as const,
          planHash: preview.planHash,
          summary: {
            authorizedCandidates: candidates.length,
            processedCandidates: jobs.length,
            createdJobs,
            existingJobs,
            remainingCandidates: candidates.length - jobs.length
          },
          failedCandidate: {
            siteId: candidate.siteId,
            ecosystemType: candidate.ecosystemType,
            publicHost: candidate.publicHost,
            intentHash: candidate.intentHash
          },
          jobs,
          workerWakeRequested: jobs.some((job) => job.status === "QUEUED" || job.status === "RUNNING"),
          nextAction: partial
            ? "RUN_NEW_PREVIEW_AND_REQUIRE_NEW_AUTHORIZATION" as const
            : "AUDIT_ENQUEUE_FAILURE_AND_RUN_NEW_PREVIEW" as const
        };
      }
    }

    const workerWakeRequested = jobs.some((job) => job.status === "QUEUED" || job.status === "RUNNING");
    if (workerWakeRequested) dependencies.wake();
    return {
      requestId: "CDX-20260902-008" as const,
      mode: PUBLICATION_BACKFILL_APPLY_MODE,
      changed: createdJobs > 0,
      blocked: false as const,
      blockedReasons: [] as const,
      planHash: preview.planHash,
      summary: {
        authorizedCandidates: candidates.length,
        processedCandidates: jobs.length,
        createdJobs,
        existingJobs,
        remainingCandidates: 0
      },
      jobs,
      workerWakeRequested,
      outcome: candidates.length === 0
        ? "NO_CANDIDATES"
        : createdJobs > 0 ? "ENQUEUED" : "IDEMPOTENT"
    } as const;
  }

  return { apply };
}

export const publicationBackfillExecutorService = createPublicationBackfillExecutorService();
