import assert from "node:assert/strict";
import test from "node:test";

import { validateHostingerDnsPayload } from "./jairo-hostinger-dns-payload-validation.mjs";

const token = "test-token-not-for-production";
const env = { HOSTINGER_API_TOKEN: token, HOSTINGER_API_BASE_URL: "https://developers.hostinger.com" };
const response = (status, body = {}) => new globalThis.Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json" }
});

test("validates the exact approved payload through Hostinger's non-mutating endpoint", async () => {
  let call;
  const result = await validateHostingerDnsPayload({
    env,
    fetchImplementation: async (input, init) => {
      call = { input: String(input), init };
      return response(200);
    }
  });
  assert.equal(call.input, "https://developers.hostinger.com/api/dns/v1/zones/jairopinto.pro/validate");
  assert.equal(call.init.method, "POST");
  assert.deepEqual(JSON.parse(String(call.init.body)), {
    overwrite: false,
    zone: [{ type: "A", name: "negocio", records: [{ content: "82.29.157.103" }], ttl: 300 }]
  });
  assert.equal(call.init.headers.Authorization, `Bearer ${token}`);
  assert.equal(result.category, "PAYLOAD_VALID");
  assert.equal(result.writesMade, false);
  assert.equal(JSON.stringify(result).includes(token), false);
});

test("classifies validation, authorization and provider failures without reading their body", async () => {
  for (const [status, category] of [[422, "PAYLOAD_REJECTED"], [403, "AUTH_REJECTED"], [404, "ZONE_NOT_ACCESSIBLE"], [429, "RATE_LIMITED"], [500, "PROVIDER_ERROR"]]) {
    const result = await validateHostingerDnsPayload({ env, fetchImplementation: async () => response(status, { sensitive: "not-returned" }) });
    assert.equal(result.category, category);
    assert.equal(JSON.stringify(result).includes("not-returned"), false);
  }
});

test("fails closed for missing token, network errors and a non-official base URL", async () => {
  await assert.rejects(() => validateHostingerDnsPayload({ env: {}, fetchImplementation: async () => response(200) }), /HOSTINGER_API_TOKEN_MISSING/);
  const network = await validateHostingerDnsPayload({ env, fetchImplementation: async () => { throw new Error("network"); } });
  assert.equal(network.category, "NETWORK_ERROR");
  let called = false;
  const mismatch = await validateHostingerDnsPayload({
    env: { ...env, HOSTINGER_API_BASE_URL: "https://example.invalid" },
    fetchImplementation: async () => { called = true; return response(200); }
  });
  assert.equal(called, false);
  assert.equal(mismatch.category, "BASE_URL_MISMATCH");
  assert.equal(mismatch.providerCall, "NONE");
});
