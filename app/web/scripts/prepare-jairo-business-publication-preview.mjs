import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { access, cp, mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname, posix, relative, resolve, sep } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

import { planGuardedPublication } from "./guarded-ecosystem-publication.mjs";
import { planSftpCapabilityProbe } from "./sftp-directory-rename-capability-probe.mjs";

export const PREPARE_MODE = "PREPARE_PACKAGE_AND_PUBLICATION_PREVIEW";
export const PREPARE_CONFIRMATION = "PREPARE_ALLOWLISTED_JAIRO_BUSINESS_PACKAGE";

const REQUEST_ID = "CDX-20260827-001";
const INPUT_ID = REQUEST_ID;
const OWNER_KEY = "f403f29e-95c8-4825-9320-967376443020";
const SITE_ID = "jairo-pinto-business";
const OWNER_SITE_ID = "jairo-pinto";
const PRODUCT_SITE_ID = "jairo-pinto-product";
const MASTER_SITE_ID = "ganomaster-business";
const EXPECTED = Object.freeze({
  ownerKey: OWNER_KEY,
  ownerSiteId: OWNER_SITE_ID,
  productSiteId: PRODUCT_SITE_ID,
  siteId: SITE_ID,
  ecosystemType: "BUSINESS",
  baseDomain: "jairopinto.pro",
  publicHost: "negocio.jairopinto.pro",
  sourceHash: "795ede8048a4d882960f08dc633de5ca0e58c810066c0e854e35fdf9531f8725",
  brandHash: "bafe5f704f8c515b9f6ea20c5379b5c9780c7dbe0da7c0e3734c746d4de1c71c",
  productHash: "9e69a03c9a794b96222cacf8d0bfb5327564f21f0d3bb4d8ab656180e92d7d3c"
});
const HOST_KEY = /^SHA256:[A-Za-z0-9+/]{43}=$/;
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = async (path) => access(path).then(() => true, () => false);

function inside(root, child) {
  const base = resolve(root);
  const target = resolve(base, child);
  if (!target.startsWith(`${base}${sep}`)) throw new Error("LOCAL_PATH_ESCAPE");
  return target;
}

async function required(path) {
  const bytes = await readFile(path);
  return { bytes, hash: sha256(bytes) };
}

async function inventory(directory) {
  if (!(await exists(directory))) return { exists: false, files: [], hash: "ABSENT" };
  const files = [];
  async function visit(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const path = resolve(current, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile()) files.push({ path: relative(directory, path).split(sep).join("/"), hash: sha256(await readFile(path)) });
    }
  }
  await visit(directory);
  files.sort((left, right) => left.path.localeCompare(right.path));
  return { exists: true, files, hash: sha256(JSON.stringify(files)) };
}

function normalizeRemote(path) {
  const normalized = posix.normalize(path ?? "").replace(/\/+$/, "");
  if (!normalized.startsWith("/") || normalized === "/") throw new Error("TARGET_REMOTE_ROOT_INVALID");
  return normalized;
}

function validateTarget(bytes, contract = EXPECTED) {
  const target = JSON.parse(bytes);
  for (const [key, value] of Object.entries({
    version: 2,
    ownerKey: contract.ownerKey,
    siteId: contract.siteId,
    ecosystemType: contract.ecosystemType,
    baseDomain: contract.baseDomain,
    publicHost: contract.publicHost,
    provisioningState: "READY",
    publicationState: "PENDING"
  })) if (target?.[key] !== value) throw new Error(`TARGET_${key.toUpperCase()}_MISMATCH`);
  const remoteRoot = normalizeRemote(target.remoteRoot);
  const parentDirectory = normalizeRemote(posix.dirname(remoteRoot));
  if (parentDirectory === "/") throw new Error("TARGET_PARENT_ROOT_FORBIDDEN");
  return { target, remoteRoot, parentDirectory };
}

