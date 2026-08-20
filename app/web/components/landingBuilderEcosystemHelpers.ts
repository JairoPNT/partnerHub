export type EcosystemType = "PRODUCT" | "BUSINESS" | "PERSONAL_BRAND";

export interface PartnerEntitlementData {
  activationLeadId: string;
  commercialState: "KNOWN" | "UNKNOWN";
  offerCode: string | null;
  includedEcosystems: EcosystemType[];
  rootEcosystem: EcosystemType | null;
  rootRedirectTarget: { ecosystemType: EcosystemType; publicHost: string } | null;
  expectedTargets: Array<{ ecosystemType: EcosystemType; role: string; publicHost: string | null }>;
  existingTargets: Array<{ ownerKey: string; siteId: string; ecosystemType: EcosystemType; baseDomain: string; publicHost: string; provisioningState: string; publicationState: string }>;
  missingTargets: Array<{ ecosystemType: EcosystemType; role: string; publicHost: string | null }>;
  regenerationRequired: boolean;
  regenerationReasons: string[];
}

export interface EcosystemConfig {
  type: EcosystemType;
  name: string;
  label: string;
  masterDomain: string;
  canonicalSubdomainPrefix: string;
  desc: string;
}

export const ECOSYSTEM_CONFIGS: Record<EcosystemType, EcosystemConfig> = {
  PRODUCT: {
    type: "PRODUCT",
    name: "Producto",
    label: "Landing de Producto",
    masterDomain: "product.partner.pro",
    canonicalSubdomainPrefix: "product",
    desc: "Landing focalizada en catálogo de productos Ganoderma"
  },
  BUSINESS: {
    type: "BUSINESS",
    name: "Negocio VSL",
    label: "Negocio y VSL",
    masterDomain: "negocio.partner.pro",
    canonicalSubdomainPrefix: "negocio",
    desc: "Embudos VSL de oportunidad de negocio"
  },
  PERSONAL_BRAND: {
    type: "PERSONAL_BRAND",
    name: "Marca Personal",
    label: "Marca del Líder",
    masterDomain: "brand.partner.pro",
    canonicalSubdomainPrefix: "brand",
    desc: "Posicionamiento de marca personal e historia del líder"
  }
};

export function isEcosystemEntitledForPartner(
  ecosystemType: EcosystemType,
  entitlement: PartnerEntitlementData | null
): boolean {
  if (!entitlement) {
    return ecosystemType === "PRODUCT";
  }
  return entitlement.includedEcosystems.includes(ecosystemType);
}

export function getCanonicalHostForEcosystem(
  ecosystemType: EcosystemType,
  domain?: string | null
): string {
  const prefix = ECOSYSTEM_CONFIGS[ecosystemType].canonicalSubdomainPrefix;
  if (!domain || !domain.trim()) {
    return `${prefix}.[dominio]`;
  }
  const cleanDomain = domain.trim().toLowerCase();
  return `${prefix}.${cleanDomain}`;
}

export function getDefaultSelectedEcosystem(
  entitlement: PartnerEntitlementData | null
): EcosystemType {
  if (!entitlement || entitlement.includedEcosystems.length === 0) {
    return "PRODUCT";
  }
  return entitlement.includedEcosystems[0];
}
