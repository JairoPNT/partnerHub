import { createHash } from "node:crypto";

const ACTIVATION_LEAD_ID = "f403f29e-95c8-4825-9320-967376443020";
const BUSINESS_PUBLIC_HOST = "negocio.jairopinto.pro";

export const JAIRO_BUSINESS_ENTITLEMENT_ENDPOINT =
  "https://app.partnerhub.club/api/internal/partner-ecosystem-entitlement?activationLeadId=f403f29e-95c8-4825-9320-967376443020";

export class FreshEntitlementError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
}

export async function readFreshJairoBusinessEntitlement({
  environment = process.env,
  fetchImplementation = globalThis.fetch,
} = {}) {
  const clientId = environment.CF_ACCESS_CLIENT_ID?.trim();
  const clientSecret = environment.CF_ACCESS_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new FreshEntitlementError("SERVICE_TOKEN_CONFIGURATION_MISSING");

  const response = await fetchImplementation(new URL(JAIRO_BUSINESS_ENTITLEMENT_ENDPOINT), {
    method: "GET",
    redirect: "manual",
    headers: {
      Accept: "application/json",
      "CF-Access-Client-Id": clientId,
      "CF-Access-Client-Secret": clientSecret,
    },
  });
  if (response.status !== 200) throw new FreshEntitlementError(`SERVICE_TOKEN_HTTP_${response.status}`);
  if ((response.headers.get("content-type") ?? "").split(";", 1)[0].trim().toLowerCase() !== "application/json") {
    throw new FreshEntitlementError("SERVICE_TOKEN_RESPONSE_NOT_JSON");
  }

  let entitlement;
  try {
    entitlement = JSON.parse(await response.text());
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    throw new FreshEntitlementError("SERVICE_TOKEN_RESPONSE_NOT_JSON");
  }
  const business = Array.isArray(entitlement?.expectedTargets)
    ? entitlement.expectedTargets.find((target) => target?.ecosystemType === "BUSINESS")
    : undefined;
  if (entitlement?.activationLeadId !== ACTIVATION_LEAD_ID ||
      entitlement?.commercialState !== "KNOWN" ||
      !Array.isArray(entitlement?.includedEcosystems) ||
      !entitlement.includedEcosystems.includes("BUSINESS") ||
      business?.role !== "SUBDOMAIN" || business?.publicHost !== BUSINESS_PUBLIC_HOST ||
      entitlement?.rootRedirectApex?.preserved !== true ||
      entitlement?.rootRedirectApex?.isPublishingTarget !== false) {
    throw new FreshEntitlementError("BUSINESS_ENTITLEMENT_IDENTITY_INVALID");
  }

  const canonicalBytes = Buffer.from(`${JSON.stringify(canonical(entitlement), null, 2)}\n`);
  return {
    canonicalBytes,
    sha256: createHash("sha256").update(canonicalBytes).digest("hex"),
    identity: { activationLeadId: ACTIVATION_LEAD_ID, businessPublicHost: BUSINESS_PUBLIC_HOST, businessEntitled: true },
  };
}
