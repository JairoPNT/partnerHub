export type PartnerHostnameEcosystem = "PRODUCT" | "BUSINESS" | "PERSONAL_BRAND";

export const PARTNER_HOST_LABELS: Record<PartnerHostnameEcosystem, string> = {
  PRODUCT: "producto",
  BUSINESS: "negocio",
  PERSONAL_BRAND: "brand"
};

export const CANONICAL_MASTER_HOSTS: Record<PartnerHostnameEcosystem, string> = {
  PRODUCT: "producto.ganomaster.pro",
  BUSINESS: "negocio.ganomaster.pro",
  PERSONAL_BRAND: "brand.ganomaster.pro"
};

export const LEGACY_MASTER_HOST_ALIASES: Partial<Record<PartnerHostnameEcosystem, string>> = {
  PRODUCT: "product.ganomaster.pro",
  BUSINESS: "business.ganomaster.pro"
};

export function getCompatibleMasterHosts(ecosystemType: PartnerHostnameEcosystem) {
  return [CANONICAL_MASTER_HOSTS[ecosystemType], LEGACY_MASTER_HOST_ALIASES[ecosystemType]]
    .filter((host): host is string => Boolean(host));
}

export function getPartnerPublicHost(baseDomain: string, ecosystemType: PartnerHostnameEcosystem) {
  return `${PARTNER_HOST_LABELS[ecosystemType]}.${baseDomain}`;
}
