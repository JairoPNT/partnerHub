import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { access, link, lstat, mkdir, open, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import process from "node:process";
import vm from "node:vm";
import { pathToFileURL } from "node:url";

export const APPLY_MODE = "APPLY_GUARDED_BUSINESS_MASTER_PACKAGE_REFRESH";
export const APPLY_CONFIRMATION = "REFRESH_CANONICAL_GANOMASTER_BUSINESS_PACKAGE";

const REQUEST_ID = "CDX-20261019-003";
const SITE_ID = "ganomaster-business";
const ECOSYSTEM_TYPE = "BUSINESS";
const PUBLIC_HOST = "business.ganomaster.pro";
const LEGACY_PACKAGE_HASH = "e9a2f7339f80110ceb13f01499298a6e9caff2fb4ab2dffa7b35fb9f76f26a76";
const LEGACY_TEMPLATE_HASH = "5aabc5e2a4402efd97ba8a6e33700e25ad338417143e6a84e97d5187d85a7e31";
const HASH = /^[0-9a-f]{64}$/;
const TEMPLATE_FILES = ["app.js", "config.js", "favicon.svg", "index.html", "styles.css"];
const PACKAGE_FILES = [".htaccess", ...TEMPLATE_FILES, "manifest.json"];
const JOB_ECOSYSTEMS = new Set(["PRODUCT", "BUSINESS", "PERSONAL_BRAND"]);
const JOB_STATUSES = new Set(["QUEUED", "RUNNING", "SUCCEEDED", "FAILED", "CANCELLED"]);
const JOB_PHASES = new Set(["QUEUED", "PREPARING_PACKAGE", "VALIDATING_CAPABILITY", "PLANNING_PUBLICATION", "PUBLISHING", "VERIFYING", "COMPLETE"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = async (path) => access(path).then(() => true, () => false);
const NO_CACHE_HTACCESS = `DirectoryIndex index.html

<IfModule mod_headers.c>
  <FilesMatch "^(index\\.html|config\\.js|app\\.js|styles\\.css|manifest\\.json)$">
    Header set Cache-Control "no-cache, must-revalidate"
    Header set Pragma "no-cache"
    Header set Expires "0"
  </FilesMatch>
</IfModule>
`;

function inside(root, child) {
  const base = resolve(root);
  const target = resolve(base, child);
  if (target === base || !target.startsWith(`${base}${sep}`)) throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_PATH_ESCAPE");
  return target;
}

function inventoryHash(entries) {
  return sha256(JSON.stringify(entries
    .map(({ path, hash }) => ({ path, hash }))
    .sort((left, right) => left.path.localeCompare(right.path))));
}

async function pathKind(path) {
  try {
    const info = await lstat(path);
    if (info.isSymbolicLink()) return "symlink";
    if (info.isDirectory()) return "directory";
    if (info.isFile()) return "file";
    return "special";
  } catch (error) {
    if (error?.code === "ENOENT") return "absent";
    throw error;
  }
}

async function assertSafeAncestors(root, target) {
  const base = resolve(root);
  const absolute = resolve(target);
  if (absolute !== base && !absolute.startsWith(`${base}${sep}`)) throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_PATH_ESCAPE");
  const baseKind = await pathKind(base);
  if (baseKind !== "directory") throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_OUTPUT_ROOT_UNSAFE");
  const remainder = relative(base, absolute).split(sep).filter(Boolean);
  let current = base;
  for (const segment of remainder.slice(0, -1)) {
    current = inside(current, segment);
    const kind = await pathKind(current);
    if (kind === "absent") return;
    if (kind !== "directory") throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_PATH_UNSAFE");
  }
}

async function ensureSafeDirectory(root, directory) {
  const base = resolve(root);
  const absolute = resolve(directory);
  if (absolute !== base && !absolute.startsWith(`${base}${sep}`)) throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_PATH_ESCAPE");
  if ((await pathKind(base)) !== "directory") throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_OUTPUT_ROOT_UNSAFE");
  const segments = relative(base, absolute).split(sep).filter(Boolean);
  let current = base;
  for (const segment of segments) {
    current = inside(current, segment);
    let kind = await pathKind(current);
    if (kind === "absent") {
      try { await mkdir(current, { mode: 0o700 }); } catch (error) { if (error?.code !== "EEXIST") throw error; }
      kind = await pathKind(current);
    }
    if (kind !== "directory") throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_PATH_UNSAFE");
  }
}

async function inventory(directory) {
  const kind = await pathKind(directory);
  if (kind === "absent") return { exists: false, files: [], hash: "ABSENT" };
  if (kind !== "directory") throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_DIRECTORY_UNSAFE");
  const files = [];
  async function visit(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const path = resolve(current, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile()) files.push({
        path: relative(directory, path).split(sep).join("/"),
        hash: sha256(await readFile(path))
      });
      else throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_SPECIAL_FILE_FORBIDDEN");
    }
  }
  await visit(directory);
  files.sort((left, right) => left.path.localeCompare(right.path));
  return { exists: true, files, hash: inventoryHash(files) };
}

async function packageShapeValid(directory) {
  const files = [];
  const directories = [];
  async function visit(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const path = resolve(current, entry.name);
      const relativePath = relative(directory, path).split(sep).join("/");
      if (entry.isDirectory()) {
        directories.push(relativePath);
        await visit(path);
      } else if (entry.isFile()) files.push(relativePath);
      else return false;
    }
    return true;
  }
  if ((await pathKind(directory)) !== "directory" || !(await visit(directory))) return false;
  files.sort((left, right) => left.localeCompare(right));
  directories.sort((left, right) => left.localeCompare(right));
  const expectedFiles = [...PACKAGE_FILES].sort((left, right) => left.localeCompare(right));
  return JSON.stringify(files) === JSON.stringify(expectedFiles) && JSON.stringify(directories) === JSON.stringify(["tipografia"]);
}

async function loadCanonicalTemplate(templateDirectory) {
  const bytesByName = new Map();
  const files = [];
  for (const name of TEMPLATE_FILES) {
    const sourcePath = inside(templateDirectory, name);
    if ((await pathKind(sourcePath)) !== "file") throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_CANONICAL_TEMPLATE_INVALID");
    const bytes = await readFile(sourcePath);
    bytesByName.set(name, bytes);
    files.push({ path: name, hash: sha256(bytes) });
  }
  const configText = bytesByName.get("config.js").toString("utf8");
  const config = new vm.Script(`${configText}\n;CONFIG;`).runInNewContext(Object.create(null), { timeout: 1000 });
  if (config?.ecosystemType !== ECOSYSTEM_TYPE || config?.site?.id !== SITE_ID || config?.site?.appName !== SITE_ID) {
    throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_CANONICAL_IDENTITY_INVALID");
  }
  for (const key of ["brandName", "firstName", "fullName", "role", "whatsappNumber", "phoneNumber", "displayPhone", "ctaUrl", "defaultMessage"]) {
    if (config?.distributor?.[key] !== "") throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_CANONICAL_DISTRIBUTOR_NOT_EMPTY");
  }
  for (const key of ["primaryUrl", "secondaryUrl", "directRegisterUrl"]) {
    if (config?.cta?.[key] !== "") throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_CANONICAL_CTA_NOT_EMPTY");
  }
  if (config?.vsl?.provider !== "custom" || !String(config?.vsl?.embedUrl ?? "").endsWith(".mp4")) {
    throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_CANONICAL_VSL_INVALID");
  }
  files.sort((left, right) => left.path.localeCompare(right.path));
  return { bytesByName, files, hash: inventoryHash(files) };
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
    files: [...TEMPLATE_FILES, ".htaccess", "tipografia/"]
  };
  bytesByName.set("manifest.json", Buffer.from(json(manifest), "utf8"));
  const files = [...bytesByName.entries()]
    .map(([path, bytes]) => ({ path, hash: sha256(bytes) }))
    .sort((left, right) => left.path.localeCompare(right.path));
  return { bytesByName, files, hash: inventoryHash(files), manifest };
}

