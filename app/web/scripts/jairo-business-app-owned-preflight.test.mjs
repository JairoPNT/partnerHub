import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { parseArguments, runAppOwnedJairoBusinessPreflight } from "./jairo-business-app-owned-preflight.mjs";

const SITE_ID = "jairo-pinto-business";
const HASH = "795ede8048a4d882960f08dc633de5ca0e58c810066c0e854e35fdf9531f8725";
const ENTITLEMENT = Buffer.from('{"activationLeadId":"f403f29e-95c8-4825-9320-967376443020","secret":"test-secret"}\n');
const SHA = createHash("sha256").update(ENTITLEMENT).digest("hex");
const expectedKeys = ["requestId", "mode", "changed", "status", "blockedReasons", "providerCallsMade", "secretsExposed"];

async function fixture(t) {
  const root = await mkdtemp(resolve(tmpdir(), "app-owned-preflight-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  return {
    scratchRoot: resolve(root, "output", ".app-owned-jairo-business-preflight"),
    environment: { PRODUCT_PAGE_SOURCE_DIR: resolve(root, "private-source-path"), PRODUCT_PAGE_OUTPUT_DIR: resolve(root, "output") },
  };
}

function readerResult() {
  return { canonicalBytes: ENTITLEMENT, sha256: SHA, identity: { secret: "test-secret" } };
}

test("non-allowlisted site runs neither reader nor preflight and creates no scratch root", async (t) => {
  const fx = await fixture(t);
  let readerCalls = 0;
  let preflightCalls = 0;
  const result = await runAppOwnedJairoBusinessPreflight({ siteId: "jairo-pinto", ...fx,
    reader: async () => { readerCalls++; throw new Error("reader called"); },
    preflight: async () => { preflightCalls++; throw new Error("preflight called"); } });
  assert.deepEqual(result, { requestId: "CDX-20260922-002", mode: "PREVIEW", changed: false, status: "BLOCKED",
    blockedReasons: ["SITE_NOT_ALLOWLISTED"], providerCallsMade: false, secretsExposed: false });
  assert.equal(readerCalls, 0);
  assert.equal(preflightCalls, 0);
  await assert.rejects(readdir(fx.scratchRoot), { code: "ENOENT" });
});

test("allowed site reads fresh bytes once and passes compiled manifest to native preflight", async (t) => {
  const fx = await fixture(t);
  let readerCalls = 0;
  let preflightCalls = 0;
  const result = await runAppOwnedJairoBusinessPreflight({ siteId: SITE_ID, ...fx,
    reader: async () => { readerCalls++; return readerResult(); },
    preflight: async ({ manifestPath, sourceDirectory, outputDirectory, environment }) => {
      preflightCalls++;
      assert.equal(sourceDirectory, fx.environment.PRODUCT_PAGE_SOURCE_DIR);
      assert.equal(outputDirectory, fx.environment.PRODUCT_PAGE_OUTPUT_DIR);
      assert.equal(environment, fx.environment);
      const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
      assert.deepEqual(manifest, { confirmation: "PREVIEW_JAIRO_BUSINESS_PUBLISHING", allowlist: [{
        activationLeadId: "f403f29e-95c8-4825-9320-967376443020", ownerSiteId: "jairo-pinto", siteId: SITE_ID,
        ecosystemType: "BUSINESS", rootEcosystemType: "PERSONAL_BRAND", baseDomain: "jairopinto.pro",
        publicHost: "negocio.jairopinto.pro", expectedSourceHash: HASH, expectedEntitlementHash: SHA,
      }] });
      assert.deepEqual(await readFile(resolve(dirname(manifestPath), "entitlement.json")), ENTITLEMENT);
      return { blocked: false, blockedReasons: [], source: { path: sourceDirectory }, entitlement: { secret: "test-secret" } };
    } });
  assert.equal(readerCalls, 1);
  assert.equal(preflightCalls, 1);
  assert.deepEqual(result, { requestId: "CDX-20260922-002", mode: "PREVIEW", changed: false, status: "READY",
    blockedReasons: [], providerCallsMade: false, secretsExposed: false });
  assert.deepEqual(await readdir(fx.scratchRoot), []);
});

test("native block keeps safe reason codes, redacts native detail and removes bundle", async (t) => {
  const fx = await fixture(t);
  const result = await runAppOwnedJairoBusinessPreflight({ siteId: SITE_ID, ...fx, reader: async () => readerResult(),
    preflight: async () => ({ blocked: true, blockedReasons: ["SOURCE_HASH_DRIFT", "test-secret", 1],
      targetInventory: { secret: "test-secret" }, plan: ["unsafe"] }) });
  assert.deepEqual(result.blockedReasons, ["SOURCE_HASH_DRIFT"]);
  assert.equal(result.status, "BLOCKED");
  assert.deepEqual(Object.keys(result), expectedKeys);
  assert.deepEqual(await readdir(fx.scratchRoot), []);
});

test("native configuration blocker retains its safe code without exposing values", async (t) => {
  const fx = await fixture(t);
  const result = await runAppOwnedJairoBusinessPreflight({ siteId: SITE_ID, ...fx, reader: async () => readerResult(),
    preflight: async () => ({ blocked: true, blockedReasons: ["CONFIGURATION_MISSING:HOSTINGER_API_TOKEN"] }) });
  assert.deepEqual(result.blockedReasons, ["CONFIGURATION_MISSING:HOSTINGER_API_TOKEN"]);
});

test("fresh reader 401 returns refresh failure without files or fallback", async (t) => {
  const fx = await fixture(t);
  let preflightCalls = 0;
  const result = await runAppOwnedJairoBusinessPreflight({ siteId: SITE_ID, ...fx,
    reader: async () => { const error = new Error("test-secret"); error.code = "SERVICE_TOKEN_HTTP_401"; throw error; },
    preflight: async () => { preflightCalls++; return { blocked: false }; } });
  assert.deepEqual(result.blockedReasons, ["SERVICE_TOKEN_HTTP_401"]);
  assert.equal(result.status, "ENTITLEMENT_REFRESH_FAILED");
  assert.equal(preflightCalls, 0);
  await assert.rejects(readdir(fx.scratchRoot), { code: "ENOENT" });
});

test("serialized result excludes scratch path, source path, secret and raw entitlement", async (t) => {
  const fx = await fixture(t);
  const result = await runAppOwnedJairoBusinessPreflight({ siteId: SITE_ID, ...fx, reader: async () => readerResult(),
    preflight: async () => ({ blocked: true, blockedReasons: ["BUSINESS_NOT_ENTITLED"],
      source: { path: fx.environment.PRODUCT_PAGE_SOURCE_DIR }, entitlement: { secret: "test-secret" } }) });
  const serialized = JSON.stringify(result);
  for (const forbidden of [fx.scratchRoot, fx.environment.PRODUCT_PAGE_SOURCE_DIR, "test-secret", "activationLeadId", "expectedTargets"])
    assert.equal(serialized.includes(forbidden), false, forbidden);
  assert.deepEqual(Object.keys(result), expectedKeys);
});

test("cleanup failure overrides native result with only safe cleanup reason", async (t) => {
  const fx = await fixture(t);
  const result = await runAppOwnedJairoBusinessPreflight({ siteId: SITE_ID, ...fx, reader: async () => readerResult(),
    preflight: async ({ manifestPath }) => {
      await rm(dirname(manifestPath), { recursive: true });
      return { blocked: false, source: { secret: "test-secret" } };
    } });
  assert.deepEqual(result, { requestId: "CDX-20260922-002", mode: "PREVIEW", changed: false, status: "BLOCKED",
    blockedReasons: ["EPHEMERAL_INPUT_CLEANUP_FAILED"], providerCallsMade: false, secretsExposed: false });
});

test("CLI argument parser rejects forbidden, duplicate and unknown flags with safe codes", () => {
  assert.deepEqual(parseArguments([`--site-id=${SITE_ID}`]), { siteId: SITE_ID });
  for (const flag of ["--apply", "--mode=APPLY", "--mode=APPLY_NOW", "--manifest=secret/path", "--endpoint=secret/path",
    "--output-dir=secret/path", "--source-dir=secret/path"])
    assert.throws(() => parseArguments([`--site-id=${SITE_ID}`, flag]), { code: "FORBIDDEN_ARGUMENT" });
  assert.throws(() => parseArguments([`--site-id=${SITE_ID}`, `--site-id=${SITE_ID}`]), { code: "DUPLICATE_ARGUMENT" });
  assert.throws(() => parseArguments([`--site-id=${SITE_ID}`, "--unknown=secret/path"]), { code: "UNKNOWN_ARGUMENT" });
  assert.throws(() => parseArguments([]), { code: "SITE_ID_REQUIRED" });
});
