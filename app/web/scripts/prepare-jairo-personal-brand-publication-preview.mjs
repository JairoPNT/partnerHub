import { createHash } from "node:crypto";
import { lstat, readFile } from "node:fs/promises";
import { posix, resolve, sep } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

import { planPersonalBrandMasterPackage } from "./jairo-personal-brand-master-package.mjs";

const REQUEST_ID = "CDX-20260910-003";
const OWNER_KEY = "f403f29e-95c8-4825-9320-967376443020";
const SITE_ID = "jairo-pinto";
const ECOSYSTEM_TYPE = "PERSONAL_BRAND";
const BASE_DOMAIN = "jairopinto.pro";
const PUBLIC_HOST = "jairopinto.pro";
const MASTER_SITE_ID = "ganomaster-personal-brand";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

function inside(root, child) {
  const base = resolve(root);
  const target = resolve(base, child);
  if (!target.startsWith(`${base}${sep}`)) throw new Error("PERSONAL_BRAND_LOCAL_PATH_ESCAPE");
  return target;
}

async function readOptional(path) {
  try {
    const metadata = await lstat(path);
    if (!metadata.isFile() || metadata.isSymbolicLink()) throw new Error("PERSONAL_BRAND_ARTIFACT_NOT_REGULAR");
    return await readFile(path);
  }
  catch (error) { if (error && typeof error === "object" && error.code === "ENOENT") return null; throw error; }
}

async function readJson(path, missingReason, invalidReason, reasons) {
  let bytes;
  try { bytes = await readOptional(path); }
  catch { reasons.push(invalidReason); return { bytes: null, value: null, hash: "UNREADABLE" }; }
  if (!bytes) { reasons.push(missingReason); return { bytes: null, value: null, hash: "ABSENT" }; }
  try { return { bytes, value: JSON.parse(bytes), hash: sha256(bytes) }; }
  catch { reasons.push(invalidReason); return { bytes, value: null, hash: sha256(bytes) }; }
}

function validSource(source) {
  return source?.site?.id === SITE_ID && source?.ecosystemType === ECOSYSTEM_TYPE;
}

function validEntitlement(entitlement) {
  const expectedTarget = entitlement?.expectedTargets?.find((entry) => entry?.ecosystemType === ECOSYSTEM_TYPE);
  return entitlement?.activationLeadId === OWNER_KEY
    && entitlement?.commercialState === "KNOWN"
    && Array.isArray(entitlement?.includedEcosystems)
    && entitlement.includedEcosystems.includes(ECOSYSTEM_TYPE)
    && expectedTarget?.role === "ROOT"
    && expectedTarget?.publicHost === PUBLIC_HOST;
}

function targetReadiness(target) {
  if (!target) return { validIdentity: false, ready: false, remoteRootPresent: false };
  const validIdentity = target.version === 2
    && target.ownerKey === OWNER_KEY
    && target.siteId === SITE_ID
    && target.ecosystemType === ECOSYSTEM_TYPE
    && target.baseDomain === BASE_DOMAIN
    && target.publicHost === PUBLIC_HOST;
  const normalizedRemoteRoot = typeof target.remoteRoot === "string" ? posix.normalize(target.remoteRoot).replace(/\/+$/, "") || "/" : null;
  const remoteRootPresent = typeof normalizedRemoteRoot === "string" && normalizedRemoteRoot.startsWith("/") && normalizedRemoteRoot !== "/";
  const ready = remoteRootPresent
    && target.provisioningState === "READY"
    && target.dnsState === "RESOLVED"
    && target.sslState === "READY"
    && ["PENDING", "READY"].includes(target.publicationState);
  return { validIdentity, ready, remoteRootPresent, normalizedRemoteRoot };
}

function resolvePaths(options = {}) {
  const sourceDirectory = resolve(options.sourceDirectory ?? "/data/generated-sites/.sources");
  const outputDirectory = resolve(options.outputDirectory ?? "/data/generated-sites");
  return {
    sourcePath: inside(sourceDirectory, `${SITE_ID}.json`),
    targetPath: inside(inside(sourceDirectory, ".publishing-targets"), `${SITE_ID}.json`),
    entitlementPath: resolve(options.entitlementPath ?? "/data/generated-sites/.migration-inputs/CDX-20260910-003/entitlement.json"),
    outputDirectory,
    templateDirectory: resolve(options.templateDirectory ?? "/app/plantillas-de-pagina/personal-brand")
  };
}

