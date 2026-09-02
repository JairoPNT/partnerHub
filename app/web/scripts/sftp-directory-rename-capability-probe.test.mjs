import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { posix, resolve } from "node:path";
import test from "node:test";
import { PROBE_CONFIRMATION, PROBE_MODE, planSftpCapabilityProbe, runSftpCapabilityProbe } from "./sftp-directory-rename-capability-probe.mjs";

const sha = (value) => createHash("sha256").update(value).digest("hex");
const stringify = (value) => `${JSON.stringify(value, null, 2)}\n`;

class MemorySftp {
  constructor() { this.files = new Map([["/hosting/negocio/live.txt", Buffer.from("LIVE_TARGET")]]); this.directories = new Set(["/", "/hosting", "/hosting/negocio"]); this.calls = []; this.fail = null; this.readMutator = null; }
  has(path) { const root = posix.normalize(path); return this.directories.has(root) || [...this.files.keys()].some((name) => name === root || name.startsWith(`${root}/`)); }
  async inventory(path) { this.calls.push(`inventory:${path}`); const root = posix.normalize(path); const files = [...this.files].filter(([name]) => name.startsWith(`${root}/`)).map(([name, value]) => ({ path: name.slice(root.length + 1), hash: sha(value) })).sort((a, b) => a.path.localeCompare(b.path)); return { exists: this.has(root), files, hash: sha(JSON.stringify(files)) }; }
  async mkdir(path) { this.calls.push(`mkdir:${path}`); if (this.has(path)) throw Object.assign(new Error("exists"), { code: "EEXIST" }); this.directories.add(posix.normalize(path)); }
  async writeFile(path, value) { this.calls.push(`write:${path}`); if (this.fail === "write") throw new Error("INJECTED_WRITE_FAILURE"); this.files.set(posix.normalize(path), Buffer.from(value)); }
  async readFile(path) { this.calls.push(`read:${path}`); let value = this.files.get(posix.normalize(path)); if (!value) throw new Error("ENOENT"); if (this.readMutator) value = this.readMutator(path, value); return value; }
  async rename(from, to) { this.calls.push(`rename:${from}->${to}`); if (this.fail === "rename") throw new Error("SFTP_RENAME_UNSUPPORTED"); const source = posix.normalize(from); const destination = posix.normalize(to);
    if (!this.has(source) || this.has(destination)) throw new Error("RENAME_CONFLICT"); for (const [name, value] of [...this.files]) if (name.startsWith(`${source}/`)) { this.files.delete(name); this.files.set(`${destination}${name.slice(source.length)}`, value); }
    for (const name of [...this.directories]) if (name === source || name.startsWith(`${source}/`)) { this.directories.delete(name); this.directories.add(`${destination}${name.slice(source.length)}`); } this.directories.add(destination); }
  async remove(path) { this.calls.push(`remove:${path}`); if (this.fail === "cleanup") throw new Error("INJECTED_CLEANUP_FAILURE"); const root = posix.normalize(path);
    for (const name of [...this.files.keys()]) if (name === root || name.startsWith(`${root}/`)) this.files.delete(name); for (const name of [...this.directories]) if (name === root || name.startsWith(`${root}/`)) this.directories.delete(name); }
}

