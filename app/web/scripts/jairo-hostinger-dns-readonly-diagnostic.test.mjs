import assert from "node:assert/strict";
import test from "node:test";

import { diagnoseHostingerDns } from "./jairo-hostinger-dns-readonly-diagnostic.mjs";

const token = "must-never-appear";
const env = { HOSTINGER_API_TOKEN: token };
const jsonResponse = (body, status = 200) => new globalThis.Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });

test("uses the exact GET-only Hostinger zone endpoint and summarizes the expected record", async () => {
  let call;
  const result = await diagnoseHostingerDns({ env, fetchImplementation: async (input, init) => {
    call = { input: String(input), init };
    return jsonResponse([{ name: "negocio", type: "A", records: [{ content: "82.29.157.103", is_disabled: false }] }]);
  } });
  assert.equal(call.input, "https://developers.hostinger.com/api/dns/v1/zones/jairopinto.pro");
  assert.equal(call.init.method, "GET");
  assert.equal(call.init.headers.Authorization, `Bearer ${token}`);
  assert.equal(result.category, "OK");
  assert.equal(result.expectedRecordPresent, true);
  assert.equal(result.expectedIpv4Present, true);
  assert.equal(result.writesMade, false);
  assert.equal(JSON.stringify(result).includes(token), false);
});

test("classifies authentication rejection without reading or leaking the response body", async () => {
  const result = await diagnoseHostingerDns({ env, fetchImplementation: async () => new globalThis.Response("sensitive provider body", { status: 401, headers: { "Content-Type": "text/plain" } }) });
  assert.equal(result.category, "AUTH_REJECTED");
  assert.equal(result.httpStatus, 401);
  assert.equal(JSON.stringify(result).includes("sensitive"), false);
  assert.equal(JSON.stringify(result).includes(token), false);
});

test("classifies an inaccessible zone and rate limiting", async () => {
  const notFound = await diagnoseHostingerDns({ env, fetchImplementation: async () => jsonResponse({ error: "hidden" }, 404) });
  const limited = await diagnoseHostingerDns({ env, fetchImplementation: async () => jsonResponse({ error: "hidden" }, 429) });
  assert.equal(notFound.category, "ZONE_NOT_ACCESSIBLE");
  assert.equal(limited.category, "RATE_LIMITED");
});

test("rejects invalid JSON and unexpected successful zone shapes", async () => {
  const invalidJson = await diagnoseHostingerDns({ env, fetchImplementation: async () => new globalThis.Response("not-json", { status: 200, headers: { "Content-Type": "application/json" } }) });
  const invalidShape = await diagnoseHostingerDns({ env, fetchImplementation: async () => jsonResponse({ records: [] }) });
  assert.equal(invalidJson.category, "INVALID_JSON");
  assert.equal(invalidShape.category, "INVALID_ZONE_SHAPE");
});

test("reports network errors and fails closed when the token is absent", async () => {
  const network = await diagnoseHostingerDns({ env, fetchImplementation: async () => { throw new Error("network body must not leak"); } });
  assert.equal(network.category, "NETWORK_ERROR");
  await assert.rejects(() => diagnoseHostingerDns({ env: {}, fetchImplementation: async () => jsonResponse([]) }), /HOSTINGER_API_TOKEN_MISSING/);
});