function connectionBinding(environment, reasons) {
  const host = environment.HOSTINGER_SFTP_HOST?.trim();
  const port = Number(environment.HOSTINGER_SFTP_PORT);
  const username = environment.HOSTINGER_SFTP_USERNAME?.trim();
  const fingerprint = environment.HOSTINGER_SFTP_HOST_KEY_SHA256?.trim();
  if (!host) reasons.push("SFTP_CONFIGURATION_MISSING:HOSTINGER_SFTP_HOST");
  if (!Number.isInteger(port) || port < 1 || port > 65535) reasons.push("SFTP_PORT_INVALID");
  if (!username) reasons.push("SFTP_CONFIGURATION_MISSING:HOSTINGER_SFTP_USERNAME");
  if (!HOST_KEY.test(fingerprint ?? "")) reasons.push("SFTP_HOST_KEY_FINGERPRINT_INVALID");
  return { host: host ?? "", port, hostKeyFingerprintSha256: fingerprint ?? "", usernameHash: username ? sha256(username) : "" };
}

function capabilityReasons(capability, connection, target, now) {
  const reasons = [];
  if (capability?.schemaVersion !== 1 || capability?.probeVersion !== "partnerhub-sftp-sibling-rename-v1" || capability?.status !== "VERIFIED") reasons.push("SFTP_CAPABILITY_VERSION_OR_STATUS_INVALID");
  for (const field of ["host", "port", "hostKeyFingerprintSha256", "usernameHash"]) if (capability?.connection?.[field] !== connection[field]) reasons.push(`SFTP_CAPABILITY_CONNECTION_MISMATCH:${field}`);
  if (capability?.scope?.parentDirectory !== target.parentDirectory) reasons.push("SFTP_CAPABILITY_PARENT_MISMATCH");
  if (capability?.scope?.remoteRoot !== target.remoteRoot) reasons.push("SFTP_CAPABILITY_REMOTE_ROOT_MISMATCH");
  if (capability?.evidence?.sameFilesystemDirectoryRename !== true || capability?.evidence?.backupRestoreReadback !== true || capability?.evidence?.cleanupVerified !== true || capability?.evidence?.targetIntact !== true) reasons.push("SFTP_DIRECTORY_SWAP_CAPABILITY_UNVERIFIED");
  const verifiedAt = Date.parse(capability?.verifiedAt);
  const ttlSeconds = capability?.ttlSeconds;
  if (!Number.isFinite(verifiedAt) || verifiedAt > now.getTime()) reasons.push("SFTP_CAPABILITY_TIMESTAMP_INVALID");
  if (!Number.isInteger(ttlSeconds) || ttlSeconds < 60 || ttlSeconds > 3600) reasons.push("SFTP_CAPABILITY_TTL_INVALID");
  else if (Number.isFinite(verifiedAt) && now.getTime() > verifiedAt + ttlSeconds * 1000) reasons.push("SFTP_CAPABILITY_EXPIRED");
  return reasons;
}

function createProbeManifest(targetBytes, target, contract = EXPECTED) {
  const probeToken = randomUUID();
  const canaryHex = randomBytes(32).toString("hex");
  const path = (kind) => posix.join(target.parentDirectory, `.partnerhub-capability-${kind}-${probeToken}`);
  return {
    confirmation: "PREVIEW_SFTP_DIRECTORY_RENAME_CAPABILITY",
    allowlist: [{
      ownerKey: contract.ownerKey,
      siteId: contract.siteId,
      ecosystemType: contract.ecosystemType,
      baseDomain: contract.baseDomain,
      publicHost: contract.publicHost,
      expectedTargetHash: sha256(targetBytes),
      remoteRoot: target.remoteRoot,
      parentDirectory: target.parentDirectory,
      probeToken,
      paths: { claim: path("claim"), stage: path("stage"), destination: path("destination"), backup: path("backup") },
      canaryHex,
      ttlSeconds: 3600
    }]
  };
}

