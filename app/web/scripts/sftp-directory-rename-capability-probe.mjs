import { Buffer } from "node:buffer";
import { createHash, randomUUID } from "node:crypto";
import { access, readFile, rename, writeFile } from "node:fs/promises";
import { posix, resolve, sep } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { createSftpAdapter } from "./guarded-ecosystem-publication.mjs";

export const PROBE_MODE = "PROBE_SFTP_DIRECTORY_RENAME_CAPABILITY";
export const PROBE_CONFIRMATION = "RUN_ALLOWLISTED_SFTP_RENAME_PROBE";
const MANIFEST_CONFIRMATION = "PREVIEW_SFTP_DIRECTORY_RENAME_CAPABILITY";
const SCHEMA_VERSION = 1;
const PROBE_VERSION = "partnerhub-sftp-sibling-rename-v1";
const HASH = /^[0-9a-f]{64}$/;
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FINGERPRINT = /^SHA256:[A-Za-z0-9+/]{43}=$/;
const EXPECTED = Object.freeze({ ownerKey: "f403f29e-95c8-4825-9320-967376443020", siteId: "jairo-pinto-business", ecosystemType: "BUSINESS",
  baseDomain: "jairopinto.pro", publicHost: "negocio.jairopinto.pro" });
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

async function exists(path) { try { await access(path); return true; } catch (error) { if (error.code === "ENOENT") return false; throw error; } }
function localInside(root, child) { const base = resolve(root); const target = resolve(base, child); if (!target.startsWith(`${base}${sep}`)) throw new Error("LOCAL_PATH_ESCAPE"); return target; }
function normalizeRemote(path) { const normalized = posix.normalize(path ?? "").replace(/\/+$/, ""); if (!normalized.startsWith("/") || normalized === "/") throw new Error("REMOTE_PATH_INVALID"); return normalized; }
function binding(environment, reasons) {
  const host = environment.HOSTINGER_SFTP_HOST?.trim().toLowerCase() ?? ""; const port = Number(environment.HOSTINGER_SFTP_PORT);
  const username = environment.HOSTINGER_SFTP_USERNAME?.trim() ?? ""; const hostKeyFingerprintSha256 = environment.HOSTINGER_SFTP_HOST_KEY_SHA256?.trim() ?? "";
  if (!host) reasons.push("SFTP_HOST_MISSING"); if (!Number.isInteger(port) || port < 1 || port > 65535) reasons.push("SFTP_PORT_INVALID");
  if (!username) reasons.push("SFTP_USERNAME_MISSING"); if (!FINGERPRINT.test(hostKeyFingerprintSha256)) reasons.push("SFTP_HOST_KEY_FINGERPRINT_INVALID");
  return { host, port, hostKeyFingerprintSha256, usernameHash: username ? sha256(username) : "" };
}
function derivedPaths(parent, token) { return { claim: posix.join(parent, `.partnerhub-capability-claim-${token}`), stage: posix.join(parent, `.partnerhub-capability-stage-${token}`),
  destination: posix.join(parent, `.partnerhub-capability-destination-${token}`), backup: posix.join(parent, `.partnerhub-capability-backup-${token}`) }; }
function safeProbePath(path, parent, remoteRoot, token) {
  const normalized = normalizeRemote(path); const root = normalizeRemote(remoteRoot); const expectedParent = normalizeRemote(parent);
  if (posix.dirname(normalized) !== expectedParent || !posix.basename(normalized).startsWith(".partnerhub-capability-") || !posix.basename(normalized).endsWith(token)) return false;
  if (normalized === root || normalized.startsWith(`${root}/`) || root.startsWith(`${normalized}/`)) return false;
  return true;
}
function validateManifest(manifest) {
  if (manifest?.confirmation !== MANIFEST_CONFIRMATION || !Array.isArray(manifest.allowlist) || manifest.allowlist.length !== 1) throw new Error("MANIFEST_EXACTLY_ONE_REQUIRED");
  const entry = manifest.allowlist[0]; for (const [key, value] of Object.entries(EXPECTED)) if (entry?.[key] !== value) throw new Error(`ALLOWLIST_MISMATCH:${key}`);
  if (!HASH.test(entry.expectedTargetHash ?? "") || !UUID_V4.test(entry.probeToken ?? "") || !HASH.test(entry.canaryHex ?? "")) throw new Error("MANIFEST_PIN_INVALID");
  if (!Number.isInteger(entry.ttlSeconds) || entry.ttlSeconds < 60 || entry.ttlSeconds > 3600) throw new Error("CAPABILITY_TTL_INVALID");
  return entry;
}