async function fixture(ecosystemType = "BUSINESS") {
  const root = await mkdtemp(resolve(tmpdir(), "sftp-capability-probe-")); const sources = resolve(root, "sources"); const inputs = resolve(root, "inputs"); const output = resolve(root, "output");
  await mkdir(resolve(sources, ".publishing-targets"), { recursive: true }); await mkdir(inputs); await mkdir(output);
  const suffix = { PRODUCT: "-product", BUSINESS: "-business", PERSONAL_BRAND: "" }[ecosystemType];
  const label = { PRODUCT: "producto", BUSINESS: "negocio", PERSONAL_BRAND: "brand" }[ecosystemType];
  const siteId = `ana-segura${suffix}`; const publicHost = `${label}.anasegura.pro`; const remoteRoot = `/hosting/${label}`;
  const target = { version: 2, ownerKey: "f403f29e-95c8-4825-9320-967376443020", siteId, ecosystemType,
    rootEcosystemType: "PERSONAL_BRAND", baseDomain: "anasegura.pro", publicHost, remoteRoot, provisioningState: "READY", publicationState: "PENDING" };
  const targetText = stringify(target); await writeFile(resolve(sources, ".publishing-targets", `${siteId}.json`), targetText);
  const probeToken = "123e4567-e89b-42d3-a456-426614174000"; const paths = { claim: `/hosting/.partnerhub-capability-claim-${probeToken}`,
    stage: `/hosting/.partnerhub-capability-stage-${probeToken}`, destination: `/hosting/.partnerhub-capability-destination-${probeToken}`, backup: `/hosting/.partnerhub-capability-backup-${probeToken}` };
  const entry = { ownerKey: target.ownerKey, siteId: target.siteId, ecosystemType: target.ecosystemType, baseDomain: target.baseDomain, publicHost: target.publicHost,
    expectedTargetHash: sha(targetText), remoteRoot: target.remoteRoot, parentDirectory: "/hosting", probeToken, paths, canaryHex: "ab".repeat(32), ttlSeconds: 1800 };
  const manifestPath = resolve(inputs, "manifest.json"); await writeFile(manifestPath, stringify({ confirmation: "PREVIEW_SFTP_DIRECTORY_RENAME_CAPABILITY", allowlist: [entry] }));
  const environment = { HOSTINGER_SFTP_HOST: "sftp.example.test", HOSTINGER_SFTP_PORT: "22", HOSTINGER_SFTP_USERNAME: "u123456789",
    HOSTINGER_SFTP_PASSWORD: "unused", HOSTINGER_SFTP_HOST_KEY_SHA256: `SHA256:${"A".repeat(43)}=` };
  return { root, sources, inputs, output, target, targetText, entry, manifestPath, environment, adapter: new MemorySftp() };
}
const options = (fx, extra = {}) => ({ manifestPath: fx.manifestPath, sourceDirectory: fx.sources, outputDirectory: fx.output, environment: fx.environment,
  now: new Date("2026-08-24T22:00:00.000Z"), adapter: fx.adapter, ...extra });
async function probe(fx, extra = {}) { const preview = await planSftpCapabilityProbe(options(fx)); return runSftpCapabilityProbe(options(fx, { mode: PROBE_MODE,
  confirmation: PROBE_CONFIRMATION, expectedPlanHash: preview.planHash, ...extra })); }
const targetSnapshot = async (adapter, remoteRoot = "/hosting/negocio") => JSON.stringify(await adapter.inventory(remoteRoot));

test("accepts canonical PRODUCT, BUSINESS and PERSONAL_BRAND targets without a customer allowlist", async () => {
  for (const ecosystemType of ["PRODUCT", "BUSINESS", "PERSONAL_BRAND"]) {
    const fx = await fixture(ecosystemType); const preview = await planSftpCapabilityProbe(options(fx));
    assert.equal(preview.blocked, false); assert.equal(preview.entry.siteId, fx.target.siteId); assert.equal(preview.planMaterial.remoteRoot, fx.target.remoteRoot);
  }
});

test("rejects a cross-tenant or non-canonical hostname before connecting", async () => {
  const fx = await fixture(); fx.entry.publicHost = "negocio.otrocliente.pro";
  await writeFile(fx.manifestPath, stringify({ confirmation: "PREVIEW_SFTP_DIRECTORY_RENAME_CAPABILITY", allowlist: [fx.entry] }));
  await assert.rejects(planSftpCapabilityProbe(options(fx)), /PUBLIC_HOST_INVALID/);
  assert.equal(fx.adapter.calls.length, 0);
});

test("PREVIEW creates no adapter, connection or filesystem write", async () => {
  const fx = await fixture(); let factoryCalls = 0; const before = await readdir(fx.output);
  const result = await runSftpCapabilityProbe({ ...options(fx), adapter: undefined, adapterFactory: async () => { factoryCalls += 1; throw new Error("MUST_NOT_CONNECT"); } });
  assert.equal(result.mode, "PREVIEW"); assert.equal(result.changed, false); assert.equal(factoryCalls, 0); assert.deepEqual(await readdir(fx.output), before); assert.equal(fx.adapter.calls.length, 0);
});

test("requires exact mode confirmation and reviewed planHash", async () => {
  const fx = await fixture(); const preview = await planSftpCapabilityProbe(options(fx));
  await assert.rejects(runSftpCapabilityProbe(options(fx, { mode: PROBE_MODE, expectedPlanHash: preview.planHash })), /PROBE_REQUIRES_CONFIRMATION/);
  await assert.rejects(runSftpCapabilityProbe(options(fx, { mode: PROBE_MODE, confirmation: PROBE_CONFIRMATION, expectedPlanHash: "0".repeat(64) })), /PROBE_PLAN_HASH_MISMATCH/);
});

