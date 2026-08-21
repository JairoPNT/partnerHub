import { z } from "zod";

import { getPartnerPublicHost } from "#partner-hostname-contract";

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

function baseDomain(lead: EntitlementLead, targets: EntitlementTarget[]) {
  const onboardingDomain = lead.onboardingData?.domain?.trim().toLowerCase();
  if (onboardingDomain) return onboardingDomain;
  const domains = [...new Set(targets.map((target) => target.baseDomain))];
  return domains.length === 1 ? domains[0] : null;
}

function selectRootRedirect(included: EcosystemType[], targets: EntitlementTarget[], domain: string | null) {
  const published = (ecosystemType: EcosystemType) => targets.find((target) =>
    target.ecosystemType === ecosystemType &&
    target.publicationState === "READY" &&
    (domain === null || target.publicHost === expectedHost(ecosystemType, domain))
  );
  const preferred = included.length === 1
    ? included
    : ["PERSONAL_BRAND", "PRODUCT", "BUSINESS"].filter((item): item is EcosystemType => included.includes(item as EcosystemType));
  const selected = preferred.map(published).find(Boolean) ?? null;
  if (!selected) {
    return {
      rootEcosystem: null,
      rootRedirectTarget: null,
      redirectStatus: "BLOCKED_NO_PUBLISHED_TARGET" as const,
      rootRedirectFallbackReason: "NO_PUBLISHED_TARGET_AVAILABLE" as const
    };
  }
  const fallback = included.length > 1 && selected.ecosystemType !== "PERSONAL_BRAND";
  return {
    rootEcosystem: selected.ecosystemType,
    rootRedirectTarget: { ecosystemType: selected.ecosystemType, publicHost: selected.publicHost },
    redirectStatus: fallback ? "READY_FALLBACK" as const : "READY_PRIMARY" as const,
    rootRedirectFallbackReason: fallback
      ? (included.includes("PERSONAL_BRAND") ? "PERSONAL_BRAND_TARGET_UNAVAILABLE" as const : "PERSONAL_BRAND_NOT_ENTITLED" as const)
      : null
  };
}

function expectedHost(ecosystemType: EcosystemType, domain: string | null) {
  if (!domain) return null;
  return getPartnerPublicHost(domain, ecosystemType);
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
      redirectStatus: "BLOCKED_NO_PUBLISHED_TARGET" as const,
      rootRedirectFallbackReason: "COMMERCIAL_STATE_UNKNOWN" as const,
      rootRedirectApex: { preserved: true, isPublishingTarget: false } as const,
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
  const domain = baseDomain(lead, existingTargets);
  const expectedTargets: ExpectedEntitlementTarget[] = includedEcosystems.map((ecosystemType) => ({
    ecosystemType,
    role: "SUBDOMAIN",
    publicHost: expectedHost(ecosystemType, domain)
  }));
  const rootRedirect = selectRootRedirect(includedEcosystems, existingTargets, domain);
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
    ...rootRedirect,
    rootRedirectApex: { preserved: true, isPublishingTarget: false } as const,
    expectedTargets,
    existingTargets,
    missingTargets,
    regenerationRequired: regenerationReasons.length > 0,
    regenerationReasons
  };
}
