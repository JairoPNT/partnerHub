import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

export const APPLY_MODE = "APPLY_JAIRO_BUSINESS_SOURCE";
export const APPLY_CONFIRMATION = "CREATE_JAIRO_BUSINESS_SOURCE";
const MANIFEST_CONFIRMATION = "GUARDED_APPLY_JAIRO_BUSINESS_SOURCE";
const DEFAULT_AUDIT_PACKAGE = "/data/generated-sites/.migration-audits/2026-08-24T16-18-48.067Z-jairo-business-source-dry-run";
const EXPECTED = {
  activationLeadId: "f403f29e-95c8-4825-9320-967376443020",
  ownerSiteId: "jairo-pinto",
  productSiteId: "jairo-pinto-product",
  businessSiteId: "jairo-pinto-business",
  ecosystemType: "BUSINESS",
  baseDomain: "jairopinto.pro",
  publicHost: "negocio.jairopinto.pro"
};
const HASH = /^[0-9a-f]{64}$/i;
const CLAIM_STALE_MS = 15 * 60 * 1000;
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

async function exists(path) { try { await stat(path); return true; } catch (error) { if (error.code === "ENOENT") return false; throw error; } }
async function required(path) { const source = await readFile(path, "utf8"); return { path, source, hash: sha256(source) }; }

function validateManifest(manifest, expectedAuditPackage) {
  if (manifest?.confirmation !== MANIFEST_CONFIRMATION || !Array.isArray(manifest.allowlist) || manifest.allowlist.length !== 1) {
    throw new Error(`MANIFEST_INVALID:${MANIFEST_CONFIRMATION}:EXACTLY_ONE`);
  }
  const entry = manifest.allowlist[0];
  for (const [key, expected] of Object.entries(EXPECTED)) if (entry[key] !== expected) throw new Error(`ALLOWLIST_MISMATCH:${key}`);
  for (const field of ["expectedActivationLeadHash", "expectedEntitlementHash", "expectedBusinessProfileHash", "expectedBrandSourceHash", "expectedProductSourceHash", "expectedCanonicalTemplateHash", "expectedProjectedBusinessHash"]) {
    if (!HASH.test(entry[field] ?? "")) throw new Error(`HASH_INVALID:${field}`);
  }
  if (entry.auditPackage !== expectedAuditPackage) throw new Error("AUDIT_PACKAGE_NOT_PINNED");
  return entry;
}

function pathsFor(sourceDirectory, auditPackage, runtimePath) {
  return {
    brand: resolve(sourceDirectory, "jairo-pinto.json"),
    product: resolve(sourceDirectory, "jairo-pinto-product.json"),
    destination: resolve(sourceDirectory, "jairo-pinto-business.json"),
    runtime: resolve(runtimePath),
    activation: resolve(auditPackage, "inputs", "activation-lead.json"),
    entitlement: resolve(auditPackage, "inputs", "entitlement.json"),
    profile: resolve(auditPackage, "inputs", "business-profile.json"),
    backupBrand: resolve(auditPackage, "backup", "jairo-pinto.json"),
    backupProduct: resolve(auditPackage, "backup", "jairo-pinto-product.json"),
    auditRuntime: resolve(auditPackage, "canonical-business-config.js"),
    projected: resolve(auditPackage, "projected", "jairo-pinto-business.json"),
    dryRun: resolve(auditPackage, "dry-run.json"),
    journal: resolve(auditPackage, "business-apply.json"),
    claim: resolve(auditPackage, ".business-apply-claim"),
    claimOwner: resolve(auditPackage, ".business-apply-claim", "owner.json")
  };
}

function planMaterial(entry) {
  return {
    auditPackage: entry.auditPackage,
    activationLeadHash: entry.expectedActivationLeadHash,
    entitlementHash: entry.expectedEntitlementHash,
    businessProfileHash: entry.expectedBusinessProfileHash,
    brandSourceHash: entry.expectedBrandSourceHash,
    productSourceHash: entry.expectedProductSourceHash,
    canonicalTemplateHash: entry.expectedCanonicalTemplateHash,
    projectedBusinessHash: entry.expectedProjectedBusinessHash,
    destination: EXPECTED.businessSiteId
  };
}

