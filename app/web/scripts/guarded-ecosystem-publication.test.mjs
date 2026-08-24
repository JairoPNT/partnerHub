import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { posix, resolve } from "node:path";
import test from "node:test";
import { APPLY_CONFIRMATION, APPLY_MODE, planGuardedPublication, runGuardedPublication } from "./guarded-ecosystem-publication.mjs";

const sha = (value) => createHash("sha256").update(value).digest("hex");
const stringify = (value) => `${JSON.stringify(value, null, 2)}\n`;
const packageHash = (files) => sha(JSON.stringify([...files.entries()].map(([path, value]) => ({ path, hash: sha(value) })).sort((a, b) => a.path.localeCompare(b.path))));

class MemoryRemote {
  constructor(initial = {}) { this.files = new Map(Object.entries(initial).map(([key, value]) => [posix.normalize(key), Buffer.from(value)])); this.directories = new Set(["/"]); this.fail = null; }
  hasDirectory(path) { const root = posix.normalize(path); return this.directories.has(root) || [...this.files].some(([name]) => name.startsWith(`${root}/`)); }
  async inventory(root) { const base = posix.normalize(root); const files = [...this.files].filter(([name]) => name.startsWith(`${base}/`)).map(([name, value]) => ({ path: name.slice(base.length + 1), hash: sha(value) })).sort((a, b) => a.path.localeCompare(b.path));
    return { exists: this.hasDirectory(base), files, hash: sha(JSON.stringify(files)) }; }
  async mkdir(path) { const normalized = posix.normalize(path); if (this.hasDirectory(normalized)) throw Object.assign(new Error("exists"), { code: "EEXIST" }); this.directories.add(normalized); }
  async writeFile(path, value) { this.files.set(posix.normalize(path), Buffer.from(value)); }
  async readFile(path) { const value = this.files.get(posix.normalize(path)); if (!value) throw new Error("ENOENT"); return value; }
  async put(local, remote) { if (this.fail === "put") throw new Error("INJECTED_PUT_FAILURE"); this.files.set(posix.normalize(remote), await readFile(local)); }
  async rename(from, to) { if (this.fail === `rename:${posix.basename(from)}` || this.fail === "rename") throw new Error("INJECTED_RENAME_FAILURE");
    const source = posix.normalize(from); const destination = posix.normalize(to); if (!this.hasDirectory(source)) throw new Error("REMOTE_SOURCE_MISSING");
    for (const [name, value] of [...this.files]) if (name.startsWith(`${source}/`)) { this.files.delete(name); this.files.set(`${destination}${name.slice(source.length)}`, value); }
    for (const name of [...this.directories]) if (name === source || name.startsWith(`${source}/`)) { this.directories.delete(name); this.directories.add(`${destination}${name.slice(source.length)}`); }
    this.directories.add(destination);
  }
  async remove(path) { const root = posix.normalize(path); for (const name of [...this.files.keys()]) if (name === root || name.startsWith(`${root}/`)) this.files.delete(name);
    for (const name of [...this.directories]) if (name === root || name.startsWith(`${root}/`)) this.directories.delete(name); }
}

