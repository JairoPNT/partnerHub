import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  JAIRO_BUSINESS_ENTITLEMENT_ENDPOINT,
  readFreshJairoBusinessEntitlement,
} from "./jairo-business-fresh-entitlement.mjs";

const activationLeadId = "f403f29e-95c8-4825-9320-967376443020";
const credentials = { CF_ACCESS_CLIENT_ID: " client-id ", CF_ACCESS_CLIENT_SECRET: " test-secret " };
const entitlement = () => ({
  rootRedirectApex: { preserved: true, isPublishingTarget: false },
  expectedTargets: [{ publicHost: "negocio.jairopinto.pro", role: "SUBDOMAIN", ecosystemType: "BUSINESS" }],
  includedEcosystems: ["PRODUCT", "BUSINESS"],
  commercialState: "KNOWN",
  activationLeadId,
});
const response = (value, status = 200, contentType = "application/json; charset=utf-8") => ({
  status,
  headers: { get: (name) => name.toLowerCase() === "content-type" ? contentType : null },
  text: async () => JSON.stringify(value),
});

test("reads only the compiled entitlement with Access headers and returns canonical, redacted data", async () => {
  let request;
  const result = await readFreshJairoBusinessEntitlement({
    environment: credentials,
    fetchImplementation: async (url, init) => {
      request = { url: String(url), init };
      return response(entitlement());
    },
  });
  assert.equal(request.url, `https://app.partnerhub.club/api/internal/partner-ecosystem-entitlement?activationLeadId=${activationLeadId}`);
  assert.equal(request.url, JAIRO_BUSINESS_ENTITLEMENT_ENDPOINT);
  assert.deepEqual(request.init, {
    method: "GET", redirect: "manual",
    headers: { Accept: "application/json", "CF-Access-Client-Id": "client-id", "CF-Access-Client-Secret": "test-secret" },
  });
  const expected = `{"activationLeadId":"${activationLeadId}","commercialState":"KNOWN","expectedTargets":[{"ecosystemType":"BUSINESS","publicHost":"negocio.jairopinto.pro","role":"SUBDOMAIN"}],"includedEcosystems":["PRODUCT","BUSINESS"],"rootRedirectApex":{"isPublishingTarget":false,"preserved":true}}`;
  const canonicalText = `${JSON.stringify(JSON.parse(expected), null, 2)}\n`;
  assert.ok(Buffer.isBuffer(result.canonicalBytes));
  assert.equal(result.canonicalBytes.toString("utf8"), canonicalText);
  assert.equal(result.sha256, createHash("sha256").update(Buffer.from(canonicalText)).digest("hex"));
  assert.deepEqual(result.identity, { activationLeadId, businessPublicHost: "negocio.jairopinto.pro", businessEntitled: true });
  assert.equal(result.canonicalBytes.includes("test-secret"), false);
  assert.equal(JSON.stringify(result.identity).includes("test-secret"), false);
});

test("missing Access credentials fail before fetch", async () => {
  let called = false;
  await assert.rejects(
    readFreshJairoBusinessEntitlement({ environment: { CF_ACCESS_CLIENT_ID: "id" }, fetchImplementation: async () => { called = true; return response(entitlement()); } }),
    { code: "SERVICE_TOKEN_CONFIGURATION_MISSING" },
  );
  assert.equal(called, false);
});

test("redirects fail closed with the HTTP status code", async () => {
  await assert.rejects(
    readFreshJairoBusinessEntitlement({ environment: credentials, fetchImplementation: async () => response({}, 302, "text/html") }),
    { code: "SERVICE_TOKEN_HTTP_302" },
  );
});

test("non-JSON content type fails closed", async () => {
  await assert.rejects(
    readFreshJairoBusinessEntitlement({ environment: credentials, fetchImplementation: async () => response(entitlement(), 200, "text/html") }),
    { code: "SERVICE_TOKEN_RESPONSE_NOT_JSON" },
  );
});

test("a lookalike content type is not accepted as JSON", async () => {
  await assert.rejects(
    readFreshJairoBusinessEntitlement({ environment: credentials, fetchImplementation: async () => response(entitlement(), 200, "text/not-application/json") }),
    { code: "SERVICE_TOKEN_RESPONSE_NOT_JSON" },
  );
});

test("invalid JSON body fails with the stable response code", async () => {
  await assert.rejects(
    readFreshJairoBusinessEntitlement({ environment: credentials, fetchImplementation: async () => ({
      status: 200, headers: { get: () => "application/json" }, text: async () => "not json",
    }) }),
    { code: "SERVICE_TOKEN_RESPONSE_NOT_JSON" },
  );
});

test("invalid Business identity fails closed", async () => {
  await assert.rejects(
    readFreshJairoBusinessEntitlement({ environment: credentials, fetchImplementation: async () => response({ ...entitlement(), rootRedirectApex: { preserved: false, isPublishingTarget: false } }) }),
    { code: "BUSINESS_ENTITLEMENT_IDENTITY_INVALID" },
  );
});

test("malformed entitlement collections return the stable identity error", async () => {
  await assert.rejects(
    readFreshJairoBusinessEntitlement({ environment: credentials, fetchImplementation: async () => response({ ...entitlement(), expectedTargets: {} }) }),
    { code: "BUSINESS_ENTITLEMENT_IDENTITY_INVALID" },
  );
});
