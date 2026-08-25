import { createHash } from "node:crypto";
import process from "node:process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const REQUEST_ID = "CDX-20260825-006";
const ZONE = "jairopinto.pro";
const RECORD_NAME = "negocio";
const EXPECTED_IPV4 = "82.29.157.103";
const DEFAULT_BASE_URL = "https://developers.hostinger.com";

const payload = {
  overwrite: false,
  zone: [{ type: "A", name: RECORD_NAME, records: [{ content: EXPECTED_IPV4 }], ttl: 300 }]
};
const payloadBytes = JSON.stringify(payload);
const payloadSha256 = createHash("sha256").update(payloadBytes).digest("hex");

function classifyStatus(status) {
  if (status === 200) return "PAYLOAD_VALID";
  if (status === 401 || status === 403) return "AUTH_REJECTED";
  if (status === 404) return "ZONE_NOT_ACCESSIBLE";
  if (status === 422) return "PAYLOAD_REJECTED";
  if (status === 429) return "RATE_LIMITED";
  if (status >= 500) return "PROVIDER_ERROR";
  return "HTTP_ERROR";
}

function normalizeBaseUrl(value) {
  const parsed = new globalThis.URL(value?.trim() || DEFAULT_BASE_URL);
  if (parsed.protocol !== "https:") throw new Error("HOSTINGER_API_BASE_URL_INVALID");
  return parsed.toString().replace(/\/$/, "");
}

export async function validateHostingerDnsPayload({ fetchImplementation = globalThis.fetch, env = process.env } = {}) {
  const token = env.HOSTINGER_API_TOKEN?.trim();
  if (!token) throw new Error("HOSTINGER_API_TOKEN_MISSING");
  const baseUrl = normalizeBaseUrl(env.HOSTINGER_API_BASE_URL);
  const base = {
    requestId: REQUEST_ID,
    mode: "NON_MUTATING_PROVIDER_VALIDATION",
    changed: false,
    payloadSha256,
    secretsExposed: false,
    writesMade: false
  };
  if (baseUrl !== DEFAULT_BASE_URL) {
    return {
      ...base,
      providerCall: "NONE",
      category: "BASE_URL_MISMATCH",
      httpStatus: null,
      configuredBaseUrlMatchesOfficial: false
    };
  }

  const endpoint = `${baseUrl}/api/dns/v1/zones/${ZONE}/validate`;
  let response;
  try {
    response = await fetchImplementation(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: payloadBytes,
      redirect: "manual",
      signal: globalThis.AbortSignal.timeout(15_000)
    });
  } catch {
    return {
      ...base,
      providerCall: "POST_VALIDATE_ONLY",
      category: "NETWORK_ERROR",
      httpStatus: null,
      configuredBaseUrlMatchesOfficial: true
    };
  }

  const contentType = response.headers.get("content-type") ?? "";
  const result = {
    ...base,
    providerCall: "POST_VALIDATE_ONLY",
    category: classifyStatus(response.status),
    httpStatus: response.status,
    configuredBaseUrlMatchesOfficial: true,
    responseIsJson: /^application\/json(?:;|$)/i.test(contentType)
  };
  response.body?.cancel().catch(() => {});
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  validateHostingerDnsPayload()
    .then((result) => process.stdout.write(`${JSON.stringify(result, null, 2)}\n`))
    .catch((error) => {
      process.stderr.write(`${JSON.stringify({ requestId: REQUEST_ID, error: error.message, secretsExposed: false, writesMade: false })}\n`);
      process.exitCode = 1;
    });
}