export async function planSftpCapabilityProbe({ manifestPath, sourceDirectory, environment = process.env }) {
  const manifest = JSON.parse(await readFile(resolve(manifestPath), "utf8")); const entry = validateManifest(manifest);
  const targetPath = localInside(resolve(sourceDirectory, ".publishing-targets"), `${entry.siteId}.json`); const targetBytes = await readFile(targetPath); const targetHash = sha256(targetBytes);
  const target = JSON.parse(targetBytes); const reasons = []; const connection = binding(environment, reasons);
  if (targetHash !== entry.expectedTargetHash) reasons.push("TARGET_HASH_DRIFT");
  if (target?.version !== 2 || target?.ownerKey !== entry.ownerKey || target?.siteId !== entry.siteId || target?.ecosystemType !== entry.ecosystemType ||
      target?.baseDomain !== entry.baseDomain || target?.publicHost !== entry.publicHost || target?.provisioningState !== "READY") reasons.push("TARGET_IDENTITY_OR_STATE_INVALID");
  let remoteRoot; let parentDirectory;
  try { remoteRoot = normalizeRemote(target?.remoteRoot); parentDirectory = normalizeRemote(posix.dirname(remoteRoot)); } catch { reasons.push("TARGET_REMOTE_ROOT_INVALID"); }
  if (entry.remoteRoot !== remoteRoot || entry.parentDirectory !== parentDirectory) reasons.push("TARGET_SCOPE_DRIFT");
  const paths = parentDirectory ? derivedPaths(parentDirectory, entry.probeToken) : entry.paths;
  if (JSON.stringify(entry.paths) !== JSON.stringify(paths)) reasons.push("PROBE_PATHS_NOT_DERIVED");
  if (!paths || new Set(Object.values(paths)).size !== 4 || Object.values(paths).some((path) => !safeProbePath(path, parentDirectory, remoteRoot, entry.probeToken))) reasons.push("PROBE_PATH_UNSAFE");
  const canaryHash = sha256(Buffer.from(entry.canaryHex, "hex"));
  const material = { schemaVersion: SCHEMA_VERSION, probeVersion: PROBE_VERSION, targetHash: entry.expectedTargetHash, siteId: entry.siteId, remoteRoot,
    parentDirectory, paths, probeToken: entry.probeToken, canaryHash, ttlSeconds: entry.ttlSeconds, connection };
  return { requestId: "CDX-20260824-006", mode: "PREVIEW", changed: false, blocked: reasons.length > 0, blockedReasons: [...new Set(reasons)],
    planHash: sha256(JSON.stringify(material)), planMaterial: material, entry, target, targetPath, paths,
    safety: { adapterCreated: false, providerCallsMade: false, targetMutationAllowed: false, cleanupOwnPathsOnly: true } };
}

async function assertOwner(adapter, paths, owner) { const current = JSON.parse(String(await adapter.readFile(posix.join(paths.claim, "owner.json")))); if (current.token !== owner.token) throw new Error("PROBE_CLAIM_OWNERSHIP_LOST"); }
async function classifyClaim(adapter, claimPath, nowMs) {
  const inventory = await adapter.inventory(claimPath); if (!inventory.exists) return null;
  try { const owner = JSON.parse(String(await adapter.readFile(posix.join(claimPath, "owner.json")))); const acquired = Date.parse(owner.acquiredAt);
    if (!owner.token || !Number.isFinite(acquired)) return "PROBE_CLAIM_INCOMPLETE"; return nowMs - acquired > 15 * 60 * 1000 ? "PROBE_CLAIM_STALE" : "PROBE_CLAIM_ACTIVE";
  } catch { return "PROBE_CLAIM_INCOMPLETE"; }
}
async function ownedResidues(adapter, paths) { const result = []; for (const [name, path] of Object.entries(paths)) if ((await adapter.inventory(path)).exists) result.push(name); return result; }
async function atomicCapability(outputDirectory, capability, token) {
  if (!(await exists(outputDirectory))) throw new Error("CAPABILITY_OUTPUT_DIRECTORY_MISSING");
  const destination = resolve(outputDirectory, "sftp-capability.json"); if (await exists(destination)) throw new Error("CAPABILITY_OUTPUT_COLLISION");
  const temporary = resolve(outputDirectory, `.sftp-capability.${token}.tmp`); const source = json(capability); await writeFile(temporary, source, { flag: "wx", mode: 0o600 });
  await rename(temporary, destination); const persisted = await readFile(destination); if (sha256(persisted) !== sha256(source)) throw new Error("CAPABILITY_ATOMIC_WRITE_VERIFY_FAILED");
  return { path: destination, hash: sha256(persisted) };
}

