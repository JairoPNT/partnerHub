type EcosystemType = "PRODUCT" | "BUSINESS" | "PERSONAL_BRAND";

export type PartnerPublishingTargetIdentity = {
  ownerKey: string;
  siteId: string;
  ecosystemType: EcosystemType;
};

type ProductSource = {
  ecosystemType?: unknown;
  hero?: { desktop?: unknown; mobile?: unknown };
};

function literalHttpsUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return undefined;
  try {
    return new URL(value).protocol === "https:" ? value : undefined;
  } catch {
    return undefined;
  }
}

export function findPartnerProductSiteId(
  businessSiteId: string,
  targets: PartnerPublishingTargetIdentity[]
) {
  const business = targets.find((target) =>
    target.siteId === businessSiteId && target.ecosystemType === "BUSINESS"
  );
  if (!business) return null;

  return targets.find((target) =>
    target.ownerKey === business.ownerKey && target.ecosystemType === "PRODUCT"
  )?.siteId ?? null;
}

export function extractProductHero(source: ProductSource | null) {
  if (!source || (source.ecosystemType !== undefined && source.ecosystemType !== "PRODUCT")) return {};
  return {
    desktop: literalHttpsUrl(source.hero?.desktop),
    mobile: literalHttpsUrl(source.hero?.mobile)
  };
}
