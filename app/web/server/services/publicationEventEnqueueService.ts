import "server-only";

import { z } from "zod";

import { activationLeadService } from "@/server/services/activationLeadService";
import { partnerEcosystemEntitlementService } from "@/server/services/partnerEcosystemEntitlementService";
import { partnerEcosystemTargetReader } from "@/server/services/partnerEcosystemTargetReader";
import { publicationJobService } from "@/server/services/publicationJobService";
import { wakePublicationJobWorker } from "@/server/services/publicationJobWorkerService";

const siteIdSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
type EventType = "ACTIVATION_CHANGED" | "SOURCE_CHANGED";
type EcosystemType = "PRODUCT" | "BUSINESS" | "PERSONAL_BRAND";
type Lead = {
  id: string;
  siteId?: string | null;
  status: string;
  recordState?: string;
};
type Target = {
  ownerKey: string;
  siteId: string;
  ecosystemType: EcosystemType;
  provisioningState: string;
  publicationState: string;
};
type Entitlement = {
  activationLeadId: string;
  commercialState: string;
  includedEcosystems: EcosystemType[];
  existingTargets: Target[];
};
type EnqueueResult = {
  created: boolean;
  job: { status: string };
};

type Dependencies = {
  getLeadById: (id: string) => Promise<Lead | null>;
  getEntitlement: (query: { activationLeadId?: string; siteId?: string }) => Promise<Entitlement | null>;
  listTargets: () => Promise<Target[]>;
  enqueue: (input: { siteId: string }, requestedBySubject: string) => Promise<EnqueueResult>;
  wake: () => void;
};

export type PublicationEventEnqueueResult = {
  event: EventType;
  outcome: "ENQUEUED" | "IDEMPOTENT" | "PARTIAL" | "SKIPPED" | "FAILED_SAFE";
  eligibleCount: number;
  createdCount: number;
  idempotentCount: number;
  skippedCount: number;
  reason?:
    | "ACTIVATION_NOT_APPROVED"
    | "ENTITLEMENT_NOT_FOUND"
    | "ENTITLEMENT_NOT_ACTIVE"
    | "TARGET_NOT_ELIGIBLE"
    | "SOURCE_SYNC_FAILED"
    | "ARTIFACT_NOT_READY"
    | "AUTOMATION_UNAVAILABLE";
};

const defaultDependencies: Dependencies = {
  getLeadById: activationLeadService.getById,
  getEntitlement: partnerEcosystemEntitlementService.get,
  listTargets: partnerEcosystemTargetReader.list,
  enqueue: publicationJobService.enqueue,
  wake: wakePublicationJobWorker
};

function approved(lead: Lead) {
  return (lead.recordState ?? "ACTIVE") === "ACTIVE" && ["PAID", "CONVERTED"].includes(lead.status);
}

function empty(event: EventType, reason: PublicationEventEnqueueResult["reason"]): PublicationEventEnqueueResult {
  return { event, outcome: "SKIPPED", eligibleCount: 0, createdCount: 0, idempotentCount: 0, skippedCount: 0, reason };
}

function safeFailure(event: EventType): PublicationEventEnqueueResult {
  return { event, outcome: "FAILED_SAFE", eligibleCount: 0, createdCount: 0, idempotentCount: 0, skippedCount: 0, reason: "AUTOMATION_UNAVAILABLE" };
}

function isArtifactNotReady(error: unknown) {
  return error instanceof Error && [
    "PUBLICATION_JOB_SOURCE_OR_TARGET_MISSING",
    "PUBLICATION_JOB_SOURCE_OR_TARGET_INVALID",
    "PUBLICATION_JOB_MASTER_PACKAGE_MISSING",
    "PUBLICATION_JOB_SOURCE_TARGET_IDENTITY_MISMATCH"
  ].includes(error.message);
}

export function createPublicationEventEnqueueService(dependencies: Dependencies = defaultDependencies) {
  async function enqueueTargets(
    event: EventType,
    lead: Lead,
    entitlement: Entitlement,
    targets: Target[]
  ): Promise<PublicationEventEnqueueResult> {
    if (!approved(lead)) return empty(event, "ACTIVATION_NOT_APPROVED");
    if (entitlement.commercialState !== "KNOWN") return empty(event, "ENTITLEMENT_NOT_ACTIVE");

    const included = new Set(entitlement.includedEcosystems);
    const eligible = targets
      .filter((target) => target.ownerKey === lead.id && target.provisioningState === "READY" && included.has(target.ecosystemType))
      .sort((left, right) => left.siteId.localeCompare(right.siteId));
    if (!eligible.length) return empty(event, "TARGET_NOT_ELIGIBLE");

    let createdCount = 0;
    let idempotentCount = 0;
    let skippedCount = 0;
    for (const target of eligible) {
      try {
        const result = await dependencies.enqueue({ siteId: target.siteId }, `system:${event.toLowerCase()}:${lead.id}`);
        if (result.created) createdCount += 1;
        else idempotentCount += 1;
      } catch (error) {
        if (!isArtifactNotReady(error)) throw error;
        skippedCount += 1;
      }
    }

    if (createdCount + idempotentCount > 0) dependencies.wake();
    if (skippedCount > 0) {
      return {
        event,
        outcome: createdCount + idempotentCount > 0 ? "PARTIAL" : "SKIPPED",
        eligibleCount: eligible.length,
        createdCount,
        idempotentCount,
        skippedCount,
        reason: "ARTIFACT_NOT_READY" as const
      };
    }
    return {
      event,
      outcome: createdCount > 0 ? "ENQUEUED" : "IDEMPOTENT",
      eligibleCount: eligible.length,
      createdCount,
      idempotentCount,
      skippedCount
    };
  }

  async function afterActivationChange(lead: Lead): Promise<PublicationEventEnqueueResult> {
    const event = "ACTIVATION_CHANGED";
    try {
      if (!approved(lead)) return empty(event, "ACTIVATION_NOT_APPROVED");
      const entitlement = await dependencies.getEntitlement({ activationLeadId: lead.id });
      if (!entitlement || entitlement.activationLeadId !== lead.id) return empty(event, "ENTITLEMENT_NOT_FOUND");
      const targets = await dependencies.listTargets();
      return await enqueueTargets(event, lead, entitlement, targets.filter((target) => target.ownerKey === lead.id));
    } catch {
      return safeFailure(event);
    }
  }

  async function afterSourceChange(rawSiteId: string): Promise<PublicationEventEnqueueResult> {
    const event = "SOURCE_CHANGED";
    try {
      const siteId = siteIdSchema.parse(rawSiteId);
      const entitlement = await dependencies.getEntitlement({ siteId });
      if (!entitlement) return empty(event, "ENTITLEMENT_NOT_FOUND");
      const lead = await dependencies.getLeadById(entitlement.activationLeadId);
      if (!lead) return empty(event, "ENTITLEMENT_NOT_FOUND");
      const target = entitlement.existingTargets.find((candidate) => candidate.siteId === siteId);
      if (!target || target.ownerKey !== lead.id) return empty(event, "TARGET_NOT_ELIGIBLE");
      return await enqueueTargets(event, lead, entitlement, [target]);
    } catch {
      return safeFailure(event);
    }
  }

  return { afterActivationChange, afterSourceChange };
}

export const publicationEventEnqueueService = createPublicationEventEnqueueService();
