import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
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

async function fixture({ existingRemote = false, ecosystemType = "BUSINESS" } = {}) {
  const root = await mkdtemp(resolve(tmpdir(), "guarded-publication-")); const sources = resolve(root, "sources"); const output = resolve(root, "output");
  const ownerSiteId = "jairo-pinto"; const siteId = ecosystemType === "PERSONAL_BRAND" ? ownerSiteId : `${ownerSiteId}-${ecosystemType === "PRODUCT" ? "product" : "business"}`;
  const hostLabel = { PRODUCT: "producto", BUSINESS: "negocio", PERSONAL_BRAND: "brand" }[ecosystemType]; const publicHost = `${hostLabel}.jairopinto.pro`; const remoteRoot = `/hosting/${hostLabel}`;
  const inputs = resolve(root, "inputs"); const journals = resolve(root, "journals"); const packageDirectory = resolve(output, siteId);
  await Promise.all([mkdir(resolve(sources, ".publishing-targets"), { recursive: true }), mkdir(packageDirectory, { recursive: true }), mkdir(inputs), mkdir(journals)]);
  const source = { ecosystemType, site: { id: siteId, domain: publicHost },
    distributor: { whatsappNumber: "573188430283", defaultMessage: "Hola Jairo" },
    vsl: { embedUrl: "https://media.example/business.mp4", thumbnailUrl: "https://cdn.example/product-hero.webp" } };
  const config = { ecosystemType, site: { id: siteId, domain: publicHost }, distributor: {},
    ...(ecosystemType === "BUSINESS" ? { vsl: { embedUrl: source.vsl.embedUrl, thumbnailUrl: source.vsl.thumbnailUrl },
      cta: { primaryUrl: "https://wa.me/573188430283?text=Hola%20Jairo", secondaryUrl: "https://wa.me/573188430283?text=Hola%20Jairo", directRegisterUrl: "" } } : {}) };
  const localFiles = new Map([["index.html", ecosystemType], ["app.js", "app"], ["styles.css", "css"], ["config.js", `const CONFIG = ${JSON.stringify(config)};\n`], ["favicon.svg", "svg"]]);
  for (const [name, value] of localFiles) await writeFile(resolve(packageDirectory, name), value);
  const sourceText = stringify(source); await writeFile(resolve(sources, `${siteId}.json`), sourceText);
  const siblingSources = new Map([
    ["jairo-pinto", stringify({ ecosystemType: "PERSONAL_BRAND", site: { id: "jairo-pinto" } })],
    ["jairo-pinto-product", stringify({ ecosystemType: "PRODUCT", site: { id: "jairo-pinto-product" } })],
    ["jairo-pinto-business", stringify({ ecosystemType: "BUSINESS", site: { id: "jairo-pinto-business" } })]
  ]); siblingSources.delete(siteId);
  for (const [siblingSiteId, value] of siblingSources) await writeFile(resolve(sources, `${siblingSiteId}.json`), value);
  const target = { version: 2, ownerKey: "f403f29e-95c8-4825-9320-967376443020", siteId, ecosystemType,
    rootEcosystemType: "PERSONAL_BRAND", baseDomain: "jairopinto.pro", publicHost, remoteRoot,
    provisioningState: "READY", publicationState: "PENDING" };
  const targetText = stringify(target); await writeFile(resolve(sources, ".publishing-targets", `${siteId}.json`), targetText);
  const environment = { HOSTINGER_SFTP_HOST: "sftp.example.test", HOSTINGER_SFTP_PORT: "22", HOSTINGER_SFTP_USERNAME: "u123456789",
    HOSTINGER_SFTP_PASSWORD: "not-used-by-tests", HOSTINGER_SFTP_HOST_KEY_SHA256: `SHA256:${"A".repeat(43)}=` };
  const capabilityValue = { schemaVersion: 1, probeVersion: "partnerhub-sftp-sibling-rename-v1", status: "VERIFIED",
    connection: { host: environment.HOSTINGER_SFTP_HOST, port: 22, hostKeyFingerprintSha256: environment.HOSTINGER_SFTP_HOST_KEY_SHA256, usernameHash: sha(environment.HOSTINGER_SFTP_USERNAME) },
    scope: { parentDirectory: "/hosting", remoteRoot }, evidence: { stagePath: "/hosting/.capability-stage", destinationPath: "/hosting/.capability-destination",
      backupPath: "/hosting/.capability-backup", sameFilesystemDirectoryRename: true, backupRestoreReadback: true }, verifiedAt: "2026-08-24T20:00:00.000Z", ttlSeconds: 3600 };
  const capability = stringify(capabilityValue);
  await writeFile(resolve(inputs, "sftp-capability.json"), capability);
  const oldRemote = new Map(existingRemote ? [["old.txt", "old package"]] : []); const expectedRemotePackageHash = existingRemote ? packageHash(oldRemote) : null;
  const entry = { ownerKey: target.ownerKey, ownerSiteId, siteId: target.siteId, ecosystemType, baseDomain: target.baseDomain, publicHost: target.publicHost,
    expectedSourceHash: sha(sourceText), expectedTargetHash: sha(targetText), expectedPackageHash: packageHash(localFiles), expectedCapabilityHash: sha(capability), expectedRemotePackageHash,
    protectedLocalArtifacts: [...siblingSources].map(([siblingSiteId, value]) => ({ siteId: siblingSiteId, expectedHash: sha(value) })) };
  const manifestPath = resolve(inputs, "manifest.json"); await writeFile(manifestPath, stringify({ confirmation: "PREVIEW_GUARDED_ECOSYSTEM_PUBLICATION", allowlist: [entry] }));
  const initial = Object.fromEntries([...oldRemote].map(([name, value]) => [`${remoteRoot}/${name}`, value])); const remote = new MemoryRemote(initial); if (existingRemote) remote.directories.add(remoteRoot);
  return { root, sources, output, inputs, journals, manifestPath, remote, entry, localFiles, environment, capabilityValue, siteId, publicHost, remoteRoot };
}