function resolvePaths(options = {}) {
  const outputDirectory = resolve(options.outputDirectory ?? process.env.PRODUCT_PAGE_OUTPUT_DIR ?? "/data/generated-sites");
  const sourceDirectory = resolve(options.sourceDirectory ?? process.env.PRODUCT_PAGE_SOURCE_DIR ?? "/data/generated-sites/.sources");
  const inputParent = resolve(options.inputParent ?? "/data/generated-sites/.publication-inputs");
  const inputDirectory = inside(inputParent, INPUT_ID);
  return {
    outputDirectory,
    sourceDirectory,
    inputParent,
    inputDirectory,
    probeManifestPath: inside(inputDirectory, "sftp-probe-manifest.json"),
    capabilityPath: inside(inputDirectory, "sftp-capability.json"),
    publicationManifestPath: inside(inputDirectory, "manifest.json"),
    preparationPath: inside(inputDirectory, "preparation.json"),
    targetPath: inside(resolve(sourceDirectory, ".publishing-targets"), `${SITE_ID}.json`),
    sourcePath: inside(sourceDirectory, `${SITE_ID}.json`),
    brandPath: inside(sourceDirectory, `${OWNER_SITE_ID}.json`),
    productPath: inside(sourceDirectory, `${PRODUCT_SITE_ID}.json`),
    packageDirectory: inside(outputDirectory, SITE_ID),
    masterDirectory: inside(outputDirectory, MASTER_SITE_ID),
    activationDirectory: resolve(options.activationDirectory ?? process.env.PRODUCT_PAGE_ACTIVATION_DIR ?? "/data/generated-sites/.activation"),
    paymentDirectory: resolve(options.paymentDirectory ?? process.env.PRODUCT_PAGE_PAYMENT_DIR ?? "/data/generated-sites/.payments"),
    grantDirectory: resolve(options.grantDirectory ?? process.env.PRODUCT_PAGE_COMMERCIAL_GRANT_DIR ?? "/data/generated-sites/.commercial-grants"),
    journalDirectory: resolve(options.journalDirectory ?? process.env.PRODUCT_PAGE_PUBLICATION_JOURNAL_DIR ?? "/data/generated-sites/.publication-journals"),
    claimDirectory: resolve(options.claimDirectory ?? "/data/generated-sites/.publication-preparation-claims/jairo-pinto-business")
  };
}

export async function prepareCapabilityPreview(options = {}) {
  const paths = resolvePaths(options);
  const contract = options.contract ?? EXPECTED;
  const targetFile = await required(paths.targetPath);
  const target = validateTarget(targetFile.bytes, contract);
  const stagingDirectory = inside(paths.inputParent, `.${INPUT_ID}.staging`);
  let created = false;
  await mkdir(paths.inputParent, { recursive: true, mode: 0o700 });
  if (await exists(stagingDirectory)) throw new Error("PUBLICATION_INPUT_STAGING_RESIDUE");
  if (!(await exists(paths.inputDirectory))) {
    const manifestBytes = json(createProbeManifest(targetFile.bytes, target, contract));
    await mkdir(stagingDirectory, { mode: 0o700 });
    await writeFile(resolve(stagingDirectory, "sftp-probe-manifest.json"), manifestBytes, { flag: "wx", mode: 0o600 });
    await rename(stagingDirectory, paths.inputDirectory);
    created = true;
  }
  const preview = await planSftpCapabilityProbe({ manifestPath: paths.probeManifestPath, sourceDirectory: paths.sourceDirectory, environment: options.environment ?? process.env });
  return {
    requestId: REQUEST_ID,
    mode: "CAPABILITY_PREVIEW",
    changed: created,
    providerCallsMade: false,
    inputDirectory: paths.inputDirectory,
    probeManifestPath: paths.probeManifestPath,
    preview
  };
}

