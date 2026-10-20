import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { access, lstat, mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import process from "node:process";
import vm from "node:vm";
import { pathToFileURL } from "node:url";

export const APPLY_MODE = "APPLY_GUARDED_BUSINESS_MASTER_PACKAGE";
export const APPLY_CONFIRMATION = "CREATE_CANONICAL_GANOMASTER_BUSINESS_PACKAGE";

const REQUEST_ID = "CDX-20260827-002";
const REFRESH_REQUEST_ID = "CDX-20261019-003";
const REFRESH_OPERATION = "REFRESH_CANONICAL_BUSINESS_MASTER_PACKAGE";
const SITE_ID = "ganomaster-business";
const ECOSYSTEM_TYPE = "BUSINESS";
const PUBLIC_HOST = "business.ganomaster.pro";
const REQUIRED_TEMPLATE_FILES = ["app.js", "config.js", "favicon.svg", "index.html", "styles.css"];
const PACKAGE_FILES = [".htaccess", ...REQUIRED_TEMPLATE_FILES, "manifest.json"];
const LEGACY_PACKAGE_HASH = "e9a2f7339f80110ceb13f01499298a6e9caff2fb4ab2dffa7b35fb9f76f26a76";
const LEGACY_TEMPLATE_HASH = "5aabc5e2a4402efd97ba8a6e33700e25ad338417143e6a84e97d5187d85a7e31";
const LEGACY_MANIFEST_FILES = [...REQUIRED_TEMPLATE_FILES, ".htaccess", "tipografia/"];
const LEGACY_ARCHIVE_FILES = [...PACKAGE_FILES].sort((left, right) => left.localeCompare(right));
const NO_CACHE_HTACCESS = `DirectoryIndex index.html

<IfModule mod_headers.c>
  <FilesMatch "^(index\\.html|config\\.js|app\\.js|styles\\.css|manifest\\.json)$">
    Header set Cache-Control "no-cache, must-revalidate"
    Header set Pragma "no-cache"
    Header set Expires "0"
  </FilesMatch>
</IfModule>
`;

const exists = async (path) => access(path).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const isSha256 = (value) => typeof value === "string" && /^[0-9a-f]{64}$/.test(value);

function inside(root, child) {
  const base = resolve(root);
  const target = resolve(base, child);
  if (!target.startsWith(`${base}${sep}`)) throw new Error("LOCAL_PATH_ESCAPE");
  return target;
}

function inventoryHash(entries) {
  return sha256(JSON.stringify(entries.map(({ path, hash }) => ({ path, hash }))));
}

async function hasNoSymlinkComponents(root, target) {
  const base = resolve(root);
  const path = resolve(target);
  const pathFromBase = relative(base, path);
  if (pathFromBase === ".." || pathFromBase.startsWith(`..${sep}`) || resolve(base, pathFromBase) !== path) return false;
  let current = base;
  try {
    const rootInfo = await lstat(current);
    if (rootInfo.isSymbolicLink()) return false;
  } catch (error) {
    if (error?.code === "ENOENT") return true;
    return false;
  }
  for (const component of pathFromBase.split(sep).filter(Boolean)) {
    current = resolve(current, component);
    try {
      const info = await lstat(current);
      if (info.isSymbolicLink()) return false;
    } catch (error) {
      if (error?.code === "ENOENT") return true;
      return false;
    }
  }
  return true;
}

async function inventory(directory) {
  if (!(await exists(directory))) return { exists: false, files: [], hash: "ABSENT" };
  const rootInfo = await lstat(directory);
  if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) throw new Error("BUSINESS_MASTER_PACKAGE_DIRECTORY_INVALID");
  const files = [];
  async function visit(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const path = resolve(current, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile()) files.push({
        path: relative(directory, path).split(sep).join("/"),
        hash: sha256(await readFile(path))
      });
      else throw new Error("BUSINESS_MASTER_PACKAGE_SPECIAL_FILE_FORBIDDEN");
    }
  }
  await visit(directory);
  files.sort((left, right) => left.path.localeCompare(right.path));
  return { exists: true, files, hash: inventoryHash(files) };
}

