import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

export const APPLY_MODE = "APPLY_JAIRO_SOURCE_IDENTITY";
export const APPLY_CONFIRMATION = "MIGRATE_JAIRO_SOURCE_IDENTITY";
const MANIFEST_CONFIRMATION = "GUARDED_APPLY_JAIRO_SOURCE_IDENTITY";
const EXPECTED = {
  sourceSiteId: "jairo-pinto",
  productSiteId: "jairo-pinto-product",
  brandSiteId: "jairo-pinto",
  baseDomain: "jairopinto.pro"
};
const HASH = /^[0-9a-f]{64}$/i;

function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
function json(value) { return `${JSON.stringify(value, null, 2)}\n`; }

function validateManifest(manifest, expectedAuditPackage) {
  if (manifest?.confirmation !== MANIFEST_CONFIRMATION || !Array.isArray(manifest.allowlist) || manifest.allowlist.length !== 1) {
    throw new Error(`Manifest requires confirmation=${MANIFEST_CONFIRMATION} and exactly one allowlisted migration.`);
  }
  const entry = manifest.allowlist[0];
  for (const [key, value] of Object.entries(EXPECTED)) if (entry[key] !== value) throw new Error(`Allowlist ${key} must equal ${value}.`);
  for (const field of ["expectedSourceHash", "expectedProjectedProductHash", "expectedProjectedBrandHash", "expectedVerificationHash", "expectedHistoryHash"]) {
    if (!HASH.test(entry[field] ?? "")) throw new Error(`${field} must be a complete SHA-256.`);
  }
  if (entry.auditPackage !== expectedAuditPackage) {
    throw new Error("Manifest auditPackage is not the reviewed CDX-009 package.");
  }
  return entry;
}

async function required(path) {
  const source = await readFile(path, "utf8");
  return { path, source, hash: sha256(source) };
}

async function absent(path) {
  try { await readFile(path); return false; } catch (error) { if (error.code === "ENOENT") return true; throw error; }
}

export async function planJairoSourceIdentityApply({ sourceDirectory, manifestPath, expectedAuditPackage = "/data/generated-sites/.migration-audits/2026-08-21T13-25-47.086Z-jairo-source-identity-dry-run" }) {
  const manifest = JSON.parse(await readFile(resolve(manifestPath), "utf8"));
  const entry = validateManifest(manifest, expectedAuditPackage);
  const audit = resolve(entry.auditPackage);
  const paths = {
    source: resolve(sourceDirectory, "jairo-pinto.json"),
    product: resolve(sourceDirectory, "jairo-pinto-product.json"),
    verification: resolve(sourceDirectory, ".verifications", "jairo-pinto.json"),
    productVerification: resolve(sourceDirectory, ".verifications", "jairo-pinto-product.json"),
    history: resolve(sourceDirectory, ".history", "jairo-pinto.json"),
    productHistory: resolve(sourceDirectory, ".history", "jairo-pinto-product.json"),
    projectedProduct: resolve(audit, "projected", "jairo-pinto-product.json"),
    projectedBrand: resolve(audit, "projected", "jairo-pinto.json"),
    auditDryRun: resolve(audit, "dry-run.json"),
    auditBackup: resolve(audit, "backup", "jairo-pinto.json"),
    applyJournal: resolve(audit, "apply.json")
  };
  const [source, verification, history, projectedProduct, projectedBrand, auditDryRun, auditBackup] = await Promise.all([
    required(paths.source), required(paths.verification), required(paths.history), required(paths.projectedProduct),
    required(paths.projectedBrand), required(paths.auditDryRun), required(paths.auditBackup)
  ]);
  const reviewed = JSON.parse(auditDryRun.source);
  const blockedReasons = [];
  const checks = [
    [source.hash, entry.expectedSourceHash, "SOURCE_HASH_DRIFT"],
    [projectedProduct.hash, entry.expectedProjectedProductHash, "PROJECTED_PRODUCT_HASH_DRIFT"],
    [projectedBrand.hash, entry.expectedProjectedBrandHash, "PROJECTED_BRAND_HASH_DRIFT"],
    [verification.hash, entry.expectedVerificationHash, "VERIFICATION_HASH_DRIFT"],
    [history.hash, entry.expectedHistoryHash, "HISTORY_HASH_DRIFT"],
    [auditBackup.hash, entry.expectedSourceHash, "AUDIT_BACKUP_HASH_DRIFT"]
  ];
  for (const [actual, expected, reason] of checks) if (actual !== expected) blockedReasons.push(reason);
  if (reviewed.mode !== "DRY_RUN" || reviewed.changed !== false || reviewed.blocked !== false) blockedReasons.push("AUDIT_DRY_RUN_NOT_APPROVED");
  if (!(await absent(paths.product))) blockedReasons.push("PRODUCT_SOURCE_COLLISION");
  if (!(await absent(paths.productVerification))) blockedReasons.push("PRODUCT_VERIFICATION_COLLISION");
  if (!(await absent(paths.productHistory))) blockedReasons.push("PRODUCT_HISTORY_COLLISION");
  if (!(await absent(paths.applyJournal))) blockedReasons.push("APPLY_JOURNAL_ALREADY_EXISTS");
  const sourceValue = JSON.parse(source.source); const productValue = JSON.parse(projectedProduct.source); const brandValue = JSON.parse(projectedBrand.source);
  if (sourceValue.ecosystemType !== "PRODUCT" || sourceValue.site?.id !== "jairo-pinto") blockedReasons.push("SOURCE_IDENTITY_INVALID");
  if (productValue.ecosystemType !== "PRODUCT" || productValue.site?.id !== "jairo-pinto-product") blockedReasons.push("PROJECTED_PRODUCT_IDENTITY_INVALID");
  if (brandValue.ecosystemType !== "PERSONAL_BRAND" || brandValue.site?.id !== "jairo-pinto") blockedReasons.push("PROJECTED_BRAND_IDENTITY_INVALID");
  const planMaterial = {
    auditPackage: entry.auditPackage,
    sourceHash: source.hash,
    projectedProductHash: projectedProduct.hash,
    projectedBrandHash: projectedBrand.hash,
    verificationHash: verification.hash,
    historyHash: history.hash
  };
  return {
    mode: "DRY_RUN", changed: false, blocked: blockedReasons.length > 0, blockedReasons,
    planHash: sha256(JSON.stringify(planMaterial)), planMaterial, paths,
    apex: { hostname: "jairopinto.pro", preserved: true, rewritten: false },
    operations: [
      "CREATE_SOURCE:jairo-pinto-product:PRODUCT",
      "MOVE_VERIFICATION:jairo-pinto->jairo-pinto-product",
      "MOVE_HISTORY:jairo-pinto->jairo-pinto-product",
      "REPLACE_SOURCE:jairo-pinto:PERSONAL_BRAND"
    ],
    files: { source, verification, history, projectedProduct, projectedBrand }
  };
}

