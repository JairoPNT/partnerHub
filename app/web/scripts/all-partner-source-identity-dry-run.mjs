import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const ECOSYSTEMS = ["PRODUCT", "BUSINESS", "PERSONAL_BRAND"];
const SUFFIX = { PRODUCT: "-product", BUSINESS: "-business", PERSONAL_BRAND: "" };
const LABEL = { PRODUCT: "producto", BUSINESS: "negocio", PERSONAL_BRAND: "brand" };
const HASH = /^[0-9a-f]{64}$/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
function canonicalJson(value) { return `${JSON.stringify(value, null, 2)}\n`; }

export function normalizeInventory(inventory) {
  return inventory.map((entry) => `${entry.siteId}|${entry.domain.toLowerCase()}|${entry.ecosystemType ?? "null"}|${entry.verificationState}`)
    .sort().join("\n");
}

function validateManifest(manifest) {
  if (manifest?.confirmation !== "DRY_RUN_ONE_PARTNER_SOURCE_IDENTITY" || !Array.isArray(manifest.allowlist) || manifest.allowlist.length !== 1) {
    throw new Error("Manifest requires DRY_RUN confirmation and exactly one allowlisted partner.");
  }
  const selected = manifest.allowlist[0];
  if (!UUID.test(selected.activationLeadId ?? "") || typeof selected.siteId !== "string") throw new Error("Allowlist identity is invalid.");
  if (!HASH.test(manifest.expectedInventoryHash ?? "") || !HASH.test(manifest.expectedEntitlementsHash ?? "")) throw new Error("Reviewed inventory and entitlement hashes are required.");
  return selected;
}

export function planPartnerIdentity({ inventory, entitlements, existingSources, existingTargets, manifest }) {
  const selected = validateManifest(manifest);
  const inventoryHash = sha256(normalizeInventory(inventory));
  const entitlementsHash = sha256(canonicalJson(entitlements));
  if (inventoryHash !== manifest.expectedInventoryHash.toLowerCase()) throw new Error("INVENTORY_HASH_MISMATCH");
  if (entitlementsHash !== manifest.expectedEntitlementsHash.toLowerCase()) throw new Error("ENTITLEMENTS_HASH_MISMATCH");
  const records = inventory.filter((entry) => entry.siteId === selected.siteId);
  const entitlementRecords = entitlements.filter((entry) => entry.siteId === selected.siteId && entry.activationLeadId === selected.activationLeadId);
  if (records.length !== 1 || entitlementRecords.length !== 1) throw new Error("ALLOWLIST_IDENTITY_NOT_UNIQUE");
  const record = records[0];
  const entitlement = entitlementRecords[0];
  const blockedReasons = [];
  if (record.ecosystemType == null) blockedReasons.push("ECOSYSTEM_TYPE_NULL");
  if (!Array.isArray(entitlement.includedEcosystems) || entitlement.includedEcosystems.length === 0 || entitlement.includedEcosystems.some((item) => !ECOSYSTEMS.includes(item))) {
    blockedReasons.push("ENTITLEMENT_UNKNOWN");
  }
  if (record.ecosystemType && !entitlement.includedEcosystems?.includes(record.ecosystemType)) blockedReasons.push("SOURCE_ENTITLEMENT_CONTRADICTION");
  if ((entitlement.includedEcosystems?.length ?? 0) > 1 && !entitlement.includedEcosystems.includes("PERSONAL_BRAND")) blockedReasons.push("MULTI_ECOSYSTEM_BRAND_REDIRECT_UNENTITLED");
  const baseDomain = record.domain.toLowerCase();
  const projections = (entitlement.includedEcosystems ?? []).map((ecosystemType) => ({
    ecosystemType,
    siteId: `${selected.siteId}${SUFFIX[ecosystemType]}`,
    publicHost: `${LABEL[ecosystemType]}.${baseDomain}`
  }));
  for (const projection of projections) {
    const source = existingSources.find((item) => item.siteId === projection.siteId);
    if (source && source.ecosystemType !== projection.ecosystemType) blockedReasons.push(`SOURCE_COLLISION:${projection.siteId}`);
    for (const target of existingTargets) {
      const identical = target.ownerKey === selected.activationLeadId && target.siteId === projection.siteId && target.ecosystemType === projection.ecosystemType && target.publicHost === projection.publicHost;
      if (!identical && target.siteId === projection.siteId) blockedReasons.push(`TARGET_SITE_ID_CONFLICT:${projection.siteId}`);
      if (!identical && target.publicHost?.toLowerCase() === projection.publicHost) blockedReasons.push(`TARGET_HOST_CONFLICT:${projection.publicHost}`);
    }
  }
  const rootEcosystem = entitlement.includedEcosystems?.length === 1 ? entitlement.includedEcosystems[0] : "PERSONAL_BRAND";
  const rootProjection = projections.find((item) => item.ecosystemType === rootEcosystem) ?? null;
  const recommendedOrder = inventory.map((item) => ({ siteId: item.siteId, blocked: item.ecosystemType == null }))
    .sort((left, right) => Number(left.blocked) - Number(right.blocked) || Number(right.siteId === "claudia-calero") - Number(left.siteId === "claudia-calero") || left.siteId.localeCompare(right.siteId));
  return {
    mode: "DRY_RUN", changed: false, blocked: blockedReasons.length > 0, blockedReasons: [...new Set(blockedReasons)],
    inventoryHash, entitlementsHash,
    partner: { activationLeadId: selected.activationLeadId, siteId: selected.siteId, baseDomain, sourceEcosystemType: record.ecosystemType },
    apex: { hostname: baseDomain, preserved: true, rewritten: false, redirectTarget: rootProjection?.publicHost ?? null },
    projections,
    currentSourceMigrationRequired: projections.some((item) => item.siteId === selected.siteId && record.ecosystemType !== item.ecosystemType),
    recommendedOrder
  };
}