export async function runSftpCapabilityProbe(options) {
  const preview = await planSftpCapabilityProbe(options); if (options.mode !== PROBE_MODE) return preview;
  if (options.confirmation !== PROBE_CONFIRMATION) throw new Error(`PROBE_REQUIRES_CONFIRMATION:${PROBE_CONFIRMATION}`);
  if (options.expectedPlanHash !== preview.planHash) throw new Error("PROBE_PLAN_HASH_MISMATCH"); if (preview.blocked) throw new Error(`PROBE_BLOCKED:${preview.blockedReasons.join(",")}`);
  const adapter = options.adapter ?? await options.adapterFactory(); const now = options.now ?? new Date(); let targetBefore;
  try {
    targetBefore = await adapter.inventory(preview.planMaterial.remoteRoot);
    const existingClaim = await classifyClaim(adapter, preview.paths.claim, now.getTime()); if (existingClaim) throw new Error(existingClaim);
    for (const name of ["stage", "destination", "backup"]) if ((await adapter.inventory(preview.paths[name])).exists) throw new Error(`PROBE_PATH_RESIDUE:${name}`);
  } catch (error) { if (!options.adapter) await adapter.close(); throw error; }
  const owner = { token: randomUUID(), probeToken: preview.entry.probeToken, acquiredAt: now.toISOString() }; let claimAcquired = false; let success = false;
  const canary = Buffer.from(preview.entry.canaryHex, "hex"); const evidence = { canaryWriteHash: preview.planMaterial.canaryHash };
  try {
    await adapter.mkdir(preview.paths.claim, false); claimAcquired = true; await adapter.writeFile(posix.join(preview.paths.claim, "owner.json"), Buffer.from(json(owner)));
    if (options.hooks?.afterClaim) await options.hooks.afterClaim({ adapter, paths: preview.paths, owner });
    await assertOwner(adapter, preview.paths, owner); await adapter.mkdir(preview.paths.stage, false);
    await assertOwner(adapter, preview.paths, owner); await adapter.writeFile(posix.join(preview.paths.stage, "canary.bin"), canary);
    if (options.hooks?.afterStageWrite) await options.hooks.afterStageWrite({ adapter, paths: preview.paths, owner });
    await assertOwner(adapter, preview.paths, owner); evidence.stageReadbackHash = sha256(await adapter.readFile(posix.join(preview.paths.stage, "canary.bin")));
    if (evidence.stageReadbackHash !== evidence.canaryWriteHash) throw new Error("PROBE_STAGE_READBACK_FAILED");
    await assertOwner(adapter, preview.paths, owner); await adapter.rename(preview.paths.stage, preview.paths.destination);
    if (options.hooks?.afterDestinationRename) await options.hooks.afterDestinationRename({ adapter, paths: preview.paths, owner });
    await assertOwner(adapter, preview.paths, owner); evidence.destinationReadbackHash = sha256(await adapter.readFile(posix.join(preview.paths.destination, "canary.bin")));
    if (evidence.destinationReadbackHash !== evidence.canaryWriteHash) throw new Error("PROBE_DESTINATION_READBACK_FAILED");
    await assertOwner(adapter, preview.paths, owner); await adapter.rename(preview.paths.destination, preview.paths.backup);
    if (options.hooks?.afterBackupRename) await options.hooks.afterBackupRename({ adapter, paths: preview.paths, owner });
    await assertOwner(adapter, preview.paths, owner); evidence.backupReadbackHash = sha256(await adapter.readFile(posix.join(preview.paths.backup, "canary.bin")));
    if (evidence.backupReadbackHash !== evidence.canaryWriteHash) throw new Error("PROBE_BACKUP_READBACK_FAILED");
    await assertOwner(adapter, preview.paths, owner); await adapter.rename(preview.paths.backup, preview.paths.destination);
    if (options.hooks?.afterRestoreRename) await options.hooks.afterRestoreRename({ adapter, paths: preview.paths, owner });
    await assertOwner(adapter, preview.paths, owner); evidence.restoreReadbackHash = sha256(await adapter.readFile(posix.join(preview.paths.destination, "canary.bin")));
    if (evidence.restoreReadbackHash !== evidence.canaryWriteHash) throw new Error("PROBE_RESTORE_READBACK_FAILED");
    if (options.hooks?.beforeCleanup) await options.hooks.beforeCleanup({ adapter, paths: preview.paths, owner });
    await assertOwner(adapter, preview.paths, owner); await adapter.remove(preview.paths.destination, true);
    await assertOwner(adapter, preview.paths, owner); await adapter.remove(preview.paths.claim, true); claimAcquired = false;
    const residues = await ownedResidues(adapter, preview.paths); if (residues.length) throw new Error(`PROBE_CLEANUP_RESIDUE:${residues.join(",")}`);
    const targetAfter = await adapter.inventory(preview.planMaterial.remoteRoot); if (JSON.stringify(targetAfter) !== JSON.stringify(targetBefore)) throw new Error("REAL_TARGET_MUTATED");
    const capability = { schemaVersion: SCHEMA_VERSION, probeVersion: PROBE_VERSION, status: "VERIFIED", connection: preview.planMaterial.connection,
      scope: { parentDirectory: preview.planMaterial.parentDirectory, remoteRoot: preview.planMaterial.remoteRoot }, evidence: { stagePath: preview.paths.stage,
        destinationPath: preview.paths.destination, backupPath: preview.paths.backup, sameFilesystemDirectoryRename: true, backupRestoreReadback: true, ...evidence,
        cleanupVerified: true, targetIntact: true }, verifiedAt: new Date(now.getTime()).toISOString(), ttlSeconds: preview.entry.ttlSeconds, probeToken: preview.entry.probeToken };
    const output = await atomicCapability(resolve(options.outputDirectory), capability, owner.token); success = true;
    return { ...preview, mode: PROBE_MODE, outcome: "VERIFIED", changed: true, blocked: false, capabilityPath: output.path, capabilityHash: output.hash, capability };
  } catch (error) {
    if (!success && claimAcquired) {
      try {
        await assertOwner(adapter, preview.paths, owner);
        for (const name of ["stage", "destination", "backup"]) if ((await adapter.inventory(preview.paths[name])).exists) { await assertOwner(adapter, preview.paths, owner); await adapter.remove(preview.paths[name], true); }
        await assertOwner(adapter, preview.paths, owner); await adapter.remove(preview.paths.claim, true); claimAcquired = false;
      } catch (cleanupError) {
        if (cleanupError.message === "PROBE_CLAIM_OWNERSHIP_LOST") throw cleanupError;
      }
    }
    const residues = await ownedResidues(adapter, preview.paths); if (residues.length) throw new Error(`PROBE_FAILED_WITH_RESIDUE:${error.message}:${residues.join(",")}`);
    throw error;
  } finally { if (!options.adapter) await adapter.close(); }
}

async function main() {
  const arg = (name) => process.argv.find((item) => item.startsWith(`--${name}=`))?.slice(name.length + 3); const manifestPath = arg("manifest");
  if (!manifestPath) throw new Error("MANIFEST_REQUIRED"); const mode = arg("mode") ?? "PREVIEW";
  const result = await runSftpCapabilityProbe({ manifestPath, sourceDirectory: process.env.PRODUCT_PAGE_SOURCE_DIR ?? "/data/generated-sites/.sources", environment: process.env,
    outputDirectory: arg("output-dir"), mode, confirmation: arg("confirm"), expectedPlanHash: arg("expected-plan-hash"), adapterFactory: () => createSftpAdapter(process.env) });
  process.stdout.write(json(result)); if (result.blocked) process.exitCode = 2;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch((error) => { process.stderr.write(json({ error: error.message })); process.exitCode = 1; });