async function fixture({ existingRemote = false } = {}) {
  const root = await mkdtemp(resolve(tmpdir(), "guarded-publication-")); const sources = resolve(root, "sources"); const output = resolve(root, "output");
  const inputs = resolve(root, "inputs"); const journals = resolve(root, "journals"); const packageDirectory = resolve(output, "jairo-pinto-business");
  await Promise.all([mkdir(resolve(sources, ".publishing-targets"), { recursive: true }), mkdir(packageDirectory, { recursive: true }), mkdir(inputs), mkdir(journals)]);
  const source = { ecosystemType: "BUSINESS", site: { id: "jairo-pinto-business", domain: "negocio.jairopinto.pro" },
    distributor: { whatsappNumber: "573188430283", defaultMessage: "Hola Jairo" },
    vsl: { embedUrl: "https://media.example/business.mp4", thumbnailUrl: "https://cdn.example/product-hero.webp" } };
  const config = { ecosystemType: "BUSINESS", site: { id: "jairo-pinto-business", domain: "negocio.jairopinto.pro" }, distributor: {},
    vsl: { embedUrl: source.vsl.embedUrl, thumbnailUrl: source.vsl.thumbnailUrl }, cta: { primaryUrl: "https://wa.me/573188430283?text=Hola%20Jairo", secondaryUrl: "https://wa.me/573188430283?text=Hola%20Jairo", directRegisterUrl: "" } };
  const localFiles = new Map([["index.html", "business"], ["app.js", "app"], ["styles.css", "css"], ["config.js", `const CONFIG = ${JSON.stringify(config)};\n`], ["favicon.svg", "svg"]]);
  for (const [name, value] of localFiles) await writeFile(resolve(packageDirectory, name), value);
  const sourceText = stringify(source); await writeFile(resolve(sources, "jairo-pinto-business.json"), sourceText);
  const brand = stringify({ ecosystemType: "PERSONAL_BRAND", site: { id: "jairo-pinto" } }); const product = stringify({ ecosystemType: "PRODUCT", site: { id: "jairo-pinto-product" } });
  await writeFile(resolve(sources, "jairo-pinto.json"), brand); await writeFile(resolve(sources, "jairo-pinto-product.json"), product);
  const target = { version: 2, ownerKey: "f403f29e-95c8-4825-9320-967376443020", siteId: "jairo-pinto-business", ecosystemType: "BUSINESS",
    rootEcosystemType: "PERSONAL_BRAND", baseDomain: "jairopinto.pro", publicHost: "negocio.jairopinto.pro", remoteRoot: "/hosting/negocio",
    provisioningState: "READY", publicationState: "PENDING" };
  const targetText = stringify(target); await writeFile(resolve(sources, ".publishing-targets", "jairo-pinto-business.json"), targetText);
  const capability = stringify({ status: "VERIFIED", sameFilesystemDirectoryRename: true, backupRestoreReadback: true, verifiedAt: "2026-08-24T20:00:00.000Z" });
  await writeFile(resolve(inputs, "sftp-capability.json"), capability);
  const oldRemote = new Map(existingRemote ? [["old.txt", "old package"]] : []); const expectedRemotePackageHash = existingRemote ? packageHash(oldRemote) : null;
  const entry = { ownerKey: target.ownerKey, ownerSiteId: "jairo-pinto", siteId: target.siteId, ecosystemType: "BUSINESS", baseDomain: target.baseDomain, publicHost: target.publicHost,
    expectedSourceHash: sha(sourceText), expectedTargetHash: sha(targetText), expectedPackageHash: packageHash(localFiles), expectedCapabilityHash: sha(capability), expectedRemotePackageHash,
    protectedLocalArtifacts: [{ siteId: "jairo-pinto", expectedHash: sha(brand) }, { siteId: "jairo-pinto-product", expectedHash: sha(product) }] };
  const manifestPath = resolve(inputs, "manifest.json"); await writeFile(manifestPath, stringify({ confirmation: "PREVIEW_GUARDED_ECOSYSTEM_PUBLICATION", allowlist: [entry] }));
  const initial = Object.fromEntries([...oldRemote].map(([name, value]) => [`/hosting/negocio/${name}`, value])); const remote = new MemoryRemote(initial); if (existingRemote) remote.directories.add("/hosting/negocio");
  return { root, sources, output, inputs, journals, manifestPath, remote, entry, localFiles, brand, product };
}

const options = (fx, extra = {}) => ({ manifestPath: fx.manifestPath, sourceDirectory: fx.sources, outputDirectory: fx.output, journalDirectory: fx.journals,
  adapter: fx.remote, verifyPublic: async () => ({ passed: true, reasons: [], httpsVerified: true }), ...extra });
async function apply(fx, extra = {}) { const preview = await planGuardedPublication(options(fx)); return { preview,
  result: await runGuardedPublication(options(fx, { mode: APPLY_MODE, confirmation: APPLY_CONFIRMATION, expectedPlanHash: preview.planHash, ...extra })) }; }

test("PREVIEW is unchanged, generic in contract, isolated to the first allowlist", async () => {
  const fx = await fixture(); const preview = await planGuardedPublication(options(fx));
  assert.equal(preview.changed, false); assert.equal(preview.blocked, false); assert.equal(preview.guarantees.usesLegacyGlobalRemoteRoot, false);
  assert.equal(preview.guarantees.destinationSource, "PUBLISHING_TARGET_V2_REMOTE_ROOT_ONLY"); assert.deepEqual(preview.isolation.protectedSiteIds.sort(), ["jairo-pinto", "jairo-pinto-product"]);
});