async function claimReason(paths, now = Date.now()) {
  if (!(await exists(paths.claim))) return null;
  try {
    const owner = JSON.parse(await readFile(paths.claimOwner, "utf8"));
    const acquired = Date.parse(owner.acquiredAt);
    if (!owner.token || !Number.isFinite(acquired)) return "APPLY_CLAIM_INCOMPLETE";
    return now - acquired >= CLAIM_STALE_MS ? "APPLY_CLAIM_STALE" : "APPLY_CLAIM_ACTIVE";
  } catch { return "APPLY_CLAIM_INCOMPLETE"; }
}

function validateBusinessIdentity(file, reasons, prefix) {
  try {
    const value = JSON.parse(file.source);
    if (value.ecosystemType !== EXPECTED.ecosystemType || value.site?.id !== EXPECTED.businessSiteId || value.site?.domain !== EXPECTED.publicHost) {
      reasons.push(`${prefix}_IDENTITY_INVALID`);
    }
  } catch { reasons.push(`${prefix}_JSON_INVALID`); }
}

async function terminalState(paths, entry) {
  if (!(await exists(paths.journal))) return null;
  const reasons = [];
  let journal;
  try { journal = JSON.parse(await readFile(paths.journal, "utf8")); } catch { return { valid: false, reasons: ["APPLY_JOURNAL_INVALID"] }; }
  const material = planMaterial(entry); const expectedPlanHash = sha256(JSON.stringify(material));
  if (journal.mode !== APPLY_MODE || journal.changed !== true || journal.planHash !== expectedPlanHash ||
      JSON.stringify(journal.hashes) !== JSON.stringify(material) || !Number.isFinite(Date.parse(journal.appliedAt))) reasons.push("APPLY_JOURNAL_DRIFT");
  let destination;
  try { destination = await required(paths.destination); } catch (error) { if (error.code === "ENOENT") reasons.push("APPLIED_DESTINATION_MISSING"); else throw error; }
  if (destination) {
    if (destination.hash !== entry.expectedProjectedBusinessHash) reasons.push("APPLIED_DESTINATION_HASH_DRIFT");
    validateBusinessIdentity(destination, reasons, "APPLIED_DESTINATION");
  }
  const activeClaim = await claimReason(paths); if (activeClaim) reasons.push(activeClaim);
  return { valid: reasons.length === 0, reasons: [...new Set(reasons)], journal, planHash: expectedPlanHash, material };
}

