import { createHash } from "node:crypto";
import { access, readdir, readFile } from "node:fs/promises";
import { isIP } from "node:net";
import { resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const CONFIRMATION = "PREVIEW_JAIRO_BUSINESS_PUBLISHING";
const EXPECTED = Object.freeze({
  activationLeadId: "f403f29e-95c8-4825-9320-967376443020",
  ownerSiteId: "jairo-pinto",
  siteId: "jairo-pinto-business",
  ecosystemType: "BUSINESS",
  rootEcosystemType: "PERSONAL_BRAND",
  baseDomain: "jairopinto.pro",
  publicHost: "negocio.jairopinto.pro"
});
const EXPECTED_SOURCE_HASH = "795ede8048a4d882960f08dc633de5ca0e58c810066c0e854e35fdf9531f8725";
const HASH = /^[0-9a-f]{64}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REQUIRED_CONFIGURATION = [
  "HOSTINGER_API_TOKEN", "HOSTINGER_SFTP_USERNAME", "HOSTINGER_SFTP_HOST",
  "HOSTINGER_SFTP_PORT", "HOSTINGER_SFTP_PASSWORD", "HOSTINGER_SFTP_REMOTE_ROOT",
  "CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ZONE_ID", "PARTNERHUB_PROVISIONING_IPV4"
];
const REQUIRED_PACKAGE_FILES = ["index.html", "app.js", "styles.css", "config.js", "favicon.svg"];
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

async function optionalText(path) {
  try { return await readFile(path, "utf8"); }
  catch (error) { if (error.code === "ENOENT") return null; throw error; }
}

function validateManifest(manifest) {
  if (manifest?.confirmation !== CONFIRMATION || !Array.isArray(manifest.allowlist) || manifest.allowlist.length !== 1) {
    throw new Error(`Manifest requires confirmation=${CONFIRMATION} and exactly one allowlisted site.`);
  }
  const entry = manifest.allowlist[0];
  for (const [field, expected] of Object.entries(EXPECTED)) {
    if (entry?.[field] !== expected) throw new Error(`Allowlist ${field} must equal ${expected}.`);
  }
  if (entry.expectedSourceHash !== EXPECTED_SOURCE_HASH || !HASH.test(entry.expectedEntitlementHash ?? "")) {
    throw new Error("Manifest source and entitlement hashes must be the approved complete SHA-256 values.");
  }
  return entry;
}

function validateSource(source) {
  const reasons = [];
  if (source?.site?.id !== EXPECTED.siteId) reasons.push("SOURCE_SITE_ID_INVALID");
  if (source?.ecosystemType !== EXPECTED.ecosystemType) reasons.push("SOURCE_ECOSYSTEM_INVALID");
  if (source?.site?.domain !== EXPECTED.publicHost) reasons.push("SOURCE_PUBLIC_HOST_INVALID");
  return reasons;
}

function validateEntitlement(entitlement) {
  const reasons = [];
  if (entitlement?.activationLeadId !== EXPECTED.activationLeadId || entitlement?.commercialState !== "KNOWN") {
    reasons.push("ENTITLEMENT_IDENTITY_INVALID");
  }
  if (!entitlement?.includedEcosystems?.includes("BUSINESS")) reasons.push("BUSINESS_NOT_ENTITLED");
  const target = entitlement?.expectedTargets?.find((item) => item.ecosystemType === "BUSINESS");
  if (target?.role !== "SUBDOMAIN" || target?.publicHost !== EXPECTED.publicHost) {
    reasons.push("ENTITLEMENT_BUSINESS_TARGET_INVALID");
  }
  if (entitlement?.rootRedirectApex?.preserved !== true || entitlement?.rootRedirectApex?.isPublishingTarget !== false) {
    reasons.push("APEX_PRESERVATION_NOT_CONFIRMED");
  }
  return reasons;
}

async function rawTargets(directory) {
  let entries;
  try { entries = await readdir(directory, { withFileTypes: true }); }
  catch (error) { if (error.code === "ENOENT") return { targets: [], invalid: [] }; throw error; }
  const targets = []; const invalid = [];
  for (const entry of entries.filter((item) => item.isFile() && item.name.endsWith(".json"))) {
    try {
      const target = JSON.parse(await readFile(resolve(directory, entry.name), "utf8"));
      if (target?.version !== 2 || !UUID.test(target?.ownerKey ?? "") || typeof target?.siteId !== "string" ||
          !["PRODUCT", "BUSINESS", "PERSONAL_BRAND"].includes(target?.ecosystemType) ||
          !["PRODUCT", "BUSINESS", "PERSONAL_BRAND"].includes(target?.rootEcosystemType) ||
          typeof target?.baseDomain !== "string" || typeof target?.publicHost !== "string" ||
          typeof target?.provisioningState !== "string" || typeof target?.publicationState !== "string") {
        invalid.push(entry.name);
      } else targets.push(target);
    } catch { invalid.push(entry.name); }
  }
  return { targets, invalid };
}

function targetDisposition(targets) {
  const identity = { ownerKey: EXPECTED.activationLeadId, siteId: EXPECTED.siteId, ecosystemType: EXPECTED.ecosystemType,
    rootEcosystemType: EXPECTED.rootEcosystemType, baseDomain: EXPECTED.baseDomain, publicHost: EXPECTED.publicHost };
  const candidates = targets.filter((target) => target.siteId === EXPECTED.siteId || target.publicHost === EXPECTED.publicHost ||
    (target.ownerKey === EXPECTED.activationLeadId && target.ecosystemType === EXPECTED.ecosystemType));
  if (candidates.length === 0) return { action: "CREATE_BUSINESS_TARGET", target: null, conflicts: [] };
  const exact = candidates.filter((target) => Object.entries(identity).every(([key, value]) => target[key] === value));
  const conflicts = candidates.filter((target) => !exact.includes(target)).map((target) => ({ siteId: target.siteId, ecosystemType: target.ecosystemType,
    publicHost: target.publicHost, reason: "IMMUTABLE_IDENTITY_CONFLICT" }));
  if (conflicts.length > 0 || exact.length !== 1) return { action: "BLOCK", target: null, conflicts };
  return { action: exact[0].provisioningState === "READY" ? "REUSE_READY_TARGET" : "RESUME_TARGET_PROVISIONING",
    target: { siteId: exact[0].siteId, provisioningState: exact[0].provisioningState, publicationState: exact[0].publicationState,
      publicHost: exact[0].publicHost, remoteRootPresent: typeof exact[0].remoteRoot === "string" && exact[0].remoteRoot.startsWith("/") }, conflicts: [] };
}

export async function runJairoBusinessPublishingPreflight({ sourceDirectory, outputDirectory, manifestPath, environment = process.env }) {
  const manifestText = await optionalText(resolve(manifestPath));
  if (!manifestText) throw new Error("Manifest does not exist.");
  const entry = validateManifest(JSON.parse(manifestText));
  const sourcePath = resolve(sourceDirectory, `${EXPECTED.siteId}.json`);
  const entitlementPath = resolve(manifestPath, "..").replace(/[\\/]manifest\.json$/, "");
  const sourceText = await optionalText(sourcePath);
  const entitlementText = await optionalText(resolve(entitlementPath, "entitlement.json"));
  if (!sourceText || !entitlementText) throw new Error("Source or entitlement snapshot is missing.");
  const sourceHash = sha256(sourceText); const entitlementHash = sha256(entitlementText);
  const source = JSON.parse(sourceText); const entitlement = JSON.parse(entitlementText);
  const inventory = await rawTargets(resolve(sourceDirectory, ".publishing-targets"));
  const disposition = targetDisposition(inventory.targets);
  const missingConfiguration = REQUIRED_CONFIGURATION.filter((name) => !environment[name]?.trim());
  const invalidConfiguration = [];
  if (environment.HOSTINGER_SFTP_PORT && (!Number.isInteger(Number(environment.HOSTINGER_SFTP_PORT)) || Number(environment.HOSTINGER_SFTP_PORT) < 1 || Number(environment.HOSTINGER_SFTP_PORT) > 65535)) invalidConfiguration.push("HOSTINGER_SFTP_PORT");
  if (environment.PARTNERHUB_PROVISIONING_IPV4 && isIP(environment.PARTNERHUB_PROVISIONING_IPV4) !== 4) invalidConfiguration.push("PARTNERHUB_PROVISIONING_IPV4");
  const masterDirectory = resolve(outputDirectory, "ganomaster-business");
  const missingMasterFiles = [];
  for (const filename of REQUIRED_PACKAGE_FILES) {
    try { await access(resolve(masterDirectory, filename)); } catch { missingMasterFiles.push(filename); }
  }
  const blockedReasons = [
    ...(sourceHash === entry.expectedSourceHash ? [] : ["SOURCE_HASH_DRIFT"]),
    ...(entitlementHash === entry.expectedEntitlementHash ? [] : ["ENTITLEMENT_HASH_DRIFT"]),
    ...validateSource(source), ...validateEntitlement(entitlement),
    ...inventory.invalid.map((name) => `INVALID_PUBLISHING_TARGET:${name}`),
    ...(disposition.action === "BLOCK" ? ["PUBLISHING_TARGET_CONFLICT"] : []),
    ...(disposition.action === "REUSE_READY_TARGET" && !disposition.target?.remoteRootPresent ? ["READY_TARGET_REMOTE_ROOT_MISSING"] : []),
    ...missingConfiguration.map((name) => `CONFIGURATION_MISSING:${name}`),
    ...invalidConfiguration.map((name) => `CONFIGURATION_INVALID:${name}`),
    ...missingMasterFiles.map((name) => `BUSINESS_MASTER_PACKAGE_MISSING:${name}`)
  ];
  return {
    requestId: "CDX-20260824-004", mode: "PREVIEW", changed: false, blocked: blockedReasons.length > 0,
    blockedReasons: [...new Set(blockedReasons)], source: { path: sourcePath, sha256: sourceHash, identity: EXPECTED },
    entitlement: { sha256: entitlementHash, businessConfirmed: !validateEntitlement(entitlement).some((reason) => reason.includes("BUSINESS")) },
    targetInventory: { parsedV2: inventory.targets.length, invalidFiles: inventory.invalid, disposition },
    configuration: { secretsExposed: false, providerCallsMade: false, missing: missingConfiguration, invalid: invalidConfiguration,
      providerAvailability: "NOT_PROBED_IN_READ_ONLY_PREVIEW" },
    generator: { supportedEcosystem: "BUSINESS", sourceMode: "SAVED_SOURCE", templateMode: "PUBLISHED_MASTER",
      masterSiteId: "ganomaster-business", masterPackageDirectory: masterDirectory, missingRequiredFiles: missingMasterFiles },
    plan: ["PROVISION_BUSINESS_TARGET", "WAIT_DNS_AND_SSL_READY", "REGENERATE_BUSINESS_FROM_SAVED_SOURCE",
      "PUBLISH_BUSINESS_PACKAGE_TO_PROVISIONED_REMOTE_ROOT", "VERIFY_PUBLIC_BUSINESS", "RECORD_RESULT"],
    isolation: { allowedSiteIds: [EXPECTED.siteId], apexPreserved: true, apexIsPublishingTarget: false,
      forbiddenSiteIds: [EXPECTED.ownerSiteId, "jairo-pinto-product"], legacyRemoteRootFallbackAllowed: false }
  };
}

async function main() {
  if (process.argv.some((value) => value === "--apply" || value.startsWith("--mode=APPLY"))) throw new Error("APPLY is not implemented by this PREVIEW command.");
  const argument = (name) => process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);
  const manifestPath = argument("manifest"); if (!manifestPath) throw new Error("--manifest=<path> is required.");
  const result = await runJairoBusinessPublishingPreflight({ sourceDirectory: process.env.PRODUCT_PAGE_SOURCE_DIR ?? "/data/generated-sites/.sources",
    outputDirectory: process.env.PRODUCT_PAGE_OUTPUT_DIR ?? "/data/generated-sites", manifestPath, environment: process.env });
  process.stdout.write(json(result));
  if (result.blocked) process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((error) => {
  process.stderr.write(json({ error: error instanceof Error ? error.message : "PREVIEW failed." })); process.exitCode = 1;
});
