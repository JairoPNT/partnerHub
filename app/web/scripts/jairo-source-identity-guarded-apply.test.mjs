import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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

async function previewAndApply(fx, extra = {}) {
  const preview = await runJairoSourceIdentityApply({ sourceDirectory: fx.sources, manifestPath: fx.manifestPath, expectedAuditPackage: fx.audit });
  const result = await runJairoSourceIdentityApply({ sourceDirectory: fx.sources, manifestPath: fx.manifestPath, expectedAuditPackage: fx.audit,
    mode: APPLY_MODE, confirmation: APPLY_CONFIRMATION, expectedPlanHash: preview.planHash, ...extra });
  return { preview, result };
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
  const fx = await fixture(); const { result } = await previewAndApply(fx);
  assert.equal(result.changed, true); assert.equal(result.postVerification, "PASSED");
  assert.equal(await readFile(resolve(fx.sources, "jairo-pinto-product.json"), "utf8"), fx.product);
  assert.equal(await readFile(resolve(fx.sources, "jairo-pinto.json"), "utf8"), fx.brand);
  assert.equal(await readFile(resolve(fx.sources, ".verifications", "jairo-pinto-product.json"), "utf8"), fx.verification);
  assert.equal(await readFile(resolve(fx.sources, ".history", "jairo-pinto-product.json"), "utf8"), fx.history);
});

test("a sequential rerun validates terminal state and returns ALREADY_APPLIED unchanged", async () => {
  const fx = await fixture(); const { preview } = await previewAndApply(fx);
  const rerun = await runJairoSourceIdentityApply({ sourceDirectory: fx.sources, manifestPath: fx.manifestPath, expectedAuditPackage: fx.audit,
    mode: APPLY_MODE, confirmation: APPLY_CONFIRMATION, expectedPlanHash: preview.planHash });
  assert.equal(rerun.outcome, "ALREADY_APPLIED"); assert.equal(rerun.changed, false); assert.equal(rerun.blocked, false);
});

test("an existing journal with final-state drift blocks instead of reporting idempotency", async () => {
  const fx = await fixture(); await previewAndApply(fx); await writeFile(resolve(fx.sources, "jairo-pinto.json"), "{}\n");
  const result = await runJairoSourceIdentityApply({ sourceDirectory: fx.sources, manifestPath: fx.manifestPath, expectedAuditPackage: fx.audit });
  assert.equal(result.outcome, "BLOCKED_APPLIED_STATE"); assert.equal(result.blocked, true);
  assert.ok(result.blockedReasons.includes("APPLIED_BRAND_HASH_DRIFT"));
  assert.ok(result.blockedReasons.includes("APPLIED_BRAND_IDENTITY_DRIFT"));
});

test("journal hash drift blocks fail closed even when final files are intact", async () => {
  const fx = await fixture(); await previewAndApply(fx); const journalPath = resolve(fx.audit, "apply.json");
  const journal = JSON.parse(await readFile(journalPath, "utf8")); journal.planHash = "0".repeat(64); await writeFile(journalPath, JSON.stringify(journal));
  const result = await runJairoSourceIdentityApply({ sourceDirectory: fx.sources, manifestPath: fx.manifestPath, expectedAuditPackage: fx.audit });
  assert.equal(result.outcome, "BLOCKED_APPLIED_STATE"); assert.ok(result.blockedReasons.includes("APPLY_JOURNAL_DRIFT"));
});

test("exclusive claim permits one concurrent mutator and the loser cannot roll it back", async () => {
  const fx = await fixture(); const preview = await runJairoSourceIdentityApply({ sourceDirectory: fx.sources, manifestPath: fx.manifestPath, expectedAuditPackage: fx.audit });
  let releaseFirst; let claimAcquired;
  const acquired = new Promise((resolvePromise) => { claimAcquired = resolvePromise; });
  const gate = new Promise((resolvePromise) => { releaseFirst = resolvePromise; });
  const first = runJairoSourceIdentityApply({ sourceDirectory: fx.sources, manifestPath: fx.manifestPath, expectedAuditPackage: fx.audit,
    mode: APPLY_MODE, confirmation: APPLY_CONFIRMATION, expectedPlanHash: preview.planHash,
    onClaimAcquired: async () => { claimAcquired(); await gate; } });
  await acquired;
  await assert.rejects(runJairoSourceIdentityApply({ sourceDirectory: fx.sources, manifestPath: fx.manifestPath, expectedAuditPackage: fx.audit,
    mode: APPLY_MODE, confirmation: APPLY_CONFIRMATION, expectedPlanHash: preview.planHash }), /APPLY_CLAIM_ACTIVE/);
  releaseFirst(); const winner = await first;
  assert.equal(winner.changed, true); assert.equal(winner.postVerification, "PASSED");
  assert.equal(await readFile(resolve(fx.sources, "jairo-pinto-product.json"), "utf8"), fx.product);
  assert.equal(await readFile(resolve(fx.sources, "jairo-pinto.json"), "utf8"), fx.brand);
});

