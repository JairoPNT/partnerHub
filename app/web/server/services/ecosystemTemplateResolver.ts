import { resolve } from "node:path";

export const ECOSYSTEM_TYPES = ["PRODUCT", "BUSINESS", "PERSONAL_BRAND"] as const;
export type EcosystemType = (typeof ECOSYSTEM_TYPES)[number];

export const MASTER_SITE_IDS: Record<EcosystemType, string> = {
  PRODUCT: "ganomaster",
  BUSINESS: "ganomaster-business",
  PERSONAL_BRAND: "ganomaster-personal-brand"
};

const CANONICAL_TEMPLATE_DIRECTORY_NAMES: Record<EcosystemType, string> = {
  PRODUCT: "producto",
  BUSINESS: "business",
  PERSONAL_BRAND: "personal-brand"
};

export function resolveCanonicalTemplateDirectory(
  productTemplateDirectory: string,
  ecosystemType: EcosystemType
) {
  const templatesRoot = resolve(productTemplateDirectory, "..");
  return resolve(templatesRoot, CANONICAL_TEMPLATE_DIRECTORY_NAMES[ecosystemType]);
}

export function resolveMasterTemplateSiteId(
  ecosystemType: EcosystemType,
  requestedMasterSiteId?: string
) {
  const expectedMasterSiteId = MASTER_SITE_IDS[ecosystemType];

  if (requestedMasterSiteId && requestedMasterSiteId !== expectedMasterSiteId) {
    throw new Error(
      `Master ${requestedMasterSiteId} belongs to another ecosystem; ${ecosystemType} requires ${expectedMasterSiteId}.`
    );
  }

  return expectedMasterSiteId;
}