function resolvePaths(options = {}) {
  const allowedOptions = new Set(["outputRoot", "templateDirectory", "businessJobsDirectory", "now", "testHooks", "mode", "confirmation", "expectedPlanHash", "siteId", "publicHost", "ecosystemType", "identity"]);
  if (Object.keys(options).some((key) => !allowedOptions.has(key))) throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_ARGUMENT_INVALID");
  const outputRoot = resolve(options.outputRoot ?? process.env.PRODUCT_PAGE_OUTPUT_DIR ?? "/data/generated-sites");
  const templateDirectory = resolve(options.templateDirectory ?? "/app/plantillas-de-pagina/business");
  return {
    outputRoot,
    templateDirectory,
    destinationDirectory: inside(outputRoot, SITE_ID),
    historyJournalPath: inside(outputRoot, ".master-package-audits/CDX-20260827-002/apply.json"),
    refreshJournalPath: inside(outputRoot, ".master-package-audits/CDX-20261019-003/refresh.json"),
    archiveDirectory: inside(outputRoot, ".master-package-archives/CDX-20261019-003/ganomaster-business"),
    archiveReservationPath: inside(outputRoot, ".master-package-archives/CDX-20261019-003/ganomaster-business.reservation.json"),
    claimDirectory: inside(outputRoot, ".master-package-claims/ganomaster-business"),
    businessJobsDirectory: resolve(options.businessJobsDirectory ?? inside(outputRoot, ".publication-jobs"))
  };
}

function validTimestamp(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}

function validLegacyJournal(journal, canonicalTemplateHash) {
  const expectedKeys = ["requestId", "mode", "outcome", "siteId", "planHash", "canonicalTemplateHash", "expectedPackageHash", "appliedAt"];
  if (!journal || typeof journal !== "object" || Array.isArray(journal)) return false;
  if (Object.keys(journal).sort().join("|") !== expectedKeys.sort().join("|")) return false;
  return journal.requestId === "CDX-20260827-002" &&
    journal.mode === "APPLY_GUARDED_BUSINESS_MASTER_PACKAGE" &&
    journal.outcome === "APPLIED" &&
    journal.siteId === SITE_ID &&
    HASH.test(journal.planHash ?? "") &&
    journal.canonicalTemplateHash === canonicalTemplateHash &&
    journal.expectedPackageHash === LEGACY_PACKAGE_HASH &&
    validTimestamp(journal.appliedAt);
}

