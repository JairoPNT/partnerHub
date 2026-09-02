import "server-only";

import { createHash } from "node:crypto";

import { activationLeadService } from "@/server/services/activationLeadService";
import { partnerEcosystemEntitlementService } from "@/server/services/partnerEcosystemEntitlementService";
import { partnerEcosystemTargetReader } from "@/server/services/partnerEcosystemTargetReader";
import { publicationJobService } from "@/server/services/publicationJobService";

type EcosystemType = "PRODUCT" | "BUSINESS" | "PERSONAL_BRAND";
type Lead = { id: string; siteId?: string | null; status: string; recordState?: string };
type Target = {
  ownerKey: string;
  siteId: string;
  ecosystemType: EcosystemType;
  baseDomain: string;
  publicHost: string;
  provisioningState: string;
  publicationState: string;
};
type Entitlement = {
  activationLeadId: string;
  commercialState: string;
  includedEcosystems: EcosystemType[];
  existingTargets: Target[];
};
type Intent = {
  ownerKey: string;
  ownerSiteId: string;
  siteId: string;
  ecosystemType: EcosystemType;
  baseDomain: string;
  publicHost: string;
  sourceHash: string;
  targetHash: string;
  masterPackageHash: string;
};
type Job = { status: "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED" };

type Dependencies = {
  listLeads: () => Promise<Lead[]>;
  listTargets: () => Promise<Target[]>;
  getEntitlement: (query: { activationLeadId: string }) => Promise<Entitlement | null>;
  previewIntent: (input: { siteId: string }) => Promise<{ intent: Intent; intentHash: string }>;
  getJob: (id: string) => Promise<Job | null>;
};

const defaultDependencies: Dependencies = {
  listLeads: () => activationLeadService.list({ includeArchived: true }),
  listTargets: partnerEcosystemTargetReader.list,
  getEntitlement: partnerEcosystemEntitlementService.get,
  previewIntent: publicationJobService.previewIntent,
  getJob: publicationJobService.get
};

type BlockedReason =
  | "LEAD_NOT_FOUND"
  | "ACTIVATION_NOT_APPROVED"
  | "ENTITLEMENT_NOT_ACTIVE"
  | "TARGET_NOT_READY"
  | "TARGET_OWNERSHIP_MISMATCH"
  | "ARTIFACT_MISSING"
  | "ARTIFACT_INVALID"
  | "MASTER_PACKAGE_MISSING"
  | "INVENTORY_UNAVAILABLE";

type InventoryIdentity = {
  siteId: string;
  ecosystemType: EcosystemType;
  publicHost: string;
};
type EligibleEntry = InventoryIdentity & {
  intentHash: string;
  sourceHash: string;
  targetHash: string;
  masterPackageHash: string;
  approvalHash: string;
};
type ExistingEntry = EligibleEntry & { jobStatus: Job["status"] };
type BlockedEntry = InventoryIdentity & {
  targetInventoryHash: string;
  approvalHash?: string;
  reason: BlockedReason;
};

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value: unknown) {
  return createHash("sha256").update(typeof value === "string" ? value : canonical(value)).digest("hex");
}

function artifactReason(error: unknown): BlockedReason {
  if (!(error instanceof Error)) return "INVENTORY_UNAVAILABLE";
  if (error.message === "PUBLICATION_JOB_SOURCE_OR_TARGET_MISSING") return "ARTIFACT_MISSING";
  if (error.message === "PUBLICATION_JOB_MASTER_PACKAGE_MISSING") return "MASTER_PACKAGE_MISSING";
  if (["PUBLICATION_JOB_SOURCE_OR_TARGET_INVALID", "PUBLICATION_JOB_SOURCE_TARGET_IDENTITY_MISMATCH"].includes(error.message)) {
    return "ARTIFACT_INVALID";
  }
  return "INVENTORY_UNAVAILABLE";
}

function identity(target: Target): InventoryIdentity {
  return { siteId: target.siteId, ecosystemType: target.ecosystemType, publicHost: target.publicHost };
}

function sortEntries<T extends InventoryIdentity>(entries: T[]) {
  return entries.sort((left, right) => left.siteId.localeCompare(right.siteId) || left.ecosystemType.localeCompare(right.ecosystemType));
}