export async function planPackagePreparation(options = {}) {
  const paths = resolvePaths(options);
  const contract = options.contract ?? EXPECTED;
  const now = options.now ?? new Date();
  const [source, brand, product, targetFile, capabilityFile, master, existingPackage, activation, payments, grants] = await Promise.all([
    required(paths.sourcePath), required(paths.brandPath), required(paths.productPath), required(paths.targetPath), required(paths.capabilityPath),
    inventory(paths.masterDirectory), inventory(paths.packageDirectory), inventory(paths.activationDirectory), inventory(paths.paymentDirectory), inventory(paths.grantDirectory)
  ]);
  const target = validateTarget(targetFile.bytes, contract);
  const reasons = [];
  if (source.hash !== contract.sourceHash) reasons.push("SOURCE_HASH_DRIFT");
  if (brand.hash !== contract.brandHash) reasons.push("PROTECTED_BRAND_HASH_DRIFT");
  if (product.hash !== contract.productHash) reasons.push("PROTECTED_PRODUCT_HASH_DRIFT");
  if (!master.exists || master.files.length === 0) reasons.push("BUSINESS_MASTER_PACKAGE_MISSING");
  if (!activation.exists) reasons.push("ACTIVATION_STORAGE_MISSING");
  const connection = connectionBinding(options.environment ?? process.env, reasons);
  let capability;
  try { capability = JSON.parse(capabilityFile.bytes); } catch { reasons.push("SFTP_CAPABILITY_JSON_INVALID"); }
  if (capability) reasons.push(...capabilityReasons(capability, connection, target, now));
  const material = {
    requestId: REQUEST_ID,
    operation: "PREPARE_LOCAL_BUSINESS_PACKAGE_AND_PUBLICATION_PREVIEW",
    identity: { ownerKey: contract.ownerKey, siteId: contract.siteId, ecosystemType: contract.ecosystemType, publicHost: contract.publicHost },
    sourceHash: source.hash,
    targetHash: targetFile.hash,
    protectedArtifacts: { brandHash: brand.hash, productHash: product.hash },
    capabilityHash: capabilityFile.hash,
    masterPackageHash: master.hash,
    activationSnapshotHash: activation.hash,
    paymentSnapshotHash: payments.hash,
    grantSnapshotHash: grants.hash,
    existingPackageHash: existingPackage.hash,
    connection,
    remoteRoot: target.remoteRoot
  };
  return {
    requestId: REQUEST_ID,
    mode: "PACKAGE_PREPARATION_PREVIEW",
    changed: false,
    blocked: reasons.length > 0,
    blockedReasons: [...new Set(reasons)],
    planHash: sha256(JSON.stringify(material)),
    planMaterial: material,
    target: target.target,
    safety: { providerCallsMade: false, sftpAdapterCreated: false, localWritesMade: false, authoritativeSourcesMutable: false }
  };
}

async function assertOwner(claimDirectory, owner) {
  const current = JSON.parse(await readFile(resolve(claimDirectory, "owner.json"), "utf8"));
  const left = globalThis.Buffer.from(current.token ?? "");
  const right = globalThis.Buffer.from(owner.token);
  if (left.length !== right.length || !timingSafeEqual(left, right)) throw new Error("PACKAGE_PREPARATION_CLAIM_OWNERSHIP_LOST");
}

async function copyIfPresent(source, destination) {
  if (await exists(source)) await cp(source, destination, { recursive: true });
  else await mkdir(destination, { recursive: true });
}

async function createIsolatedWorkspace(paths, workDirectory) {
  const sourceDirectory = resolve(workDirectory, "sources");
  const targetDirectory = resolve(sourceDirectory, ".publishing-targets");
  const activationDirectory = resolve(workDirectory, "activation");
  const paymentDirectory = resolve(workDirectory, "payments");
  const commercialGrantDirectory = resolve(workDirectory, "commercial-grants");
  const outputDirectory = resolve(workDirectory, "output");
  await Promise.all([mkdir(targetDirectory, { recursive: true }), mkdir(outputDirectory, { recursive: true })]);
  await Promise.all([
    cp(paths.sourcePath, resolve(sourceDirectory, `${SITE_ID}.json`)),
    cp(paths.brandPath, resolve(sourceDirectory, `${OWNER_SITE_ID}.json`)),
    cp(paths.productPath, resolve(sourceDirectory, `${PRODUCT_SITE_ID}.json`)),
    cp(paths.targetPath, resolve(targetDirectory, `${SITE_ID}.json`)),
    cp(paths.masterDirectory, resolve(outputDirectory, MASTER_SITE_ID), { recursive: true }),
    copyIfPresent(paths.activationDirectory, activationDirectory),
    copyIfPresent(paths.paymentDirectory, paymentDirectory),
    copyIfPresent(paths.grantDirectory, commercialGrantDirectory)
  ]);
  const productTarget = { version: 2, ownerKey: OWNER_KEY, siteId: PRODUCT_SITE_ID, ecosystemType: "PRODUCT" };
  await writeFile(resolve(targetDirectory, `${PRODUCT_SITE_ID}.json`), json(productTarget), { flag: "wx", mode: 0o600 });
  return { sourceDirectory, activationDirectory, paymentDirectory, commercialGrantDirectory, outputDirectory };
}