const options = (fx, extra = {}) => ({ manifestPath: fx.manifestPath, sourceDirectory: fx.sources, outputDirectory: fx.output, journalDirectory: fx.journals,
  adapter: fx.remote, environment: fx.environment, now: new Date("2026-08-24T20:30:00.000Z"), verifyPublic: async () => ({ passed: true, reasons: [], httpsVerified: true }), ...extra });
async function apply(fx, extra = {}) { const preview = await planGuardedPublication(options(fx)); return { preview,
  result: await runGuardedPublication(options(fx, { mode: APPLY_MODE, confirmation: APPLY_CONFIRMATION, expectedPlanHash: preview.planHash, ...extra })) }; }

test("PREVIEW is unchanged, generic in contract, isolated to the first allowlist", async () => {
  const fx = await fixture(); const preview = await planGuardedPublication(options(fx));
  assert.equal(preview.changed, false); assert.equal(preview.blocked, false); assert.equal(preview.guarantees.usesLegacyGlobalRemoteRoot, false);
  assert.equal(preview.guarantees.destinationSource, "PUBLISHING_TARGET_V2_REMOTE_ROOT_ONLY"); assert.deepEqual(preview.isolation.protectedSiteIds.sort(), ["jairo-pinto", "jairo-pinto-product"]);
});

test("PRODUCT and PERSONAL_BRAND packages pass the same guarded publication contract", async () => {
  for (const ecosystemType of ["PRODUCT", "PERSONAL_BRAND"]) {
    const fx = await fixture({ ecosystemType }); const preview = await planGuardedPublication(options(fx));
    assert.equal(preview.blocked, false); assert.equal(preview.material.ecosystemType, ecosystemType);
    assert.equal(preview.material.siteId, fx.siteId); assert.equal(preview.material.publicHost, fx.publicHost);
    assert.equal(preview.material.remoteRoot, fx.remoteRoot);
    const result = await runGuardedPublication(options(fx, { mode: APPLY_MODE, confirmation: APPLY_CONFIRMATION, expectedPlanHash: preview.planHash }));
    assert.equal(result.outcome, "APPLIED"); assert.equal((await fx.remote.inventory(fx.remoteRoot)).hash, fx.entry.expectedPackageHash);
    assert.equal(JSON.parse(await readFile(resolve(fx.sources, ".publishing-targets", `${fx.siteId}.json`), "utf8")).publicationState, "READY");
  }
});

