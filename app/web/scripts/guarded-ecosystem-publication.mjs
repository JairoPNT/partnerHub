import { createHash, randomUUID } from "node:crypto";
import { access, mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { basename, dirname, posix, relative, resolve, sep } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import vm from "node:vm";

export const APPLY_MODE = "APPLY_GUARDED_ECOSYSTEM_PUBLICATION";
export const APPLY_CONFIRMATION = "PUBLISH_ALLOWLISTED_ECOSYSTEM_PACKAGE";
const MANIFEST_CONFIRMATION = "PREVIEW_GUARDED_ECOSYSTEM_PUBLICATION";
const HASH = /^[0-9a-f]{64}$/;
const JAIRO_BUSINESS = Object.freeze({ ownerKey: "f403f29e-95c8-4825-9320-967376443020", ownerSiteId: "jairo-pinto",
  siteId: "jairo-pinto-business", ecosystemType: "BUSINESS", baseDomain: "jairopinto.pro", publicHost: "negocio.jairopinto.pro" });
const REQUIRED_ASSETS = ["index.html", "app.js", "styles.css", "config.js", "favicon.svg"];
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

async function exists(path) { try { await access(path); return true; } catch (error) { if (error.code === "ENOENT") return false; throw error; } }
async function required(path) { const source = await readFile(path); return { source, hash: sha256(source) }; }
function inside(root, child) { const base = resolve(root); const target = resolve(base, child); if (!target.startsWith(`${base}${sep}`)) throw new Error("LOCAL_PATH_ESCAPE"); return target; }
function remoteSibling(remoteRoot, suffix) { const root = posix.normalize(remoteRoot).replace(/\/+$/, ""); if (!root.startsWith("/") || root === "/") throw new Error("REMOTE_ROOT_INVALID"); return posix.join(posix.dirname(root), `.${basename(root)}.${suffix}`); }

async function localInventory(directory) {
  const files = [];
  async function visit(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const path = resolve(current, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile()) files.push({ path: relative(directory, path).split(sep).join("/"), localPath: path, hash: sha256(await readFile(path)) });
    }
  }
  await visit(directory); files.sort((a, b) => a.path.localeCompare(b.path));
  return { files, hash: sha256(JSON.stringify(files.map(({ path, hash }) => ({ path, hash })))) };
}

function parseConfig(source, filename = "config.js") {
  const script = new vm.Script(`${source}\n;CONFIG;`, { filename });
  return JSON.parse(JSON.stringify(script.runInNewContext(Object.create(null), { timeout: 1000 })));
}