async function directoryPaths(directory) {
  const directories = [];
  async function visit(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const path = resolve(current, entry.name);
      if (entry.isDirectory()) {
        directories.push(relative(directory, path).split(sep).join("/"));
        await visit(path);
      } else if (!entry.isFile()) {
        throw new Error("BUSINESS_MASTER_PACKAGE_SPECIAL_FILE_FORBIDDEN");
      }
    }
  }
  await visit(directory);
  directories.sort((left, right) => left.localeCompare(right));
  return directories;
}

function validateCanonicalConfig(bytes) {
  const text = bytes.toString("utf8");
  const config = new vm.Script(`${text}\n;CONFIG;`).runInNewContext(Object.create(null), { timeout: 1000 });
  if (config?.ecosystemType !== ECOSYSTEM_TYPE || config?.site?.id !== SITE_ID) {
    throw new Error("BUSINESS_CANONICAL_TEMPLATE_IDENTITY_INVALID");
  }
  if (config?.site?.appName !== SITE_ID) throw new Error("BUSINESS_CANONICAL_TEMPLATE_APP_NAME_INVALID");
  for (const key of ["brandName", "firstName", "fullName", "role", "whatsappNumber", "phoneNumber", "displayPhone", "ctaUrl", "defaultMessage"]) {
    if (config?.distributor?.[key] !== "") throw new Error(`BUSINESS_CANONICAL_MASTER_DISTRIBUTOR_NOT_EMPTY:${key}`);
  }
  for (const key of ["primaryUrl", "secondaryUrl", "directRegisterUrl"]) {
    if (config?.cta?.[key] !== "") throw new Error(`BUSINESS_CANONICAL_MASTER_CTA_NOT_EMPTY:${key}`);
  }
  if (config?.vsl?.provider !== "custom" || !String(config?.vsl?.embedUrl ?? "").endsWith(".mp4")) {
    throw new Error("BUSINESS_CANONICAL_MASTER_VSL_INVALID");
  }
}

async function loadCanonicalTemplate(templateDirectory) {
  const entries = [];
  const bytesByName = new Map();
  for (const name of REQUIRED_TEMPLATE_FILES) {
    const bytes = await readFile(inside(templateDirectory, name));
    bytesByName.set(name, bytes);
    entries.push({ path: name, hash: sha256(bytes) });
  }
  entries.sort((left, right) => left.path.localeCompare(right.path));
  validateCanonicalConfig(bytesByName.get("config.js"));
  return { bytesByName, files: entries, hash: inventoryHash(entries) };
}

function buildExpectedPackage(template) {
  const bytesByName = new Map(template.bytesByName);
  bytesByName.set(".htaccess", Buffer.from(NO_CACHE_HTACCESS, "utf8"));
  const manifest = {
    schemaVersion: 1,
    siteId: SITE_ID,
    ecosystemType: ECOSYSTEM_TYPE,
    publicHost: PUBLIC_HOST,
    source: "CANONICAL_BUSINESS_TEMPLATE",
    canonicalTemplateHash: template.hash,
    files: [...REQUIRED_TEMPLATE_FILES, ".htaccess", "tipografia/"]
  };
  bytesByName.set("manifest.json", Buffer.from(json(manifest), "utf8"));
  const files = [...bytesByName.entries()]
    .map(([path, bytes]) => ({ path, hash: sha256(bytes) }))
    .sort((left, right) => left.path.localeCompare(right.path));
  return { bytesByName, files, hash: inventoryHash(files), manifest };
}