async function atomicWrite(path, source) {
  const temporary = `${path}.tmp-${process.pid}-${Date.now()}`;
  await writeFile(temporary, source, "utf8");
  return temporary;
}

export async function runJairoSourceIdentityApply({ sourceDirectory, manifestPath, expectedAuditPackage, mode = "DRY_RUN", confirmation, expectedPlanHash, failAfterStep }) {
  if (mode !== "DRY_RUN" && mode !== APPLY_MODE) throw new Error(`Unsupported mode: ${mode}.`);
  const plan = await planJairoSourceIdentityApply({ sourceDirectory, manifestPath, expectedAuditPackage });
  const safe = { ...plan, files: undefined };
  if (mode === "DRY_RUN") return safe;
  if (confirmation !== APPLY_CONFIRMATION) throw new Error(`${APPLY_MODE} requires confirmation=${APPLY_CONFIRMATION}.`);
  if (plan.blocked) throw new Error(`APPLY blocked: ${plan.blockedReasons.join(", ")}.`);
  if (!HASH.test(expectedPlanHash ?? "") || expectedPlanHash !== plan.planHash) throw new Error("APPLY requires the reviewed DRY_RUN planHash.");

  const { paths, files } = plan;
  const productTemp = await atomicWrite(paths.product, files.projectedProduct.source);
  const brandTemp = await atomicWrite(paths.source, files.projectedBrand.source);
  const sourceRollback = `${paths.source}.rollback-${process.pid}-${Date.now()}`;
  const state = { product: false, verification: false, history: false, originalMoved: false, brand: false, journal: false };
  const maybeFail = (step) => { if (failAfterStep === step) throw new Error(`Injected failure after ${step}.`); };
  try {
    await rename(productTemp, paths.product); state.product = true; maybeFail("product");
    await rename(paths.verification, paths.productVerification); state.verification = true; maybeFail("verification");
    await rename(paths.history, paths.productHistory); state.history = true; maybeFail("history");
    await rename(paths.source, sourceRollback); state.originalMoved = true; maybeFail("source-backup");
    await rename(brandTemp, paths.source); state.brand = true; maybeFail("brand");
    const [persistedProduct, persistedBrand, persistedVerification, persistedHistory] = await Promise.all([
      required(paths.product), required(paths.source), required(paths.productVerification), required(paths.productHistory)
    ]);
    if (persistedProduct.hash !== files.projectedProduct.hash || persistedBrand.hash !== files.projectedBrand.hash ||
        persistedVerification.hash !== files.verification.hash || persistedHistory.hash !== files.history.hash ||
        !(await absent(paths.verification)) || !(await absent(paths.history))) throw new Error("POST_VERIFICATION_FAILED");
    const journal = { mode: APPLY_MODE, changed: true, planHash: plan.planHash, appliedAt: new Date().toISOString(), hashes: plan.planMaterial };
    const journalPath = paths.applyJournal;
    await mkdir(resolve(plan.planMaterial.auditPackage), { recursive: true });
    const journalTemp = await atomicWrite(journalPath, json(journal));
    await rename(journalTemp, journalPath); state.journal = true;
    await rm(sourceRollback, { force: true });
    return { ...safe, mode: APPLY_MODE, changed: true, journalPath, postVerification: "PASSED" };
  } catch (error) {
    if (state.journal) await rm(paths.applyJournal, { force: true });
    if (state.brand) await rm(paths.source, { force: true });
    if (state.originalMoved) await rename(sourceRollback, paths.source);
    if (state.history) await rename(paths.productHistory, paths.history);
    if (state.verification) await rename(paths.productVerification, paths.verification);
    if (state.product) await rm(paths.product, { force: true });
    await rm(productTemp, { force: true }); await rm(brandTemp, { force: true });
    throw error;
  }
}

async function main() {
  if (process.argv.includes("--apply")) throw new Error(`Generic --apply is disabled; use --mode=${APPLY_MODE}.`);
  const arg = (name) => process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);
  const manifestPath = arg("manifest"); if (!manifestPath) throw new Error("--manifest is required.");
  const result = await runJairoSourceIdentityApply({
    sourceDirectory: process.env.PRODUCT_PAGE_SOURCE_DIR ?? "/data/generated-sites/.sources",
    manifestPath, mode: arg("mode") ?? "DRY_RUN", confirmation: arg("confirm"), expectedPlanHash: arg("expected-plan-hash")
  });
  process.stdout.write(json(result));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((error) => { process.stderr.write(json({ error: error.message })); process.exitCode = 1; });
