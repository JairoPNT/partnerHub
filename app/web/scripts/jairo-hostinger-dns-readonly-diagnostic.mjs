import process from "node:process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const REQUEST_ID = "CDX-20260825-005";
const ZONE = "jairopinto.pro";
const EXPECTED_HOSTNAME = "negocio.jairopinto.pro";
const EXPECTED_IPV4 = "82.29.157.103";
const DEFAULT_BASE_URL = "https://developers.hostinger.com";

function classifyStatus(status) {
  if (status === 200) return "OK";
  if (status === 401 || status === 403) return "AUTH_REJECTED";
  if (status === 404) return "ZONE_NOT_ACCESSIBLE";
  if (status === 422) return "REQUEST_REJECTED";
  if (status === 429) return "RATE_LIMITED";
  if (status >= 500) return "PROVIDER_ERROR";
  return "HTTP_ERROR";
}

function normalizeBaseUrl(value) {
  const parsed = new globalThis.URL(value?.trim() || DEFAULT_BASE_URL);
  if (parsed.protocol !== "https:") throw new Error("HOSTINGER_API_BASE_URL_INVALID");
  return parsed.toString().replace(/\/$/, "");
}

function summarizeZone(value) {
  if (!Array.isArray(value)) return { zoneShapeValid: false };
  const matchingEntries = value.filter((entry) => {
    if (!entry || entry.type !== "A" || typeof entry.name !== "string" || !Array.isArray(entry.records)) return false;
    const fqdn = entry.name === "@" ? ZONE : entry.name.endsWith(`.${ZONE}`) ? entry.name : `${entry.name}.${ZONE}`;
    return fqdn === EXPECTED_HOSTNAME;
  });
  const enabledContents = matchingEntries.flatMap((entry) => entry.records
    .filter((record) => record && record.is_disabled !== true && typeof record.content === "string")
    .map((record) => record.content));
  return {
    zoneShapeValid: value.every((entry) => entry && typeof entry.name === "string" && typeof entry.type === "string" && Array.isArray(entry.records)),
    expectedRecordEntries: matchingEntries.length,
    expectedRecordPresent: enabledContents.length > 0,
    expectedIpv4Present: enabledContents.includes(EXPECTED_IPV4),
    conflictingExpectedRecordPresent: enabledContents.some((content) => content !== EXPECTED_IPV4)
  };
}

export async function diagnoseHostingerDns({ fetchImplementation = globalThis.fetch, env = process.env } = {}) {
  const token = env.HOSTINGER_API_TOKEN?.trim();
  if (!token) throw new Error("HOSTINGER_API_TOKEN_MISSING");
  const baseUrl = normalizeBaseUrl(env.HOSTINGER_API_BASE_URL);
  const endpoint = `${baseUrl}/api/dns/v1/zones/${ZONE}`;
  let response;
  try {
    response = await fetchImplementation(endpoint, {
      method: "GET",
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      redirect: "manual",
      signal: globalThis.AbortSignal.timeout(15_000)
    });
  } catch {
    return {
      requestId: REQUEST_ID,
      mode: "READ_ONLY_PROVIDER_DIAGNOSTIC",
      changed: false,
      providerCall: "GET_ONLY",
      category: "NETWORK_ERROR",
      httpStatus: null,
      secretsExposed: false,
      writesMade: false
    };
  }

  const contentType = response.headers.get("content-type") ?? "";
  const category = classifyStatus(response.status);
  const base = {
    requestId: REQUEST_ID,
    mode: "READ_ONLY_PROVIDER_DIAGNOSTIC",
    changed: false,
    providerCall: "GET_ONLY",
    category,
    httpStatus: response.status,
    responseIsJson: /^application\/json(?:;|$)/i.test(contentType),
    secretsExposed: false,
    writesMade: false
  };
  if (response.status !== 200) {
    response.body?.cancel().catch(() => {});
    return base;
  }

  let value;
  try {
    value = await response.json();
  } catch {
    return { ...base, category: "INVALID_JSON", zoneShapeValid: false };
  }
  const zone = summarizeZone(value);
  return { ...base, category: zone.zoneShapeValid ? category : "INVALID_ZONE_SHAPE", ...zone };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  diagnoseHostingerDns()
    .then((result) => process.stdout.write(`${JSON.stringify(result, null, 2)}\n`))
    .catch((error) => {
      process.stderr.write(`${JSON.stringify({ requestId: REQUEST_ID, error: error.message, secretsExposed: false, writesMade: false })}\n`);
      process.exitCode = 1;
    });
}
