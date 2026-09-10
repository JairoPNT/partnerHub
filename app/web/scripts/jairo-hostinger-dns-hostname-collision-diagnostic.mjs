import process from "node:process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const REQUEST_ID = "CDX-20260825-008";
const ZONE = "jairopinto.pro";
const EXPECTED_HOSTNAME = "negocio.jairopinto.pro";
const DEFAULT_BASE_URL = "https://developers.hostinger.com";

function normalizeBaseUrl(value) {
  const parsed = new globalThis.URL(value?.trim() || DEFAULT_BASE_URL);
  if (parsed.protocol !== "https:") throw new Error("HOSTINGER_API_BASE_URL_INVALID");
  return parsed.toString().replace(/\/$/, "");
}

function fqdn(name) {
  if (name === "@") return ZONE;
  return name.endsWith(`.${ZONE}`) ? name : `${name}.${ZONE}`;
}

function summarize(value) {
  if (!Array.isArray(value)) return { zoneShapeValid: false };
  const valid = value.every((entry) => entry && typeof entry.name === "string" && typeof entry.type === "string" && Array.isArray(entry.records));
  if (!valid) return { zoneShapeValid: false };
  const matching = value.filter((entry) => fqdn(entry.name.trim().toLowerCase()) === EXPECTED_HOSTNAME);
  const entries = matching.map((entry) => ({
    type: entry.type.trim().toUpperCase(),
    enabledRecords: entry.records.filter((record) => record?.is_disabled !== true).length,
    disabledRecords: entry.records.filter((record) => record?.is_disabled === true).length,
  })).sort((left, right) => left.type.localeCompare(right.type));
  const enabledTypes = [...new Set(entries.filter((entry) => entry.enabledRecords > 0).map((entry) => entry.type))].sort();
  return {
    zoneShapeValid: true,
    matchingEntries: entries.length,
    entries,
    enabledTypes,
    hostnameOccupied: entries.some((entry) => entry.enabledRecords > 0),
    hostnameOccupiedByNonARecord: entries.some((entry) => entry.type !== "A" && entry.enabledRecords > 0),
    secretsExposed: false,
    recordContentsExposed: false,
  };
}

function classify(status) {
  if (status === 200) return "OK";
  if (status === 401 || status === 403) return "AUTH_REJECTED";
  if (status === 404) return "ZONE_NOT_ACCESSIBLE";
  if (status === 429) return "RATE_LIMITED";
  if (status >= 500) return "PROVIDER_ERROR";
  return "HTTP_ERROR";
}

export async function diagnoseHostnameCollision({ fetchImplementation = globalThis.fetch, env = process.env } = {}) {
  const token = env.HOSTINGER_API_TOKEN?.trim();
  if (!token) throw new Error("HOSTINGER_API_TOKEN_MISSING");
  const baseUrl = normalizeBaseUrl(env.HOSTINGER_API_BASE_URL);
  const base = {
    requestId: REQUEST_ID,
    mode: "READ_ONLY_HOSTNAME_COLLISION_DIAGNOSTIC",
    changed: false,
    providerCall: "GET_ONLY",
    writesMade: false,
    secretsExposed: false,
    recordContentsExposed: false,
  };
  if (baseUrl !== DEFAULT_BASE_URL) return { ...base, providerCall: "NONE", category: "BASE_URL_MISMATCH", httpStatus: null };

  let response;
  try {
    response = await fetchImplementation(`${baseUrl}/api/dns/v1/zones/${ZONE}`, {
      method: "GET",
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      redirect: "manual",
      signal: globalThis.AbortSignal.timeout(15_000),
    });
  } catch {
    return { ...base, category: "NETWORK_ERROR", httpStatus: null };
  }
  const category = classify(response.status);
  if (response.status !== 200) {
    response.body?.cancel().catch(() => {});
    return { ...base, category, httpStatus: response.status };
  }
  let value;
  try {
    value = await response.json();
  } catch {
    return { ...base, category: "INVALID_JSON", httpStatus: 200, zoneShapeValid: false };
  }
  const summary = summarize(value);
  return { ...base, category: summary.zoneShapeValid ? "OK" : "INVALID_ZONE_SHAPE", httpStatus: 200, ...summary };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  diagnoseHostnameCollision()
    .then((result) => process.stdout.write(`${JSON.stringify(result, null, 2)}\n`))
    .catch((error) => {
      process.stderr.write(`${JSON.stringify({ requestId: REQUEST_ID, error: error.message, secretsExposed: false, writesMade: false })}\n`);
      process.exitCode = 1;
    });
}

