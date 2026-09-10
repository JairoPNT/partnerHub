export type PartnerHostnameEcosystem = "PRODUCT" | "BUSINESS" | "PERSONAL_BRAND";

export const PARTNER_HOST_LABELS: Record<PartnerHostnameEcosystem, string> = {
  PRODUCT: "producto",
  BUSINESS: "negocio",
  PERSONAL_BRAND: "brand"
};

export const PARTNER_SUBDOMAIN_SLUGS: Record<Exclude<PartnerHostnameEcosystem, "PERSONAL_BRAND">, string> = {
  PRODUCT: "producto",
  BUSINESS: "negocio"
};

export type PartnerRouteResolution = {
  requestedHost: string;
  canonicalHost: string;
  action: "SERVE" | "REDIRECT";
  ecosystemType: PartnerHostnameEcosystem;
};

const PARTNER_ROUTE_ECOSYSTEMS: readonly PartnerHostnameEcosystem[] = ["PRODUCT", "BUSINESS", "PERSONAL_BRAND"];
const HOSTNAME_PATTERN = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

function assertHostname(host: string, fieldName: string) {
  if (typeof host !== "string" || !HOSTNAME_PATTERN.test(host)) {
    throw new Error(`${fieldName} must be a valid lowercase hostname`);
  }
}

function assertPartnerRouteEcosystem(ecosystemType: string): asserts ecosystemType is PartnerHostnameEcosystem {
  if (!PARTNER_ROUTE_ECOSYSTEMS.includes(ecosystemType as PartnerHostnameEcosystem)) {
    throw new Error(`Unknown partner route ecosystem: ${ecosystemType}`);
  }
}

export function getPartnerCanonicalPublicHost(
  baseDomain: string,
  ecosystemType: PartnerHostnameEcosystem,
  rootEcosystemType: PartnerHostnameEcosystem
) {
  assertHostname(baseDomain, "baseDomain");
  assertPartnerRouteEcosystem(ecosystemType);
  assertPartnerRouteEcosystem(rootEcosystemType);

  if (ecosystemType === "PERSONAL_BRAND") {
    if (rootEcosystemType !== "PERSONAL_BRAND") {
      throw new Error("PERSONAL_BRAND can only use the apex as the root ecosystem");
    }
    return baseDomain;
  }

  return `${PARTNER_HOST_LABELS[ecosystemType]}.${baseDomain}`;
}

export function resolvePartnerRoute({
  baseDomain,
  requestedHost,
  activeEcosystems
}: {
  baseDomain: string;
  requestedHost: string;
  activeEcosystems: readonly PartnerHostnameEcosystem[];
}): PartnerRouteResolution {
  assertHostname(baseDomain, "baseDomain");
  assertHostname(requestedHost, "requestedHost");

  if (activeEcosystems.length === 0) {
    throw new Error("activeEcosystems must not be empty");
  }

  const activeEcosystemSet = new Set<PartnerHostnameEcosystem>();
  for (const ecosystemType of activeEcosystems) {
    assertPartnerRouteEcosystem(ecosystemType);
    if (activeEcosystemSet.has(ecosystemType)) {
      throw new Error(`Duplicate active ecosystem: ${ecosystemType}`);
    }
    activeEcosystemSet.add(ecosystemType);
  }

  const requestedEcosystemType = requestedHost === baseDomain
    ? "PERSONAL_BRAND"
    : (Object.entries(PARTNER_SUBDOMAIN_SLUGS).find(([, slug]) => requestedHost === `${slug}.${baseDomain}`)?.[0] as PartnerHostnameEcosystem | undefined);

  if (!requestedEcosystemType) {
    throw new Error("requestedHost must be the apex or an allowlisted partner subdomain");
  }

  const resolvedEcosystemType = (["PERSONAL_BRAND", "BUSINESS", "PRODUCT"] as const)
    .find((ecosystemType) => activeEcosystemSet.has(ecosystemType));

  if (!resolvedEcosystemType) {
    throw new Error("activeEcosystems must contain a known ecosystem");
  }

  const canonicalHost = getPartnerCanonicalPublicHost(baseDomain, resolvedEcosystemType, resolvedEcosystemType);

  return {
    requestedHost,
    canonicalHost,
    action: requestedHost === canonicalHost ? "SERVE" : "REDIRECT",
    ecosystemType: resolvedEcosystemType
  };
}

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