function resolvePaths(options = {}) {
  const outputRoot = resolve(options.outputRoot ?? process.env.PRODUCT_PAGE_OUTPUT_DIR ?? "/data/generated-sites");
  const templateDirectory = resolve(options.templateDirectory ?? "/app/plantillas-de-pagina/business");
  const auditRoot = inside(outputRoot, ".master-package-audits");
  const claimRoot = resolve(options.claimRoot ?? inside(outputRoot, ".master-package-claims"));
  const auditDirectory = inside(auditRoot, REQUEST_ID);
  const refreshAuditDirectory = inside(auditRoot, REFRESH_REQUEST_ID);
  const archiveDirectory = inside(inside(outputRoot, ".master-package-archives"), `${REFRESH_REQUEST_ID}/${SITE_ID}`);
  return {
    outputRoot,
    templateDirectory,
    destinationDirectory: inside(outputRoot, SITE_ID),
    claimDirectory: inside(claimRoot, SITE_ID),
    auditDirectory,
    journalPath: inside(auditDirectory, "apply.json"),
    refreshAuditDirectory,
    refreshJournalPath: inside(refreshAuditDirectory, "refresh.json"),
    archiveDirectory
  };
}

async function isDirectory(path, root) {
  if (root && !(await hasNoSymlinkComponents(root, path))) return false;
  return lstat(path).then((value) => value.isDirectory() && !value.isSymbolicLink(), () => false);
}

async function readFixedJson(path, reasons, { missingReason, invalidReason, root }) {
  let bytes;
  try {
    if (root && !(await hasNoSymlinkComponents(root, path))) throw new Error("FIXED_PATH_SYMLINK");
    const info = await lstat(path);
    if (!info.isFile() || info.isSymbolicLink()) throw new Error("FIXED_FILE_NOT_REGULAR");
    bytes = await readFile(path);
  } catch (error) {
    if (error?.code === "ENOENT") {
      if (missingReason) reasons.push(missingReason);
      return null;
    }
    reasons.push(invalidReason);
    return null;
  }

  try {
    return { value: JSON.parse(bytes.toString("utf8")), bytes, hash: sha256(bytes) };
  } catch {
    reasons.push(invalidReason);
    return { value: null, bytes, hash: sha256(bytes) };
  }
}

function isIsoTimestamp(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value));
}

function validateHistoricalJournal(journal) {
  return journal?.requestId === REQUEST_ID
    && journal?.mode === APPLY_MODE
    && journal?.outcome === "APPLIED"
    && journal?.siteId === SITE_ID
    && isSha256(journal?.planHash)
    && isSha256(journal?.canonicalTemplateHash)
    && isSha256(journal?.expectedPackageHash)
    && isIsoTimestamp(journal?.appliedAt);
}

function validateManifestIdentity(manifest, { requireCurrentTemplateHash, currentTemplateHash, expectedFiles } = {}) {
  return manifest?.schemaVersion === 1
    && manifest?.siteId === SITE_ID
    && manifest?.ecosystemType === ECOSYSTEM_TYPE
    && manifest?.publicHost === PUBLIC_HOST
    && manifest?.source === "CANONICAL_BUSINESS_TEMPLATE"
    && isSha256(manifest?.canonicalTemplateHash)
    && (!requireCurrentTemplateHash || manifest.canonicalTemplateHash === currentTemplateHash)
    && Array.isArray(manifest?.files)
    && (!expectedFiles || JSON.stringify(manifest.files) === JSON.stringify(expectedFiles));
}

async function readManifest(directory, reasons, reason, root) {
  const manifestPath = inside(directory, "manifest.json");
  try {
    if (root && !(await hasNoSymlinkComponents(root, manifestPath))) throw new Error("MANIFEST_PATH_SYMLINK");
    const info = await lstat(manifestPath);
    if (!info.isFile() || info.isSymbolicLink()) throw new Error("MANIFEST_NOT_REGULAR");
    const bytes = await readFile(manifestPath);
    return { value: JSON.parse(bytes.toString("utf8")), hash: sha256(bytes) };
  } catch {
    reasons.push(reason);
    return null;
  }
}