test("planHash binds owner, domain and every protected local artifact hash", async () => {
  const fx = await fixture(); const first = await planGuardedPublication(options(fx));
  fx.entry.protectedLocalArtifacts[0].expectedHash = "0".repeat(64);
  await writeFile(fx.manifestPath, stringify({ confirmation: "PREVIEW_GUARDED_ECOSYSTEM_PUBLICATION", allowlist: [fx.entry] }));
  const second = await planGuardedPublication(options(fx)); assert.notEqual(second.planHash, first.planHash);
  assert.ok(second.blockedReasons.some((reason) => reason.startsWith("PROTECTED_ARTIFACT_DRIFT:")));
});

test("PREVIEW output never exposes SFTP credentials", async () => {
  const fx = await fixture(); const preview = await planGuardedPublication(options(fx)); const serialized = JSON.stringify(preview);
  assert.equal(serialized.includes(fx.environment.HOSTINGER_SFTP_PASSWORD), false);
  assert.equal(serialized.includes(fx.environment.HOSTINGER_SFTP_USERNAME), false);
  assert.equal(serialized.includes(fx.environment.HOSTINGER_SFTP_HOST_KEY_SHA256), true);
});

test("manifest identity must use canonical owner siteId and ecosystem hostname", async () => {
  const mutations = [
    (entry) => { entry.ownerKey = "not-a-uuid"; },
    (entry) => { entry.siteId = "../foreign"; },
    (entry) => { entry.publicHost = "negocio.foreign.pro"; },
    (entry) => { entry.ownerSiteId = "other-owner"; },
    (entry) => { entry.protectedLocalArtifacts.push({ ...entry.protectedLocalArtifacts[0] }); }
  ];
  for (const mutate of mutations) {
    const fx = await fixture(); mutate(fx.entry);
    await writeFile(fx.manifestPath, stringify({ confirmation: "PREVIEW_GUARDED_ECOSYSTEM_PUBLICATION", allowlist: [fx.entry] }));
    await assert.rejects(planGuardedPublication(options(fx)), /OWNER_KEY_INVALID|SITE_ID_INVALID|PUBLIC_HOST_INVALID|SITE_ID_OWNER_ECOSYSTEM_MISMATCH|PROTECTED_ARTIFACTS_INVALID/);
  }
});

test("source and generated package cannot substitute another ecosystem identity even with updated hashes", async () => {
  const packageFixture = await fixture(); const packagePath = resolve(packageFixture.output, packageFixture.siteId, "config.js");
  const foreignConfig = `const CONFIG={ecosystemType:"PRODUCT",site:{id:"jairo-pinto-product",domain:"producto.jairopinto.pro"}};\n`;
  await writeFile(packagePath, foreignConfig); packageFixture.localFiles.set("config.js", foreignConfig);
  packageFixture.entry.expectedPackageHash = packageHash(packageFixture.localFiles);
  await writeFile(packageFixture.manifestPath, stringify({ confirmation: "PREVIEW_GUARDED_ECOSYSTEM_PUBLICATION", allowlist: [packageFixture.entry] }));
  let preview = await planGuardedPublication(options(packageFixture)); assert.ok(preview.blockedReasons.includes("PACKAGE_CONFIG_IDENTITY_INVALID"));

  const sourceFixture = await fixture(); const sourcePath = resolve(sourceFixture.sources, `${sourceFixture.siteId}.json`);
  const foreignSource = stringify({ ecosystemType: "PRODUCT", site: { id: "jairo-pinto-product", domain: "producto.jairopinto.pro" } });
  await writeFile(sourcePath, foreignSource); sourceFixture.entry.expectedSourceHash = sha(foreignSource);
  await writeFile(sourceFixture.manifestPath, stringify({ confirmation: "PREVIEW_GUARDED_ECOSYSTEM_PUBLICATION", allowlist: [sourceFixture.entry] }));
  preview = await planGuardedPublication(options(sourceFixture)); assert.ok(preview.blockedReasons.includes("PACKAGE_SOURCE_IDENTITY_INVALID"));
});

