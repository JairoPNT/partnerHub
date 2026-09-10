import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { posix, resolve } from "node:path";
import test from "node:test";

import { createPublicationExecution, createPublicationJobWorker, type PublicationExecution } from "./publicationJobWorkerService.ts";
import type { PublicationJob } from "./publicationJobService.ts";

const hash = "a".repeat(64);
const sha = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const stringify = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const job: PublicationJob = {
  schemaVersion: 1,
  id: hash,
  intentHash: hash,
  intent: {
    schemaVersion: 1,
    operation: "PUBLISH_PARTNER_ECOSYSTEM",
    ownerKey: "f403f29e-95c8-4825-9320-967376443020",
    ownerSiteId: "ana-segura",
    siteId: "ana-segura-business",
    ecosystemType: "BUSINESS",
    baseDomain: "anasegura.pro",
    publicHost: "negocio.anasegura.pro",
    sourceHash: hash,
    targetHash: hash,
    masterPackageHash: hash
  },
  status: "RUNNING",
  phase: "PREPARING_PACKAGE",
  revision: 2,
  attemptCount: 1,
  requestedBySubjectHash: hash,
  createdAt: "2026-09-02T12:00:00.000Z",
  updatedAt: "2026-09-02T12:00:00.000Z",
  lease: {
    tokenHash: hash,
    workerHash: hash,
    acquiredAt: "2026-09-02T12:00:00.000Z",
    expiresAt: "2026-09-02T12:30:00.000Z"
  },
  evidence: []
};

function fixture(execution: PublicationExecution | null) {
  const calls: string[] = [];
  const jobs = {
    async claimNext() { calls.push("claim"); return execution ? { job, leaseToken: "RAW_LEASE_SECRET" } : null; },
    async advance(_id: string, token: string, phase: string) { assert.equal(token, "RAW_LEASE_SECRET"); calls.push(`advance:${phase}`); return job; },
    async complete(_id: string, token: string) { assert.equal(token, "RAW_LEASE_SECRET"); calls.push("complete"); return { ...job, status: "SUCCEEDED", phase: "COMPLETE" }; },
    async fail(_id: string, token: string, code: string) { assert.equal(token, "RAW_LEASE_SECRET"); calls.push(`fail:${code}`); return { ...job, status: "FAILED", lastErrorCode: code }; },
    toSafeJob(value: Record<string, unknown>) { return { status: value.status, lastErrorCode: value.lastErrorCode }; }
  };
  return { calls, jobs };
}

test("returns IDLE without executing when the durable queue is empty", async () => {
  const fx = fixture(null);
  const result = await createPublicationJobWorker({ jobs: fx.jobs as never, execution: { execute: async () => ({}) } }).runNext();
  assert.deepEqual(result, { outcome: "IDLE" });
  assert.deepEqual(fx.calls, ["claim"]);
});

test("completes only after the executor advances every guarded phase", async () => {
  const execution: PublicationExecution = { async execute(_job, advance) {
    for (const phase of ["VALIDATING_CAPABILITY", "PLANNING_PUBLICATION", "PUBLISHING", "VERIFYING"] as const) await advance(phase);
    return { packageHash: hash, capabilityHash: hash, planHash: hash, journalHash: hash };
  } };
  const fx = fixture(execution);
  const result = await createPublicationJobWorker({ jobs: fx.jobs as never, execution, workerId: "worker" }).runNext();
  assert.equal(result.outcome, "SUCCEEDED");
  assert.deepEqual(fx.calls, ["claim", "advance:VALIDATING_CAPABILITY", "advance:PLANNING_PUBLICATION", "advance:PUBLISHING", "advance:VERIFYING", "complete"]);
  assert.doesNotMatch(JSON.stringify(result), /RAW_LEASE_SECRET/);
});

test("fails closed with a redacted stable code and never exposes provider secrets", async () => {
  const execution: PublicationExecution = { async execute() { throw new Error("getConnection: password=super-secret token=abc"); } };
  const fx = fixture(execution);
  const result = await createPublicationJobWorker({ jobs: fx.jobs as never, execution, workerId: "worker" }).runNext();
  assert.equal(result.outcome, "FAILED");
  assert.match(String(result.job.lastErrorCode), /^PUBLICATION_WORKER_GETCONNECTION$/);
  assert.doesNotMatch(JSON.stringify(result), /super-secret|token=abc|RAW_LEASE_SECRET/);
});