async function safeInventory(directory, reasons, invalidReason, root) {
  try {
    if (root && !(await hasNoSymlinkComponents(root, directory))) throw new Error("FIXED_PATH_SYMLINK");
    return await inventory(directory);
  } catch {
    reasons.push(invalidReason);
    return { exists: true, files: [], hash: "INVALID" };
  }
}

function refreshJournalIsConsistent(refresh, paths, legacy, legacyHash, archive, archiveManifest, templateHash, expectedPackageHash) {
  return refresh?.schemaVersion === 1
    && refresh?.operation === REFRESH_OPERATION
    && refresh?.requestId === REFRESH_REQUEST_ID
    && refresh?.siteId === SITE_ID
    && refresh?.ecosystemType === ECOSYSTEM_TYPE
    && refresh?.publicHost === PUBLIC_HOST
    && isSha256(refresh?.planHash)
    && refresh?.previousPackageHash === LEGACY_PACKAGE_HASH
    && refresh?.refreshedPackageHash === expectedPackageHash
    && refresh?.canonicalTemplateHash === templateHash
    && refresh?.previousJournalPath === paths.journalPath
    && refresh?.previousJournalHash === legacyHash
    && refresh?.archivePath === paths.archiveDirectory
    && refresh?.archivedPackageHash === LEGACY_PACKAGE_HASH
    && archive.hash === LEGACY_PACKAGE_HASH
    && legacy?.expectedPackageHash === LEGACY_PACKAGE_HASH
    && legacy?.canonicalTemplateHash === LEGACY_TEMPLATE_HASH
    && archiveManifest?.canonicalTemplateHash === LEGACY_TEMPLATE_HASH
    && legacy?.requestId === REQUEST_ID
    && validateHistoricalJournal(legacy)
    && isIsoTimestamp(refresh?.appliedAt);
}