test("blocks unverified rename capability, target drift and non-READY target", async () => {
  const fx = await fixture(); await writeFile(resolve(fx.inputs, "sftp-capability.json"), stringify({ status: "UNKNOWN" }));
  let preview = await planGuardedPublication(options(fx)); assert.ok(preview.blockedReasons.includes("SFTP_CAPABILITY_HASH_DRIFT")); assert.ok(preview.blockedReasons.includes("SFTP_DIRECTORY_SWAP_CAPABILITY_UNVERIFIED"));
  const other = await fixture(); const path = resolve(other.sources, ".publishing-targets", "jairo-pinto-business.json"); const target = JSON.parse(await readFile(path, "utf8")); target.provisioningState = "SSL_PENDING"; await writeFile(path, stringify(target));
  preview = await planGuardedPublication(options(other)); assert.ok(preview.blockedReasons.includes("TARGET_HASH_DRIFT")); assert.ok(preview.blockedReasons.includes("PUBLISHING_TARGET_NOT_READY"));
});

test("capability is bound to host, port, fingerprint, username, parent and remoteRoot", async () => {
  const mutations = [
    (value) => { value.connection.host = "other.example.test"; },
    (value) => { value.connection.port = 2222; },
    (value) => { value.connection.hostKeyFingerprintSha256 = `SHA256:${"B".repeat(43)}=`; },
    (value) => { value.connection.usernameHash = "0".repeat(64); },
    (value) => { value.scope.parentDirectory = "/other"; },
    (value) => { value.scope.remoteRoot = "/hosting/other"; }
  ];
  for (const mutate of mutations) {
    const fx = await fixture(); const capability = JSON.parse(JSON.stringify(fx.capabilityValue)); mutate(capability); const text = stringify(capability);
    await writeFile(resolve(fx.inputs, "sftp-capability.json"), text); fx.entry.expectedCapabilityHash = sha(text);
    await writeFile(fx.manifestPath, stringify({ confirmation: "PREVIEW_GUARDED_ECOSYSTEM_PUBLICATION", allowlist: [fx.entry] }));
    const preview = await planGuardedPublication(options(fx)); assert.equal(preview.blocked, true);
    assert.ok(preview.blockedReasons.some((reason) => reason.startsWith("SFTP_CAPABILITY_CONNECTION_MISMATCH") || reason === "SFTP_CAPABILITY_PARENT_MISMATCH" || reason === "SFTP_CAPABILITY_REMOTE_ROOT_MISMATCH"));
  }
});

test("expired and future capability evidence block fail-closed", async () => {
  for (const verifiedAt of ["2026-08-24T18:00:00.000Z", "2026-08-24T21:00:00.000Z"]) {
    const fx = await fixture(); const capability = { ...fx.capabilityValue, verifiedAt, ttlSeconds: 3600 }; const text = stringify(capability);
    await writeFile(resolve(fx.inputs, "sftp-capability.json"), text); fx.entry.expectedCapabilityHash = sha(text);
    await writeFile(fx.manifestPath, stringify({ confirmation: "PREVIEW_GUARDED_ECOSYSTEM_PUBLICATION", allowlist: [fx.entry] }));
    const preview = await planGuardedPublication(options(fx)); assert.ok(preview.blockedReasons.includes(verifiedAt.includes("18:00") ? "SFTP_CAPABILITY_EXPIRED" : "SFTP_CAPABILITY_FROM_FUTURE"));
  }
});