class MemorySftp {
  files = new Map<string, Buffer>();
  directories = new Set(["/", "/hosting"]);
  normalize(path: string) { return posix.normalize(path); }
  has(path: string) {
    const root = this.normalize(path);
    return this.directories.has(root) || [...this.files.keys()].some((name) => name === root || name.startsWith(`${root}/`));
  }
  async inventory(path: string) {
    const root = this.normalize(path);
    const files = [...this.files]
      .filter(([name]) => name.startsWith(`${root}/`))
      .map(([name, value]) => ({ path: name.slice(root.length + 1), hash: sha(value) }))
      .sort((left, right) => left.path.localeCompare(right.path));
    return { exists: this.has(root), files, hash: sha(JSON.stringify(files)) };
  }
  async mkdir(path: string, recursive = false) {
    const target = this.normalize(path);
    if (this.has(target)) throw Object.assign(new Error("exists"), { code: "EEXIST" });
    if (recursive) {
      let current = "";
      for (const segment of target.split("/").filter(Boolean)) { current += `/${segment}`; this.directories.add(current); }
    } else this.directories.add(target);
  }
  async writeFile(path: string, value: Buffer) { this.files.set(this.normalize(path), Buffer.from(value)); }
  async readFile(path: string) {
    const value = this.files.get(this.normalize(path));
    if (!value) throw new Error("ENOENT");
    return Buffer.from(value);
  }
  async put(local: string, remote: string) { await this.mkdirParents(posix.dirname(remote)); this.files.set(this.normalize(remote), await readFile(local)); }
  async mkdirParents(path: string) {
    let current = "";
    for (const segment of this.normalize(path).split("/").filter(Boolean)) { current += `/${segment}`; this.directories.add(current); }
  }
  async rename(from: string, to: string) {
    const source = this.normalize(from); const destination = this.normalize(to);
    if (!this.has(source) || this.has(destination)) throw new Error("RENAME_CONFLICT");
    for (const [name, value] of [...this.files]) if (name.startsWith(`${source}/`)) { this.files.delete(name); this.files.set(`${destination}${name.slice(source.length)}`, value); }
    for (const name of [...this.directories]) if (name === source || name.startsWith(`${source}/`)) { this.directories.delete(name); this.directories.add(`${destination}${name.slice(source.length)}`); }
  }
  async remove(path: string) {
    const root = this.normalize(path);
    for (const name of [...this.files.keys()]) if (name === root || name.startsWith(`${root}/`)) this.files.delete(name);
    for (const name of [...this.directories]) if (name === root || name.startsWith(`${root}/`)) this.directories.delete(name);
  }
  async close() {}
}

test("the production execution generates, probes, atomically publishes and journals one generic customer without persisting credentials", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "publication-worker-execution-"));
  const sources = resolve(root, "sources"); const targets = resolve(sources, ".publishing-targets");
  const output = resolve(root, "output"); const work = resolve(root, "work"); const journals = resolve(root, "journals");
  await mkdir(targets, { recursive: true }); await mkdir(output); await mkdir(journals);
  const source = { ecosystemType: "PRODUCT", site: { id: "ana-segura-product", domain: "producto.anasegura.pro" } };
  const target = { version: 2, ownerKey: job.intent.ownerKey, siteId: "ana-segura-product", ecosystemType: "PRODUCT", rootEcosystemType: "PERSONAL_BRAND",
    baseDomain: "anasegura.pro", publicHost: "producto.anasegura.pro", remoteRoot: "/hosting/producto", provisioningState: "READY", publicationState: "PENDING" };
  const sourceText = stringify(source); const targetText = stringify(target);
  await writeFile(resolve(sources, `${target.siteId}.json`), sourceText); await writeFile(resolve(targets, `${target.siteId}.json`), targetText);
  await mkdir(resolve(output, "ganomaster")); await writeFile(resolve(output, "ganomaster", "index.html"), "master-product");
  const masterPackageHash = sha(JSON.stringify([{ path: "index.html", hash: sha("master-product") }]));
  const executionJob: PublicationJob = { ...job, id: sha("job"), intentHash: sha("intent"), intent: { ...job.intent, siteId: target.siteId, ecosystemType: "PRODUCT",
    publicHost: target.publicHost, sourceHash: sha(sourceText), targetHash: sha(targetText), masterPackageHash } };
  const adapter = new MemorySftp(); const phases: string[] = [];
  const environment = { HOSTINGER_SFTP_HOST: "sftp.example.test", HOSTINGER_SFTP_PORT: "65002", HOSTINGER_SFTP_USERNAME: "private-user",
    HOSTINGER_SFTP_PASSWORD: "super-secret-password", HOSTINGER_SFTP_HOST_KEY_SHA256: `SHA256:${"A".repeat(43)}=` } as NodeJS.ProcessEnv;
  let generationCount = 0;
  const execution = createPublicationExecution({ sourceDirectory: sources, outputDirectory: output, workDirectory: work, journalDirectory: journals, environment,
    adapterFactory: async () => adapter as never, verifyPublic: async () => ({ passed: true, reasons: [] }),
    generate: async (siteId) => {
      generationCount += 1;
      const destination = resolve(output, siteId); await mkdir(destination);
      const config = `const CONFIG = ${JSON.stringify(source)};\n`;
      for (const [name, value] of Object.entries({ "index.html": "index", "app.js": "app", "styles.css": "css", "config.js": config, "favicon.svg": "svg" })) await writeFile(resolve(destination, name), value);
      return { siteId, generatedAt: "2026-09-02T12:00:00.000Z", outputDirectory: destination, previewUrl: "", files: [] };
    } });
  const evidence = await execution.execute(executionJob, async (phase) => { phases.push(phase); return executionJob; });
  assert.deepEqual(phases, ["VALIDATING_CAPABILITY", "PLANNING_PUBLICATION", "PUBLISHING", "VERIFYING"]);
  assert.match(evidence.journalHash ?? "", /^[0-9a-f]{64}$/);
  assert.equal((await adapter.inventory(target.remoteRoot)).hash, evidence.packageHash);
  assert.equal(JSON.parse(await readFile(resolve(targets, `${target.siteId}.json`), "utf8")).publicationState, "READY");
  const attempt = (await readdir(work))[0]; const persisted = (await Promise.all((await readdir(resolve(work, attempt))).map((name) => readFile(resolve(work, attempt, name), "utf8")))).join("\n");
  assert.doesNotMatch(persisted, /super-secret-password|private-user/);
  const recoveredPhases: string[] = [];
  const recovered = await execution.execute({ ...executionJob, attemptCount: 2 }, async (phase) => { recoveredPhases.push(phase); return executionJob; });
  assert.equal(generationCount, 1); assert.deepEqual(recovered, evidence);
  assert.deepEqual(recoveredPhases, ["VALIDATING_CAPABILITY", "PLANNING_PUBLICATION", "PUBLISHING", "VERIFYING"]);
});