export async function planBusinessMasterPackage(options = {}) {
  const paths = resolvePaths(options);
  const reasons = [];
  let template = { bytesByName: new Map(), files: [], hash: "INVALID" };
  let expectedPackage = { bytesByName: new Map(), files: [], hash: "INVALID", manifest: null };
  try {
    template = await loadCanonicalTemplate(paths.templateDirectory);
    expectedPackage = buildExpectedPackage(template);
  } catch (error) {
    reasons.push(error instanceof Error && error.message.startsWith("BUSINESS_")
      ? error.message
      : "BUSINESS_CANONICAL_TEMPLATE_MISSING_OR_UNREADABLE");
  }
  const destination = await safeInventory(paths.destinationDirectory, reasons, "BUSINESS_MASTER_PACKAGE_DESTINATION_INVALID", paths.outputRoot);
  const archive = await safeInventory(paths.archiveDirectory, reasons, "BUSINESS_MASTER_PACKAGE_ARCHIVE_INVALID", paths.outputRoot);
  let destinationDirectories = [];
  if (destination.exists && destination.hash !== "INVALID") {
    try {
      destinationDirectories = await directoryPaths(paths.destinationDirectory);
    } catch {
      destinationDirectories = ["INVALID"];
    }
  }
  let archiveDirectories = [];
  if (archive.exists && archive.hash !== "INVALID") {
    try {
      archiveDirectories = await directoryPaths(paths.archiveDirectory);
    } catch {
      archiveDirectories = ["INVALID"];
    }
  }
  const typographyPresent = await isDirectory(resolve(paths.destinationDirectory, "tipografia"), paths.outputRoot);
  const archiveTypographyPresent = await isDirectory(resolve(paths.archiveDirectory, "tipografia"), paths.outputRoot);
  const archiveInventoryMatchesLegacy = archive.exists
    && archive.hash === LEGACY_PACKAGE_HASH
    && JSON.stringify(archive.files.map(({ path }) => path)) === JSON.stringify(LEGACY_ARCHIVE_FILES)
    && JSON.stringify(archiveDirectories) === JSON.stringify(["tipografia"]);
  if (archive.exists && archive.hash !== "INVALID" && (!archiveInventoryMatchesLegacy || !archiveTypographyPresent)) {
    reasons.push("BUSINESS_MASTER_PACKAGE_ARCHIVE_DRIFT");
  }
  let destinationManifest = null;
  let destinationIdentityValid = false;
  if (destination.exists && destination.hash !== "INVALID") {
    const destinationManifestFile = await readManifest(paths.destinationDirectory, reasons, "BUSINESS_MASTER_PACKAGE_DESTINATION_IDENTITY_INVALID", paths.outputRoot);
    destinationManifest = destinationManifestFile?.value ?? null;
    const destinationManifestEntry = destination.files.find(({ path }) => path === "manifest.json");
    destinationIdentityValid = destinationManifestEntry?.hash === destinationManifestFile?.hash
      && validateManifestIdentity(destinationManifest, {
      requireCurrentTemplateHash: true,
      currentTemplateHash: template.hash
    });
    if (!destinationIdentityValid) reasons.push("BUSINESS_MASTER_PACKAGE_DESTINATION_IDENTITY_INVALID");
  }
  const destinationShapeMatchesPackage = JSON.stringify(destinationDirectories) === JSON.stringify(["tipografia"]);
  if (destination.exists && (destination.hash !== expectedPackage.hash || !typographyPresent || !destinationShapeMatchesPackage)) {
    reasons.push("BUSINESS_MASTER_PACKAGE_DRIFT");
  }
  if (!options.ignoreClaim && await exists(paths.claimDirectory)) reasons.push("BUSINESS_MASTER_PACKAGE_CLAIM_PRESENT");

  const journalFile = await readFixedJson(paths.journalPath, reasons, {
    invalidReason: "BUSINESS_MASTER_PACKAGE_JOURNAL_INVALID",
    root: paths.outputRoot
  });
  const journal = journalFile?.value ?? null;
  const journalPresent = journalFile !== null;
  const journalBaseValid = validateHistoricalJournal(journal);
  if (journalPresent && !journalBaseValid) reasons.push("BUSINESS_MASTER_PACKAGE_JOURNAL_DRIFT");
  if (journalPresent && !destination.exists) reasons.push("BUSINESS_MASTER_PACKAGE_JOURNAL_WITHOUT_PACKAGE");

  const refreshFile = await readFixedJson(paths.refreshJournalPath, reasons, {
    invalidReason: "BUSINESS_MASTER_PACKAGE_REFRESH_JOURNAL_INVALID",
    root: paths.outputRoot
  });
  const refreshJournal = refreshFile?.value ?? null;
  const refreshJournalPresent = refreshFile !== null;
  const hasLineageArtifacts = refreshJournalPresent || archive.exists;
  const journalMatchesCurrentPackage = journalBaseValid
    && journal.expectedPackageHash === expectedPackage.hash
    && journal.canonicalTemplateHash === template.hash;
  const legacyJournalPointsToPriorPackage = journalBaseValid
    && (journal.expectedPackageHash !== expectedPackage.hash || journal.canonicalTemplateHash !== template.hash);
  const lineageExpected = hasLineageArtifacts || legacyJournalPointsToPriorPackage;
  let archiveManifest = null;
  let archiveIdentityValid = false;
  if (archive.exists && archive.hash !== "INVALID") {
    const archiveManifestFile = await readManifest(paths.archiveDirectory, reasons, "BUSINESS_MASTER_PACKAGE_ARCHIVE_IDENTITY_INVALID", paths.outputRoot);
    archiveManifest = archiveManifestFile?.value ?? null;
    const archiveManifestEntry = archive.files.find(({ path }) => path === "manifest.json");
    archiveIdentityValid = archiveManifestEntry?.hash === archiveManifestFile?.hash
      && archiveInventoryMatchesLegacy
      && validateManifestIdentity(archiveManifest, { expectedFiles: LEGACY_MANIFEST_FILES })
      && archiveManifest?.canonicalTemplateHash === LEGACY_TEMPLATE_HASH;
    if (!archiveIdentityValid) reasons.push("BUSINESS_MASTER_PACKAGE_ARCHIVE_IDENTITY_INVALID");
  }

  let lineageValid = false;
  if (lineageExpected) {
    if (legacyJournalPointsToPriorPackage && !refreshJournalPresent) {
      reasons.push("BUSINESS_MASTER_PACKAGE_JOURNAL_DRIFT");
    }
    if (!refreshJournalPresent) reasons.push("BUSINESS_MASTER_PACKAGE_REFRESH_JOURNAL_MISSING");
    if (!archive.exists) reasons.push("BUSINESS_MASTER_PACKAGE_ARCHIVE_MISSING");
    if (!journalPresent) reasons.push("BUSINESS_MASTER_PACKAGE_LEGACY_JOURNAL_MISSING");
    if (archive.exists && archive.hash !== "INVALID" && archiveIdentityValid
      && journalBaseValid && journalFile && refreshJournal) {
      lineageValid = refreshJournalIsConsistent(
        refreshJournal,
        paths,
        journal,
        journalFile.hash,
        archive,
        archiveManifest,
        template.hash,
        expectedPackage.hash
      );
    }
    if (refreshJournalPresent && !lineageValid) reasons.push("BUSINESS_MASTER_PACKAGE_LINEAGE_DRIFT");
    if (archive.exists && archive.hash !== "INVALID" && journalBaseValid
      && journal.expectedPackageHash !== archive.hash) reasons.push("BUSINESS_MASTER_PACKAGE_ARCHIVE_DRIFT");
    if (archive.exists && archive.hash !== "INVALID" && refreshJournal
      && (refreshJournal.archivedPackageHash !== archive.hash || refreshJournal.previousPackageHash !== archive.hash)) {
      reasons.push("BUSINESS_MASTER_PACKAGE_ARCHIVE_DRIFT");
    }
    if (refreshJournal && journalFile && refreshJournal.previousJournalHash !== journalFile.hash) {
      reasons.push("BUSINESS_MASTER_PACKAGE_LEGACY_JOURNAL_HASH_DRIFT");
    }
  } else if (destination.exists && !journalPresent) {
    reasons.push("BUSINESS_MASTER_PACKAGE_JOURNAL_MISSING");
  } else if (journalPresent && !journalMatchesCurrentPackage && destination.exists) {
    reasons.push("BUSINESS_MASTER_PACKAGE_JOURNAL_DRIFT");
  }

  const material = {
    requestId: REQUEST_ID,
    operation: "CREATE_CANONICAL_BUSINESS_MASTER_PACKAGE",
    identity: { siteId: SITE_ID, ecosystemType: ECOSYSTEM_TYPE, publicHost: PUBLIC_HOST },
    canonicalTemplateHash: template.hash,
    canonicalTemplateFiles: template.files,
    expectedPackageHash: expectedPackage.hash,
    expectedPackageFiles: expectedPackage.files,
    destinationHash: destination.hash,
    destinationFiles: destination.files,
    destinationDirectories,
    destinationIdentity: destinationManifest ? {
      siteId: destinationManifest.siteId,
      ecosystemType: destinationManifest.ecosystemType,
      publicHost: destinationManifest.publicHost,
      canonicalTemplateHash: destinationManifest.canonicalTemplateHash
    } : null,
    lineage: {
      refreshJournalPath: paths.refreshJournalPath,
      refreshJournalHash: refreshFile?.hash ?? "ABSENT",
      refreshJournal,
      archivePath: paths.archiveDirectory,
      archiveHash: archive.hash,
      archiveFiles: archive.files,
      archiveDirectories,
      archiveTypographyDirectoryPresent: archiveTypographyPresent,
      archiveIdentity: archiveManifest ? {
        siteId: archiveManifest.siteId,
        ecosystemType: archiveManifest.ecosystemType,
        publicHost: archiveManifest.publicHost,
        canonicalTemplateHash: archiveManifest.canonicalTemplateHash
      } : null,
      legacyJournalPath: paths.journalPath,
      legacyJournalHash: journalFile?.hash ?? "ABSENT",
      legacyJournal: journal,
      validated: lineageValid
    }
  };
  const destinationIsCanonical = destination.exists
    && destination.hash === expectedPackage.hash
    && typographyPresent
    && destinationShapeMatchesPackage
    && destinationIdentityValid;
  const alreadyApplied = destinationIsCanonical && (lineageValid || (!lineageExpected && journalMatchesCurrentPackage));
  return {
    requestId: REQUEST_ID,
    mode: "PREVIEW",
    changed: false,
    blocked: reasons.length > 0,
    blockedReasons: [...new Set(reasons)],
    planHash: sha256(JSON.stringify(material)),
    planMaterial: material,
    disposition: alreadyApplied ? "ALREADY_APPLIED" : "CREATE_LOCAL_MASTER_PACKAGE",
    destination: { present: destination.exists, hash: destination.hash, typographyDirectoryPresent: typographyPresent },
    safety: { providerCallsMade: false, sftpAdapterCreated: false, localWritesMade: false, partnerPackagesMutable: false }
  };
}

