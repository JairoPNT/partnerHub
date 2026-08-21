import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { APPLY_CONFIRMATION, APPLY_MODE, runJairoSourceIdentityApply } from "./jairo-source-identity-guarded-apply.mjs";

const hash = (value) => createHash("sha256").update(value).digest("hex");
async function fixture() {
  const root = await mkdtemp(resolve(tmpdir(), "jairo-guarded-apply-"));
  const sources = resolve(root, "sources"); const audit = resolve(root, "audit");
  await mkdir(resolve(sources, ".verifications"), { recursive: true }); await mkdir(resolve(sources, ".history"), { recursive: true });
  await mkdir(resolve(audit, "backup"), { recursive: true }); await mkdir(resolve(audit, "projected"), { recursive: true });
  const original = `${JSON.stringify({ ecosystemType: "PRODUCT", site: { id: "jairo-pinto", appName: "jairo-pinto" } }, null, 2)}\n`;
  const product = `${JSON.stringify({ ecosystemType: "PRODUCT", site: { id: "jairo-pinto-product", appName: "jairo-pinto-product" } }, null, 2)}\n`;
  const brand = `${JSON.stringify({ ecosystemType: "PERSONAL_BRAND", site: { id: "jairo-pinto", appName: "jairo-pinto" } }, null, 2)}\n`;
  const verification = "{\"status\":\"VERIFIED\"}\n"; const history = "{\"entries\":[]}\n";
  await writeFile(resolve(sources, "jairo-pinto.json"), original); await writeFile(resolve(sources, ".verifications", "jairo-pinto.json"), verification); await writeFile(resolve(sources, ".history", "jairo-pinto.json"), history);
  await writeFile(resolve(audit, "backup", "jairo-pinto.json"), original); await writeFile(resolve(audit, "projected", "jairo-pinto-product.json"), product); await writeFile(resolve(audit, "projected", "jairo-pinto.json"), brand); await writeFile(resolve(audit, "dry-run.json"), JSON.stringify({ mode: "DRY_RUN", changed: false, blocked: false }));
  const entry = { sourceSiteId: "jairo-pinto", productSiteId: "jairo-pinto-product", brandSiteId: "jairo-pinto", baseDomain: "jairopinto.pro", auditPackage: audit,
    expectedSourceHash: hash(original), expectedProjectedProductHash: hash(product), expectedProjectedBrandHash: hash(brand), expectedVerificationHash: hash(verification), expectedHistoryHash: hash(history) };
  const manifestPath = resolve(root, "manifest.json"); await writeFile(manifestPath, JSON.stringify({ confirmation: "GUARDED_APPLY_JAIRO_SOURCE_IDENTITY", allowlist: [entry] }));
  return { sources, audit, manifestPath, original, product, brand, verification, history };
}

test("preview is unchanged and produces a reviewable plan hash", async () => {
  const fx = await fixture(); const result = await runJairoSourceIdentityApply({ sourceDirectory: fx.sources, manifestPath: fx.manifestPath, expectedAuditPackage: fx.audit });
  assert.equal(result.changed, false); assert.equal(result.blocked, false); assert.match(result.planHash, /^[0-9a-f]{64}$/);
  assert.equal(await readFile(resolve(fx.sources, "jairo-pinto.json"), "utf8"), fx.original);
});

test("blocks drift and destination collisions", async () => {
  const fx = await fixture(); await writeFile(resolve(fx.sources, "jairo-pinto-product.json"), "collision");
  const result = await runJairoSourceIdentityApply({ sourceDirectory: fx.sources, manifestPath: fx.manifestPath, expectedAuditPackage: fx.audit });
  assert.ok(result.blockedReasons.includes("PRODUCT_SOURCE_COLLISION"));
  await writeFile(resolve(fx.sources, "jairo-pinto.json"), "{}\n");
  const drift = await runJairoSourceIdentityApply({ sourceDirectory: fx.sources, manifestPath: fx.manifestPath, expectedAuditPackage: fx.audit });
  assert.ok(drift.blockedReasons.includes("SOURCE_HASH_DRIFT"));
});

test("APPLY requires confirmation and reviewed preview hash", async () => {
  const fx = await fixture(); const preview = await runJairoSourceIdentityApply({ sourceDirectory: fx.sources, manifestPath: fx.manifestPath, expectedAuditPackage: fx.audit });
  await assert.rejects(runJairoSourceIdentityApply({ sourceDirectory: fx.sources, manifestPath: fx.manifestPath, expectedAuditPackage: fx.audit, mode: APPLY_MODE, expectedPlanHash: preview.planHash }), /requires confirmation/);
  await assert.rejects(runJairoSourceIdentityApply({ sourceDirectory: fx.sources, manifestPath: fx.manifestPath, expectedAuditPackage: fx.audit, mode: APPLY_MODE, confirmation: APPLY_CONFIRMATION, expectedPlanHash: "0".repeat(64) }), /planHash/);
});

test("atomic APPLY separates identities and dependent evidence", async () => {
  const fx = await fixture(); const preview = await runJairoSourceIdentityApply({ sourceDirectory: fx.sources, manifestPath: fx.manifestPath, expectedAuditPackage: fx.audit });
  const result = await runJairoSourceIdentityApply({ sourceDirectory: fx.sources, manifestPath: fx.manifestPath, expectedAuditPackage: fx.audit, mode: APPLY_MODE, confirmation: APPLY_CONFIRMATION, expectedPlanHash: preview.planHash });
  assert.equal(result.changed, true); assert.equal(result.postVerification, "PASSED");
  assert.equal(await readFile(resolve(fx.sources, "jairo-pinto-product.json"), "utf8"), fx.product);
  assert.equal(await readFile(resolve(fx.sources, "jairo-pinto.json"), "utf8"), fx.brand);
  assert.equal(await readFile(resolve(fx.sources, ".verifications", "jairo-pinto-product.json"), "utf8"), fx.verification);
  assert.equal(await readFile(resolve(fx.sources, ".history", "jairo-pinto-product.json"), "utf8"), fx.history);
});

test("rolls back every committed step after an injected failure", async () => {
  const fx = await fixture(); const preview = await runJairoSourceIdentityApply({ sourceDirectory: fx.sources, manifestPath: fx.manifestPath, expectedAuditPackage: fx.audit });
  await assert.rejects(runJairoSourceIdentityApply({ sourceDirectory: fx.sources, manifestPath: fx.manifestPath, expectedAuditPackage: fx.audit, mode: APPLY_MODE, confirmation: APPLY_CONFIRMATION, expectedPlanHash: preview.planHash, failAfterStep: "brand" }), /Injected failure/);
  assert.equal(await readFile(resolve(fx.sources, "jairo-pinto.json"), "utf8"), fx.original);
  assert.equal(await readFile(resolve(fx.sources, ".verifications", "jairo-pinto.json"), "utf8"), fx.verification);
  assert.equal(await readFile(resolve(fx.sources, ".history", "jairo-pinto.json"), "utf8"), fx.history);
  await assert.rejects(readFile(resolve(fx.sources, "jairo-pinto-product.json")), /ENOENT/);
});