function validateBusinessPackage(config, source, entry) {
  const reasons = [];
  if (config?.ecosystemType !== "BUSINESS" || config?.site?.id !== entry.siteId || config?.site?.domain !== entry.publicHost) reasons.push("BUSINESS_CONFIG_IDENTITY_INVALID");
  if (source?.ecosystemType !== "BUSINESS" || source?.site?.id !== entry.siteId || source?.site?.domain !== entry.publicHost) reasons.push("BUSINESS_SOURCE_IDENTITY_INVALID");
  if (typeof config?.vsl?.embedUrl !== "string" || !config.vsl.embedUrl.startsWith("https://") || !/\.mp4(?:\?|$)/i.test(config.vsl.embedUrl) || config.vsl.embedUrl !== source?.vsl?.embedUrl) reasons.push("BUSINESS_VSL_MP4_INVALID");
  if (!config?.vsl?.thumbnailUrl || config.vsl.thumbnailUrl !== source?.vsl?.thumbnailUrl) reasons.push("BUSINESS_POSTER_DERIVATION_INVALID");
  const primary = config?.cta?.primaryUrl; const secondary = config?.cta?.secondaryUrl;
  const whatsapp = String(source?.distributor?.whatsappNumber ?? "").replace(/\D/g, ""); const message = source?.distributor?.defaultMessage;
  const expectedWhatsapp = whatsapp && typeof message === "string" && message ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}` : null;
  if (!expectedWhatsapp || primary !== expectedWhatsapp || secondary !== expectedWhatsapp) reasons.push("BUSINESS_WHATSAPP_CTA_INVALID");
  if (config?.cta?.directRegisterUrl || config?.distributor?.purchaseUrl || JSON.stringify(config).includes("purchaseUrl")) reasons.push("BUSINESS_PURCHASE_URL_PRESENT");
  return reasons;
}

function validateManifest(manifest) {
  if (manifest?.confirmation !== MANIFEST_CONFIRMATION || !Array.isArray(manifest.allowlist) || manifest.allowlist.length !== 1) throw new Error("MANIFEST_EXACTLY_ONE_REQUIRED");
  const entry = manifest.allowlist[0];
  for (const [key, value] of Object.entries(JAIRO_BUSINESS)) if (entry?.[key] !== value) throw new Error(`ALLOWLIST_MISMATCH:${key}`);
  for (const field of ["expectedSourceHash", "expectedTargetHash", "expectedPackageHash", "expectedCapabilityHash"]) if (!HASH.test(entry[field] ?? "")) throw new Error(`HASH_INVALID:${field}`);
  if (entry.expectedRemotePackageHash !== null && !HASH.test(entry.expectedRemotePackageHash ?? "")) throw new Error("HASH_INVALID:expectedRemotePackageHash");
  if (!Array.isArray(entry.protectedLocalArtifacts) || entry.protectedLocalArtifacts.length !== 2 || entry.protectedLocalArtifacts.some((item) => !HASH.test(item.expectedHash ?? ""))) throw new Error("PROTECTED_ARTIFACTS_INVALID");
  return entry;
}

async function atomicJournal(path, value, token) { const temporary = `${path}.tmp-${token}`; await writeFile(temporary, json(value), { flag: "wx" }); await rename(temporary, path); }
async function atomicReplace(path, value, token) { const temporary = `${path}.tmp-${token}`; await writeFile(temporary, value, { flag: "wx" }); await rename(temporary, path); }

async function terminalJournal(journalPath, planHash, adapter, entry) {
  if (!(await exists(journalPath))) return null;
  let journal; try { journal = JSON.parse(await readFile(journalPath, "utf8")); } catch { return { valid: false, reasons: ["PUBLICATION_JOURNAL_INVALID"] }; }
  const reasons = [];
  if (journal.mode !== APPLY_MODE || journal.planHash !== planHash || journal.packageHash !== entry.expectedPackageHash || !Date.parse(journal.appliedAt)) reasons.push("PUBLICATION_JOURNAL_DRIFT");
  if (adapter) {
    const remote = await adapter.inventory(journal.remoteRoot);
    if (!remote.exists || remote.hash !== entry.expectedPackageHash) reasons.push("PUBLISHED_PACKAGE_DRIFT");
  }
  try { const target = JSON.parse(await readFile(journal.targetPath, "utf8")); if (target.publicationState !== "READY" || sha256(json(target)) !== journal.finalTargetHash) reasons.push("PUBLISHED_TARGET_STATE_DRIFT"); }
  catch { reasons.push("PUBLISHED_TARGET_STATE_DRIFT"); }
  return { valid: reasons.length === 0, reasons, journal };
}

export async function planGuardedPublication({ manifestPath, sourceDirectory, outputDirectory, journalDirectory, adapter = null }) {
  const manifest = JSON.parse(await readFile(resolve(manifestPath), "utf8")); const entry = validateManifest(manifest);
  const sourcePath = inside(sourceDirectory, `${entry.siteId}.json`); const targetPath = inside(resolve(sourceDirectory, ".publishing-targets"), `${entry.siteId}.json`);
  const packageDirectory = inside(outputDirectory, entry.siteId); const capabilityPath = resolve(dirname(resolve(manifestPath)), "sftp-capability.json");
  const [sourceFile, targetFile, capabilityFile] = await Promise.all([required(sourcePath), required(targetPath), required(capabilityPath)]);
  const source = JSON.parse(sourceFile.source); const target = JSON.parse(targetFile.source); const capability = JSON.parse(capabilityFile.source);
  const inventory = await localInventory(packageDirectory); const reasons = [];
  if (sourceFile.hash !== entry.expectedSourceHash) reasons.push("SOURCE_HASH_DRIFT");
  if (targetFile.hash !== entry.expectedTargetHash) reasons.push("TARGET_HASH_DRIFT");
  if (inventory.hash !== entry.expectedPackageHash) reasons.push("PACKAGE_HASH_DRIFT");
  if (capabilityFile.hash !== entry.expectedCapabilityHash) reasons.push("SFTP_CAPABILITY_HASH_DRIFT");
  if (target?.version !== 2 || target?.ownerKey !== entry.ownerKey || target?.siteId !== entry.siteId || target?.ecosystemType !== entry.ecosystemType ||
      target?.baseDomain !== entry.baseDomain || target?.publicHost !== entry.publicHost) reasons.push("PUBLISHING_TARGET_IDENTITY_INVALID");
  if (target?.provisioningState !== "READY") reasons.push("PUBLISHING_TARGET_NOT_READY");
  if (target?.publicationState === "READY") reasons.push("PUBLICATION_STATE_READY_WITHOUT_JOURNAL");
  if (typeof target?.remoteRoot !== "string" || !target.remoteRoot.startsWith("/") || target.remoteRoot === "/") reasons.push("PUBLISHING_TARGET_REMOTE_ROOT_INVALID");
  if (capability?.status !== "VERIFIED" || capability?.sameFilesystemDirectoryRename !== true || capability?.backupRestoreReadback !== true || !Date.parse(capability?.verifiedAt)) reasons.push("SFTP_DIRECTORY_SWAP_CAPABILITY_UNVERIFIED");
  for (const name of REQUIRED_ASSETS) if (!inventory.files.some((file) => file.path === name)) reasons.push(`PACKAGE_ASSET_MISSING:${name}`);
  let config; try { config = parseConfig((await readFile(resolve(packageDirectory, "config.js"), "utf8"))); } catch { reasons.push("PACKAGE_CONFIG_INVALID"); }
  if (config) reasons.push(...validateBusinessPackage(config, source, entry));
  const protectedState = [];
  for (const item of entry.protectedLocalArtifacts) {
    const path = inside(sourceDirectory, item.siteId + ".json"); const file = await required(path); protectedState.push({ path, expectedHash: item.expectedHash, actualHash: file.hash });
    if (file.hash !== item.expectedHash) reasons.push(`PROTECTED_ARTIFACT_DRIFT:${item.siteId}`);
  }
  const material = { siteId: entry.siteId, ecosystemType: entry.ecosystemType, targetHash: entry.expectedTargetHash, sourceHash: entry.expectedSourceHash,
    packageHash: entry.expectedPackageHash, capabilityHash: entry.expectedCapabilityHash, expectedRemotePackageHash: entry.expectedRemotePackageHash,
    remoteRoot: target.remoteRoot ?? null, publicHost: entry.publicHost };
  const planHash = sha256(JSON.stringify(material)); const journalPath = resolve(journalDirectory, `${entry.siteId}.json`);
  const terminal = await terminalJournal(journalPath, planHash, adapter, entry);
  if (terminal) return { requestId: "CDX-20260824-005", mode: "PREVIEW", outcome: terminal.valid ? "ALREADY_APPLIED" : "BLOCKED_APPLIED_STATE",
    changed: false, blocked: !terminal.valid, blockedReasons: terminal.reasons, planHash, material, journalPath };
  return { requestId: "CDX-20260824-005", mode: "PREVIEW", changed: false, blocked: reasons.length > 0, blockedReasons: [...new Set(reasons)], planHash, material,
    entry, target, targetPath, targetFile, inventory, protectedState, source, packageDirectory, journalPath, operations: ["REMOTE_CLAIM", "UPLOAD_COMPLETE_STAGE", "VERIFY_STAGE_HASH",
      "RENAME_DESTINATION_TO_BACKUP_IF_PRESENT", "RENAME_STAGE_TO_DESTINATION", "PUBLIC_HTTPS_VERIFY", "MARK_TARGET_PUBLICATION_READY", "WRITE_FINAL_JOURNAL", "CLEANUP_BACKUP_AND_CLAIM"],
    guarantees: { directorySwapAtomic: false, recoverableTwoRenameCommit: true, capabilityEvidenceRequired: true, destinationSource: "PUBLISHING_TARGET_V2_REMOTE_ROOT_ONLY",
      usesLegacyGlobalRemoteRoot: false, provisioningReadyMeansPublished: false }, isolation: { allowedSiteIds: [entry.siteId], protectedSiteIds: entry.protectedLocalArtifacts.map((item) => item.siteId), apexMutated: false } };
}

async function assertOwner(adapter, claimPath, owner) { const current = JSON.parse(String(await adapter.readFile(posix.join(claimPath, "owner.json")))); if (current.token !== owner.token) throw new Error("PUBLICATION_CLAIM_OWNERSHIP_LOST"); }
async function acquireClaim(adapter, claimPath) {
  const owner = { token: randomUUID(), pid: process.pid, acquiredAt: new Date().toISOString() };
  try { await adapter.mkdir(claimPath, false); await adapter.writeFile(posix.join(claimPath, "owner.json"), Buffer.from(json(owner))); }
  catch (error) { throw new Error(`PUBLICATION_CLAIM_ACTIVE:${error.code ?? "UNKNOWN"}`); }
  return owner;
}

export async function runGuardedPublication(options) {
  const preview = await planGuardedPublication(options); if (options.mode !== APPLY_MODE) return preview;
  if (options.confirmation !== APPLY_CONFIRMATION) throw new Error(`APPLY_REQUIRES_CONFIRMATION:${APPLY_CONFIRMATION}`);
  if (options.expectedPlanHash !== preview.planHash) throw new Error("APPLY_PLAN_HASH_MISMATCH");
  if (preview.outcome === "ALREADY_APPLIED") return { ...preview, mode: APPLY_MODE };
  if (preview.blocked) throw new Error(`APPLY_BLOCKED:${preview.blockedReasons.join(",")}`);
  if (!options.adapter) throw new Error("SFTP_ADAPTER_REQUIRED");
  await mkdir(options.journalDirectory, { recursive: true });
  const { adapter } = options; const remoteRoot = preview.target.remoteRoot; const suffix = sha256(preview.entry.siteId).slice(0, 16);
  const claimPath = remoteSibling(remoteRoot, `partnerhub-claim-${suffix}`); const owner = await acquireClaim(adapter, claimPath);
  const stagePath = remoteSibling(remoteRoot, `partnerhub-stage-${owner.token}`); const backupPath = remoteSibling(remoteRoot, `partnerhub-backup-${owner.token}`);
  let destinationBackedUp = false; let destinationInstalled = false; let targetUpdated = false; let journalCommitted = false;
  try {
    if (options.hooks?.afterClaim) await options.hooks.afterClaim({ claimPath, owner, remoteRoot, stagePath, backupPath });
    await assertOwner(adapter, claimPath, owner);
    const locked = await planGuardedPublication({ ...options, adapter: null });
    if (locked.blocked || locked.planHash !== preview.planHash) throw new Error("LOCKED_PREFLIGHT_DRIFT");
    const current = await adapter.inventory(remoteRoot);
    if ((preview.entry.expectedRemotePackageHash === null && current.exists && current.files.length > 0) ||
        (preview.entry.expectedRemotePackageHash !== null && current.hash !== preview.entry.expectedRemotePackageHash)) throw new Error("REMOTE_PACKAGE_DRIFT");
    await assertOwner(adapter, claimPath, owner); await adapter.mkdir(stagePath, false);
    for (const file of preview.inventory.files) { await assertOwner(adapter, claimPath, owner); await adapter.put(file.localPath, posix.join(stagePath, file.path)); }
    const staged = await adapter.inventory(stagePath); if (staged.hash !== preview.entry.expectedPackageHash) throw new Error("REMOTE_STAGE_HASH_MISMATCH");
    if (options.hooks?.afterStage) await options.hooks.afterStage({ claimPath, owner, remoteRoot, stagePath, backupPath });
    await assertOwner(adapter, claimPath, owner);
    if (current.exists) { await adapter.rename(remoteRoot, backupPath); destinationBackedUp = true; }
    if (options.hooks?.afterBackupRename) await options.hooks.afterBackupRename({ claimPath, owner, remoteRoot, stagePath, backupPath });
    await assertOwner(adapter, claimPath, owner); await adapter.rename(stagePath, remoteRoot); destinationInstalled = true;
    if (options.hooks?.afterDestinationRename) await options.hooks.afterDestinationRename({ claimPath, owner, remoteRoot, stagePath, backupPath });
    await assertOwner(adapter, claimPath, owner); const installed = await adapter.inventory(remoteRoot);
    if (installed.hash !== preview.entry.expectedPackageHash) throw new Error("REMOTE_POST_COMMIT_HASH_MISMATCH");
    const verification = await options.verifyPublic(preview.entry, preview.source);
    if (!verification?.passed) throw new Error(`PUBLIC_VERIFICATION_FAILED:${verification?.reasons?.join(",") ?? "UNKNOWN"}`);
    for (const item of preview.protectedState) if ((await required(item.path)).hash !== item.expectedHash) throw new Error("PROTECTED_LOCAL_ARTIFACT_DRIFT");
    await assertOwner(adapter, claimPath, owner);
    const finalTarget = { ...preview.target, publicationState: "READY", updatedAt: new Date().toISOString() };
    await atomicReplace(preview.targetPath, json(finalTarget), `${owner.token}-target`); targetUpdated = true;
    const finalTargetHash = sha256(json(finalTarget));
    if (options.hooks?.afterTargetUpdate) await options.hooks.afterTargetUpdate({ claimPath, owner, remoteRoot, stagePath, backupPath });
    await assertOwner(adapter, claimPath, owner);
    await atomicJournal(preview.journalPath, { mode: APPLY_MODE, changed: true, planHash: preview.planHash, packageHash: preview.entry.expectedPackageHash,
      remoteRoot, publicHost: preview.entry.publicHost, targetPath: preview.targetPath, finalTargetHash, appliedAt: new Date().toISOString(), verification }, owner.token); journalCommitted = true;
    if (options.hooks?.afterJournal) await options.hooks.afterJournal({ claimPath, owner, remoteRoot, stagePath, backupPath });
    await assertOwner(adapter, claimPath, owner); if (destinationBackedUp) await adapter.remove(backupPath, true);
    await assertOwner(adapter, claimPath, owner); await adapter.remove(claimPath, true);
    return { ...preview, mode: APPLY_MODE, outcome: "APPLIED", changed: true, blocked: false, postVerification: "PASSED" };
  } catch (error) {
    if (journalCommitted) throw new Error(`APPLY_POST_JOURNAL_CLEANUP_FAILED:${error.message}`);
    try { await assertOwner(adapter, claimPath, owner); } catch { throw new Error("PUBLICATION_CLAIM_OWNERSHIP_LOST"); }
    if (targetUpdated) { await assertOwner(adapter, claimPath, owner); await atomicReplace(preview.targetPath, preview.targetFile.source, `${owner.token}-target-rollback`); targetUpdated = false; }
    if (destinationInstalled) { await assertOwner(adapter, claimPath, owner); await adapter.remove(remoteRoot, true); destinationInstalled = false; }
    if (destinationBackedUp) { await assertOwner(adapter, claimPath, owner); await adapter.rename(backupPath, remoteRoot); destinationBackedUp = false; }
    const stage = await adapter.inventory(stagePath); if (stage.exists) { await assertOwner(adapter, claimPath, owner); await adapter.remove(stagePath, true); }
    await assertOwner(adapter, claimPath, owner); await adapter.remove(claimPath, true); throw error;
  }
}

export async function createSftpAdapter(environment = process.env) {
  for (const name of ["HOSTINGER_SFTP_HOST", "HOSTINGER_SFTP_PORT", "HOSTINGER_SFTP_USERNAME", "HOSTINGER_SFTP_PASSWORD"]) if (!environment[name]?.trim()) throw new Error(`SFTP_CONFIGURATION_MISSING:${name}`);
  const { default: SftpClient } = await import("ssh2-sftp-client"); const client = new SftpClient();
  await client.connect({ host: environment.HOSTINGER_SFTP_HOST, port: Number(environment.HOSTINGER_SFTP_PORT), username: environment.HOSTINGER_SFTP_USERNAME,
    password: environment.HOSTINGER_SFTP_PASSWORD, readyTimeout: 15000 });
  async function inventory(root) {
    if (!(await client.exists(root))) return { exists: false, files: [], hash: sha256("[]") };
    const files = [];
    async function visit(directory, prefix = "") { for (const item of await client.list(directory)) { const path = posix.join(directory, item.name); const relativePath = posix.join(prefix, item.name);
      if (item.type === "d") await visit(path, relativePath); else if (item.type === "-") files.push({ path: relativePath, hash: sha256(await client.get(path)) }); } }
    await visit(root); files.sort((a, b) => a.path.localeCompare(b.path)); return { exists: true, files, hash: sha256(JSON.stringify(files)) };
  }
  return { inventory, mkdir: (path, recursive) => client.mkdir(path, recursive), writeFile: (path, value) => client.put(value, path), readFile: (path) => client.get(path),
    put: async (local, remote) => { await client.mkdir(posix.dirname(remote), true); await client.put(local, remote); }, rename: (from, to) => client.rename(from, to),
    remove: (path, recursive) => recursive ? client.rmdir(path, true) : client.delete(path), close: () => client.end() };
}

export async function verifyPublicPackage(entry, source, fetcher = fetch) {
  const reasons = []; const base = `https://${entry.publicHost}`; const responses = {};
  for (const asset of REQUIRED_ASSETS) { try { const response = await fetcher(`${base}/${asset}`, { redirect: "manual" }); responses[asset] = response;
    if (!response.ok) reasons.push(`PUBLIC_ASSET_UNAVAILABLE:${asset}`); } catch { reasons.push(`PUBLIC_ASSET_UNAVAILABLE:${asset}`); } }
  let config; try { config = parseConfig(await responses["config.js"].text(), `${base}/config.js`); } catch { reasons.push("PUBLIC_CONFIG_INVALID"); }
  if (config) reasons.push(...validateBusinessPackage(config, source, entry));
  return { passed: reasons.length === 0, reasons: [...new Set(reasons)], httpsVerified: reasons.every((item) => !item.startsWith("PUBLIC_ASSET_UNAVAILABLE")) };
}

async function main() {
  const arg = (name) => process.argv.find((item) => item.startsWith(`--${name}=`))?.slice(name.length + 3); const manifestPath = arg("manifest");
  if (!manifestPath) throw new Error("MANIFEST_REQUIRED"); const mode = arg("mode") ?? "PREVIEW"; let adapter;
  try { if (mode === APPLY_MODE) adapter = await createSftpAdapter(); const result = await runGuardedPublication({ manifestPath,
    sourceDirectory: process.env.PRODUCT_PAGE_SOURCE_DIR ?? "/data/generated-sites/.sources", outputDirectory: process.env.PRODUCT_PAGE_OUTPUT_DIR ?? "/data/generated-sites",
    journalDirectory: process.env.PRODUCT_PAGE_PUBLICATION_JOURNAL_DIR ?? "/data/generated-sites/.publication-journals", mode, confirmation: arg("confirm"),
    expectedPlanHash: arg("expected-plan-hash"), adapter, verifyPublic: verifyPublicPackage }); process.stdout.write(json(result)); if (result.blocked) process.exitCode = 2;
  } finally { await adapter?.close(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch((error) => { process.stderr.write(json({ error: error.message })); process.exitCode = 1; });
