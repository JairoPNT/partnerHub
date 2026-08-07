import "server-only";

import { z } from "zod";

export const ecosystemTypeSchema = z.enum(["PRODUCT", "BUSINESS", "PERSONAL_BRAND"]);
export type EcosystemType = z.infer<typeof ecosystemTypeSchema>;

export const DEFAULT_ECOSYSTEM_TYPE: EcosystemType = "PRODUCT";

export const MASTER_SITE_IDS: Record<EcosystemType, string> = {
  PRODUCT: "ganomaster",
  BUSINESS: "ganomaster-business",
  PERSONAL_BRAND: "ganomaster-personal-brand"
};

export const MASTER_SITE_DOMAINS: Record<EcosystemType, string> = {
  PRODUCT: "product.ganomaster.pro",
  BUSINESS: "business.ganomaster.pro",
  PERSONAL_BRAND: "brand.ganomaster.pro"
};

export const MASTER_SITE_DIRECTORY_NAMES: Record<EcosystemType, string> = {
  PRODUCT: "product",
  BUSINESS: "business",
  PERSONAL_BRAND: "brand"
};

export function normalizeEcosystemType(value: unknown): EcosystemType {
  const parsed = ecosystemTypeSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_ECOSYSTEM_TYPE;
}

export function getMasterSiteId(ecosystemType?: unknown) {
  return MASTER_SITE_IDS[normalizeEcosystemType(ecosystemType)];
}

export function getMasterSiteDomain(ecosystemType?: unknown) {
  return MASTER_SITE_DOMAINS[normalizeEcosystemType(ecosystemType)];
}

export function getMasterSiteDirectoryName(ecosystemType?: unknown) {
  return MASTER_SITE_DIRECTORY_NAMES[normalizeEcosystemType(ecosystemType)];
}

export function getMasterEcosystemType(siteId: string): EcosystemType | null {
  return ecosystemTypeSchema.options.find((type) => MASTER_SITE_IDS[type] === siteId) ?? null;
}

export function getMasterSiteDomainBySiteId(siteId: string): string | null {
  const ecosystemType = getMasterEcosystemType(siteId);
  return ecosystemType ? getMasterSiteDomain(ecosystemType) : null;
}

export function isMasterSiteId(siteId: string) {
  return Object.values(MASTER_SITE_IDS).includes(siteId);
}
