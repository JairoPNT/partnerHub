import "server-only";

import { z } from "zod";

import { activationLeadService } from "@/server/services/activationLeadService";
import { partnerEcosystemEntitlementService } from "@/server/services/partnerEcosystemEntitlementService";
import { partnerEcosystemTargetReader } from "@/server/services/partnerEcosystemTargetReader";
import { publicationJobService } from "@/server/services/publicationJobService";

const activationLeadIdSchema = z.string().uuid();

type EcosystemType = "PRODUCT" | "BUSINESS" | "PERSONAL_BRAND";
type JobStatus = "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
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

type Dependencies = {
  getLeadById: (id: string) => Promise<Lead | null>;
  getEntitlement: (query: { activationLeadId: string }) => Promise<Entitlement | null>;
  listTargets: () => Promise<Target[]>;
  previewIntent: (input: { siteId: string }) => Promise<{ intent: Intent; intentHash: string }>;
  getJob: (id: string) => Promise<{ status: JobStatus } | null>;
  onRead?: (dependency: "lead" | "entitlement" | "targets" | "intent" | "job") => void;
};

const defaultDependencies: Dependencies = {
  getLeadById: activationLeadService.getById,
  getEntitlement: partnerEcosystemEntitlementService.get,
  listTargets: partnerEcosystemTargetReader.list,
  previewIntent: publicationJobService.previewIntent,
  getJob: publicationJobService.get
};

type BlockedReason =
  | "ACTIVATION_NOT_APPROVED"
  | "ENTITLEMENT_NOT_FOUND"
  | "BUSINESS_NOT_ENTITLED"
  | "TARGET_NOT_FOUND"
  | "TARGET_OWNERSHIP_MISMATCH"
  | "TARGET_NOT_READY"
  | "ARTIFACT_MISSING"
  | "ARTIFACT_INVALID"
  | "MASTER_PACKAGE_MISSING"
  | "INVENTORY_UNAVAILABLE";

type ReadyStatus =
  | "READY_FOR_PUBLICATION_PREVIEW"
  | "PUBLICATION_CURRENT"
  | "PUBLICATION_SCHEDULED"
  | "RETRY_REQUIRED";

function approved(lead: Lead) {
  return (lead.recordState ?? "ACTIVE") === "ACTIVE" && ["PAID", "CONVERTED"].includes(lead.status);
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

function matches(target: Target, lead: Lead) {
  return target.ownerKey === lead.id && target.ecosystemType === "BUSINESS" && target.siteId === `${lead.siteId}-business`;
}

function publicationStatus(status: JobStatus | null): ReadyStatus {
  if (!status) return "READY_FOR_PUBLICATION_PREVIEW";
  if (status === "SUCCEEDED") return "PUBLICATION_CURRENT";
  if (status === "QUEUED" || status === "RUNNING") return "PUBLICATION_SCHEDULED";
  return "RETRY_REQUIRED";
}

function blocked(reason: BlockedReason) {
  return {
    status: "BLOCKED" as const,
    blocked: true as const,
    blockedReasons: [reason] as [BlockedReason],
    artifacts: null
  };
}

export function createBusinessCommercialReadinessService(dependencies: Dependencies = defaultDependencies) {
  async function get(input: { activationLeadId: string }) {
    const activationLeadId = activationLeadIdSchema.parse(input.activationLeadId);
    dependencies.onRead?.("lead");
    const lead = await dependencies.getLeadById(activationLeadId);
    if (!lead) {
      return { status: "NOT_FOUND" as const, blocked: false as const, blockedReasons: [] as BlockedReason[], artifacts: null };
    }
    if (!lead.siteId || !approved(lead)) return blocked("ACTIVATION_NOT_APPROVED");

    dependencies.onRead?.("entitlement");
    const entitlement = await dependencies.getEntitlement({ activationLeadId });
    if (!entitlement || entitlement.activationLeadId !== lead.id || entitlement.commercialState !== "KNOWN") {
      return blocked("ENTITLEMENT_NOT_FOUND");
    }
    if (!entitlement.includedEcosystems.includes("BUSINESS")) return blocked("BUSINESS_NOT_ENTITLED");

    dependencies.onRead?.("targets");
    const targets = await dependencies.listTargets();
    const inventoryTarget = targets.find((target) => matches(target, lead));
    const entitlementTarget = entitlement.existingTargets.find((target) => matches(target, lead));
    if (!inventoryTarget || !entitlementTarget) return blocked("TARGET_NOT_FOUND");
    if (
      inventoryTarget.ownerKey !== entitlementTarget.ownerKey ||
      inventoryTarget.siteId !== entitlementTarget.siteId ||
      inventoryTarget.ecosystemType !== entitlementTarget.ecosystemType ||
      inventoryTarget.baseDomain !== entitlementTarget.baseDomain ||
      inventoryTarget.publicHost !== entitlementTarget.publicHost
    ) return blocked("TARGET_OWNERSHIP_MISMATCH");
    if (inventoryTarget.provisioningState !== "READY") return blocked("TARGET_NOT_READY");

    try {
      dependencies.onRead?.("intent");
      const { intent, intentHash } = await dependencies.previewIntent({ siteId: inventoryTarget.siteId });
      if (
        intent.ownerKey !== lead.id ||
        intent.ownerSiteId !== lead.siteId ||
        intent.siteId !== inventoryTarget.siteId ||
        intent.ecosystemType !== "BUSINESS" ||
        intent.baseDomain !== inventoryTarget.baseDomain ||
        intent.publicHost !== inventoryTarget.publicHost
      ) return blocked("TARGET_OWNERSHIP_MISMATCH");

      dependencies.onRead?.("job");
      const job = await dependencies.getJob(intentHash);
      const status = !job && inventoryTarget.publicationState === "READY"
        ? "PUBLICATION_CURRENT"
        : publicationStatus(job?.status ?? null);
      return {
        status,
        blocked: false as const,
        blockedReasons: [] as BlockedReason[],
        siteId: inventoryTarget.siteId,
        publicHost: inventoryTarget.publicHost,
        artifacts: {
          sourceHash: intent.sourceHash,
          targetHash: intent.targetHash,
          masterPackageHash: intent.masterPackageHash,
          intentHash
        }
      };
    } catch (error) {
      return blocked(artifactReason(error));
    }
  }

  return { get };
}

export const businessCommercialReadinessService = createBusinessCommercialReadinessService();
