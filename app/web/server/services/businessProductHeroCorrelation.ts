export { extractProductHero } from "../../shared/business-vsl-poster-contract.mjs";

type EcosystemType = "PRODUCT" | "BUSINESS" | "PERSONAL_BRAND";

export type PartnerPublishingTargetIdentity = {
  ownerKey: string;
  siteId: string;
  ecosystemType: EcosystemType;
};

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