test("blocks unverified rename capability, target drift and non-READY target", async () => {
  const fx = await fixture(); await writeFile(resolve(fx.inputs, "sftp-capability.json"), stringify({ status: "UNKNOWN" }));
  let preview = await planGuardedPublication(options(fx)); assert.ok(preview.blockedReasons.includes("SFTP_CAPABILITY_HASH_DRIFT")); assert.ok(preview.blockedReasons.includes("SFTP_DIRECTORY_SWAP_CAPABILITY_UNVERIFIED"));
  const other = await fixture(); const path = resolve(other.sources, ".publishing-targets", "jairo-pinto-business.json"); const target = JSON.parse(await readFile(path, "utf8")); target.provisioningState = "SSL_PENDING"; await writeFile(path, stringify(target));
  preview = await planGuardedPublication(options(other)); assert.ok(preview.blockedReasons.includes("TARGET_HASH_DRIFT")); assert.ok(preview.blockedReasons.includes("PUBLISHING_TARGET_NOT_READY"));
});

test("APPLY requires confirmation and exact planHash", async () => {
  const fx = await fixture(); const preview = await planGuardedPublication(options(fx));
  await assert.rejects(runGuardedPublication(options(fx, { mode: APPLY_MODE, expectedPlanHash: preview.planHash })), /APPLY_REQUIRES_CONFIRMATION/);
  await assert.rejects(runGuardedPublication(options(fx, { mode: APPLY_MODE, confirmation: APPLY_CONFIRMATION, expectedPlanHash: "0".repeat(64) })), /APPLY_PLAN_HASH_MISMATCH/);
});

test("uploads and readback-verifies a complete package, then reruns ALREADY_APPLIED", async () => {
  const fx = await fixture(); const { preview, result } = await apply(fx); assert.equal(result.outcome, "APPLIED"); assert.equal(result.postVerification, "PASSED");
  assert.equal((await fx.remote.inventory("/hosting/negocio")).hash, fx.entry.expectedPackageHash);
  assert.equal(JSON.parse(await readFile(resolve(fx.sources, ".publishing-targets", "jairo-pinto-business.json"), "utf8")).publicationState, "READY");
  const rerun = await runGuardedPublication(options(fx, { mode: APPLY_MODE, confirmation: APPLY_CONFIRMATION, expectedPlanHash: preview.planHash }));
  assert.equal(rerun.outcome, "ALREADY_APPLIED"); assert.equal(rerun.changed, false);
});

test("exclusive remote claim lets only one process mutate", async () => {
  const fx = await fixture(); const preview = await planGuardedPublication(options(fx)); let release; let acquired;
  const waiting = new Promise((done) => { acquired = done; }); const gate = new Promise((done) => { release = done; });
  const first = runGuardedPublication(options(fx, { mode: APPLY_MODE, confirmation: APPLY_CONFIRMATION, expectedPlanHash: preview.planHash,
    hooks: { afterClaim: async () => { acquired(); await gate; } } })); await waiting;
  await assert.rejects(runGuardedPublication(options(fx, { mode: APPLY_MODE, confirmation: APPLY_CONFIRMATION, expectedPlanHash: preview.planHash })), /PUBLICATION_CLAIM_ACTIVE/);
  release(); assert.equal((await first).outcome, "APPLIED");
});

test("pre-commit upload failure removes owned stage and preserves destination", async () => {
  const fx = await fixture({ existingRemote: true }); fx.remote.fail = "put";
  await assert.rejects(apply(fx), /INJECTED_PUT_FAILURE/); assert.equal((await fx.remote.inventory("/hosting/negocio")).hash, fx.entry.expectedRemotePackageHash);
});

test("second rename failure restores the previous package under ownership", async () => {
  const fx = await fixture({ existingRemote: true }); let renameCount = 0; const original = fx.remote.rename.bind(fx.remote);
  fx.remote.rename = async (...args) => { renameCount += 1; if (renameCount === 2) throw new Error("INJECTED_COMMIT_FAILURE"); return original(...args); };
  await assert.rejects(apply(fx), /INJECTED_COMMIT_FAILURE/); assert.equal((await fx.remote.inventory("/hosting/negocio")).hash, fx.entry.expectedRemotePackageHash);
});

test("public verification failure rolls back the installed package", async () => {
  const fx = await fixture({ existingRemote: true });
  await assert.rejects(apply(fx, { verifyPublic: async () => ({ passed: false, reasons: ["BUSINESS_VSL_MP4_INVALID"] }) }), /PUBLIC_VERIFICATION_FAILED/);
  assert.equal((await fx.remote.inventory("/hosting/negocio")).hash, fx.entry.expectedRemotePackageHash);
  assert.equal(JSON.parse(await readFile(resolve(fx.sources, ".publishing-targets", "jairo-pinto-business.json"), "utf8")).publicationState, "PENDING");
});

