import { Buffer } from "node:buffer";
import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { access, mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

import { planSftpCapabilityProbe } from "./sftp-directory-rename-capability-probe.mjs";

export const APPLY_MODE = "APPLY_GUARDED_EXPIRED_SFTP_CAPABILITY_ARCHIVE";
export const APPLY_CONFIRMATION = "ARCHIVE_EXPIRED_JAIRO_BUSINESS_SFTP_CAPABILITY";

const REQUEST_ID = "CDX-20260902-002";
const INPUT_ID = "CDX-20260827-001";
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
  return {
    inputParent,
    sourceDirectory,
    inputDirectory,
    manifestPath: inside(inputDirectory, "sftp-probe-manifest.json"),
    capabilityPath: inside(inputDirectory, "sftp-capability.json"),
    archiveRoot,
    requestArchiveRoot,
    claimDirectory: inside(inputParent, `.capability-renewal-claim-${REQUEST_ID}`)
  };
}

function archivePaths(paths, capabilityHash) {
  if (!HASH.test(capabilityHash ?? "")) throw new Error("SFTP_CAPABILITY_ARCHIVE_HASH_INVALID");
  const directory = inside(paths.requestArchiveRoot, capabilityHash);
  return {
    directory,
    capabilityPath: inside(directory, "sftp-capability.json"),
    journalPath: inside(directory, "archive.json")
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

async function readArchiveJournal(archive, capabilityHash, reasons) {
  if (!(await exists(archive.journalPath))) {
    reasons.push("SFTP_CAPABILITY_ARCHIVE_JOURNAL_MISSING");
    return null;
  }
  try {
    const journal = JSON.parse(await readFile(archive.journalPath, "utf8"));
    if (journal?.requestId !== REQUEST_ID || journal?.capabilityHash !== capabilityHash || journal?.sourceInputId !== INPUT_ID) {
      reasons.push("SFTP_CAPABILITY_ARCHIVE_JOURNAL_DRIFT");
    }
    return journal;
  } catch {
    reasons.push("SFTP_CAPABILITY_ARCHIVE_JOURNAL_INVALID");
    return null;
  }
}

async function readArchivedByPlanHash(paths, expectedPlanHash) {
  if (!HASH.test(expectedPlanHash ?? "") || !(await exists(paths.requestArchiveRoot))) return null;
  const matches = [];
  for (const entry of await readdir(paths.requestArchiveRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || !HASH.test(entry.name)) continue;
    const archive = archivePaths(paths, entry.name);
    try {
      const journal = JSON.parse(await readFile(archive.journalPath, "utf8"));
      if (journal?.planHash !== expectedPlanHash) continue;
      const capabilityFile = await file(archive.capabilityPath);
      if (
        journal?.requestId !== REQUEST_ID ||
        journal?.sourceInputId !== INPUT_ID ||
        journal?.capabilityHash !== entry.name ||
        capabilityFile.hash !== entry.name ||
        !journal?.planMaterial ||
        sha256(JSON.stringify(journal.planMaterial)) !== expectedPlanHash ||
        journal.planMaterial.expectedCapabilityHash !== entry.name
      ) throw new Error("SFTP_CAPABILITY_ARCHIVE_JOURNAL_DRIFT");
      matches.push({ archive, journal, capabilityFile });
    } catch (error) {
      throw new Error(`SFTP_CAPABILITY_ARCHIVE_IDEMPOTENCY_INVALID:${error.message}`);
    }
  }
  if (matches.length > 1) throw new Error("SFTP_CAPABILITY_ARCHIVE_PLAN_COLLISION");
  return matches[0] ?? null;
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
  if (!options.ignoreClaim && await exists(paths.claimDirectory)) reasons.push("SFTP_CAPABILITY_RENEWAL_CLAIM_PRESENT");
  let capabilityFile = null;
  let capability = null;
  let capabilityHash = "ABSENT";
  let archive = null;
  let archivePresent = false;
  let archivedCapabilityHash = "ABSENT";
  let archiveJournal = null;
  let timing = { verifiedAt: "INVALID", expiresAt: "INVALID", ttlSeconds: null };
  if (activePresent) {
    try {
      capabilityFile = await file(paths.capabilityPath);
      capabilityHash = capabilityFile.hash;
      if (options.expectedCapabilityHash && capabilityHash !== options.expectedCapabilityHash) reasons.push("SFTP_CAPABILITY_HASH_DRIFT");
      archive = archivePaths(paths, capabilityHash);
      archivePresent = await exists(archive.directory);
      if (archivePresent) {
        reasons.push("SFTP_CAPABILITY_ACTIVE_AND_ARCHIVE_COLLISION");
        try {
          const archived = await file(archive.capabilityPath);
          archivedCapabilityHash = archived.hash;
          if (archived.hash !== capabilityHash) reasons.push("SFTP_CAPABILITY_ARCHIVE_HASH_DRIFT");
        } catch {
          reasons.push("SFTP_CAPABILITY_ARCHIVE_EVIDENCE_INVALID");
        }
        archiveJournal = await readArchiveJournal(archive, capabilityHash, reasons);
      }
      capability = JSON.parse(capabilityFile.bytes);
      if (probe) timing = validateCapability(capability, probe, options.now ?? new Date(), reasons);
    } catch {
      reasons.push("SFTP_CAPABILITY_EVIDENCE_INVALID_JSON_OR_FILE");
    }
  } else {
    reasons.push("SFTP_CAPABILITY_EVIDENCE_MISSING");
  }

  const manifestHash = await file(paths.manifestPath).then((value) => value.hash, () => "MISSING");
  const material = {
    requestId: REQUEST_ID,
    operation: "ARCHIVE_EXPIRED_SFTP_CAPABILITY_FOR_RENEWAL",
    sourceInputId: INPUT_ID,
    manifestHash,
    probePlanHash: probe?.planHash ?? "INVALID",
    expectedCapabilityHash: capabilityHash,
    activeCapabilityHash: activePresent ? capabilityHash : "ABSENT",
    archiveCapabilityHash: archivedCapabilityHash,
    verifiedAt: timing.verifiedAt,
    expiresAt: timing.expiresAt,
    ttlSeconds: timing.ttlSeconds,
    archiveDirectory: archive?.directory ?? paths.requestArchiveRoot
  };
  return {
    requestId: REQUEST_ID,
    mode: "PREVIEW",
    changed: false,
    blocked: reasons.length > 0,
    blockedReasons: [...new Set(reasons)],
    planHash: sha256(JSON.stringify(material)),
    planMaterial: material,
    disposition: "ARCHIVE_EXPIRED_CAPABILITY",
    evidence: {
      activePresent,
      archivePresent,
      capabilityHash,
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
  if (!(await exists(paths.capabilityPath))) {
    const archived = await readArchivedByPlanHash(paths, options.expectedPlanHash);
    if (archived) {
      return {
        requestId: REQUEST_ID,
        mode: APPLY_MODE,
        changed: false,
        blocked: false,
        blockedReasons: [],
        planHash: options.expectedPlanHash,
        planMaterial: archived.journal.planMaterial,
        disposition: "ALREADY_ARCHIVED",
        outcome: "ALREADY_ARCHIVED",
        evidence: {
          activePresent: false,
          archivePresent: true,
          capabilityHash: archived.capabilityFile.hash,
          expired: true,
          archivedPlanHash: archived.journal.planHash
        },
        safety: { providerCallsMade: false, sftpAdapterCreated: false, remoteWritesMade: false, publishingTargetMutable: false }
      };
    }
  }
  const preview = await planExpiredSftpCapabilityRenewal(options);
  if (preview.planHash !== options.expectedPlanHash) throw new Error("SFTP_CAPABILITY_RENEWAL_PLAN_HASH_MISMATCH");
  if (preview.blocked) throw new Error(`SFTP_CAPABILITY_RENEWAL_BLOCKED:${preview.blockedReasons.join(",")}`);

  const archive = archivePaths(paths, preview.planMaterial.expectedCapabilityHash);
  const owner = { requestId: REQUEST_ID, token: randomUUID(), acquiredAt: new Date().toISOString(), planHash: preview.planHash };
  await mkdir(dirname(paths.claimDirectory), { recursive: true, mode: 0o700 });
  await mkdir(paths.claimDirectory, { mode: 0o700 });
  await writeFile(resolve(paths.claimDirectory, "owner.json"), json(owner), { flag: "wx", mode: 0o600 });
  const stagingDirectory = inside(paths.requestArchiveRoot, `.${preview.planMaterial.expectedCapabilityHash}.${owner.token}.staging`);
  let movedToStaging = false;
  let committed = false;
  try {
    const recheck = await planExpiredSftpCapabilityRenewal({
      ...options,
      ignoreClaim: true,
      expectedCapabilityHash: preview.planMaterial.expectedCapabilityHash
    });
    if (recheck.planHash !== preview.planHash || recheck.blocked) throw new Error("SFTP_CAPABILITY_RENEWAL_PREFLIGHT_DRIFT");
    await assertOwner(paths.claimDirectory, owner);
    await mkdir(paths.requestArchiveRoot, { recursive: true, mode: 0o700 });
    if (await exists(stagingDirectory) || await exists(archive.directory)) throw new Error("SFTP_CAPABILITY_ARCHIVE_COLLISION");
    await mkdir(stagingDirectory, { mode: 0o700 });
    await assertOwner(paths.claimDirectory, owner);
    await rename(paths.capabilityPath, resolve(stagingDirectory, "sftp-capability.json"));
    movedToStaging = true;
    const archived = await file(resolve(stagingDirectory, "sftp-capability.json"));
    if (archived.hash !== preview.planMaterial.expectedCapabilityHash) throw new Error("SFTP_CAPABILITY_ARCHIVE_HASH_DRIFT");
    const journal = {
      requestId: REQUEST_ID,
      sourceInputId: INPUT_ID,
      outcome: "ARCHIVED_FOR_RENEWAL",
      planHash: preview.planHash,
      capabilityHash: archived.hash,
      planMaterial: preview.planMaterial,
      archivedAt: new Date().toISOString()
    };
    await writeFile(resolve(stagingDirectory, "archive.json"), json(journal), { flag: "wx", mode: 0o600 });
    await assertOwner(paths.claimDirectory, owner);
    await rename(stagingDirectory, archive.directory);
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
      archive: { capabilityHash: archived.hash, directory: archive.directory, journalPath: archive.journalPath },
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