function validLegacyManifest(manifest) {
  return manifest?.schemaVersion === 1 &&
    manifest.siteId === SITE_ID &&
    manifest.ecosystemType === ECOSYSTEM_TYPE &&
    manifest.publicHost === PUBLIC_HOST &&
    manifest.source === "CANONICAL_BUSINESS_TEMPLATE" &&
    manifest.canonicalTemplateHash === LEGACY_TEMPLATE_HASH &&
    Array.isArray(manifest.files) &&
    JSON.stringify(manifest.files) === JSON.stringify([...TEMPLATE_FILES, ".htaccess", "tipografia/"]);
}

async function readClaimOwner(claimDirectory) {
  try {
    if ((await pathKind(claimDirectory)) !== "directory" || (await pathKind(inside(claimDirectory, "owner.json"))) !== "file") return null;
    const files = await readdir(claimDirectory);
    if (files.length !== 1 || files[0] !== "owner.json") return null;
    const owner = JSON.parse(await readFile(inside(claimDirectory, "owner.json"), "utf8"));
    if (owner?.schemaVersion !== 1 || owner?.operation !== "REFRESH_CANONICAL_BUSINESS_MASTER_PACKAGE" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(owner.ownerToken ?? "") ||
        !HASH.test(owner.planHash ?? "") || !validTimestamp(owner.acquiredAt)) return null;
    return owner;
  } catch {
    return null;
  }
}

async function assertClaimOwner(claimDirectory, owner) {
  const current = await readClaimOwner(claimDirectory);
  if (!current || current.planHash !== owner.planHash || current.acquiredAt !== owner.acquiredAt) {
    throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_CLAIM_OWNERSHIP_LOST");
  }
  const left = Buffer.from(current.ownerToken);
  const right = Buffer.from(owner.ownerToken);
  if (left.length !== right.length || !timingSafeEqual(left, right)) throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_CLAIM_OWNERSHIP_LOST");
}

async function removeOwnedClaim(claimDirectory, owner) {
  try { await assertClaimOwner(claimDirectory, owner); } catch { return false; }
  await rm(claimDirectory, { recursive: true });
  return true;
}

function exactKeys(value, required, optional = []) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  return required.every((key) => Object.hasOwn(value, key)) && keys.every((key) => required.includes(key) || optional.includes(key));
}

function validJobEvidence(evidence) {
  if (!Array.isArray(evidence)) return false;
  return evidence.every((entry) => exactKeys(entry, ["phase", "recordedAt"], ["packageHash", "capabilityHash", "planHash", "journalHash"]) &&
    JOB_PHASES.has(entry.phase) && validTimestamp(entry.recordedAt) &&
    ["packageHash", "capabilityHash", "planHash", "journalHash"].every((key) => entry[key] === undefined || HASH.test(entry[key])));
}

function classifyJob(job, filename) {
  const jobKeys = ["schemaVersion", "id", "intentHash", "intent", "status", "phase", "revision", "attemptCount", "requestedBySubjectHash", "createdAt", "updatedAt", "evidence"];
  if (!exactKeys(job, jobKeys, ["lease", "lastErrorCode", "completedAt", "cancelledAt"]) || job.schemaVersion !== 1 ||
      !HASH.test(job.id ?? "") || filename !== `${job.id}.json` || !HASH.test(job.intentHash ?? "") || job.id !== job.intentHash ||
      !exactKeys(job.intent, ["schemaVersion", "operation", "ownerKey", "ownerSiteId", "siteId", "ecosystemType", "baseDomain", "publicHost", "sourceHash", "targetHash", "masterPackageHash"]) ||
      job.intent.schemaVersion !== 1 || job.intent.operation !== "PUBLISH_PARTNER_ECOSYSTEM" || !UUID.test(job.intent.ownerKey ?? "") ||
      !JOB_ECOSYSTEMS.has(job.intent.ecosystemType) || typeof job.intent.siteId !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(job.intent.siteId) ||
      typeof job.intent.ownerSiteId !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(job.intent.ownerSiteId) ||
      typeof job.intent.baseDomain !== "string" || !job.intent.baseDomain || typeof job.intent.publicHost !== "string" || !job.intent.publicHost ||
      !HASH.test(job.intent.sourceHash ?? "") || !HASH.test(job.intent.targetHash ?? "") || !HASH.test(job.intent.masterPackageHash ?? "") ||
      !JOB_STATUSES.has(job.status) || !JOB_PHASES.has(job.phase) ||
      !Number.isInteger(job.revision) || job.revision < 1 || !Number.isInteger(job.attemptCount) || job.attemptCount < 0 ||
      !HASH.test(job.requestedBySubjectHash ?? "") || !validTimestamp(job.createdAt) || !validTimestamp(job.updatedAt) || !validJobEvidence(job.evidence)) return null;
  if ((job.intent.ecosystemType === "BUSINESS" && !job.intent.siteId.endsWith("-business")) ||
      (job.intent.ecosystemType === "PRODUCT" && !job.intent.siteId.endsWith("-product"))) return null;
  if (job.status === "RUNNING") {
    if (!exactKeys(job.lease, ["tokenHash", "workerHash", "acquiredAt", "expiresAt"]) ||
        !HASH.test(job.lease.tokenHash ?? "") || !HASH.test(job.lease.workerHash ?? "") ||
        !validTimestamp(job.lease.acquiredAt) || !validTimestamp(job.lease.expiresAt)) return null;
  } else if (job.lease !== undefined) return null;
  if (job.lastErrorCode !== undefined && (typeof job.lastErrorCode !== "string" || !/^[A-Z0-9_:-]{1,160}$/.test(job.lastErrorCode))) return null;
  if (job.status === "FAILED" ? job.lastErrorCode === undefined : job.lastErrorCode !== undefined) return null;
  if (job.status === "SUCCEEDED" ? job.phase !== "COMPLETE" || !validTimestamp(job.completedAt) : job.completedAt !== undefined) return null;
  if (job.status === "CANCELLED" ? !validTimestamp(job.cancelledAt) : job.cancelledAt !== undefined) return null;
  return {
    id: job.id,
    siteId: job.intent.siteId,
    ecosystemType: job.intent.ecosystemType,
    status: job.status,
    phase: job.phase,
    revision: job.revision,
    attemptCount: job.attemptCount
  };
}