async function assertOwner(claimDirectory, owner) {
  const current = JSON.parse(await readFile(resolve(claimDirectory, "owner.json"), "utf8"));
  const left = Buffer.from(current.token ?? "");
  const right = Buffer.from(owner.token);
  if (left.length !== right.length || !timingSafeEqual(left, right)) throw new Error("BUSINESS_MASTER_PACKAGE_CLAIM_OWNERSHIP_LOST");
}

async function writeAtomic(path, value) {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporary, value, { flag: "wx", mode: 0o600 });
  await rename(temporary, path);
}

async function removeOwnedClaim(claimDirectory, owner) {
  if (!(await exists(claimDirectory))) return;
  await assertOwner(claimDirectory, owner);
  await rm(claimDirectory, { recursive: true });
}

export async function applyBusinessMasterPackage(options = {}) {
  if (options.mode !== APPLY_MODE) throw new Error("BUSINESS_MASTER_PACKAGE_APPLY_MODE_REQUIRED");
  if (options.confirmation !== APPLY_CONFIRMATION) throw new Error("BUSINESS_MASTER_PACKAGE_CONFIRMATION_REQUIRED");
  if (!/^[0-9a-f]{64}$/.test(options.expectedPlanHash ?? "")) throw new Error("BUSINESS_MASTER_PACKAGE_PLAN_HASH_REQUIRED");

  const paths = resolvePaths(options);
  const preview = await planBusinessMasterPackage(options);
  if (preview.planHash !== options.expectedPlanHash) throw new Error("BUSINESS_MASTER_PACKAGE_PLAN_HASH_MISMATCH");
  if (preview.blocked) throw new Error(`BUSINESS_MASTER_PACKAGE_BLOCKED:${preview.blockedReasons.join(",")}`);
  if (preview.disposition === "ALREADY_APPLIED") return { ...preview, mode: APPLY_MODE, outcome: "ALREADY_APPLIED" };

  const owner = { token: randomUUID(), planHash: preview.planHash, acquiredAt: new Date().toISOString() };
  const stageDirectory = inside(paths.outputRoot, `.${SITE_ID}.${owner.token}.staging`);
  let stageCreated = false;
  let destinationInstalled = false;
  await mkdir(dirname(paths.claimDirectory), { recursive: true, mode: 0o700 });
  await mkdir(paths.claimDirectory, { mode: 0o700 });
  await writeFile(resolve(paths.claimDirectory, "owner.json"), json(owner), { flag: "wx", mode: 0o600 });

  try {
    const recheck = await planBusinessMasterPackage({ ...options, ignoreClaim: true });
    if (recheck.blocked || recheck.planHash !== preview.planHash || recheck.disposition !== "CREATE_LOCAL_MASTER_PACKAGE") {
      throw new Error("BUSINESS_MASTER_PACKAGE_DRIFT_BEFORE_INSTALL");
    }
    const template = await loadCanonicalTemplate(paths.templateDirectory);
    const expected = buildExpectedPackage(template);
    await assertOwner(paths.claimDirectory, owner);
    await mkdir(stageDirectory, { mode: 0o700 });
    stageCreated = true;
    for (const name of PACKAGE_FILES) {
      const bytes = expected.bytesByName.get(name);
      if (!bytes) throw new Error(`BUSINESS_MASTER_PACKAGE_EXPECTED_FILE_MISSING:${name}`);
      await writeFile(resolve(stageDirectory, name), bytes, { flag: "wx", mode: 0o600 });
    }
    await mkdir(resolve(stageDirectory, "tipografia"), { mode: 0o700 });
    const staged = await inventory(stageDirectory);
    if (staged.hash !== expected.hash || !(await isDirectory(resolve(stageDirectory, "tipografia")))) {
      throw new Error("BUSINESS_MASTER_PACKAGE_STAGING_HASH_DRIFT");
    }
    await assertOwner(paths.claimDirectory, owner);
    if (await exists(paths.destinationDirectory)) throw new Error("BUSINESS_MASTER_PACKAGE_DESTINATION_CREATED_CONCURRENTLY");
    await rename(stageDirectory, paths.destinationDirectory);
    stageCreated = false;
    destinationInstalled = true;
    const installed = await inventory(paths.destinationDirectory);
    if (installed.hash !== expected.hash || !(await isDirectory(resolve(paths.destinationDirectory, "tipografia")))) {
      throw new Error("BUSINESS_MASTER_PACKAGE_POST_INSTALL_HASH_DRIFT");
    }
    const journal = {
      requestId: REQUEST_ID,
      mode: APPLY_MODE,
      outcome: "APPLIED",
      siteId: SITE_ID,
      planHash: preview.planHash,
      canonicalTemplateHash: template.hash,
      expectedPackageHash: expected.hash,
      appliedAt: new Date().toISOString()
    };
    await writeAtomic(paths.journalPath, json(journal));
    await removeOwnedClaim(paths.claimDirectory, owner);
    return {
      ...preview,
      mode: APPLY_MODE,
      changed: true,
      blocked: false,
      blockedReasons: [],
      outcome: "APPLIED",
      destination: { present: true, hash: installed.hash, typographyDirectoryPresent: true },
      journalPath: paths.journalPath,
      safety: { ...preview.safety, localWritesMade: true, providerCallsMade: false, sftpAdapterCreated: false }
    };
  } catch (error) {
    if (stageCreated && await exists(stageDirectory)) {
      await assertOwner(paths.claimDirectory, owner);
      await rm(stageDirectory, { recursive: true });
    }
    if (!destinationInstalled) await removeOwnedClaim(paths.claimDirectory, owner);
    throw error;
  }
}

function parseArguments(argv) {
  const values = {};
  for (const argument of argv) {
    const [key, ...rest] = argument.split("=");
    if (!key.startsWith("--") || rest.length === 0) throw new Error(`UNKNOWN_ARGUMENT:${argument}`);
    values[key.slice(2)] = rest.join("=");
  }
  return values;
}

async function main() {
  const args = parseArguments(process.argv.slice(2));
  const mode = args.mode ?? "PREVIEW";
  const result = mode === "PREVIEW"
    ? await planBusinessMasterPackage()
    : await applyBusinessMasterPackage({
        mode,
        confirmation: args.confirm,
        expectedPlanHash: args["expected-plan-hash"]
      });
  process.stdout.write(json(result));
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(json({ error: error instanceof Error ? error.message : String(error) }));
    process.exitCode = 1;
  });
}
