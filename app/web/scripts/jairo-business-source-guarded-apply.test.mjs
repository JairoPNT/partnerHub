import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { APPLY_CONFIRMATION, APPLY_MODE, runJairoBusinessSourceApply } from "./jairo-business-source-guarded-apply.mjs";

const hash = (value) => createHash("sha256").update(value).digest("hex");
const stringify = (value) => `${JSON.stringify(value, null, 2)}\n`;

async function fixture() {
  const root = await mkdtemp(resolve(tmpdir(), "business-guarded-apply-"));
  const sources = resolve(root, "sources"); const audit = resolve(root, "audit"); const runtimePath = resolve(root, "business-config.js");
  await mkdir(resolve(audit, "inputs"), { recursive: true }); await mkdir(resolve(audit, "backup"), { recursive: true }); await mkdir(resolve(audit, "projected"), { recursive: true }); await mkdir(sources);
  const activation = stringify({ id: "f403f29e-95c8-4825-9320-967376443020", siteId: "jairo-pinto" });
  const entitlement = stringify({ activationLeadId: "f403f29e-95c8-4825-9320-967376443020", commercialState: "KNOWN", includedEcosystems: ["BUSINESS"] });
  const profile = stringify({ role: "authorized" });
  const brand = stringify({ ecosystemType: "PERSONAL_BRAND", site: { id: "jairo-pinto" } });
  const product = stringify({ ecosystemType: "PRODUCT", site: { id: "jairo-pinto-product" } });
  const runtime = "const CONFIG={ecosystemType:'BUSINESS'};\n";
  const projected = stringify({ ecosystemType: "BUSINESS", site: { id: "jairo-pinto-business", domain: "negocio.jairopinto.pro" } });
  await Promise.all([
    writeFile(resolve(audit, "inputs", "activation-lead.json"), activation), writeFile(resolve(audit, "inputs", "entitlement.json"), entitlement),
    writeFile(resolve(audit, "inputs", "business-profile.json"), profile), writeFile(resolve(sources, "jairo-pinto.json"), brand),
    writeFile(resolve(sources, "jairo-pinto-product.json"), product), writeFile(resolve(audit, "backup", "jairo-pinto.json"), brand),
    writeFile(resolve(audit, "backup", "jairo-pinto-product.json"), product), writeFile(runtimePath, runtime),
    writeFile(resolve(audit, "canonical-business-config.js"), runtime), writeFile(resolve(audit, "projected", "jairo-pinto-business.json"), projected),
    writeFile(resolve(audit, "dry-run.json"), stringify({ mode: "DRY_RUN", changed: false, blocked: false, hashes: { projectedBusiness: hash(projected) } }))
  ]);
  const entry = { activationLeadId: "f403f29e-95c8-4825-9320-967376443020", ownerSiteId: "jairo-pinto", productSiteId: "jairo-pinto-product",
    businessSiteId: "jairo-pinto-business", ecosystemType: "BUSINESS", baseDomain: "jairopinto.pro", publicHost: "negocio.jairopinto.pro", auditPackage: audit,
    expectedActivationLeadHash: hash(activation), expectedEntitlementHash: hash(entitlement), expectedBusinessProfileHash: hash(profile),
    expectedBrandSourceHash: hash(brand), expectedProductSourceHash: hash(product), expectedCanonicalTemplateHash: hash(runtime), expectedProjectedBusinessHash: hash(projected) };
  const manifestPath = resolve(root, "manifest.json"); await writeFile(manifestPath, stringify({ confirmation: "GUARDED_APPLY_JAIRO_BUSINESS_SOURCE", allowlist: [entry] }));
  return { root, sources, audit, runtimePath, manifestPath, brand, product, projected };
}