async function inspectBusinessJobs(directory) {
  const kind = await pathKind(directory);
  if (kind === "absent") return { jobs: [], running: [] };
  if (kind !== "directory") throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_JOB_DIRECTORY_UNSAFE");
  const jobs = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && [".claims", ".locks"].includes(entry.name)) continue;
    if (!entry.isFile() || !entry.name.endsWith(".json")) {
      if (entry.isDirectory() || entry.isSymbolicLink() || !entry.isFile()) throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_JOB_UNCLASSIFIABLE");
      continue;
    }
    let parsed;
    try { parsed = JSON.parse(await readFile(inside(directory, entry.name), "utf8")); } catch {
      throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_JOB_UNCLASSIFIABLE");
    }
    const safe = classifyJob(parsed, entry.name);
    if (!safe) throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_JOB_UNCLASSIFIABLE");
    jobs.push(safe);
  }
  jobs.sort((left, right) => left.id.localeCompare(right.id));
  return { jobs, running: jobs.filter((job) => job.ecosystemType === ECOSYSTEM_TYPE && job.status === "RUNNING") };
}

function stableBlockedReasons(reasons) {
  return [...new Set(reasons)].sort((left, right) => left.localeCompare(right));
}

async function buildPreview(options = {}, { claimOwner = null } = {}) {
  const paths = resolvePaths(options);
  const reasons = [];
  if ("siteId" in options || "publicHost" in options || "ecosystemType" in options || "identity" in options) {
    reasons.push("BUSINESS_MASTER_PACKAGE_REFRESH_IDENTITY_OVERRIDE_FORBIDDEN");
  }
  let template = { bytesByName: new Map(), files: [], hash: "INVALID" };
  let expectedPackage = { bytesByName: new Map(), files: [], hash: "INVALID", manifest: null };
  let destination = { exists: false, files: [], hash: "ABSENT" };
  let historyBytes = null;
  let historyJournal = null;
  let activeBusinessJobs = [];
  let businessJobs = [];
  let claimPresent = false;
  let archivePresent = false;
  let refreshJournalPresent = false;
  const safeRoots = [paths.destinationDirectory, paths.historyJournalPath, paths.refreshJournalPath, paths.archiveDirectory, paths.archiveReservationPath, paths.claimDirectory, paths.businessJobsDirectory];
  try {
    for (const target of safeRoots) await assertSafeAncestors(paths.outputRoot, target);
  } catch {
    reasons.push("BUSINESS_MASTER_PACKAGE_REFRESH_PATH_UNSAFE");
  }
  try {
    template = await loadCanonicalTemplate(paths.templateDirectory);
    expectedPackage = buildExpectedPackage(template);
  } catch (error) {
    reasons.push(error instanceof Error && error.message.startsWith("BUSINESS_MASTER_PACKAGE_REFRESH_")
      ? error.message
      : "BUSINESS_MASTER_PACKAGE_REFRESH_CANONICAL_TEMPLATE_INVALID");
  }
  try {
    destination = await inventory(paths.destinationDirectory);
    if (destination.exists && destination.hash !== LEGACY_PACKAGE_HASH) reasons.push("BUSINESS_MASTER_PACKAGE_PREVIOUS_HASH_NOT_ALLOWLISTED");
  } catch {
    reasons.push("BUSINESS_MASTER_PACKAGE_REFRESH_DESTINATION_UNSAFE");
  }
  if (destination.exists && destination.hash === LEGACY_PACKAGE_HASH) {
    try {
      const expectedNames = [...PACKAGE_FILES].sort((left, right) => left.localeCompare(right));
      if (JSON.stringify(destination.files.map((file) => file.path).sort((left, right) => left.localeCompare(right))) !== JSON.stringify(expectedNames) ||
          !(await packageShapeValid(paths.destinationDirectory))) {
        reasons.push("BUSINESS_MASTER_PACKAGE_PREVIOUS_INVENTORY_INVALID");
      }
      const manifest = JSON.parse(await readFile(inside(paths.destinationDirectory, "manifest.json"), "utf8"));
      const installedTemplateFiles = destination.files.filter((file) => TEMPLATE_FILES.includes(file.path));
      const installedTemplateHash = inventoryHash(installedTemplateFiles);
      if (!validLegacyManifest(manifest) || installedTemplateHash !== LEGACY_TEMPLATE_HASH || manifest.canonicalTemplateHash !== installedTemplateHash) {
        reasons.push("BUSINESS_MASTER_PACKAGE_PREVIOUS_MANIFEST_INVALID");
      }
      if ((await pathKind(inside(paths.destinationDirectory, "tipografia"))) !== "directory") reasons.push("BUSINESS_MASTER_PACKAGE_PREVIOUS_TYPOGRAPHY_INVALID");
    } catch {
      reasons.push("BUSINESS_MASTER_PACKAGE_PREVIOUS_MANIFEST_INVALID");
    }
  }
  try {
    if ((await pathKind(paths.historyJournalPath)) !== "file") throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_PREVIOUS_JOURNAL_INVALID");
    historyBytes = await readFile(paths.historyJournalPath);
    historyJournal = JSON.parse(historyBytes.toString("utf8"));
    if (!validLegacyJournal(historyJournal, LEGACY_TEMPLATE_HASH)) reasons.push("BUSINESS_MASTER_PACKAGE_PREVIOUS_JOURNAL_INVALID");
  } catch {
    reasons.push("BUSINESS_MASTER_PACKAGE_PREVIOUS_JOURNAL_INVALID");
  }
  try {
    const jobState = await inspectBusinessJobs(paths.businessJobsDirectory);
    businessJobs = jobState.jobs.filter((job) => job.ecosystemType === ECOSYSTEM_TYPE);
    activeBusinessJobs = jobState.running;
    if (activeBusinessJobs.length > 0) reasons.push("BUSINESS_MASTER_PACKAGE_PUBLICATION_RUNNING");
  } catch {
    reasons.push("BUSINESS_MASTER_PACKAGE_PUBLICATION_JOB_UNCLASSIFIABLE");
  }
  try {
    claimPresent = (await pathKind(paths.claimDirectory)) !== "absent";
    if (claimPresent && (!claimOwner || !(await readClaimOwner(paths.claimDirectory)) || (await assertClaimOwner(paths.claimDirectory, claimOwner).then(() => false, () => true)))) {
      reasons.push("BUSINESS_MASTER_PACKAGE_REFRESH_CLAIM_PRESENT");
    }
  } catch {
    reasons.push("BUSINESS_MASTER_PACKAGE_REFRESH_CLAIM_INVALID");
  }
  try {
    archivePresent = (await pathKind(paths.archiveDirectory)) !== "absent" || (await pathKind(paths.archiveReservationPath)) !== "absent";
    if (archivePresent) reasons.push("BUSINESS_MASTER_PACKAGE_REFRESH_ARCHIVE_OCCUPIED");
  } catch {
    reasons.push("BUSINESS_MASTER_PACKAGE_REFRESH_ARCHIVE_UNSAFE");
  }
  try {
    refreshJournalPresent = (await pathKind(paths.refreshJournalPath)) !== "absent";
    if (refreshJournalPresent) reasons.push("BUSINESS_MASTER_PACKAGE_REFRESH_JOURNAL_OCCUPIED");
  } catch {
    reasons.push("BUSINESS_MASTER_PACKAGE_REFRESH_JOURNAL_UNSAFE");
  }
  if (!destination.exists) reasons.push("BUSINESS_MASTER_PACKAGE_PREVIOUS_DESTINATION_MISSING");
  const material = {
    schemaVersion: 1,
    requestId: REQUEST_ID,
    operation: "REFRESH_CANONICAL_BUSINESS_MASTER_PACKAGE",
    identity: { siteId: SITE_ID, ecosystemType: ECOSYSTEM_TYPE, publicHost: PUBLIC_HOST },
    canonicalTemplateHash: template.hash,
    canonicalTemplateFiles: template.files,
    refreshedPackageHash: expectedPackage.hash,
    refreshedPackageFiles: expectedPackage.files,
    previousPackageHash: destination.hash,
    previousPackageFiles: destination.files,
    previousJournalPath: paths.historyJournalPath,
    previousJournalHash: historyBytes ? sha256(historyBytes) : "ABSENT",
    previousJournal: historyJournal ? {
      requestId: historyJournal.requestId,
      siteId: historyJournal.siteId,
      canonicalTemplateHash: historyJournal.canonicalTemplateHash,
      expectedPackageHash: historyJournal.expectedPackageHash,
      appliedAt: historyJournal.appliedAt
    } : null,
    archivePath: paths.archiveDirectory,
    archivePresent,
    refreshJournalPath: paths.refreshJournalPath,
    refreshJournalPresent,
    claimPresent: Boolean(claimPresent && !claimOwner),
    businessJobSnapshot: businessJobs,
    businessJobsHash: sha256(JSON.stringify(businessJobs)),
    activeBusinessJobs
  };
  return {
    requestId: REQUEST_ID,
    mode: "PREVIEW",
    changed: false,
    blocked: reasons.length > 0,
    blockedReasons: stableBlockedReasons(reasons),
    planHash: sha256(JSON.stringify(material)),
    planMaterial: material,
    target: { siteId: SITE_ID, ecosystemType: ECOSYSTEM_TYPE, publicHost: PUBLIC_HOST },
    safety: { providerCallsMade: false, sftpAdapterCreated: false, localWritesMade: false }
  };
}

