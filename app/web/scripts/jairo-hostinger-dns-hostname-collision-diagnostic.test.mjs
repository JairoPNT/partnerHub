import assert from "node:assert/strict";
import test from "node:test";

import { diagnoseHostnameCollision } from "./jairo-hostinger-dns-hostname-collision-diagnostic.mjs";

const env = { HOSTINGER_API_TOKEN: "secret" };
const response = (body, status = 200) => new globalThis.Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

test("reports an unoccupied hostname without exposing zone contents", async () => {
  const result = await diagnoseHostnameCollision({ env, fetchImplementation: async () => response([{ name: "@", type: "A", records: [{ content: "82.29.157.103" }] }]) });
  assert.equal(result.category, "OK");
  assert.equal(result.hostnameOccupied, false);
  assert.deepEqual(result.enabledTypes, []);
  assert.equal(JSON.stringify(result).includes("82.29.157.103"), false);
});

test("detects an enabled CNAME collision using only type and counts", async () => {
  const result = await diagnoseHostnameCollision({ env, fetchImplementation: async () => response([{ name: "negocio", type: "CNAME", records: [{ content: "example.invalid", is_disabled: false }] }]) });
  assert.equal(result.hostnameOccupied, true);
  assert.equal(result.hostnameOccupiedByNonARecord, true);
  assert.deepEqual(result.enabledTypes, ["CNAME"]);
  assert.deepEqual(result.entries, [{ type: "CNAME", enabledRecords: 1, disabledRecords: 0 }]);
  assert.equal(JSON.stringify(result).includes("example.invalid"), false);
});

test("distinguishes disabled and enabled records across matching types", async () => {
  const result = await diagnoseHostnameCollision({ env, fetchImplementation: async () => response([
    { name: "negocio.jairopinto.pro", type: "AAAA", records: [{ content: "::1", is_disabled: true }] },
    { name: "negocio", type: "TXT", records: [{ content: "redacted", is_disabled: false }] },
  ]) });
  assert.deepEqual(result.enabledTypes, ["TXT"]);
  assert.deepEqual(result.entries, [
    { type: "AAAA", enabledRecords: 0, disabledRecords: 1 },
    { type: "TXT", enabledRecords: 1, disabledRecords: 0 },
  ]);
});

test("classifies provider rejection without reading its body", async () => {
  const result = await diagnoseHostnameCollision({ env, fetchImplementation: async () => response({ token: "do-not-print" }, 403) });
  assert.equal(result.category, "AUTH_REJECTED");
  assert.equal(result.httpStatus, 403);
  assert.equal(JSON.stringify(result).includes("do-not-print"), false);
});
