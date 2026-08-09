export type DomainInventoryLead = {
  id: string;
  siteId: string | null;
  fullName: string;
  brandName: string;
  ecosystemType?: string;
  publicationState?: string;
  onboardingData?: { domain?: string };
};

export type DomainInventorySource = {
  siteId: string;
  configuration: unknown;
};

export type DomainInventoryTarget = {
  ownerKey: string;
  siteId: string;
  ecosystemType: string;
  publicHost: string;
  provisioningState: string;
  hostingerState: string;
  dnsState: string;
  sslState: string;
  lastErrorCode?: string;
  updatedAt: string;
};

export type DomainVerificationSummary = {
  siteId: string;
  status: string;
  verifiedAt: string;
};

export type DomainInventoryItem = {
  id: string;
  kind: "MASTER" | "PARTNER_LEGACY" | "PARTNER_TARGET";
  hostname: string;
  siteId: string;
  ecosystemType: string;
  partner: { id: string; fullName: string; brandName: string } | null;
  assignmentState: "ASSIGNED";
  provisioningState: string;
  hostingState: string;
  dnsState: string;
  sslState: string;
  publicationState: string;
  verificationState: string;
  verifiedAt?: string;
  lastErrorCode?: string;
  updatedAt?: string;
};

const masters = [
  { ecosystemType: "PRODUCT", siteId: "ganomaster", hostname: "product.ganomaster.pro" },
  { ecosystemType: "BUSINESS", siteId: "ganomaster-business", hostname: "business.ganomaster.pro" },
  { ecosystemType: "PERSONAL_BRAND", siteId: "ganomaster-personal-brand", hostname: "brand.ganomaster.pro" }
] as const;

function sourceDetails(configuration: unknown) {
  if (!configuration || typeof configuration !== "object") return {};
  const record = configuration as { ecosystemType?: unknown; site?: { domain?: unknown } };
  return {
    ecosystemType: typeof record.ecosystemType === "string" ? record.ecosystemType : undefined,
    domain: typeof record.site?.domain === "string" ? record.site.domain.trim().toLowerCase() : undefined
  };
}

export function buildDomainInventory(input: {
  leads: DomainInventoryLead[];
  sources: DomainInventorySource[];
  targets: DomainInventoryTarget[];
  verifications: DomainVerificationSummary[];
}): DomainInventoryItem[] {
  const leadById = new Map(input.leads.map((lead) => [lead.id, lead]));
  const sourceBySiteId = new Map(input.sources.map((source) => [source.siteId, sourceDetails(source.configuration)]));
  const verificationBySiteId = new Map(input.verifications.map((verification) => [verification.siteId, verification]));

  const verificationFields = (siteId: string) => {
    const verification = verificationBySiteId.get(siteId);
    return verification
      ? { verificationState: verification.status, verifiedAt: verification.verifiedAt }
      : { verificationState: "NOT_CHECKED" };
  };

  const masterItems: DomainInventoryItem[] = masters.map((master) => ({
    id: `master:${master.siteId}`,
    kind: "MASTER",
    hostname: master.hostname,
    siteId: master.siteId,
    ecosystemType: master.ecosystemType,
    partner: null,
    assignmentState: "ASSIGNED",
    provisioningState: "MANAGED_EXTERNALLY",
    hostingState: "MANAGED_EXTERNALLY",
    dnsState: "UNKNOWN",
    sslState: "UNKNOWN",
    publicationState: "UNKNOWN",
    ...verificationFields(master.siteId)
  }));

  const legacyItems = input.leads.flatMap((lead): DomainInventoryItem[] => {
    if (!lead.siteId) return [];
    const source = sourceBySiteId.get(lead.siteId);
    const hostname = lead.onboardingData?.domain?.trim().toLowerCase() || source?.domain;
    if (!hostname) return [];
    return [{
      id: `legacy:${lead.siteId}`,
      kind: "PARTNER_LEGACY",
      hostname,
      siteId: lead.siteId,
      ecosystemType: source?.ecosystemType || lead.ecosystemType || "PRODUCT",
      partner: { id: lead.id, fullName: lead.fullName, brandName: lead.brandName },
      assignmentState: "ASSIGNED",
      provisioningState: "LEGACY_NOT_TRACKED",
      hostingState: "LEGACY_NOT_TRACKED",
      dnsState: "UNKNOWN",
      sslState: "UNKNOWN",
      publicationState: lead.publicationState || "NOT_STARTED",
      ...verificationFields(lead.siteId)
    }];
  });

  const targetItems: DomainInventoryItem[] = input.targets.map((target) => {
    const lead = leadById.get(target.ownerKey);
    return {
      id: `target:${target.siteId}`,
      kind: "PARTNER_TARGET",
      hostname: target.publicHost,
      siteId: target.siteId,
      ecosystemType: target.ecosystemType,
      partner: lead ? { id: lead.id, fullName: lead.fullName, brandName: lead.brandName } : null,
      assignmentState: "ASSIGNED",
      provisioningState: target.provisioningState,
      hostingState: target.hostingerState,
      dnsState: target.dnsState,
      sslState: target.sslState,
      publicationState: "NOT_TRACKED",
      ...verificationFields(target.siteId),
      ...(target.lastErrorCode ? { lastErrorCode: target.lastErrorCode } : {}),
      updatedAt: target.updatedAt
    };
  });

  return [...masterItems, ...legacyItems, ...targetItems].sort((left, right) =>
    left.hostname.localeCompare(right.hostname)
  );
}