export async function planBusinessMasterPackageRefresh(options = {}) {
  return buildPreview(options);
}

function testHook(options, name) {
  if (process.env.NODE_ENV !== "test") return undefined;
  const hook = options.testHooks?.[name];
  return typeof hook === "function" ? hook : undefined;
}

async function writePackage(directory, expected) {
  await mkdir(directory, { mode: 0o700 });
  for (const name of PACKAGE_FILES) {
    const bytes = expected.bytesByName.get(name);
    if (!bytes) throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_STAGED_FILE_MISSING");
    await writeFile(inside(directory, name), bytes, { flag: "wx", mode: 0o600 });
  }
  await mkdir(inside(directory, "tipografia"), { mode: 0o700 });
}

async function copyPackageArchive(sourceDirectory, archiveDirectory, files) {
  await mkdir(archiveDirectory, { mode: 0o700 });
  await mkdir(inside(archiveDirectory, "tipografia"), { mode: 0o700 });
  for (const file of files) {
    if (file.path.startsWith("/") || file.path.split("/").some((part) => part === ".." || part === "")) {
      throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_ARCHIVE_INVENTORY_INVALID");
    }
    const sourcePath = inside(sourceDirectory, file.path);
    if ((await pathKind(sourcePath)) !== "file") throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_ARCHIVE_SOURCE_UNSAFE");
    const sourceBytes = await readFile(sourcePath);
    if (sha256(sourceBytes) !== file.hash) throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_ARCHIVE_SOURCE_DRIFT");
    const destination = inside(archiveDirectory, file.path);
    await ensureSafeDirectory(archiveDirectory, dirname(destination));
    await writeFile(destination, sourceBytes, { flag: "wx", mode: 0o600 });
  }
}