async function optionalJson(path, siteId) {
  try { const source = await readFile(resolve(path, `${siteId}.json`), "utf8"); return { siteId, source, value: JSON.parse(source), hash: sha256(source) }; }
  catch (error) { if (error.code === "ENOENT") return null; throw error; }
}

async function listTargets(directory) {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    return Promise.all(entries.filter((entry) => entry.isFile() && entry.name.endsWith(".json")).map(async (entry) => JSON.parse(await readFile(resolve(directory, entry.name), "utf8"))));
  } catch (error) { if (error.code === "ENOENT") return []; throw error; }
}

export async function runPartnerIdentityDryRun({ inventoryPath, entitlementsPath, manifestPath, sourceDirectory, auditDirectory, now = new Date() }) {
  const [inventorySource, entitlementsSource, manifestSource, targets] = await Promise.all([
    readFile(resolve(inventoryPath), "utf8"), readFile(resolve(entitlementsPath), "utf8"), readFile(resolve(manifestPath), "utf8"), listTargets(resolve(sourceDirectory, ".publishing-targets"))
  ]);
  const inventory = JSON.parse(inventorySource); const entitlements = JSON.parse(entitlementsSource); const manifest = JSON.parse(manifestSource);
  const selected = validateManifest(manifest);
  const canonicalIds = ECOSYSTEMS.map((ecosystem) => `${selected.siteId}${SUFFIX[ecosystem]}`);
  const sourceFiles = (await Promise.all(canonicalIds.map((siteId) => optionalJson(sourceDirectory, siteId)))).filter(Boolean);
  const existingSources = sourceFiles.map((file) => ({ siteId: file.siteId, ecosystemType: file.value.ecosystemType ?? null, hash: file.hash }));
  const verification = await optionalJson(resolve(sourceDirectory, ".verifications"), selected.siteId);
  const history = await optionalJson(resolve(sourceDirectory, ".history"), selected.siteId);
  const plan = planPartnerIdentity({ inventory, entitlements, existingSources, existingTargets: targets, manifest });
  const backupDirectory = resolve(auditDirectory, `${now.toISOString().replaceAll(":", "-")}-${selected.siteId}-identity-plan`);
  await mkdir(backupDirectory, { recursive: true });
  await Promise.all([
    writeFile(resolve(backupDirectory, "inventory.json"), inventorySource), writeFile(resolve(backupDirectory, "entitlements.json"), entitlementsSource),
    writeFile(resolve(backupDirectory, "manifest.json"), manifestSource), writeFile(resolve(backupDirectory, "sources.json"), canonicalJson(existingSources)),
    writeFile(resolve(backupDirectory, "targets.json"), canonicalJson(targets)), writeFile(resolve(backupDirectory, "dry-run.json"), canonicalJson({ ...plan, dependentHashes: { verification: verification?.hash ?? null, history: history?.hash ?? null } }))
  ]);
  return { ...plan, backupDirectory, dependentHashes: { verification: verification?.hash ?? null, history: history?.hash ?? null } };
}

async function main() {
  if (process.argv.some((value) => value === "--apply" || value.startsWith("--mode=APPLY"))) throw new Error("APPLY is not implemented.");
  const arg = (name) => process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);
  const [inventoryPath, entitlementsPath, manifestPath] = [arg("inventory"), arg("entitlements"), arg("manifest")];
  if (!inventoryPath || !entitlementsPath || !manifestPath) throw new Error("--inventory, --entitlements and --manifest are required.");
  const result = await runPartnerIdentityDryRun({ inventoryPath, entitlementsPath, manifestPath, sourceDirectory: process.env.PRODUCT_PAGE_SOURCE_DIR ?? "/data/generated-sites/.sources", auditDirectory: process.env.PRODUCT_PAGE_MIGRATION_AUDIT_DIR ?? "/data/generated-sites/.migration-audits" });
  process.stdout.write(canonicalJson(result));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((error) => { process.stderr.write(canonicalJson({ error: error.message })); process.exitCode = 1; });