test("valid capability is bound into plan material and passes", async () => {
  const fx = await fixture(); const preview = await planGuardedPublication(options(fx)); assert.equal(preview.blocked, false);
  assert.deepEqual(preview.material.capabilityBinding.connection, fx.capabilityValue.connection);
  assert.equal(preview.material.capabilityBinding.scope.remoteRoot, "/hosting/negocio");
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

test("concurrent target drift at commit is not overwritten and restores the prior remote package", async () => {
  const fx = await fixture({ existingRemote: true }); const targetPath = resolve(fx.sources, ".publishing-targets", "jairo-pinto-business.json");
  const foreignTarget = stringify({ version: 2, ownerKey: "00000000-0000-4000-8000-000000000001", siteId: "foreign", ecosystemType: "BUSINESS",
    baseDomain: "foreign.example", publicHost: "negocio.foreign.example", remoteRoot: "/foreign", provisioningState: "READY", publicationState: "PENDING" });
  await assert.rejects(apply(fx, { hooks: { beforePublicationCommit: async () => { await writeFile(targetPath, foreignTarget); } } }), /TARGET_DRIFT_BEFORE_PUBLICATION_COMMIT/);
  assert.equal(await readFile(targetPath, "utf8"), foreignTarget);
  assert.equal((await fx.remote.inventory("/hosting/negocio")).hash, fx.entry.expectedRemotePackageHash);
  assert.deepEqual(await readdir(resolve(fx.journals, "jairo-pinto-business")), []);
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
  const fx = await fixture(); const applied = await apply(fx); const journalPath = applied.preview.journalPath;
  const journal = JSON.parse(await readFile(journalPath, "utf8")); journal.planHash = "0".repeat(64); await writeFile(journalPath, stringify(journal));
  let preview = await planGuardedPublication(options(fx)); assert.equal(preview.outcome, "BLOCKED_APPLIED_STATE"); assert.ok(preview.blockedReasons.includes("PUBLICATION_JOURNAL_DRIFT"));
  const other = await fixture(); await apply(other); other.remote.files.set("/hosting/negocio/app.js", Buffer.from("drift"));
  preview = await planGuardedPublication(options(other)); assert.equal(preview.outcome, "BLOCKED_APPLIED_STATE"); assert.ok(preview.blockedReasons.includes("PUBLISHED_PACKAGE_DRIFT"));
});

test("an already READY target can receive a later version with its own immutable plan journal", async () => {
  const fx = await fixture(); const path = resolve(fx.sources, ".publishing-targets", "jairo-pinto-business.json"); const target = JSON.parse(await readFile(path, "utf8"));
  target.publicationState = "READY"; const source = stringify(target); await writeFile(path, source); fx.entry.expectedTargetHash = sha(source);
  await writeFile(fx.manifestPath, stringify({ confirmation: "PREVIEW_GUARDED_ECOSYSTEM_PUBLICATION", allowlist: [fx.entry] }));
  const preview = await planGuardedPublication(options(fx)); assert.equal(preview.blocked, false);
  const result = await runGuardedPublication(options(fx, { mode: APPLY_MODE, confirmation: APPLY_CONFIRMATION, expectedPlanHash: preview.planHash }));
  assert.equal(result.outcome, "APPLIED"); assert.match(result.journalPath, new RegExp(`${preview.planHash}\\.json$`));
});

test("Business validation blocks purchaseUrl and divergent WhatsApp CTAs", async () => {
  const fx = await fixture(); const path = resolve(fx.output, "jairo-pinto-business", "config.js");
  await writeFile(path, `const CONFIG={ecosystemType:"BUSINESS",site:{id:"jairo-pinto-business",domain:"negocio.jairopinto.pro"},distributor:{purchaseUrl:"https://store.example"},vsl:{embedUrl:"https://media.example/a.mp4",thumbnailUrl:"https://cdn.example/product-hero.webp"},cta:{primaryUrl:"https://wa.me/1?text=a",secondaryUrl:"https://wa.me/2?text=b"}};\n`);
  const preview = await planGuardedPublication(options(fx)); assert.ok(preview.blockedReasons.includes("PACKAGE_HASH_DRIFT"));
  assert.ok(preview.blockedReasons.includes("BUSINESS_WHATSAPP_CTA_INVALID")); assert.ok(preview.blockedReasons.includes("BUSINESS_PURCHASE_URL_PRESENT"));
});