async function assertArchiveReservation(paths, owner) {
  let reservation;
  if ((await pathKind(paths.archiveReservationPath)) !== "file") throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_ARCHIVE_RESERVATION_LOST");
  try { reservation = JSON.parse(await readFile(paths.archiveReservationPath, "utf8")); } catch {
    throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_ARCHIVE_RESERVATION_LOST");
  }
  if (reservation?.schemaVersion !== 1 || reservation?.requestId !== REQUEST_ID || reservation?.planHash !== owner.planHash ||
      reservation?.ownerTokenHash !== sha256(owner.ownerToken)) {
    throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_ARCHIVE_RESERVATION_LOST");
  }
}

async function removeOwnedArchive(paths, owner, expectedHash) {
  try {
    await assertArchiveReservation(paths, owner);
    if ((await inventory(paths.archiveDirectory)).hash !== expectedHash || !(await packageShapeValid(paths.archiveDirectory))) return false;
    await rm(paths.archiveDirectory, { recursive: true });
    await rm(paths.archiveReservationPath);
    return true;
  } catch {
    return false;
  }
}

async function releaseArchiveReservation(paths, owner) {
  await assertArchiveReservation(paths, owner);
  if ((await inventory(paths.archiveDirectory)).hash !== LEGACY_PACKAGE_HASH || !(await packageShapeValid(paths.archiveDirectory))) {
    throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_ARCHIVE_HASH_DRIFT");
  }
  await rm(paths.archiveReservationPath);
}

async function writeJournalWithoutReplace(path, value, outputRoot) {
  await ensureSafeDirectory(outputRoot, dirname(path));
  if ((await pathKind(path)) !== "absent") throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_JOURNAL_OCCUPIED");
  const temporaryPath = inside(dirname(path), `.refresh.${randomUUID()}.tmp`);
  const handle = await open(temporaryPath, "wx", 0o600);
  try {
    await handle.writeFile(value);
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    await link(temporaryPath, path);
  } catch (error) {
    await rm(temporaryPath, { force: true });
    if (error?.code === "EEXIST") throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_JOURNAL_OCCUPIED");
    throw error;
  }
  await rm(temporaryPath, { force: true });
}

async function writeStageOwner(stageDirectory, owner) {
  await writeFile(inside(stageDirectory, "owner.json"), json({ ownerTokenHash: sha256(owner.ownerToken), planHash: owner.planHash }), { flag: "wx", mode: 0o600 });
}

async function removeOwnedStage(stageDirectory, owner) {
  try {
    if ((await pathKind(stageDirectory)) !== "directory" || (await pathKind(inside(stageDirectory, "owner.json"))) !== "file") return false;
    const stageEntries = await readdir(stageDirectory, { withFileTypes: true });
    if (stageEntries.some((entry) => !entry.isFile() && !entry.isDirectory()) ||
        stageEntries.some((entry) => !["owner.json", "package"].includes(entry.name))) return false;
    const marker = JSON.parse(await readFile(inside(stageDirectory, "owner.json"), "utf8"));
    if (marker.ownerTokenHash !== sha256(owner.ownerToken) || marker.planHash !== owner.planHash) return false;
    const packageDirectory = inside(stageDirectory, "package");
    if ((await pathKind(packageDirectory)) === "directory") {
      const packageEntries = await readdir(packageDirectory, { withFileTypes: true });
      if (packageEntries.some((entry) => !entry.isFile() && !entry.isDirectory()) ||
          packageEntries.some((entry) => ![...PACKAGE_FILES, "tipografia"].includes(entry.name)) ||
          packageEntries.some((entry) => entry.isDirectory() && entry.name !== "tipografia")) return false;
      if ((await pathKind(inside(packageDirectory, "tipografia"))) === "directory" &&
          (await readdir(inside(packageDirectory, "tipografia"))).length > 0) return false;
    }
    await rm(stageDirectory, { recursive: true });
    return true;
  } catch {
    return false;
  }
}