export async function preparePersonalBrandPublicationPreview(options = {}) {
  const paths = resolvePaths(options);
  const reasons = [];
  const [source, entitlement, target] = await Promise.all([
    readJson(paths.sourcePath, "PERSONAL_BRAND_SOURCE_MISSING_OR_UNREADABLE", "PERSONAL_BRAND_SOURCE_MISSING_OR_UNREADABLE", reasons),
    readJson(paths.entitlementPath, "PERSONAL_BRAND_ENTITLEMENT_INVALID", "PERSONAL_BRAND_ENTITLEMENT_INVALID", reasons),
    readJson(paths.targetPath, "PERSONAL_BRAND_TARGET_MISSING", "PERSONAL_BRAND_APEX_TARGET_INVALID", reasons)
  ]);
  if (source.value && !validSource(source.value)) reasons.push("PERSONAL_BRAND_SOURCE_IDENTITY_INVALID");
  if (entitlement.value && !validEntitlement(entitlement.value)) reasons.push("PERSONAL_BRAND_ENTITLEMENT_INVALID");
  const readiness = targetReadiness(target.value);
  if (target.value && !readiness.validIdentity) reasons.push("PERSONAL_BRAND_APEX_TARGET_INVALID");
  if (target.value && readiness.validIdentity && !readiness.ready) reasons.push("PERSONAL_BRAND_TARGET_NOT_READY");

  let masterPackage = { destination: { present: false, hash: "ABSENT", typographyDirectoryPresent: false }, disposition: "MASTER_PACKAGE_MISSING", blocked: true };
  try { masterPackage = await planPersonalBrandMasterPackage({ outputRoot: paths.outputDirectory, templateDirectory: paths.templateDirectory }); }
  catch { reasons.push("PERSONAL_BRAND_PACKAGE_DRIFT"); }
  if (!masterPackage.destination.present) reasons.push("PERSONAL_BRAND_MASTER_PACKAGE_MISSING");
  else if (masterPackage.blocked || masterPackage.disposition !== "ALREADY_CURRENT") reasons.push("PERSONAL_BRAND_PACKAGE_DRIFT");

  const identity = { ownerKey: OWNER_KEY, siteId: SITE_ID, ecosystemType: ECOSYSTEM_TYPE, baseDomain: BASE_DOMAIN, publicHost: PUBLIC_HOST, masterSiteId: MASTER_SITE_ID };
  const material = {
    operation: "PREVIEW_PERSONAL_BRAND_APEX_PUBLICATION",
    identity,
    sourceHash: source.hash,
    entitlementHash: entitlement.hash,
    targetHash: target.hash,
    masterPackageHash: masterPackage.destination.hash,
    targetReadiness: {
      provisioningState: target.value?.provisioningState ?? null,
      dnsState: target.value?.dnsState ?? null,
      sslState: target.value?.sslState ?? null,
      publicationState: target.value?.publicationState ?? null,
      remoteRoot: readiness.remoteRootPresent ? readiness.normalizedRemoteRoot : null,
      remoteRootPresent: readiness.remoteRootPresent
    }
  };
  return {
    requestId: REQUEST_ID,
    mode: "PREPARE_AND_PREVIEW",
    changed: false,
    blocked: reasons.length > 0,
    blockedReasons: [...new Set(reasons)],
    planHash: sha256(JSON.stringify(material)),
    planMaterial: material,
    target: {
      present: target.bytes !== null,
      hash: target.hash,
      provisioningState: target.value?.provisioningState ?? null,
      dnsState: target.value?.dnsState ?? null,
      sslState: target.value?.sslState ?? null,
      publicationState: target.value?.publicationState ?? null,
      remoteRootPresent: readiness.remoteRootPresent
    },
    safety: { providerCallsMade: false, sftpAdapterCreated: false, localWritesMade: false, remoteWritesMade: false, publishingTargetMutable: false }
  };
}

async function main() { process.stdout.write(json(await preparePersonalBrandPublicationPreview())); }

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch(() => { process.stderr.write(json({ error: "PERSONAL_BRAND_PUBLICATION_PREVIEW_FAILED" })); process.exitCode = 1; });
}