const options = (fx, extra = {}) => ({ sourceDirectory: fx.sources, runtimePath: fx.runtimePath, manifestPath: fx.manifestPath, expectedAuditPackage: fx.audit, ...extra });
async function apply(fx, extra = {}) {
  const preview = await runJairoBusinessSourceApply(options(fx));
  const result = await runJairoBusinessSourceApply(options(fx, { mode: APPLY_MODE, confirmation: APPLY_CONFIRMATION, expectedPlanHash: preview.planHash, ...extra }));
  return { preview, result };
}

test("preview is unchanged, pins one operation and produces a planHash", async () => {
  const fx = await fixture(); const preview = await runJairoBusinessSourceApply(options(fx));
  assert.equal(preview.changed, false); assert.equal(preview.blocked, false); assert.deepEqual(preview.operations, ["CREATE_SOURCE:jairo-pinto-business:BUSINESS"]);
  assert.match(preview.planHash, /^[0-9a-f]{64}$/); await assert.rejects(readFile(resolve(fx.sources, "jairo-pinto-business.json")), /ENOENT/);
});

test("preview blocks every pinned drift and destination collision", async () => {
  const fx = await fixture(); await writeFile(resolve(fx.audit, "inputs", "entitlement.json"), "{}\n");
  let preview = await runJairoBusinessSourceApply(options(fx)); assert(preview.blockedReasons.includes("ENTITLEMENT_HASH_DRIFT"));
  const other = await fixture(); await writeFile(resolve(other.sources, "jairo-pinto-business.json"), "collision");
  preview = await runJairoBusinessSourceApply(options(other)); assert(preview.blockedReasons.includes("BUSINESS_SOURCE_COLLISION"));
});

test("APPLY requires exact confirmation and reviewed planHash", async () => {
  const fx = await fixture(); const preview = await runJairoBusinessSourceApply(options(fx));
  await assert.rejects(runJairoBusinessSourceApply(options(fx, { mode: APPLY_MODE, expectedPlanHash: preview.planHash })), /APPLY_REQUIRES_CONFIRMATION/);
  await assert.rejects(runJairoBusinessSourceApply(options(fx, { mode: APPLY_MODE, confirmation: APPLY_CONFIRMATION, expectedPlanHash: "0".repeat(64) })), /APPLY_PLAN_HASH_MISMATCH/);
});

test("APPLY atomically creates only Business and post-verifies", async () => {
  const fx = await fixture(); const { result } = await apply(fx);
  assert.equal(result.outcome, "APPLIED"); assert.equal(result.changed, true); assert.equal(result.postVerification, "PASSED");
  assert.equal(await readFile(resolve(fx.sources, "jairo-pinto-business.json"), "utf8"), fx.projected);
  assert.equal(await readFile(resolve(fx.sources, "jairo-pinto.json"), "utf8"), fx.brand); assert.equal(await readFile(resolve(fx.sources, "jairo-pinto-product.json"), "utf8"), fx.product);
});

test("sequential rerun validates journal and returns ALREADY_APPLIED", async () => {
  const fx = await fixture(); const { preview } = await apply(fx);
  const rerun = await runJairoBusinessSourceApply(options(fx, { mode: APPLY_MODE, confirmation: APPLY_CONFIRMATION, expectedPlanHash: preview.planHash }));
  assert.equal(rerun.outcome, "ALREADY_APPLIED"); assert.equal(rerun.changed, false); assert.equal(rerun.blocked, false);
});

test("journal or final-state drift blocks idempotency", async () => {
  const fx = await fixture(); await apply(fx); await writeFile(resolve(fx.sources, "jairo-pinto-business.json"), "{}\n");
  let terminal = await runJairoBusinessSourceApply(options(fx)); assert.equal(terminal.outcome, "BLOCKED_APPLIED_STATE"); assert(terminal.blockedReasons.includes("APPLIED_DESTINATION_HASH_DRIFT"));
  const other = await fixture(); await apply(other); const path = resolve(other.audit, "business-apply.json"); const journal = JSON.parse(await readFile(path, "utf8")); journal.planHash = "0".repeat(64); await writeFile(path, stringify(journal));
  terminal = await runJairoBusinessSourceApply(options(other)); assert(terminal.blockedReasons.includes("APPLY_JOURNAL_DRIFT"));
});