export async function applyBusinessMasterPackageRefresh(options = {}) {
  if (options.mode !== APPLY_MODE) throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_APPLY_MODE_REQUIRED");
  if (options.confirmation !== APPLY_CONFIRMATION) throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_CONFIRMATION_REQUIRED");
  if (!HASH.test(options.expectedPlanHash ?? "")) throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_PLAN_HASH_REQUIRED");
  const paths = resolvePaths(options);
  const preview = await buildPreview(options);
  if (preview.planHash !== options.expectedPlanHash) throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_PLAN_HASH_MISMATCH");
  if (preview.blocked) throw new Error(`BUSINESS_MASTER_PACKAGE_REFRESH_BLOCKED:${preview.blockedReasons.join(",")}`);

  const owner = { ownerToken: randomUUID(), planHash: preview.planHash, acquiredAt: new Date().toISOString() };
  await ensureSafeDirectory(paths.outputRoot, dirname(paths.claimDirectory));
  try { await mkdir(paths.claimDirectory, { mode: 0o700 }); } catch (error) {
    if (error?.code === "EEXIST") throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_CLAIM_PRESENT");
    throw error;
  }
  try {
    if ((await pathKind(paths.claimDirectory)) !== "directory" ||
        (await pathKind(inside(paths.claimDirectory, "owner.json"))) !== "absent") {
      throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_CLAIM_INITIALIZATION_FAILED");
    }
    await writeFile(inside(paths.claimDirectory, "owner.json"), json({
      schemaVersion: 1,
      operation: "REFRESH_CANONICAL_BUSINESS_MASTER_PACKAGE",
      ownerToken: owner.ownerToken,
      planHash: owner.planHash,
      acquiredAt: owner.acquiredAt
    }), { flag: "wx", mode: 0o600 });
  } catch {
    throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_CLAIM_INITIALIZATION_FAILED");
  }

  const stageDirectory = inside(paths.outputRoot, `.${SITE_ID}.refresh-${owner.ownerToken}.staging`);
  const stagePackageDirectory = inside(stageDirectory, "package");
  const previousBackupDirectory = inside(paths.outputRoot, `.${SITE_ID}.refresh-${owner.ownerToken}.previous`);
  let stageCreated = false;
  let archiveReserved = false;
  let previousMovedToBackup = false;
  let packageInstalled = false;
  let packageMutationStarted = false;
  try {
    await testHook(options, "afterClaim")?.({ claimDirectory: paths.claimDirectory });
    await assertClaimOwner(paths.claimDirectory, owner);
    const locked = await buildPreview(options, { claimOwner: owner });
    if (locked.blocked || locked.planHash !== preview.planHash) throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_DRIFT_AFTER_CLAIM");
    const template = await loadCanonicalTemplate(paths.templateDirectory);
    const expected = buildExpectedPackage(template);
    await assertClaimOwner(paths.claimDirectory, owner);
    await mkdir(stageDirectory, { mode: 0o700 });
    stageCreated = true;
    await writeStageOwner(stageDirectory, owner);
    await writePackage(stagePackageDirectory, expected);
    const staged = await inventory(stagePackageDirectory);
    if (staged.hash !== expected.hash || (await pathKind(inside(stagePackageDirectory, "tipografia"))) !== "directory") {
      throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_STAGING_HASH_DRIFT");
    }
    await testHook(options, "afterStageVerified")?.({ stageDirectory });
    await assertClaimOwner(paths.claimDirectory, owner);
    const beforeArchive = await buildPreview(options, { claimOwner: owner });
    if (beforeArchive.blocked || beforeArchive.planHash !== preview.planHash) throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_DRIFT_BEFORE_ARCHIVE");
    await ensureSafeDirectory(paths.outputRoot, dirname(paths.archiveDirectory));
    if ((await pathKind(paths.archiveDirectory)) !== "absent" || (await pathKind(paths.archiveReservationPath)) !== "absent") {
      throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_ARCHIVE_OCCUPIED");
    }
    await writeFile(paths.archiveReservationPath, json({
      schemaVersion: 1,
      requestId: REQUEST_ID,
      planHash: owner.planHash,
      ownerTokenHash: sha256(owner.ownerToken)
    }), { flag: "wx", mode: 0o600 });
    packageMutationStarted = true;
    await assertClaimOwner(paths.claimDirectory, owner);
    await copyPackageArchive(paths.destinationDirectory, paths.archiveDirectory, preview.planMaterial.previousPackageFiles);
    archiveReserved = true;
    if ((await inventory(paths.archiveDirectory)).hash !== LEGACY_PACKAGE_HASH) throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_ARCHIVE_HASH_DRIFT");
    await assertArchiveReservation(paths, owner);
    if ((await pathKind(previousBackupDirectory)) !== "absent") throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_BACKUP_OCCUPIED");
    await rename(paths.destinationDirectory, previousBackupDirectory);
    previousMovedToBackup = true;
    await testHook(options, "afterArchive")?.({ archiveDirectory: paths.archiveDirectory });
    await assertClaimOwner(paths.claimDirectory, owner);
    if ((await pathKind(paths.destinationDirectory)) !== "absent") throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_DESTINATION_AMBIGUOUS");
    if ((await inventory(paths.archiveDirectory)).hash !== LEGACY_PACKAGE_HASH) throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_ARCHIVE_HASH_DRIFT");
    await assertArchiveReservation(paths, owner);
    await rename(stagePackageDirectory, paths.destinationDirectory);
    packageInstalled = true;
    const installed = await inventory(paths.destinationDirectory);
    if (installed.hash !== expected.hash || (await pathKind(inside(paths.destinationDirectory, "tipografia"))) !== "directory") {
      throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_POST_INSTALL_HASH_DRIFT");
    }
    await testHook(options, "beforeJournalCommit")?.({ destinationDirectory: paths.destinationDirectory });
    await assertClaimOwner(paths.claimDirectory, owner);
    const historyBytes = await readFile(paths.historyJournalPath);
    const journal = {
      schemaVersion: 1,
      operation: "REFRESH_CANONICAL_BUSINESS_MASTER_PACKAGE",
      requestId: REQUEST_ID,
      siteId: SITE_ID,
      ecosystemType: ECOSYSTEM_TYPE,
      publicHost: PUBLIC_HOST,
      planHash: preview.planHash,
      previousPackageHash: LEGACY_PACKAGE_HASH,
      refreshedPackageHash: expected.hash,
      canonicalTemplateHash: template.hash,
      previousJournalPath: paths.historyJournalPath,
      previousJournalHash: sha256(historyBytes),
      archivePath: paths.archiveDirectory,
      archivedPackageHash: LEGACY_PACKAGE_HASH,
      appliedAt: new Date().toISOString()
    };
    await writeJournalWithoutReplace(paths.refreshJournalPath, json(journal), paths.outputRoot);
    await assertClaimOwner(paths.claimDirectory, owner);
    if ((await inventory(previousBackupDirectory)).hash !== LEGACY_PACKAGE_HASH) throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_BACKUP_HASH_DRIFT");
    await rm(previousBackupDirectory, { recursive: true });
    if (!(await removeOwnedStage(stageDirectory, owner))) throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_STAGING_OWNERSHIP_LOST");
    await releaseArchiveReservation(paths, owner);
    if (!(await removeOwnedClaim(paths.claimDirectory, owner))) throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_CLAIM_OWNERSHIP_LOST");
    return {
      ...preview,
      mode: APPLY_MODE,
      changed: true,
      blocked: false,
      blockedReasons: [],
      outcome: "APPLIED",
      destination: { present: true, hash: installed.hash, typographyDirectoryPresent: true },
      archive: { present: true, hash: LEGACY_PACKAGE_HASH, path: paths.archiveDirectory },
      journalPath: paths.refreshJournalPath,
      safety: { providerCallsMade: false, sftpAdapterCreated: false, localWritesMade: true }
    };
  } catch (error) {
    if (stageCreated) await removeOwnedStage(stageDirectory, owner);
    if (archiveReserved && previousMovedToBackup && !packageInstalled) {
      try {
        await assertClaimOwner(paths.claimDirectory, owner);
        if ((await pathKind(paths.destinationDirectory)) === "absent" &&
            (await inventory(previousBackupDirectory)).hash === LEGACY_PACKAGE_HASH &&
            (await inventory(paths.archiveDirectory)).hash === LEGACY_PACKAGE_HASH) {
          await rename(previousBackupDirectory, paths.destinationDirectory);
          await removeOwnedArchive(paths, owner, LEGACY_PACKAGE_HASH);
        }
      } catch {
        // Preserve the claim and both paths whenever rollback ownership or state is uncertain.
      }
    }
    if (!packageMutationStarted) await removeOwnedClaim(paths.claimDirectory, owner);
    throw error;
  }
}

function parseArguments(argv) {
  const result = {};
  const allowed = new Set(["mode", "confirm", "expected-plan-hash"]);
  for (const argument of argv) {
    const match = /^--([a-z-]+)=(.*)$/.exec(argument);
    if (!match || !allowed.has(match[1])) throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_ARGUMENT_INVALID");
    result[match[1]] = match[2];
  }
  return result;
}

async function main() {
  const args = parseArguments(process.argv.slice(2));
  const result = (args.mode ?? "PREVIEW") === "PREVIEW"
    ? await planBusinessMasterPackageRefresh()
    : await applyBusinessMasterPackageRefresh({ mode: args.mode, confirmation: args.confirm, expectedPlanHash: args["expected-plan-hash"] });
  process.stdout.write(json(result));
  if (result.blocked) process.exitCode = 2;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    const message = error instanceof Error && /^BUSINESS_MASTER_PACKAGE_REFRESH_[A-Z0-9_:,-]+$/.test(error.message)
      ? error.message
      : "BUSINESS_MASTER_PACKAGE_REFRESH_FAILED_SAFELY";
    process.stderr.write(json({ error: message, providerCallsMade: false }));
    process.exitCode = 1;
  });
}