export function createPublicationBackfillPreviewService(dependencies: Dependencies = defaultDependencies) {
  async function preview() {
    const [leads, targets] = await Promise.all([dependencies.listLeads(), dependencies.listTargets()]);
    const leadsById = new Map(leads.map((lead) => [lead.id, lead]));
    const entitlementByOwner = new Map<string, Promise<Entitlement | null>>();
    const candidates: EligibleEntry[] = [];
    const alreadyCurrent: ExistingEntry[] = [];
    const alreadyScheduled: ExistingEntry[] = [];
    const retryRequired: ExistingEntry[] = [];
    const blocked: BlockedEntry[] = [];

    for (const target of [...targets].sort((left, right) => left.siteId.localeCompare(right.siteId))) {
      const targetInventoryHash = sha256(target);
      const reject = (reason: BlockedReason, approvalHash?: string) => {
        blocked.push({ ...identity(target), targetInventoryHash, ...(approvalHash ? { approvalHash } : {}), reason });
      };
      const lead = leadsById.get(target.ownerKey);
      if (!lead) {
        reject("LEAD_NOT_FOUND");
        continue;
      }
      const leadState = { ownerKey: lead.id, siteId: lead.siteId ?? null, status: lead.status, recordState: lead.recordState ?? "ACTIVE" };
      if (leadState.recordState !== "ACTIVE" || !["PAID", "CONVERTED"].includes(lead.status)) {
        reject("ACTIVATION_NOT_APPROVED", sha256(leadState));
        continue;
      }
      let entitlementPromise = entitlementByOwner.get(lead.id);
      if (!entitlementPromise) {
        entitlementPromise = dependencies.getEntitlement({ activationLeadId: lead.id });
        entitlementByOwner.set(lead.id, entitlementPromise);
      }
      const entitlement = await entitlementPromise;
      const approvalState = {
        ...leadState,
        commercialState: entitlement?.commercialState ?? "MISSING",
        includedEcosystems: [...(entitlement?.includedEcosystems ?? [])].sort()
      };
      const approvalHash = sha256(approvalState);
      if (!entitlement || entitlement.activationLeadId !== lead.id || entitlement.commercialState !== "KNOWN" ||
          !entitlement.includedEcosystems.includes(target.ecosystemType)) {
        reject("ENTITLEMENT_NOT_ACTIVE", approvalHash);
        continue;
      }
      const entitledTarget = entitlement.existingTargets.find((candidate) => candidate.siteId === target.siteId);
      if (!entitledTarget || entitledTarget.ownerKey !== lead.id || entitledTarget.ecosystemType !== target.ecosystemType ||
          entitledTarget.publicHost !== target.publicHost || entitledTarget.baseDomain !== target.baseDomain) {
        reject("TARGET_OWNERSHIP_MISMATCH", approvalHash);
        continue;
      }
      if (target.provisioningState !== "READY") {
        reject("TARGET_NOT_READY", approvalHash);
        continue;
      }

      let previewResult: { intent: Intent; intentHash: string };
      try {
        previewResult = await dependencies.previewIntent({ siteId: target.siteId });
      } catch (error) {
        reject(artifactReason(error), approvalHash);
        continue;
      }
      const { intent, intentHash } = previewResult;
      if (intent.ownerKey !== lead.id || intent.ownerSiteId !== lead.siteId || intent.siteId !== target.siteId ||
          intent.ecosystemType !== target.ecosystemType || intent.publicHost !== target.publicHost || intent.baseDomain !== target.baseDomain) {
        reject("TARGET_OWNERSHIP_MISMATCH", approvalHash);
        continue;
      }
      const entry: EligibleEntry = {
        ...identity(target),
        intentHash,
        sourceHash: intent.sourceHash,
        targetHash: intent.targetHash,
        masterPackageHash: intent.masterPackageHash,
        approvalHash
      };
      const job = await dependencies.getJob(intentHash);
      if (!job) candidates.push(entry);
      else if (job.status === "SUCCEEDED") alreadyCurrent.push({ ...entry, jobStatus: job.status });
      else if (job.status === "QUEUED" || job.status === "RUNNING") alreadyScheduled.push({ ...entry, jobStatus: job.status });
      else retryRequired.push({ ...entry, jobStatus: job.status });
    }

    const planMaterial = {
      schemaVersion: 1 as const,
      operation: "PREVIEW_EXISTING_PUBLICATION_BACKFILL" as const,
      candidates: sortEntries(candidates),
      alreadyCurrent: sortEntries(alreadyCurrent),
      alreadyScheduled: sortEntries(alreadyScheduled),
      retryRequired: sortEntries(retryRequired),
      blocked: sortEntries(blocked)
    };
    return {
      requestId: "CDX-20260902-007" as const,
      mode: "READ_ONLY_PUBLICATION_BACKFILL_PREVIEW" as const,
      changed: false as const,
      writesMade: false as const,
      providerCallsMade: false as const,
      planHash: sha256(planMaterial),
      summary: {
        targets: targets.length,
        candidates: candidates.length,
        alreadyCurrent: alreadyCurrent.length,
        alreadyScheduled: alreadyScheduled.length,
        retryRequired: retryRequired.length,
        blocked: blocked.length
      },
      planMaterial
    };
  }

  return { preview };
}

export const publicationBackfillPreviewService = createPublicationBackfillPreviewService();