export async function planJairoBusinessSourceApply({ sourceDirectory, manifestPath, runtimePath, expectedAuditPackage = DEFAULT_AUDIT_PACKAGE, skipClaimCheck = false }) {
  const manifest = JSON.parse(await readFile(resolve(manifestPath), "utf8"));
  const entry = validateManifest(manifest, expectedAuditPackage);
  const paths = pathsFor(resolve(sourceDirectory), resolve(entry.auditPackage), resolve(runtimePath));
  const terminal = await terminalState(paths, entry);
  if (terminal) return { mode: "PREVIEW", outcome: terminal.valid ? "ALREADY_APPLIED" : "BLOCKED_APPLIED_STATE", changed: false,
    blocked: !terminal.valid, blockedReasons: terminal.reasons, planHash: terminal.planHash, planMaterial: terminal.material, paths, operations: [] };
  const files = {};
  [files.activation, files.entitlement, files.profile, files.brand, files.product, files.runtime, files.backupBrand,
    files.backupProduct, files.auditRuntime, files.projected, files.dryRun] = await Promise.all([
    required(paths.activation), required(paths.entitlement), required(paths.profile), required(paths.brand), required(paths.product), required(paths.runtime),
    required(paths.backupBrand), required(paths.backupProduct), required(paths.auditRuntime), required(paths.projected), required(paths.dryRun)
  ]);
  const reasons = [];
  for (const [actual, expected, reason] of [
    [files.activation.hash, entry.expectedActivationLeadHash, "ACTIVATION_HASH_DRIFT"],
    [files.entitlement.hash, entry.expectedEntitlementHash, "ENTITLEMENT_HASH_DRIFT"],
    [files.profile.hash, entry.expectedBusinessProfileHash, "PROFILE_HASH_DRIFT"],
    [files.brand.hash, entry.expectedBrandSourceHash, "BRAND_HASH_DRIFT"],
    [files.product.hash, entry.expectedProductSourceHash, "PRODUCT_HASH_DRIFT"],
    [files.runtime.hash, entry.expectedCanonicalTemplateHash, "RUNTIME_HASH_DRIFT"],
    [files.backupBrand.hash, entry.expectedBrandSourceHash, "BACKUP_BRAND_HASH_DRIFT"],
    [files.backupProduct.hash, entry.expectedProductSourceHash, "BACKUP_PRODUCT_HASH_DRIFT"],
    [files.auditRuntime.hash, entry.expectedCanonicalTemplateHash, "AUDIT_RUNTIME_HASH_DRIFT"],
    [files.projected.hash, entry.expectedProjectedBusinessHash, "PROJECTED_HASH_DRIFT"]
  ]) if (actual !== expected) reasons.push(reason);
  let reviewed;
  try { reviewed = JSON.parse(files.dryRun.source); } catch { reasons.push("DRY_RUN_JOURNAL_INVALID"); }
  if (reviewed && (reviewed.mode !== "DRY_RUN" || reviewed.changed !== false || reviewed.blocked !== false || reviewed.hashes?.projectedBusiness !== entry.expectedProjectedBusinessHash)) reasons.push("DRY_RUN_NOT_APPROVED");
  if (await exists(paths.destination)) reasons.push("BUSINESS_SOURCE_COLLISION");
  if (!skipClaimCheck) { const claim = await claimReason(paths); if (claim) reasons.push(claim); }
  validateBusinessIdentity(files.projected, reasons, "PROJECTED_BUSINESS");
  const material = planMaterial(entry); const planHash = sha256(JSON.stringify(material));
  return { mode: "PREVIEW", changed: false, blocked: reasons.length > 0, blockedReasons: [...new Set(reasons)], planHash,
    planMaterial: material, paths, files, operations: ["CREATE_SOURCE:jairo-pinto-business:BUSINESS"],
    apex: { hostname: EXPECTED.baseDomain, preserved: true, rewritten: false, isPublishingTarget: false } };
}

async function acquireClaim(paths) {
  const owner = { token: randomUUID(), pid: process.pid, acquiredAt: new Date().toISOString() };
  try { await mkdir(paths.claim); } catch (error) { if (error.code === "EEXIST") throw new Error((await claimReason(paths)) ?? "APPLY_CLAIM_RACE"); throw error; }
  try { await writeFile(paths.claimOwner, json(owner), { encoding: "utf8", flag: "wx" }); }
  catch (error) { throw new Error(`APPLY_CLAIM_INCOMPLETE:${error.code ?? "UNKNOWN"}`); }
  return owner;
}
async function assertOwner(paths, owner) {
  try { const current = JSON.parse(await readFile(paths.claimOwner, "utf8")); if (current.token !== owner.token) throw new Error(); }
  catch { throw new Error("APPLY_CLAIM_OWNERSHIP_LOST"); }
}
async function releaseClaim(paths, owner) { await assertOwner(paths, owner); await rm(paths.claim, { recursive: true }); }

async function writeTemporary(path, source, token) {
  const temporary = `${path}.tmp-${token}`;
  await writeFile(temporary, source, { encoding: "utf8", flag: "wx" });
  return temporary;
}

