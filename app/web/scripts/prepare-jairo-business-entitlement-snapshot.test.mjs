import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { OPERATOR_EXPORT_MODE, prepareJairoBusinessEntitlementSnapshot, SERVICE_TOKEN_MODE } from "./prepare-jairo-business-entitlement-snapshot.mjs";

const entitlement = () => ({ rootRedirectApex: { isPublishingTarget: false, preserved: true }, expectedTargets: [{ publicHost: "negocio.jairopinto.pro", role: "SUBDOMAIN", ecosystemType: "BUSINESS" }],
  includedEcosystems: ["PRODUCT", "BUSINESS", "PERSONAL_BRAND"], commercialState: "KNOWN", activationLeadId: "f403f29e-95c8-4825-9320-967376443020" });
const response = (body, status = 200, contentType = "application/json") => ({ status, headers: { get: (name) => name.toLowerCase() === "content-type" ? contentType : null }, text: async () => body });
async function root() { return mkdtemp(resolve(tmpdir(), "entitlement-snapshot-")); }
test("service token uses only supported headers and persists no secret or cookie", async () => { const directory = await root(); let request;
  const result = await prepareJairoBusinessEntitlementSnapshot({ mode: SERVICE_TOKEN_MODE, outputDirectory: resolve(directory, "stage"), endpoint: "https://app.partnerhub.club/api/internal/partner-ecosystem-entitlement?x=1",
    environment: { CF_ACCESS_CLIENT_ID: "client-id", CF_ACCESS_CLIENT_SECRET: "client-secret" }, fetchImplementation: async (url, init) => { request = { url: String(url), init }; return response(JSON.stringify(entitlement())); } });
  assert.equal(request.init.redirect, "manual"); assert.equal(request.init.headers["CF-Access-Client-Id"], "client-id"); assert.equal(request.init.headers["CF-Access-Client-Secret"], "client-secret"); assert.equal("Cookie" in request.init.headers, false);
  const persisted = await readFile(result.entitlementPath, "utf8"); assert.equal(persisted.includes("client-secret"), false); assert.equal(JSON.stringify(result).includes("client-secret"), false); assert.equal(result.security.cookiesUsed, false); });
test("service token redirect, non-json and missing credentials fail closed", async () => { const one = await root(); await assert.rejects(() => prepareJairoBusinessEntitlementSnapshot({ mode: SERVICE_TOKEN_MODE,
  outputDirectory: resolve(one, "stage"), endpoint: "https://app.partnerhub.club/x", environment: {}, fetchImplementation: async () => response("") }), /SERVICE_TOKEN_CONFIGURATION_MISSING/);
  const two = await root(); await assert.rejects(() => prepareJairoBusinessEntitlementSnapshot({ mode: SERVICE_TOKEN_MODE, outputDirectory: resolve(two, "stage"), endpoint: "https://app.partnerhub.club/x",
    environment: { CF_ACCESS_CLIENT_ID: "id", CF_ACCESS_CLIENT_SECRET: "secret" }, fetchImplementation: async () => response("", 302, "text/html") }), /SERVICE_TOKEN_HTTP_302/); });
test("operator export is canonicalized and validated without Access cookies", async () => { const directory = await root(); const input = resolve(directory, "browser-export.json"); await writeFile(input, JSON.stringify(entitlement()));
  const result = await prepareJairoBusinessEntitlementSnapshot({ mode: OPERATOR_EXPORT_MODE, outputDirectory: resolve(directory, "stage"), operatorExportPath: input });
  assert.equal(result.authentication, "OPERATOR_AUTHENTICATED_BROWSER_EXPORT"); assert.equal(result.security.bindingCookieCopied, false); assert.match(await readFile(result.entitlementPath, "utf8"), /^\{\n {2}"activationLeadId"/); });
test("wrong partner or Business target blocks before snapshot", async () => { const directory = await root(); const input = resolve(directory, "bad.json"); await writeFile(input, JSON.stringify({ ...entitlement(), activationLeadId: "00000000-0000-4000-8000-000000000000" }));
  await assert.rejects(() => prepareJairoBusinessEntitlementSnapshot({ mode: OPERATOR_EXPORT_MODE, outputDirectory: resolve(directory, "stage"), operatorExportPath: input }), /BUSINESS_ENTITLEMENT_IDENTITY_INVALID/); });
test("existing output, nonempty staging and foreign residue are never overwritten", async () => { const directory = await root(); const input = resolve(directory, "export.json"); await writeFile(input, JSON.stringify(entitlement())); const stage = resolve(directory, "stage"); await mkdir(stage); await writeFile(resolve(stage, "foreign"), "x");
  await assert.rejects(() => prepareJairoBusinessEntitlementSnapshot({ mode: OPERATOR_EXPORT_MODE, outputDirectory: stage, operatorExportPath: input }), /STAGING_ALREADY_EXISTS/);
  await assert.rejects(() => prepareJairoBusinessEntitlementSnapshot({ mode: OPERATOR_EXPORT_MODE, outputDirectory: stage, operatorExportPath: input, resumeEmptyStaging: true }), /STAGING_NOT_EMPTY/); });
test("explicit resume accepts only a verified empty staging directory", async () => { const directory = await root(); const input = resolve(directory, "export.json"); await writeFile(input, JSON.stringify(entitlement())); const stage = resolve(directory, "stage"); await mkdir(stage);
  const result = await prepareJairoBusinessEntitlementSnapshot({ mode: OPERATOR_EXPORT_MODE, outputDirectory: stage, operatorExportPath: input, resumeEmptyStaging: true }); assert.equal(result.outcome, "SNAPSHOT_READY");
  await assert.rejects(() => prepareJairoBusinessEntitlementSnapshot({ mode: OPERATOR_EXPORT_MODE, outputDirectory: stage, operatorExportPath: input, resumeEmptyStaging: true }), /ENTITLEMENT_OUTPUT_COLLISION/); });