async function defaultGenerator(workspace, modulePath = "/app/runtime-assets/jairo-business-package-generator.mjs") {
  const runtime = await import(pathToFileURL(resolve(modulePath)).href);
  if (typeof runtime.generateJairoBusinessPackageIsolated !== "function") throw new Error("BUSINESS_PACKAGE_GENERATOR_EXPORT_INVALID");
  return runtime.generateJairoBusinessPackageIsolated(workspace);
}

function publicationManifest(preview, packageHash, contract = EXPECTED) {
  return {
    confirmation: "PREVIEW_GUARDED_ECOSYSTEM_PUBLICATION",
    allowlist: [{
      ownerKey: contract.ownerKey,
      ownerSiteId: contract.ownerSiteId,
      siteId: contract.siteId,
      ecosystemType: contract.ecosystemType,
      baseDomain: contract.baseDomain,
      publicHost: contract.publicHost,
      expectedSourceHash: preview.planMaterial.sourceHash,
      expectedTargetHash: preview.planMaterial.targetHash,
      expectedPackageHash: packageHash,
      expectedCapabilityHash: preview.planMaterial.capabilityHash,
      expectedRemotePackageHash: null,
      protectedLocalArtifacts: [
        { siteId: contract.ownerSiteId, expectedHash: preview.planMaterial.protectedArtifacts.brandHash },
        { siteId: contract.productSiteId, expectedHash: preview.planMaterial.protectedArtifacts.productHash }
      ]
    }]
  };
}