test("rejects target path, descendant, prefix ambiguity and parent escape", async () => {
  const unsafe = ["/hosting/negocio", "/hosting/negocio/probe", "/hosting/negocio-other", "/other/.partnerhub-capability-stage-123e4567-e89b-42d3-a456-426614174000"];
  for (const path of unsafe) { const fx = await fixture(); fx.entry.paths.stage = path; await writeFile(fx.manifestPath, stringify({ confirmation: "PREVIEW_SFTP_DIRECTORY_RENAME_CAPABILITY", allowlist: [fx.entry] }));
    const preview = await planSftpCapabilityProbe(options(fx)); assert.equal(preview.blocked, true); assert.ok(preview.blockedReasons.includes("PROBE_PATHS_NOT_DERIVED") || preview.blockedReasons.includes("PROBE_PATH_UNSAFE")); }
});

test("existing temporary residue and incomplete or stale claims block without cleanup", async () => {
  const residue = await fixture(); residue.adapter.directories.add(residue.entry.paths.destination); await assert.rejects(probe(residue), /PROBE_PATH_RESIDUE:destination/);
  assert.equal(residue.adapter.has(residue.entry.paths.destination), true);
  const incomplete = await fixture(); incomplete.adapter.directories.add(incomplete.entry.paths.claim); await assert.rejects(probe(incomplete), /PROBE_CLAIM_INCOMPLETE/);
  assert.equal(incomplete.adapter.has(incomplete.entry.paths.claim), true);
  const stale = await fixture(); stale.adapter.directories.add(stale.entry.paths.claim); stale.adapter.files.set(posix.join(stale.entry.paths.claim, "owner.json"), Buffer.from(stringify({ token: "old", acquiredAt: "2020-01-01T00:00:00.000Z" })));
  await assert.rejects(probe(stale), /PROBE_CLAIM_STALE/); assert.equal(stale.adapter.has(stale.entry.paths.claim), true);
});

test("ownership loss never cleans foreign paths and emits no capability", async () => {
  const fx = await fixture(); await assert.rejects(probe(fx, { hooks: { afterStageWrite: async ({ paths }) => {
    fx.adapter.files.set(posix.join(paths.claim, "owner.json"), Buffer.from(stringify({ token: "foreign" })));
  } } }), /PROBE_CLAIM_OWNERSHIP_LOST/);
  assert.equal(fx.adapter.has(fx.entry.paths.stage), true); assert.deepEqual(await readdir(fx.output), []);
});

test("unsupported rename fails, cleans owned paths and preserves real target", async () => {
  const fx = await fixture(); const before = await targetSnapshot(fx.adapter); fx.adapter.fail = "rename";
  await assert.rejects(probe(fx), /SFTP_RENAME_UNSUPPORTED/); assert.equal(await targetSnapshot(fx.adapter), before);
  assert.deepEqual((await Promise.all(Object.values(fx.entry.paths).map((path) => fx.adapter.inventory(path)))).map((item) => item.exists), [false, false, false, false]);
});

test("restore readback failure blocks evidence and preserves target", async () => {
  const fx = await fixture(); const before = await targetSnapshot(fx.adapter); let destinationReads = 0;
  fx.adapter.readMutator = (path, value) => { if (path.includes("capability-destination")) { destinationReads += 1; if (destinationReads === 2) return Buffer.from("DRIFT"); } return value; };
  await assert.rejects(probe(fx), /PROBE_RESTORE_READBACK_FAILED/); assert.equal(await targetSnapshot(fx.adapter), before); assert.deepEqual(await readdir(fx.output), []);
});

test("cleanup failure reports residues and never emits capability", async () => {
  const fx = await fixture(); fx.adapter.fail = "cleanup";
  await assert.rejects(probe(fx), /PROBE_FAILED_WITH_RESIDUE:INJECTED_CLEANUP_FAILURE/); assert.deepEqual(await readdir(fx.output), []);
  assert.equal(fx.adapter.has(fx.entry.paths.destination), true);
});

test("happy path verifies canary/rename/restore, cleans all owned paths and emits compatible capability atomically", async () => {
  const fx = await fixture(); const before = await targetSnapshot(fx.adapter); const result = await probe(fx);
  assert.equal(result.outcome, "VERIFIED"); assert.match(result.capabilityHash, /^[0-9a-f]{64}$/); assert.equal(await targetSnapshot(fx.adapter), before);
  for (const path of Object.values(fx.entry.paths)) assert.equal((await fx.adapter.inventory(path)).exists, false);
  const persisted = await readFile(resolve(fx.output, "sftp-capability.json")); assert.equal(sha(persisted), result.capabilityHash);
  const capability = JSON.parse(persisted); assert.equal(capability.schemaVersion, 1); assert.equal(capability.probeVersion, "partnerhub-sftp-sibling-rename-v1");
  assert.equal(capability.status, "VERIFIED"); assert.equal(capability.scope.remoteRoot, "/hosting/negocio"); assert.equal(capability.ttlSeconds, 1800);
  assert.equal(capability.evidence.cleanupVerified, true); assert.equal(capability.evidence.targetIntact, true);
});
