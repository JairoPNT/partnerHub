import { Buffer } from "node:buffer";
import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { access, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

import { planSftpCapabilityProbe } from "./sftp-directory-rename-capability-probe.mjs";

export const APPLY_MODE = "APPLY_GUARDED_EXPIRED_SFTP_CAPABILITY_ARCHIVE";
export const APPLY_CONFIRMATION = "ARCHIVE_EXPIRED_JAIRO_BUSINESS_SFTP_CAPABILITY";

const REQUEST_ID = "CDX-20260827-003";
const INPUT_ID = "CDX-20260827-001";
const EXPECTED_CAPABILITY_HASH = "f669889d249a791fdec820ff794eaff38040784093e85800df2ed0e41b2a3bb6";
const HASH = /^[0-9a-f]{64}$/;
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = async (path) => access(path).then(() => true, () => false);

function inside(root, child) {
  const base = resolve(root);
  const target = resolve(base, child);
  if (!target.startsWith(`${base}${sep}`)) throw new Error("LOCAL_PATH_ESCAPE");
  return target;
}

function resolvePaths(options = {}) {
  const inputParent = resolve(options.inputParent ?? "/data/generated-sites/.publication-inputs");
  const sourceDirectory = resolve(options.sourceDirectory ?? process.env.PRODUCT_PAGE_SOURCE_DIR ?? "/data/generated-sites/.sources");
  const inputDirectory = inside(inputParent, INPUT_ID);
  const archiveRoot = inside(inputParent, ".capability-archives");
  const requestArchiveRoot = inside(archiveRoot, REQUEST_ID);
  const expectedCapabilityHash = options.expectedCapabilityHash ?? EXPECTED_CAPABILITY_HASH;
  const archiveDirectory = inside(requestArchiveRoot, expectedCapabilityHash);
  return {
    inputParent,
    sourceDirectory,
    inputDirectory,
    manifestPath: inside(inputDirectory, "sftp-probe-manifest.json"),
    capabilityPath: inside(inputDirectory, "sftp-capability.json"),
    archiveRoot,
    requestArchiveRoot,
    archiveDirectory,
    archivedCapabilityPath: inside(archiveDirectory, "sftp-capability.json"),
    journalPath: inside(archiveDirectory, "archive.json"),
    claimDirectory: inside(inputParent, `.capability-renewal-claim-${REQUEST_ID}`),
    expectedCapabilityHash
  };
}

async function file(path) {
  const bytes = await readFile(path);
  return { bytes, hash: sha256(bytes) };
}

function validateCapability(capability, probe, now, reasons) {
  if (capability?.schemaVersion !== 1 || capability?.probeVersion !== "partnerhub-sftp-sibling-rename-v1" || capability?.status !== "VERIFIED") {
    reasons.push("SFTP_CAPABILITY_VERSION_OR_STATUS_INVALID");
  }
  if (JSON.stringify(capability?.connection) !== JSON.stringify(probe.planMaterial.connection)) reasons.push("SFTP_CAPABILITY_CONNECTION_DRIFT");
  if (capability?.scope?.parentDirectory !== probe.planMaterial.parentDirectory || capability?.scope?.remoteRoot !== probe.planMaterial.remoteRoot) {
    reasons.push("SFTP_CAPABILITY_SCOPE_DRIFT");
  }
  if (capability?.probeToken !== probe.planMaterial.probeToken) reasons.push("SFTP_CAPABILITY_PROBE_TOKEN_DRIFT");
  const evidence = capability?.evidence;
  if (evidence?.sameFilesystemDirectoryRename !== true || evidence?.backupRestoreReadback !== true || evidence?.cleanupVerified !== true || evidence?.targetIntact !== true) {
    reasons.push("SFTP_CAPABILITY_EVIDENCE_INVALID");
  }
  const verifiedAtMs = Date.parse(capability?.verifiedAt);
  const ttlSeconds = capability?.ttlSeconds;
  if (!Number.isFinite(verifiedAtMs) || verifiedAtMs > now.getTime()) reasons.push("SFTP_CAPABILITY_TIMESTAMP_INVALID");
  if (!Number.isInteger(ttlSeconds) || ttlSeconds < 60 || ttlSeconds > 3600) reasons.push("SFTP_CAPABILITY_TTL_INVALID");
  const expiresAtMs = Number.isFinite(verifiedAtMs) && Number.isInteger(ttlSeconds) ? verifiedAtMs + ttlSeconds * 1000 : Number.NaN;
  if (Number.isFinite(expiresAtMs) && now.getTime() <= expiresAtMs) reasons.push("SFTP_CAPABILITY_NOT_EXPIRED");
  return {
    verifiedAt: Number.isFinite(verifiedAtMs) ? new Date(verifiedAtMs).toISOString() : "INVALID",
    expiresAt: Number.isFinite(expiresAtMs) ? new Date(expiresAtMs).toISOString() : "INVALID",
    ttlSeconds: Number.isInteger(ttlSeconds) ? ttlSeconds : null
  };
}

async function readArchiveJournal(paths, reasons) {
  if (!(await exists(paths.journalPath))) {
    reasons.push("SFTP_CAPABILITY_ARCHIVE_JOURNAL_MISSING");
    return null;
  }
  try {
    const journal = JSON.parse(await readFile(paths.journalPath, "utf8"));
    if (journal?.requestId !== REQUEST_ID || journal?.capabilityHash !== paths.expectedCapabilityHash || journal?.sourceInputId !== INPUT_ID) {
      reasons.push("SFTP_CAPABILITY_ARCHIVE_JOURNAL_DRIFT");
    }
    return journal;
  } catch {
    reasons.push("SFTP_CAPABILITY_ARCHIVE_JOURNAL_INVALID");
    return null;
  }
}

export async function planExpiredSftpCapabilityRenewal(options = {}) {
  const paths = resolvePaths(options);
  const reasons = [];
  let probe;
  try {
    probe = await planSftpCapabilityProbe({
      manifestPath: paths.manifestPath,
      sourceDirectory: paths.sourceDirectory,
      environment: options.environment ?? process.env
    });
    if (probe.blocked) reasons.push(...probe.blockedReasons.map((reason) => `SFTP_PROBE_PREVIEW_BLOCKED:${reason}`));
  } catch {
    reasons.push("SFTP_PROBE_MANIFEST_OR_TARGET_INVALID");
  }

  const activePresent = await exists(paths.capabilityPath);
  const archivePresent = await exists(paths.archiveDirectory);
  if (!options.ignoreClaim && await exists(paths.claimDirectory)) reasons.push("SFTP_CAPABILITY_RENEWAL_CLAIM_PRESENT");
  if (activePresent && archivePresent) reasons.push("SFTP_CAPABILITY_ACTIVE_AND_ARCHIVE_COLLISION");
  if (!activePresent && !archivePresent) reasons.push("SFTP_CAPABILITY_EVIDENCE_MISSING");

  let capabilityFile = null;
  let capability = null;
  let timing = { verifiedAt: "INVALID", expiresAt: "INVALID", ttlSeconds: null };
  const evidencePath = activePresent ? paths.capabilityPath : paths.archivedCapabilityPath;
  if (activePresent || archivePresent) {
    try {
      capabilityFile = await file(evidencePath);
      if (capabilityFile.hash !== paths.expectedCapabilityHash) reasons.push("SFTP_CAPABILITY_HASH_DRIFT");
      capability = JSON.parse(capabilityFile.bytes);
      if (probe) timing = validateCapability(capability, probe, options.now ?? new Date(), reasons);
    } catch {
      reasons.push("SFTP_CAPABILITY_EVIDENCE_INVALID_JSON_OR_FILE");
    }
  }
  const archiveJournal = archivePresent ? await readArchiveJournal(paths, reasons) : null;

  const manifestHash = await file(paths.manifestPath).then((value) => value.hash, () => "MISSING");
  const material = {
    requestId: REQUEST_ID,
    operation: "ARCHIVE_EXPIRED_SFTP_CAPABILITY_FOR_RENEWAL",
    sourceInputId: INPUT_ID,
    manifestHash,
    probePlanHash: probe?.planHash ?? "INVALID",
    expectedCapabilityHash: paths.expectedCapabilityHash,
    activeCapabilityHash: activePresent ? capabilityFile?.hash ?? "INVALID" : "ABSENT",
    archiveCapabilityHash: archivePresent ? capabilityFile?.hash ?? "INVALID" : "ABSENT",
    verifiedAt: timing.verifiedAt,
    expiresAt: timing.expiresAt,
    ttlSeconds: timing.ttlSeconds,
    archiveDirectory: paths.archiveDirectory
  };
  const alreadyArchived = !activePresent && archivePresent && reasons.length === 0;
  return {
    requestId: REQUEST_ID,
    mode: "PREVIEW",
    changed: false,
    blocked: reasons.length > 0,
    blockedReasons: [...new Set(reasons)],
    planHash: sha256(JSON.stringify(material)),
    planMaterial: material,
    disposition: alreadyArchived ? "ALREADY_ARCHIVED" : "ARCHIVE_EXPIRED_CAPABILITY",
    evidence: {
      activePresent,
      archivePresent,
      capabilityHash: capabilityFile?.hash ?? "ABSENT",
      expired: !reasons.includes("SFTP_CAPABILITY_NOT_EXPIRED"),
      archivedPlanHash: archiveJournal?.planHash ?? null
    },
    safety: { providerCallsMade: false, sftpAdapterCreated: false, remoteWritesMade: false, publishingTargetMutable: false }
  };
}

async function assertOwner(path, owner) {
  const current = JSON.parse(await readFile(resolve(path, "owner.json"), "utf8"));
  const left = Buffer.from(current.token ?? "");
  const right = Buffer.from(owner.token);
  if (left.length !== right.length || !timingSafeEqual(left, right)) throw new Error("SFTP_CAPABILITY_RENEWAL_CLAIM_OWNERSHIP_LOST");
}

async function removeOwnedClaim(path, owner) {
  if (!(await exists(path))) return;
  await assertOwner(path, owner);
  await rm(path, { recursive: true });
}

export async function applyExpiredSftpCapabilityRenewal(options = {}) {
  if (options.mode !== APPLY_MODE) throw new Error("SFTP_CAPABILITY_RENEWAL_APPLY_MODE_REQUIRED");
  if (options.confirmation !== APPLY_CONFIRMATION) throw new Error("SFTP_CAPABILITY_RENEWAL_CONFIRMATION_REQUIRED");
  if (!HASH.test(options.expectedPlanHash ?? "")) throw new Error("SFTP_CAPABILITY_RENEWAL_PLAN_HASH_REQUIRED");

  const paths = resolvePaths(options);
  const preview = await planExpiredSftpCapabilityRenewal(options);
  if (preview.disposition === "ALREADY_ARCHIVED" && preview.evidence.archivedPlanHash === options.expectedPlanHash) {
    return { ...preview, mode: APPLY_MODE, planHash: options.expectedPlanHash, outcome: "ALREADY_ARCHIVED", changed: false };
  }
  if (preview.planHash !== options.expectedPlanHash) throw new Error("SFTP_CAPABILITY_RENEWAL_PLAN_HASH_MISMATCH");
  if (preview.blocked) throw new Error(`SFTP_CAPABILITY_RENEWAL_BLOCKED:${preview.blockedReasons.join(",")}`);

  const owner = { requestId: REQUEST_ID, token: randomUUID(), acquiredAt: new Date().toISOString(), planHash: preview.planHash };
  await mkdir(dirname(paths.claimDirectory), { recursive: true, mode: 0o700 });
  await mkdir(paths.claimDirectory, { mode: 0o700 });
  await writeFile(resolve(paths.claimDirectory, "owner.json"), json(owner), { flag: "wx", mode: 0o600 });
  const stagingDirectory = inside(paths.requestArchiveRoot, `.${paths.expectedCapabilityHash}.${owner.token}.staging`);
  let movedToStaging = false;
  let committed = false;
  try {
    const recheck = await planExpiredSftpCapabilityRenewal({ ...options, ignoreClaim: true });
    if (recheck.planHash !== preview.planHash || recheck.blocked) throw new Error("SFTP_CAPABILITY_RENEWAL_PREFLIGHT_DRIFT");
    await assertOwner(paths.claimDirectory, owner);
    await mkdir(paths.requestArchiveRoot, { recursive: true, mode: 0o700 });
    if (await exists(stagingDirectory) || await exists(paths.archiveDirectory)) throw new Error("SFTP_CAPABILITY_ARCHIVE_COLLISION");
    await mkdir(stagingDirectory, { mode: 0o700 });
    await assertOwner(paths.claimDirectory, owner);
    await rename(paths.capabilityPath, resolve(stagingDirectory, "sftp-capability.json"));
    movedToStaging = true;
    const archived = await file(resolve(stagingDirectory, "sftp-capability.json"));
    if (archived.hash !== paths.expectedCapabilityHash) throw new Error("SFTP_CAPABILITY_ARCHIVE_HASH_DRIFT");
    const journal = {
      requestId: REQUEST_ID,
      sourceInputId: INPUT_ID,
      outcome: "ARCHIVED_FOR_RENEWAL",
      planHash: preview.planHash,
      capabilityHash: archived.hash,
      archivedAt: new Date().toISOString()
    };
    await writeFile(resolve(stagingDirectory, "archive.json"), json(journal), { flag: "wx", mode: 0o600 });
    await assertOwner(paths.claimDirectory, owner);
    await rename(stagingDirectory, paths.archiveDirectory);
    committed = true;
    await removeOwnedClaim(paths.claimDirectory, owner);
    const nextProbePreview = await planSftpCapabilityProbe({
      manifestPath: paths.manifestPath,
      sourceDirectory: paths.sourceDirectory,
      environment: options.environment ?? process.env
    });
    return {
      ...preview,
      mode: APPLY_MODE,
      outcome: "ARCHIVED_FOR_RENEWAL",
      changed: true,
      archive: { capabilityHash: archived.hash, directory: paths.archiveDirectory, journalPath: paths.journalPath },
      nextProbePreview: {
        mode: nextProbePreview.mode,
        changed: nextProbePreview.changed,
        blocked: nextProbePreview.blocked,
        blockedReasons: nextProbePreview.blockedReasons,
        planHash: nextProbePreview.planHash,
        planMaterial: nextProbePreview.planMaterial,
        safety: nextProbePreview.safety
      },
      safety: { ...preview.safety, localWritesMade: true, expiredEvidencePreserved: true }
    };
  } catch (error) {
    if (!committed && movedToStaging && !(await exists(paths.capabilityPath))) {
      try {
        await assertOwner(paths.claimDirectory, owner);
        await rename(resolve(stagingDirectory, "sftp-capability.json"), paths.capabilityPath);
        movedToStaging = false;
      } catch {
        throw new Error(`SFTP_CAPABILITY_RENEWAL_FAILED_WITH_RETAINED_STAGING:${error.message}`);
      }
    }
    if (!committed && await exists(stagingDirectory)) await rm(stagingDirectory, { recursive: true });
    if (!committed) await removeOwnedClaim(paths.claimDirectory, owner);
    throw error;
  }
}

async function main() {
  const arg = (name) => process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);
  const mode = arg("mode") ?? "PREVIEW";
  const options = {
    mode,
    confirmation: arg("confirm"),
    expectedPlanHash: arg("expected-plan-hash")
  };
  const result = mode === "PREVIEW"
    ? await planExpiredSftpCapabilityRenewal(options)
    : await applyExpiredSftpCapabilityRenewal(options);
  process.stdout.write(json(result));
  if (result.blocked) process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => { process.stderr.write(json({ error: error.message, providerCallsMade: false })); process.exitCode = 1; });
}