export async function runJairoBusinessSourceApply(options) {
  const preview = await planJairoBusinessSourceApply(options);
  if (options.mode !== APPLY_MODE) return preview;
  if (options.confirmation !== APPLY_CONFIRMATION) throw new Error(`APPLY_REQUIRES_CONFIRMATION:${APPLY_CONFIRMATION}`);
  if (preview.outcome === "BLOCKED_APPLIED_STATE") return { ...preview, mode: APPLY_MODE };
  if (options.expectedPlanHash !== preview.planHash) throw new Error("APPLY_PLAN_HASH_MISMATCH");
  if (preview.outcome === "ALREADY_APPLIED") return { ...preview, mode: APPLY_MODE };
  if (preview.blocked) throw new Error(`APPLY_BLOCKED:${preview.blockedReasons.join(",")}`);
  const owner = await acquireClaim(preview.paths);
  let destinationTemp; let journalTemp; let destinationInstalled = false; let committed = false;
  try {
    if (options.hooks?.onClaimAcquired) await options.hooks.onClaimAcquired(preview.paths, owner);
    await assertOwner(preview.paths, owner);
    const locked = await planJairoBusinessSourceApply({ ...options, skipClaimCheck: true });
    if (locked.blocked || locked.planHash !== preview.planHash) throw new Error("LOCKED_PREFLIGHT_DRIFT");
    await assertOwner(preview.paths, owner);
    destinationTemp = await writeTemporary(preview.paths.destination, locked.files.projected.source, `${owner.token}-business`);
    await assertOwner(preview.paths, owner);
    await rename(destinationTemp, preview.paths.destination); destinationInstalled = true; destinationTemp = null;
    if (options.hooks?.afterDestinationWrite) await options.hooks.afterDestinationWrite(preview.paths, owner);
    await assertOwner(preview.paths, owner);
    const persisted = await required(preview.paths.destination); const postReasons = [];
    if (persisted.hash !== locked.files.projected.hash) postReasons.push("POST_HASH_FAILED");
    validateBusinessIdentity(persisted, postReasons, "POST_DESTINATION");
    const [brand, product] = await Promise.all([required(preview.paths.brand), required(preview.paths.product)]);
    if (brand.hash !== locked.files.brand.hash || product.hash !== locked.files.product.hash) postReasons.push("READ_ONLY_SOURCE_DRIFT");
    if (postReasons.length) throw new Error(`POST_VERIFICATION_FAILED:${postReasons.join(",")}`);
    await assertOwner(preview.paths, owner);
    const journal = { mode: APPLY_MODE, changed: true, planHash: locked.planHash, appliedAt: new Date().toISOString(), hashes: locked.planMaterial };
    journalTemp = await writeTemporary(preview.paths.journal, json(journal), `${owner.token}-journal`);
    await assertOwner(preview.paths, owner);
    await rename(journalTemp, preview.paths.journal); journalTemp = null; committed = true;
    if (options.hooks?.afterJournal) await options.hooks.afterJournal(preview.paths, owner);
    await assertOwner(preview.paths, owner);
    await releaseClaim(preview.paths, owner);
    return { ...locked, mode: APPLY_MODE, outcome: "APPLIED", changed: true, journalPath: preview.paths.journal, postVerification: "PASSED" };
  } catch (error) {
    if (committed) {
      if (error.message === "APPLY_CLAIM_OWNERSHIP_LOST") throw error;
      throw new Error(`APPLY_POST_COMMIT_CLEANUP_FAILED:${error.message}`);
    }
    try { await assertOwner(preview.paths, owner); } catch { throw new Error("APPLY_CLAIM_OWNERSHIP_LOST"); }
    if (destinationInstalled) { await assertOwner(preview.paths, owner); await rm(preview.paths.destination, { force: true }); }
    if (destinationTemp) { await assertOwner(preview.paths, owner); await rm(destinationTemp, { force: true }); }
    if (journalTemp) { await assertOwner(preview.paths, owner); await rm(journalTemp, { force: true }); }
    await releaseClaim(preview.paths, owner);
    throw error;
  }
}

async function main() {
  const arg = (name) => process.argv.find((item) => item.startsWith(`--${name}=`))?.slice(name.length + 3);
  if (process.argv.includes("--apply")) throw new Error(`GENERIC_APPLY_DISABLED:use --mode=${APPLY_MODE}`);
  const manifestPath = arg("manifest"); if (!manifestPath) throw new Error("MANIFEST_REQUIRED");
  const result = await runJairoBusinessSourceApply({ sourceDirectory: process.env.PRODUCT_PAGE_SOURCE_DIR ?? "/data/generated-sites/.sources",
    runtimePath: process.env.PRODUCT_PAGE_BUSINESS_TEMPLATE_CONFIG ?? "/app/runtime-assets/business-config.js", manifestPath,
    mode: arg("mode") ?? "PREVIEW", confirmation: arg("confirm"), expectedPlanHash: arg("expected-plan-hash") });
  process.stdout.write(json(result)); if (result.blocked) process.exitCode = 2;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch((error) => { process.stderr.write(json({ error: error.message })); process.exitCode = 1; });
