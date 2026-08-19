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

const manualPaymentSnapshotSchema = z.object({
  version: z.literal(1),
  offerCode: z.string().nullable(),
  ecosystemTypes: z.array(z.enum(["PRODUCT", "BUSINESS", "PERSONAL_BRAND"])).min(1),
  pricingMode: z.enum(["CATALOG", "MANUAL_NEGOTIATED"]),
  amountCop: z.number().int().positive(),
  currency: z.literal("COP"),
  selectedAt: z.string().datetime({ offset: true })
}).strict();

type EntitlementSnapshot = z.infer<typeof entitlementSnapshotSchema>;

export type EntitlementLead = {
  id: string;
  siteId?: string | null;
  offerCode?: string;
  offerSnapshot?: unknown;
  additionalCommercialSnapshots?: unknown[];
  complimentaryGrantEcosystems?: EcosystemType[];
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
  role: "SUBDOMAIN";
  publicHost: string | null;
};

const labels: Record<EcosystemType, string> = {
  PRODUCT: "product",
  BUSINESS: "business",
  PERSONAL_BRAND: "brand"
};

function rootEcosystem(included: EcosystemType[]) {
  if (included.length === 1) return included[0] ?? null;
  if (included.includes("PERSONAL_BRAND")) return "PERSONAL_BRAND" as const;
  return included.includes("PRODUCT") ? "PRODUCT" as const : null;
}

function baseDomain(lead: EntitlementLead, targets: EntitlementTarget[]) {
  const onboardingDomain = lead.onboardingData?.domain?.trim().toLowerCase();
  if (onboardingDomain) return onboardingDomain;
  const domains = [...new Set(targets.map((target) => target.baseDomain))];
  return domains.length === 1 ? domains[0] : null;
}

function expectedHost(ecosystemType: EcosystemType, domain: string | null) {
  if (!domain) return null;
  return `${labels[ecosystemType]}.${domain}`;
}

export function buildPartnerEcosystemEntitlement(lead: EntitlementLead, allTargets: EntitlementTarget[]) {
  const parsedSnapshot = entitlementSnapshotSchema.safeParse(lead.offerSnapshot);
  const manualSnapshots = (lead.additionalCommercialSnapshots ?? []).flatMap((snapshot) => {
    const parsed = manualPaymentSnapshotSchema.safeParse(snapshot);
    return parsed.success ? [parsed.data] : [];
  });
  const complimentaryGrantEcosystems = [...new Set(lead.complimentaryGrantEcosystems ?? [])];
  const existingTargets = allTargets
    .filter((target) => target.ownerKey === lead.id)
    .map((target) => ({ ...target }));

  if (!parsedSnapshot.success && manualSnapshots.length === 0 && complimentaryGrantEcosystems.length === 0) {
    return {
      activationLeadId: lead.id,
      commercialState: "UNKNOWN" as const,
      offerCode: null,
      offerSnapshot: null,
      includedEcosystems: [] as EcosystemType[],
      rootEcosystem: null,
      rootRedirectTarget: null,
      expectedTargets: [] as ExpectedEntitlementTarget[],
      existingTargets,
      missingTargets: [] as ExpectedEntitlementTarget[],
      regenerationRequired: false,
      regenerationReasons: ["COMMERCIAL_STATE_UNKNOWN"]
    };
  }

  const activationSnapshot: EntitlementSnapshot | null = parsedSnapshot.success ? parsedSnapshot.data : null;
  const selectedSnapshot = manualSnapshots.at(-1) ?? activationSnapshot;
  const includedEcosystems = [...new Set([
    ...(activationSnapshot?.ecosystemTypes ?? []),
    ...manualSnapshots.flatMap((snapshot) => snapshot.ecosystemTypes),
    ...complimentaryGrantEcosystems
  ])];
  const root = rootEcosystem(includedEcosystems);
  const domain = baseDomain(lead, existingTargets);
  const expectedTargets: ExpectedEntitlementTarget[] = includedEcosystems.map((ecosystemType) => ({
    ecosystemType,
    role: "SUBDOMAIN",
    publicHost: expectedHost(ecosystemType, domain)
  }));
  const rootRedirectHost = root === null ? null : expectedHost(root, domain);
  const rootRedirectTarget = root === null || rootRedirectHost === null
    ? null
    : { ecosystemType: root, publicHost: rootRedirectHost };
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
    offerCode: selectedSnapshot?.offerCode ?? null,
    offerSnapshot: selectedSnapshot ? { ...selectedSnapshot, ecosystemTypes: [...selectedSnapshot.ecosystemTypes] } : null,
    commercialSnapshots: [
      ...(activationSnapshot ? [{ ...activationSnapshot, ecosystemTypes: [...activationSnapshot.ecosystemTypes] }] : []),
      ...manualSnapshots.map((snapshot) => ({ ...snapshot, ecosystemTypes: [...snapshot.ecosystemTypes] }))
    ],
    complimentaryGrantEcosystems,
    includedEcosystems,
    rootEcosystem: root,
    rootRedirectTarget,
    expectedTargets,
    existingTargets,
    missingTargets,
    regenerationRequired: regenerationReasons.length > 0,
    regenerationReasons
  };
}
