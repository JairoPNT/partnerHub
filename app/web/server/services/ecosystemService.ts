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

export function normalizeEcosystemType(value: unknown): EcosystemType {
  const parsed = ecosystemTypeSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_ECOSYSTEM_TYPE;
}

export function getMasterSiteId(ecosystemType?: unknown) {
  return MASTER_SITE_IDS[normalizeEcosystemType(ecosystemType)];
}

export function isMasterSiteId(siteId: string) {
  return Object.values(MASTER_SITE_IDS).includes(siteId);
}
