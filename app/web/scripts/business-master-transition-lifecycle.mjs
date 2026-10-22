import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { link, lstat, mkdir, open, readFile, readdir, realpath, rename, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, parse, relative, resolve, sep } from "node:path";
import process from "node:process";
const SITE_ID = "ganomaster-business";
const ECOSYSTEM_TYPE = "BUSINESS";
const HASH = /^[0-9a-f]{64}$/;
const PACKAGE_FILES = [".htaccess", "app.js", "config.js", "favicon.svg", "index.html", "styles.css", "manifest.json"];
const JOB_ECOSYSTEMS = new Set(["PRODUCT", "BUSINESS", "PERSONAL_BRAND"]);
const JOB_STATUSES = new Set(["QUEUED", "RUNNING", "SUCCEEDED", "FAILED", "CANCELLED"]);
const JOB_PHASES = new Set(["QUEUED", "PREPARING_PACKAGE", "VALIDATING_CAPABILITY", "PLANNING_PUBLICATION", "PUBLISHING", "VERIFYING", "COMPLETE"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
export const sha256 = (value) => createHash("sha256").update(value).digest("hex");
// Never serialized or supplied by callers: acquired filesystem objects are
// bound to this in-process owner, not reproducible by copying JSON markers.
const acquiredResources = new WeakMap();
function inside(root, child) {
  const base = resolve(root);
  const target = resolve(base, child);
  if (target === base || !target.startsWith(`${base}${sep}`)) throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_PATH_ESCAPE");
  return target;
}

function isDescendant(root, target) {
  const relativePath = relative(resolve(root), resolve(target));
  return relativePath !== "" && relativePath !== ".." && !relativePath.startsWith(`..${sep}`) && !isAbsolute(relativePath);
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

async function packageShapeValid(directory, packageFiles = PACKAGE_FILES) {
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
  const expectedFiles = [...packageFiles].sort((left, right) => left.localeCompare(right));
  return JSON.stringify(files) === JSON.stringify(expectedFiles) && JSON.stringify(directories) === JSON.stringify(["tipografia"]);
}

function validTimestamp(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}

// Private checkpoint evidence; serialized markers remain unchanged. Clocks do
// not include atime, which our own read-only checks may legitimately update.
function physicalNode(stat) {
  return Object.fromEntries(["dev", "ino", "mode", "nlink", "size", "mtimeNs", "ctimeNs"].map((key) => [key, String(stat[key])]));
}

async function captureFileEvidence(path, expectedBytes) {
  const ancestors = await captureBusinessMasterAncestors(dirname(path));
  const before = await lstat(path, { bigint: true });
  if (!before.isFile()) throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_RECOVERY_EVIDENCE_DRIFT");
  const bytes = await readFile(path), after = await lstat(path, { bigint: true });
  if (!bytes.equals(Buffer.from(expectedBytes)) ||
      JSON.stringify(physicalNode(before)) !== JSON.stringify(physicalNode(after)) ||
      JSON.stringify(ancestors) !== JSON.stringify(await captureBusinessMasterAncestors(dirname(path)))) {
    throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_RECOVERY_EVIDENCE_DRIFT");
  }
  return { ancestors, node: physicalNode(after), bytes: bytes.toString("base64") };
}

async function assertFileEvidence(path, proof, code) {
  try {
    if (!proof || JSON.stringify(await captureFileEvidence(path, Buffer.from(proof.bytes, "base64"))) !== JSON.stringify(proof)) throw new Error();
  } catch {
    throw new Error(code);
  }
}

async function captureClaimEvidence(directory, bytes) {
  const before = await lstat(directory, { bigint: true });
  if (!before.isDirectory()) throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_CLAIM_OWNERSHIP_LOST");
  const marker = await captureFileEvidence(inside(directory, "owner.json"), bytes);
  const after = await lstat(directory, { bigint: true });
  if (JSON.stringify(physicalNode(before)) !== JSON.stringify(physicalNode(after))) throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_CLAIM_OWNERSHIP_LOST");
  return { directory: physicalNode(after), marker };
}

async function assertStageMarker(directory, owner) {
  await assertFileEvidence(inside(directory, "owner.json"), acquiredResources.get(owner)?.stage,
    "BUSINESS_MASTER_PACKAGE_REFRESH_STAGING_OWNERSHIP_LOST");
}

async function readClaimOwner(claimDirectory, operation = "REFRESH_CANONICAL_BUSINESS_MASTER_PACKAGE") {
  try {
    if ((await pathKind(claimDirectory)) !== "directory" || (await pathKind(inside(claimDirectory, "owner.json"))) !== "file") return null;
    const files = await readdir(claimDirectory);
    if (files.length !== 1 || files[0] !== "owner.json") return null;
    const owner = JSON.parse(await readFile(inside(claimDirectory, "owner.json"), "utf8"));
    if (!exactKeys(owner, ["schemaVersion", "operation", "ownerToken", "planHash", "acquiredAt"]) ||
        owner.schemaVersion !== 1 || owner.operation !== operation ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(owner.ownerToken ?? "") ||
        !HASH.test(owner.planHash ?? "") || !validTimestamp(owner.acquiredAt)) return null;
    return owner;
  } catch {
    return null;
  }
}

async function assertClaimOwner(claimDirectory, owner) {
  const current = await readClaimOwner(claimDirectory, owner.operation);
  if (!current || current.planHash !== owner.planHash || current.acquiredAt !== owner.acquiredAt) {
    throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_CLAIM_OWNERSHIP_LOST");
  }
  const left = Buffer.from(current.ownerToken);
  const right = Buffer.from(owner.ownerToken);
  if (left.length !== right.length || !timingSafeEqual(left, right)) throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_CLAIM_OWNERSHIP_LOST");
  if (acquiredResources.has(owner)) {
    try {
      const proof = acquiredResources.get(owner).claim;
      if (!proof || JSON.stringify(await captureClaimEvidence(claimDirectory, Buffer.from(proof.marker.bytes, "base64"))) !== JSON.stringify(proof)) throw new Error();
    } catch { throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_CLAIM_OWNERSHIP_LOST"); }
  }
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

function testHook(options, name) {
  if (process.env.NODE_ENV !== "test") return undefined;
  const hook = options.testHooks?.[name];
  return typeof hook === "function" ? hook : undefined;
}

async function writePackage(directory, expected, packageFiles) {
  await mkdir(directory, { mode: 0o700 });
  for (const name of packageFiles) {
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
  if (reservation?.schemaVersion !== 1 || reservation?.requestId !== owner.requestId || reservation?.planHash !== owner.planHash ||
      reservation?.ownerTokenHash !== sha256(owner.ownerToken)) {
    throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_ARCHIVE_RESERVATION_LOST");
  }
  await assertFileEvidence(paths.archiveReservationPath, acquiredResources.get(owner)?.reservation,
    "BUSINESS_MASTER_PACKAGE_REFRESH_ARCHIVE_RESERVATION_LOST");
}

async function removeOwnedArchive(paths, owner, expectedHash) {
  try {
    await assertClaimOwner(paths.claimDirectory, owner);
    await assertArchiveReservation(paths, owner);
    if ((await inventory(paths.archiveDirectory)).hash !== expectedHash || !(await packageShapeValid(paths.archiveDirectory, owner.archiveFiles))) return false;
    await assertClaimOwner(paths.claimDirectory, owner);
    await assertArchiveReservation(paths, owner);
    await rm(paths.archiveDirectory, { recursive: true });
    await rm(paths.archiveReservationPath);
    return true;
  } catch {
    return false;
  }
}

async function releaseArchiveReservation(paths, owner) {
  await assertClaimOwner(paths.claimDirectory, owner);
  await assertArchiveReservation(paths, owner);
  if ((await inventory(paths.archiveDirectory)).hash !== owner.previousHash || !(await packageShapeValid(paths.archiveDirectory, owner.archiveFiles))) {
    throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_ARCHIVE_HASH_DRIFT");
  }
  await assertClaimOwner(paths.claimDirectory, owner);
  await assertArchiveReservation(paths, owner);
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
  return captureFileEvidence(path, value);
}

async function writeStageOwner(stageDirectory, owner) {
  await writeFile(inside(stageDirectory, "owner.json"), json({ ownerTokenHash: sha256(owner.ownerToken), planHash: owner.planHash }), { flag: "wx", mode: 0o600 });
}

async function removeOwnedStage(stageDirectory, owner) {
  try {
    await assertStageMarker(stageDirectory, owner);
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
          packageEntries.some((entry) => ![...owner.packageFiles, "tipografia"].includes(entry.name)) ||
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

// Internal mechanical primitive, not an approval/profile factory. Callers own policy.
export async function executeBusinessMasterTransition(adapter) {
  const { options, paths, preview, requestId: REQUEST_ID, previousHash: LEGACY_PACKAGE_HASH,
    packageFiles: PACKAGE_FILES, buildPreview, loadCanonicalTemplate, buildExpectedPackage,
    applyMode: APPLY_MODE } = adapter;
  const owner = { ownerToken: randomUUID(), planHash: preview.planHash, acquiredAt: new Date().toISOString(), requestId: REQUEST_ID, previousHash: LEGACY_PACKAGE_HASH, packageFiles: PACKAGE_FILES, archiveFiles: adapter.previousFiles ?? PACKAGE_FILES, operation: adapter.operation };
  const acquired = {};
  acquiredResources.set(owner, acquired);
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
    const claimBytes = json({
      schemaVersion: 1,
      operation: adapter.operation,
      ownerToken: owner.ownerToken,
      planHash: owner.planHash,
      acquiredAt: owner.acquiredAt
    });
    await writeFile(inside(paths.claimDirectory, "owner.json"), claimBytes, { flag: "wx", mode: 0o600 });
    acquired.claim = await captureClaimEvidence(paths.claimDirectory, claimBytes);
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
    acquired.stage = await captureFileEvidence(inside(stageDirectory, "owner.json"),
      json({ ownerTokenHash: sha256(owner.ownerToken), planHash: owner.planHash }));
    await writePackage(stagePackageDirectory, expected, PACKAGE_FILES);
    const staged = await inventory(stagePackageDirectory);
    if (staged.hash !== expected.hash || (await pathKind(inside(stagePackageDirectory, "tipografia"))) !== "directory") {
      throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_STAGING_HASH_DRIFT");
    }
    const assertStage = await adapter.captureStage?.(stagePackageDirectory);
    await testHook(options, "afterStageVerified")?.({ stageDirectory });
    await assertClaimOwner(paths.claimDirectory, owner);
    const beforeArchive = await buildPreview(options, { claimOwner: owner });
    if (beforeArchive.blocked || beforeArchive.planHash !== preview.planHash) throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_DRIFT_BEFORE_ARCHIVE");
    await ensureSafeDirectory(paths.outputRoot, dirname(paths.archiveDirectory));
    if ((await pathKind(paths.archiveDirectory)) !== "absent" || (await pathKind(paths.archiveReservationPath)) !== "absent") {
      throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_ARCHIVE_OCCUPIED");
    }
    const reservationBytes = json({
      schemaVersion: 1,
      requestId: REQUEST_ID,
      planHash: owner.planHash,
      ownerTokenHash: sha256(owner.ownerToken)
    });
    await writeFile(paths.archiveReservationPath, reservationBytes, { flag: "wx", mode: 0o600 });
    packageMutationStarted = true;
    acquired.reservation = await captureFileEvidence(paths.archiveReservationPath, reservationBytes);
    await assertClaimOwner(paths.claimDirectory, owner);
    await copyPackageArchive(paths.destinationDirectory, paths.archiveDirectory, preview.planMaterial.previousPackageFiles);
    archiveReserved = true;
    if ((await inventory(paths.archiveDirectory)).hash !== LEGACY_PACKAGE_HASH) throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_ARCHIVE_HASH_DRIFT");
    await assertArchiveReservation(paths, owner);
    if ((await pathKind(previousBackupDirectory)) !== "absent") throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_BACKUP_OCCUPIED");
    await testHook(options, "afterPreviousBackupAbsentCheck")?.({ destinationDirectory: paths.destinationDirectory, previousBackupDirectory });
    await assertClaimOwner(paths.claimDirectory, owner);
    await adapter.assertCaptured?.({ previousDirectory: paths.destinationDirectory });
    await assertStage?.();
    await assertClaimOwner(paths.claimDirectory, owner);
    await assertArchiveReservation(paths, owner);
    if ((await pathKind(previousBackupDirectory)) !== "absent") throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_BACKUP_OCCUPIED");
    await rename(paths.destinationDirectory, previousBackupDirectory);
    previousMovedToBackup = true;
    await testHook(options, "afterArchive")?.({ archiveDirectory: paths.archiveDirectory });
    await assertClaimOwner(paths.claimDirectory, owner);
    if ((await pathKind(paths.destinationDirectory)) !== "absent") throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_DESTINATION_AMBIGUOUS");
    if ((await inventory(paths.archiveDirectory)).hash !== LEGACY_PACKAGE_HASH) throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_ARCHIVE_HASH_DRIFT");
    await assertArchiveReservation(paths, owner);
    await adapter.assertCaptured?.({ previousDirectory: previousBackupDirectory });
    await assertStage?.();
    await assertClaimOwner(paths.claimDirectory, owner);
    await assertArchiveReservation(paths, owner);
    await rename(stagePackageDirectory, paths.destinationDirectory);
    packageInstalled = true;
    const installed = await inventory(paths.destinationDirectory);
    if (installed.hash !== expected.hash || (await pathKind(inside(paths.destinationDirectory, "tipografia"))) !== "directory") {
      throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_POST_INSTALL_HASH_DRIFT");
    }
    await testHook(options, "afterInstall")?.({ destinationDirectory: paths.destinationDirectory });
    await testHook(options, "beforeJournalCommit")?.({ destinationDirectory: paths.destinationDirectory });
    await assertClaimOwner(paths.claimDirectory, owner);
    await assertStage?.(paths.destinationDirectory);
    await adapter.assertCaptured?.({ previousDirectory: previousBackupDirectory, installedDirectory: paths.destinationDirectory });
    await assertClaimOwner(paths.claimDirectory, owner);
    await assertArchiveReservation(paths, owner);
    const journal = await adapter.createJournal({ paths, preview, template, expected });
    const committedJournalProof = await writeJournalWithoutReplace(paths.refreshJournalPath, json(journal), paths.outputRoot);
    const assertCommittedJournal = () => assertFileEvidence(paths.refreshJournalPath, committedJournalProof,
      "BUSINESS_MASTER_PACKAGE_REFRESH_JOURNAL_COMMITTED_PROOF_LOST");
    const assertCleanupOwnership = async () => {
      await assertClaimOwner(paths.claimDirectory, owner);
      await assertArchiveReservation(paths, owner);
      await assertStageMarker(stageDirectory, owner);
      await assertCommittedJournal();
    };
    await testHook(options, "beforeCleanup")?.({ claimDirectory: paths.claimDirectory, previousBackupDirectory });
    await assertClaimOwner(paths.claimDirectory, owner);
    await assertStage?.(paths.destinationDirectory);
    await adapter.assertCaptured?.({ previousDirectory: previousBackupDirectory, installedDirectory: paths.destinationDirectory });
    if ((await inventory(previousBackupDirectory)).hash !== LEGACY_PACKAGE_HASH) throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_BACKUP_HASH_DRIFT");
    await assertCleanupOwnership();
    await rm(previousBackupDirectory, { recursive: true });
    await assertCleanupOwnership();
    if (!(await removeOwnedStage(stageDirectory, owner))) throw new Error("BUSINESS_MASTER_PACKAGE_REFRESH_STAGING_OWNERSHIP_LOST");
    await assertClaimOwner(paths.claimDirectory, owner);
    await assertArchiveReservation(paths, owner);
    await assertCommittedJournal();
    await releaseArchiveReservation(paths, owner);
    await assertCommittedJournal();
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
    let stageRemoved = !stageCreated;
    if (stageCreated && !packageInstalled) {
      try {
        await assertClaimOwner(paths.claimDirectory, owner);
        if (acquired.reservation) await assertArchiveReservation(paths, owner);
        stageRemoved = await removeOwnedStage(stageDirectory, owner);
      } catch {
        // Ownership uncertainty preserves staging as well as backup/claim.
      }
    }
    if (archiveReserved && previousMovedToBackup && !packageInstalled) {
      try {
        await assertClaimOwner(paths.claimDirectory, owner);
        await assertArchiveReservation(paths, owner);
        await adapter.assertRollback?.({ previousDirectory: previousBackupDirectory });
        if ((await pathKind(paths.destinationDirectory)) === "absent" &&
            (await inventory(previousBackupDirectory)).hash === LEGACY_PACKAGE_HASH &&
            (await inventory(paths.archiveDirectory)).hash === LEGACY_PACKAGE_HASH) {
          await assertClaimOwner(paths.claimDirectory, owner);
          await assertArchiveReservation(paths, owner);
          await rename(previousBackupDirectory, paths.destinationDirectory);
          await removeOwnedArchive(paths, owner, LEGACY_PACKAGE_HASH);
        }
      } catch {
        // Preserve the claim and both paths whenever rollback ownership or state is uncertain.
      }
    }
    if (!packageMutationStarted && stageRemoved) await removeOwnedClaim(paths.claimDirectory, owner);
    throw error;
  }
}


export { inside, isDescendant, inventoryHash, pathKind, assertSafeAncestors, ensureSafeDirectory, inventory, packageShapeValid, validTimestamp, readClaimOwner, assertClaimOwner, exactKeys, inspectBusinessJobs };
const captureFail = (code) => { throw new Error("BUSINESS_MASTER_TRANSITION_" + code); };
const captureSorted = (items) => [...items].sort((a, b) => a.localeCompare(b));
// lstat every ancestor, including ancestors above caller roots: never traverse a link.
export async function captureBusinessMasterAncestors(target) {
  const absolute = resolve(target), root = parse(absolute).root;
  let current = root;
  const identities = [];
  for (const segment of relative(root, absolute).split(sep).filter(Boolean)) {
    current = resolve(current, segment);
    const kind = await pathKind(current);
    if (kind === "absent") break;
    if (kind !== "directory") captureFail("ANCESTOR_UNSAFE");
    const stat = await lstat(current, { bigint: true });
    identities.push({ path: current, dev: String(stat.dev), ino: String(stat.ino), mode: String(stat.mode) });
  }
  return identities;
}

// Hash files AND enumerate directories. Bind file identity/change clocks so a
// capture/mutate/revert is not accepted merely because bytes happen to match again.
export async function captureBusinessMasterTree(directory) {
  await captureBusinessMasterAncestors(dirname(directory));
  const kind = await pathKind(directory);
  if (kind === "absent") return { exists: false, files: [], directories: [], nodes: [], hash: "ABSENT" };
  if (kind !== "directory" || await realpath(directory) !== resolve(directory)) captureFail("TREE_UNSAFE");
  const files = [], directories = [], nodes = [];
  async function visit(path, name) {
    const stat = await lstat(path, { bigint: true });
    if (stat.isSymbolicLink() || (!stat.isFile() && !stat.isDirectory())) captureFail("SPECIAL_FILE_FORBIDDEN");
    const node = { path: name, dev: String(stat.dev), ino: String(stat.ino), mode: String(stat.mode) };
    if (stat.isDirectory()) {
      if (name) directories.push(name);
      nodes.push(node);
      for (const entry of captureSorted(await readdir(path))) await visit(inside(path, entry), name ? name + "/" + entry : entry);
    } else {
      const bytes = await readFile(path), after = await lstat(path, { bigint: true });
      if (stat.ino !== after.ino || stat.dev !== after.dev || stat.mtimeNs !== after.mtimeNs || stat.ctimeNs !== after.ctimeNs || stat.size !== after.size) captureFail("CAPTURE_RACE");
      files.push({ path: name, hash: sha256(bytes) });
      nodes.push({ ...node, size: String(stat.size), mtimeNs: String(stat.mtimeNs), ctimeNs: String(stat.ctimeNs) });
    }
  }
  await visit(directory, "");
  files.sort((a, b) => a.path.localeCompare(b.path)); directories.sort((a, b) => a.localeCompare(b));
  nodes.sort((a, b) => a.path.localeCompare(b.path));
  return { exists: true, files, directories, nodes, hash: inventoryHash(files) };
}