export async function preparePackageAndPublicationPreview(options = {}) {
  const preview = await planPackagePreparation(options);
  const contract = options.contract ?? EXPECTED;
  if (options.confirmation !== PREPARE_CONFIRMATION) throw new Error(`PREPARE_REQUIRES_CONFIRMATION:${PREPARE_CONFIRMATION}`);
  if (options.expectedPlanHash !== preview.planHash) throw new Error("PREPARATION_PLAN_HASH_MISMATCH");
  if (preview.blocked) throw new Error(`PREPARATION_BLOCKED:${preview.blockedReasons.join(",")}`);
  const paths = resolvePaths(options);
  if (await exists(paths.publicationManifestPath) || await exists(paths.preparationPath)) throw new Error("PUBLICATION_PREPARATION_ALREADY_EXISTS");
  await mkdir(dirname(paths.claimDirectory), { recursive: true, mode: 0o700 });
  const owner = { token: randomUUID(), planHash: preview.planHash, acquiredAt: new Date().toISOString() };
  await mkdir(paths.claimDirectory, { mode: 0o700 });
  await writeFile(resolve(paths.claimDirectory, "owner.json"), json(owner), { flag: "wx", mode: 0o600 });
  const workDirectory = resolve(paths.outputDirectory, `.publication-preparation-${owner.token}`);
  const backupDirectory = resolve(paths.outputDirectory, `.${SITE_ID}.backup-${owner.token}`);
  const temporaryManifest = resolve(paths.inputDirectory, `.manifest.${owner.token}.tmp`);
  const temporaryPreparation = resolve(paths.inputDirectory, `.preparation.${owner.token}.tmp`);
  let backupCreated = false;
  let packageInstalled = false;
  let committed = false;
  try {
    const locked = await planPackagePreparation(options);
    if (locked.blocked || locked.planHash !== preview.planHash) throw new Error("LOCKED_PREPARATION_DRIFT");
    await assertOwner(paths.claimDirectory, owner);
    await mkdir(workDirectory, { mode: 0o700 });
    const workspace = await createIsolatedWorkspace(paths, workDirectory);
    await (options.generator ?? defaultGenerator)(workspace, options.generatorModulePath);
    const generatedDirectory = resolve(workspace.outputDirectory, SITE_ID);
    const generatedInventory = await inventory(generatedDirectory);
    if (!generatedInventory.exists || generatedInventory.files.length === 0) throw new Error("GENERATED_PACKAGE_EMPTY");
    const manifestBytes = json(publicationManifest(preview, generatedInventory.hash, contract));
    await writeFile(temporaryManifest, manifestBytes, { flag: "wx", mode: 0o600 });
    const stagedPublicationPreview = await planGuardedPublication({
      manifestPath: temporaryManifest,
      sourceDirectory: paths.sourceDirectory,
      outputDirectory: workspace.outputDirectory,
      journalDirectory: paths.journalDirectory,
      environment: options.environment ?? process.env,
      now: options.now ?? new Date()
    });
    if (stagedPublicationPreview.blocked) throw new Error(`PUBLICATION_PREVIEW_BLOCKED:${stagedPublicationPreview.blockedReasons.join(",")}`);
    await assertOwner(paths.claimDirectory, owner);
    if (await exists(paths.packageDirectory)) {
      await rename(paths.packageDirectory, backupDirectory);
      backupCreated = true;
    }
    await assertOwner(paths.claimDirectory, owner);
    await rename(generatedDirectory, paths.packageDirectory);
    packageInstalled = true;
    await options.hooks?.afterPackageInstall?.({ packageDirectory: paths.packageDirectory });
    const installedPublicationPreview = await planGuardedPublication({
      manifestPath: temporaryManifest,
      sourceDirectory: paths.sourceDirectory,
      outputDirectory: paths.outputDirectory,
      journalDirectory: paths.journalDirectory,
      environment: options.environment ?? process.env,
      now: options.now ?? new Date()
    });
    if (installedPublicationPreview.blocked || installedPublicationPreview.planHash !== stagedPublicationPreview.planHash) throw new Error("INSTALLED_PUBLICATION_PREVIEW_DRIFT");
    const preparation = {
      requestId: REQUEST_ID,
      mode: PREPARE_MODE,
      preparationPlanHash: preview.planHash,
      publicationPlanHash: installedPublicationPreview.planHash,
      packageHash: generatedInventory.hash,
      capabilityHash: preview.planMaterial.capabilityHash,
      preparedAt: new Date().toISOString()
    };
    await writeFile(temporaryPreparation, json(preparation), { flag: "wx", mode: 0o600 });
    await assertOwner(paths.claimDirectory, owner);
    await rename(temporaryManifest, paths.publicationManifestPath);
    await rename(temporaryPreparation, paths.preparationPath);
    committed = true;
    if (backupCreated) await rm(backupDirectory, { recursive: true });
    await rm(workDirectory, { recursive: true });
    await rm(paths.claimDirectory, { recursive: true });
    return {
      requestId: REQUEST_ID,
      mode: PREPARE_MODE,
      changed: true,
      providerCallsMade: false,
      sftpAdapterCreated: false,
      inputs: { directory: paths.inputDirectory, manifestPath: paths.publicationManifestPath, preparationPath: paths.preparationPath },
      package: { directory: paths.packageDirectory, hash: generatedInventory.hash, files: generatedInventory.files.length },
      publicationPreview: installedPublicationPreview
    };
  } catch (error) {
    if (committed) throw new Error(`PREPARATION_POST_COMMIT_CLEANUP_FAILED:${error.message}`);
    await assertOwner(paths.claimDirectory, owner);
    if (packageInstalled && await exists(paths.packageDirectory)) await rm(paths.packageDirectory, { recursive: true });
    if (backupCreated && await exists(backupDirectory)) await rename(backupDirectory, paths.packageDirectory);
    for (const path of [temporaryManifest, temporaryPreparation]) if (await exists(path)) await rm(path);
    if (await exists(workDirectory)) await rm(workDirectory, { recursive: true });
    await rm(paths.claimDirectory, { recursive: true });
    throw error;
  }
}

export async function runJairoBusinessPublicationPreparation(options = {}) {
  if (options.mode === PREPARE_MODE) return preparePackageAndPublicationPreview(options);
  if (options.mode === "PACKAGE_PREPARATION_PREVIEW") return planPackagePreparation(options);
  return prepareCapabilityPreview(options);
}

async function main() {
  const arg = (name) => process.argv.find((item) => item.startsWith(`--${name}=`))?.slice(name.length + 3);
  const result = await runJairoBusinessPublicationPreparation({
    mode: arg("mode") ?? "CAPABILITY_PREVIEW",
    confirmation: arg("confirm"),
    expectedPlanHash: arg("expected-plan-hash")
  });
  process.stdout.write(json(result));
  if (result.blocked || result.preview?.blocked || result.publicationPreview?.blocked) process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => { process.stderr.write(json({ error: error.message, providerCallsMade: false })); process.exitCode = 1; });
}