test("incomplete and stale claims block fail closed without automatic cleanup", async () => {
  const fx = await fixture(); const claim = resolve(fx.audit, ".apply-claim"); await mkdir(claim);
  const incomplete = await runJairoSourceIdentityApply({ sourceDirectory: fx.sources, manifestPath: fx.manifestPath, expectedAuditPackage: fx.audit });
  assert.ok(incomplete.blockedReasons.includes("APPLY_CLAIM_INCOMPLETE")); assert.equal(await readFile(resolve(fx.sources, "jairo-pinto.json"), "utf8"), fx.original);
  await writeFile(resolve(claim, "owner.json"), JSON.stringify({ token: "stale-owner", acquiredAt: "2020-01-01T00:00:00.000Z" }));
  const stale = await runJairoSourceIdentityApply({ sourceDirectory: fx.sources, manifestPath: fx.manifestPath, expectedAuditPackage: fx.audit });
  assert.ok(stale.blockedReasons.includes("APPLY_CLAIM_STALE")); assert.equal(await readFile(resolve(claim, "owner.json"), "utf8"), JSON.stringify({ token: "stale-owner", acquiredAt: "2020-01-01T00:00:00.000Z" }));
});

test("a process never removes a claim whose ownership token changed", async () => {
  const fx = await fixture(); const preview = await runJairoSourceIdentityApply({ sourceDirectory: fx.sources, manifestPath: fx.manifestPath, expectedAuditPackage: fx.audit });
  const foreign = JSON.stringify({ token: "foreign-owner", acquiredAt: new Date().toISOString() });
  await assert.rejects(runJairoSourceIdentityApply({ sourceDirectory: fx.sources, manifestPath: fx.manifestPath, expectedAuditPackage: fx.audit,
    mode: APPLY_MODE, confirmation: APPLY_CONFIRMATION, expectedPlanHash: preview.planHash,
    onClaimAcquired: async () => { await writeFile(resolve(fx.audit, ".apply-claim", "owner.json"), foreign); } }), /APPLY_CLAIM_OWNERSHIP_LOST/);
  assert.equal(await readFile(resolve(fx.audit, ".apply-claim", "owner.json"), "utf8"), foreign);
  assert.equal(await readFile(resolve(fx.sources, "jairo-pinto.json"), "utf8"), fx.original);
  await assert.rejects(readFile(resolve(fx.sources, "jairo-pinto-product.json")), /ENOENT/);
  await rm(resolve(fx.audit, ".apply-claim"), { recursive: true });
});

test("rolls back every committed step after an injected failure", async () => {
  const fx = await fixture(); const preview = await runJairoSourceIdentityApply({ sourceDirectory: fx.sources, manifestPath: fx.manifestPath, expectedAuditPackage: fx.audit });
  await assert.rejects(runJairoSourceIdentityApply({ sourceDirectory: fx.sources, manifestPath: fx.manifestPath, expectedAuditPackage: fx.audit, mode: APPLY_MODE, confirmation: APPLY_CONFIRMATION, expectedPlanHash: preview.planHash, failAfterStep: "brand" }), /Injected failure/);
  assert.equal(await readFile(resolve(fx.sources, "jairo-pinto.json"), "utf8"), fx.original);
  assert.equal(await readFile(resolve(fx.sources, ".verifications", "jairo-pinto.json"), "utf8"), fx.verification);
  assert.equal(await readFile(resolve(fx.sources, ".history", "jairo-pinto.json"), "utf8"), fx.history);
  await assert.rejects(readFile(resolve(fx.sources, "jairo-pinto-product.json")), /ENOENT/);
});
