import type { EcosystemType } from "@/server/services/ecosystemTemplateResolver";

export function requiresProductCommerceVerification(ecosystemType: EcosystemType) {
  return ecosystemType === "PRODUCT";
}