test("exclusive claim allows one mutator and loser cannot mutate", async () => {
  const fx = await fixture(); const preview = await runJairoBusinessSourceApply(options(fx)); let release; let acquired;
  const waiting = new Promise((resolvePromise) => { acquired = resolvePromise; }); const gate = new Promise((resolvePromise) => { release = resolvePromise; });
  const first = runJairoBusinessSourceApply(options(fx, { mode: APPLY_MODE, confirmation: APPLY_CONFIRMATION, expectedPlanHash: preview.planHash,
    hooks: { onClaimAcquired: async () => { acquired(); await gate; } } }));
  await waiting;
  await assert.rejects(runJairoBusinessSourceApply(options(fx, { mode: APPLY_MODE, confirmation: APPLY_CONFIRMATION, expectedPlanHash: preview.planHash })), /APPLY_CLAIM_ACTIVE/);
  release(); const winner = await first; assert.equal(winner.outcome, "APPLIED");
});

test("incomplete and stale claims block without automatic cleanup", async () => {
  const fx = await fixture(); const claim = resolve(fx.audit, ".business-apply-claim"); await mkdir(claim);
  let preview = await runJairoBusinessSourceApply(options(fx)); assert(preview.blockedReasons.includes("APPLY_CLAIM_INCOMPLETE"));
  await writeFile(resolve(claim, "owner.json"), stringify({ token: "stale", acquiredAt: "2020-01-01T00:00:00.000Z" }));
  preview = await runJairoBusinessSourceApply(options(fx)); assert(preview.blockedReasons.includes("APPLY_CLAIM_STALE"));
  assert.equal(JSON.parse(await readFile(resolve(claim, "owner.json"), "utf8")).token, "stale");
});

test("rollback removes only owned Business after injected failure", async () => {
  const fx = await fixture();
  await assert.rejects(apply(fx, { hooks: { afterDestinationWrite: async () => { throw new Error("INJECTED_FAILURE"); } } }), /INJECTED_FAILURE/);
  await assert.rejects(readFile(resolve(fx.sources, "jairo-pinto-business.json")), /ENOENT/);
  assert.equal(await readFile(resolve(fx.sources, "jairo-pinto.json"), "utf8"), fx.brand); assert.equal(await readFile(resolve(fx.sources, "jairo-pinto-product.json"), "utf8"), fx.product);
});

test("ownership loss after write never deletes a foreign winner artifact", async () => {
  const fx = await fixture(); const foreign = stringify({ token: "foreign", acquiredAt: new Date().toISOString() });
  await assert.rejects(apply(fx, { hooks: { afterDestinationWrite: async (paths) => {
    await writeFile(paths.destination, "FOREIGN_WINNER"); await writeFile(paths.claimOwner, foreign);
  } } }), /APPLY_CLAIM_OWNERSHIP_LOST/);
  assert.equal(await readFile(resolve(fx.sources, "jairo-pinto-business.json"), "utf8"), "FOREIGN_WINNER");
  assert.equal(await readFile(resolve(fx.audit, ".business-apply-claim", "owner.json"), "utf8"), foreign);
});

test("post-journal failure preserves committed state and claim", async () => {
  const fx = await fixture();
  await assert.rejects(apply(fx, { hooks: { afterJournal: async () => { throw new Error("CLEANUP_FAILURE"); } } }), /APPLY_POST_COMMIT_CLEANUP_FAILED/);
  assert.equal(await readFile(resolve(fx.sources, "jairo-pinto-business.json"), "utf8"), fx.projected);
  assert.equal(JSON.parse(await readFile(resolve(fx.audit, "business-apply.json"), "utf8")).changed, true);
  assert.equal(await readFile(resolve(fx.audit, ".business-apply-claim", "owner.json"), "utf8").then(Boolean), true);
});
