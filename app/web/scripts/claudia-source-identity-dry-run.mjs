import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import vm from "node:vm";

const CONFIRMATION = "DRY_RUN_CLAUDIA_SOURCE_IDENTITY";
const EXPECTED = {
  sourceSiteId: "claudia-calero",
  productSiteId: "claudia-calero-product",
  brandSiteId: "claudia-calero",
  baseDomain: "claudiacalero.pro"
};

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function validateManifest(manifest) {
  if (manifest?.confirmation !== CONFIRMATION || !Array.isArray(manifest.allowlist) || manifest.allowlist.length !== 1) {
    throw new Error(`Manifest requires confirmation=${CONFIRMATION} and exactly one allowlisted migration.`);
  }
  const entry = manifest.allowlist[0];
  for (const [key, value] of Object.entries(EXPECTED)) {
    if (entry[key] !== value) throw new Error(`Allowlist ${key} must equal ${value}.`);
  }
  if (!/^[0-9a-f]{64}$/i.test(entry.expectedSourceHash ?? "")) throw new Error("A complete expectedSourceHash is required.");
  return entry;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function buildSourceIdentityPlan({ source, canonicalBrand, manifestEntry, sourceHash, dependentHashes, productDestinationExists }) {
  const blockedReasons = [];
  if (sourceHash !== manifestEntry.expectedSourceHash.toLowerCase()) blockedReasons.push("SOURCE_HASH_MISMATCH");
  if (source?.ecosystemType !== "PRODUCT" || source?.site?.id !== EXPECTED.sourceSiteId) blockedReasons.push("SOURCE_IDENTITY_NOT_PRODUCT");
  if (canonicalBrand?.ecosystemType !== "PERSONAL_BRAND") blockedReasons.push("CANONICAL_BRAND_TEMPLATE_INVALID");
  if (productDestinationExists) blockedReasons.push("PRODUCT_DESTINATION_ALREADY_EXISTS");

  const projectedProduct = clone(source);
  projectedProduct.site = { ...projectedProduct.site, id: EXPECTED.productSiteId, appName: EXPECTED.productSiteId };
  const projectedBrand = clone(canonicalBrand);
  projectedBrand.site = {
    ...projectedBrand.site,
    id: EXPECTED.brandSiteId,
    appName: EXPECTED.brandSiteId,
    domain: EXPECTED.baseDomain
  };

  return {
    mode: "DRY_RUN",
    changed: false,
    blocked: blockedReasons.length > 0,
    blockedReasons,
    apex: { hostname: EXPECTED.baseDomain, preserved: true, rewritten: false },
    hashes: {
      source: sourceHash,
      canonicalBrandTemplate: sha256(JSON.stringify(canonicalBrand)),
      projectedProduct: sha256(`${JSON.stringify(projectedProduct, null, 2)}\n`),
      projectedBrand: sha256(`${JSON.stringify(projectedBrand, null, 2)}\n`),
      ...dependentHashes
    },
    projections: {
      product: { siteId: EXPECTED.productSiteId, ecosystemType: "PRODUCT", publicHost: "producto.claudiacalero.pro" },
      brand: { siteId: EXPECTED.brandSiteId, ecosystemType: "PERSONAL_BRAND", publicHost: "brand.claudiacalero.pro", source: "CANONICAL_TEMPLATE" }
    },
    cutoverRequired: true,
    projectedProduct,
    projectedBrand
  };
}

async function optionalFile(path) {
  try {
    const source = await readFile(path, "utf8");
    return { path, source, hash: sha256(source) };
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function parseCanonicalConfig(source, filename) {
  const script = new vm.Script(`${source}\n;CONFIG;`, { filename });
  return clone(script.runInNewContext(Object.create(null), { timeout: 1000 }));
}

export async function runSourceIdentityDryRun({ sourceDirectory, canonicalBrandConfigPath, manifestPath, auditDirectory, now = new Date() }) {
  const manifest = JSON.parse(await readFile(resolve(manifestPath), "utf8"));
  const manifestEntry = validateManifest(manifest);
  const sourcePath = resolve(sourceDirectory, `${EXPECTED.sourceSiteId}.json`);
  const productDestinationPath = resolve(sourceDirectory, `${EXPECTED.productSiteId}.json`);
  const [sourceFile, productDestination, verification, history, brandTemplateSource] = await Promise.all([
    optionalFile(sourcePath),
    optionalFile(productDestinationPath),
    optionalFile(resolve(sourceDirectory, ".verifications", `${EXPECTED.sourceSiteId}.json`)),
    optionalFile(resolve(sourceDirectory, ".history", `${EXPECTED.sourceSiteId}.json`)),
    readFile(resolve(canonicalBrandConfigPath), "utf8")
  ]);
  if (!sourceFile) throw new Error("Allowlisted source does not exist.");
  const source = JSON.parse(sourceFile.source);
  const canonicalBrand = parseCanonicalConfig(brandTemplateSource, canonicalBrandConfigPath);
  const dependentHashes = {
    verification: verification?.hash ?? null,
    history: history?.hash ?? null
  };
  const plan = buildSourceIdentityPlan({
    source,
    canonicalBrand,
    manifestEntry,
    sourceHash: sourceFile.hash,
    dependentHashes,
    productDestinationExists: Boolean(productDestination)
  });
  const backupDirectory = resolve(auditDirectory, `${now.toISOString().replaceAll(":", "-")}-claudia-source-identity-dry-run`);
  await mkdir(resolve(backupDirectory, "backup"), { recursive: true });
  await mkdir(resolve(backupDirectory, "projected"), { recursive: true });
  const writes = [
    writeFile(resolve(backupDirectory, "backup", "claudia-calero.json"), sourceFile.source, "utf8"),
    writeFile(resolve(backupDirectory, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8"),
    writeFile(resolve(backupDirectory, "dry-run.json"), `${JSON.stringify({ ...plan, projectedProduct: undefined, projectedBrand: undefined }, null, 2)}\n`, "utf8"),
    writeFile(resolve(backupDirectory, "projected", "claudia-calero-product.json"), `${JSON.stringify(plan.projectedProduct, null, 2)}\n`, "utf8"),
    writeFile(resolve(backupDirectory, "projected", "claudia-calero.json"), `${JSON.stringify(plan.projectedBrand, null, 2)}\n`, "utf8")
  ];
  if (verification) writes.push(writeFile(resolve(backupDirectory, "backup", "claudia-calero.verification.json"), verification.source, "utf8"));
  if (history) writes.push(writeFile(resolve(backupDirectory, "backup", "claudia-calero.history.json"), history.source, "utf8"));
  await Promise.all(writes);
  return { ...plan, projectedProduct: undefined, projectedBrand: undefined, backupDirectory };
}

async function main() {
  if (process.argv.some((value) => value === "--apply" || value.startsWith("--mode=APPLY"))) throw new Error("APPLY is not implemented.");
  const argument = (name) => process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);
  const manifestPath = argument("manifest");
  if (!manifestPath) throw new Error("--manifest=<path> is required.");
  const sourceDirectory = process.env.PRODUCT_PAGE_SOURCE_DIR ?? "/data/generated-sites/.sources";
  const templateRoot = process.env.PRODUCT_PAGE_TEMPLATE_ROOT ?? "/app/plantillas-de-pagina";
  const result = await runSourceIdentityDryRun({
    sourceDirectory,
    canonicalBrandConfigPath: resolve(templateRoot, "personal-brand", "config.js"),
    manifestPath,
    auditDirectory: process.env.PRODUCT_PAGE_MIGRATION_AUDIT_DIR ?? "/data/generated-sites/.migration-audits"
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`${JSON.stringify({ error: error instanceof Error ? error.message : "DRY_RUN failed." })}\n`);
    process.exitCode = 1;
  });
}
