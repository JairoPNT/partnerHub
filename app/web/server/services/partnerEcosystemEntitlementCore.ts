import { z } from "zod";

export type EcosystemType = "PRODUCT" | "BUSINESS" | "PERSONAL_BRAND";

const entitlementSnapshotSchema = z.object({
  offerCode: z.enum(["PRODUCT_ONLY", "BUSINESS_ONLY", "PERSONAL_BRAND_ONLY", "PLAN_360"]),
  ecosystemTypes: z.array(z.enum(["PRODUCT", "BUSINESS", "PERSONAL_BRAND"])).min(1),
  ecosystemType: z.enum(["PRODUCT", "BUSINESS", "PERSONAL_BRAND"]).nullable(),
  amountCop: z.number().int().positive(),
  currency: z.literal("COP"),
  billingType: z.literal("ONE_TIME"),
  catalogVersion: z.literal("2026-08-12.v1"),
  selectedAt: z.string().datetime({ offset: true })
}).strict();

type EntitlementSnapshot = z.infer<typeof entitlementSnapshotSchema>;

export type EntitlementLead = {
  id: string;
  siteId?: string | null;
  offerCode?: string;
  offerSnapshot?: unknown;
  onboardingData?: { domain?: string };
};

export type EntitlementTarget = {
  ownerKey: string;
  siteId: string;
  ecosystemType: EcosystemType;
  baseDomain: string;
  publicHost: string;
  provisioningState: string;
  publicationState: string;
};

export type ExpectedEntitlementTarget = {
  ecosystemType: EcosystemType;
  role: "ROOT" | "SUBDOMAIN";
  publicHost: string | null;
};

const labels: Partial<Record<EcosystemType, string>> = {
  PRODUCT: "producto",
  BUSINESS: "negocio"
};

function rootEcosystem(included: EcosystemType[]) {
  if (included.includes("PERSONAL_BRAND")) return "PERSONAL_BRAND" as const;
  return included.length === 1 ? included[0] ?? null : null;
}

function baseDomain(lead: EntitlementLead, targets: EntitlementTarget[]) {
  const onboardingDomain = lead.onboardingData?.domain?.trim().toLowerCase();
  if (onboardingDomain) return onboardingDomain;
  const domains = [...new Set(targets.map((target) => target.baseDomain))];
  return domains.length === 1 ? domains[0] : null;
}

function expectedHost(ecosystemType: EcosystemType, root: EcosystemType | null, domain: string | null) {
  if (!domain) return null;
  if (ecosystemType === root) return domain;
  const label = labels[ecosystemType];
  return label ? `${label}.${domain}` : null;
}

export function buildPartnerEcosystemEntitlement(lead: EntitlementLead, allTargets: EntitlementTarget[]) {
  const parsedSnapshot = entitlementSnapshotSchema.safeParse(lead.offerSnapshot);
  const existingTargets = allTargets
    .filter((target) => target.ownerKey === lead.id)
    .map((target) => ({ ...target }));

  if (!parsedSnapshot.success) {
    return {
      activationLeadId: lead.id,
      commercialState: "UNKNOWN" as const,
      offerCode: null,
      offerSnapshot: null,
      includedEcosystems: [] as EcosystemType[],
      rootEcosystem: null,
      expectedTargets: [] as ExpectedEntitlementTarget[],
      existingTargets,
      missingTargets: [] as ExpectedEntitlementTarget[],
      regenerationRequired: false,
      regenerationReasons: ["COMMERCIAL_STATE_UNKNOWN"]
    };
  }

  const snapshot: EntitlementSnapshot = parsedSnapshot.data;
  const includedEcosystems = [...snapshot.ecosystemTypes];
  const root = rootEcosystem(includedEcosystems);
  const domain = baseDomain(lead, existingTargets);
  const expectedTargets: ExpectedEntitlementTarget[] = includedEcosystems.map((ecosystemType) => ({
    ecosystemType,
    role: ecosystemType === root ? "ROOT" : "SUBDOMAIN",
    publicHost: expectedHost(ecosystemType, root, domain)
  }));
  const missingTargets = expectedTargets.filter((expected) => !existingTargets.some((existing) =>
    existing.ecosystemType === expected.ecosystemType &&
    (expected.publicHost === null || existing.publicHost === expected.publicHost)
  ));
  const regenerationReasons = missingTargets.map((target) => `TARGET_MISSING:${target.ecosystemType}`);
  for (const target of existingTargets) {
    if (!includedEcosystems.includes(target.ecosystemType)) {
      regenerationReasons.push(`UNENTITLED_TARGET_PRESENT:${target.ecosystemType}`);
    } else if (target.publicationState !== "READY") {
      regenerationReasons.push(`TARGET_PUBLICATION_PENDING:${target.ecosystemType}`);
    }
  }

  return {
    activationLeadId: lead.id,
    commercialState: "KNOWN" as const,
    offerCode: snapshot.offerCode,
    offerSnapshot: { ...snapshot, ecosystemTypes: [...snapshot.ecosystemTypes] },
    includedEcosystems,
    rootEcosystem: root,
    expectedTargets,
    existingTargets,
    missingTargets,
    regenerationRequired: regenerationReasons.length > 0,
    regenerationReasons
  };
}