test("late pre-journal failure restores target state and previous remote package", async () => {
  const fx = await fixture({ existingRemote: true });
  await assert.rejects(apply(fx, { hooks: { afterTargetUpdate: async () => { throw new Error("INJECTED_PRE_JOURNAL_FAILURE"); } } }), /INJECTED_PRE_JOURNAL_FAILURE/);
  assert.equal((await fx.remote.inventory("/hosting/negocio")).hash, fx.entry.expectedRemotePackageHash);
  assert.equal(JSON.parse(await readFile(resolve(fx.sources, ".publishing-targets", "jairo-pinto-business.json"), "utf8")).publicationState, "PENDING");
});

test("ownership loss after mutation never deletes or restores foreign artifacts", async () => {
  const fx = await fixture({ existingRemote: true });
  await assert.rejects(apply(fx, { hooks: { afterBackupRename: async ({ claimPath }) => {
    await fx.remote.writeFile(posix.join(claimPath, "owner.json"), Buffer.from(stringify({ token: "foreign" })));
  } } }), /PUBLICATION_CLAIM_OWNERSHIP_LOST/);
  assert.equal((await fx.remote.inventory("/hosting/negocio")).exists, false);
  assert.equal([...fx.remote.directories].some((path) => path.includes("partnerhub-backup")), true);
});

test("post-journal cleanup failure never rolls back and rerun remains ALREADY_APPLIED", async () => {
  const fx = await fixture({ existingRemote: true });
  await assert.rejects(apply(fx, { hooks: { afterJournal: async () => { throw new Error("INJECTED_CLEANUP_FAILURE"); } } }), /APPLY_POST_JOURNAL_CLEANUP_FAILED/);
  assert.equal((await fx.remote.inventory("/hosting/negocio")).hash, fx.entry.expectedPackageHash);
  const preview = await planGuardedPublication(options(fx)); assert.equal(preview.outcome, "ALREADY_APPLIED"); assert.equal(preview.changed, false);
});

test("journal and final remote package drift block idempotent reruns", async () => {
  const fx = await fixture(); await apply(fx); const journalPath = resolve(fx.journals, "jairo-pinto-business.json");
  const journal = JSON.parse(await readFile(journalPath, "utf8")); journal.planHash = "0".repeat(64); await writeFile(journalPath, stringify(journal));
  let preview = await planGuardedPublication(options(fx)); assert.equal(preview.outcome, "BLOCKED_APPLIED_STATE"); assert.ok(preview.blockedReasons.includes("PUBLICATION_JOURNAL_DRIFT"));
  const other = await fixture(); await apply(other); other.remote.files.set("/hosting/negocio/app.js", Buffer.from("drift"));
  preview = await planGuardedPublication(options(other)); assert.equal(preview.outcome, "BLOCKED_APPLIED_STATE"); assert.ok(preview.blockedReasons.includes("PUBLISHED_PACKAGE_DRIFT"));
});

test("provisioning READY never substitutes publication READY without a journal", async () => {
  const fx = await fixture(); const path = resolve(fx.sources, ".publishing-targets", "jairo-pinto-business.json"); const target = JSON.parse(await readFile(path, "utf8"));
  target.publicationState = "READY"; const source = stringify(target); await writeFile(path, source); fx.entry.expectedTargetHash = sha(source);
  await writeFile(fx.manifestPath, stringify({ confirmation: "PREVIEW_GUARDED_ECOSYSTEM_PUBLICATION", allowlist: [fx.entry] }));
  const preview = await planGuardedPublication(options(fx)); assert.ok(preview.blockedReasons.includes("PUBLICATION_STATE_READY_WITHOUT_JOURNAL"));
});

test("Business validation blocks purchaseUrl and divergent WhatsApp CTAs", async () => {
  const fx = await fixture(); const path = resolve(fx.output, "jairo-pinto-business", "config.js");
  await writeFile(path, `const CONFIG={ecosystemType:"BUSINESS",site:{id:"jairo-pinto-business",domain:"negocio.jairopinto.pro"},distributor:{purchaseUrl:"https://store.example"},vsl:{embedUrl:"https://media.example/a.mp4",thumbnailUrl:"https://cdn.example/product-hero.webp"},cta:{primaryUrl:"https://wa.me/1?text=a",secondaryUrl:"https://wa.me/2?text=b"}};\n`);
  const preview = await planGuardedPublication(options(fx)); assert.ok(preview.blockedReasons.includes("PACKAGE_HASH_DRIFT"));
  assert.ok(preview.blockedReasons.includes("BUSINESS_WHATSAPP_CTA_INVALID")); assert.ok(preview.blockedReasons.includes("BUSINESS_PURCHASE_URL_PRESENT"));
});
