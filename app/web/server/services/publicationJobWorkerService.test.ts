import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
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

function fixture(execution: PublicationExecution | null, activeJob = job) {
  const calls: string[] = [];
  let refreshActive = false;
  let activateRefreshAfterClaim = false;
  const jobs = {
    async claimNext() {
      calls.push("claim");
      if (activateRefreshAfterClaim) refreshActive = true;
      return execution ? { job: activeJob, leaseToken: "RAW_LEASE_SECRET" } : null;
    },
    async isBusinessMasterPackageRefreshActive() { calls.push("refresh-check"); return refreshActive; },
    async deferClaimedBusinessJob(id: string, token: string) {
      assert.equal(id, activeJob.id); assert.equal(token, "RAW_LEASE_SECRET"); calls.push("defer");
      return { ...activeJob, status: "QUEUED", phase: "QUEUED", revision: activeJob.revision + 1, attemptCount: activeJob.attemptCount - 1, lease: undefined };
    },
    async advance(_id: string, token: string, phase: string) { assert.equal(token, "RAW_LEASE_SECRET"); calls.push(`advance:${phase}`); return job; },
    async complete(_id: string, token: string) { assert.equal(token, "RAW_LEASE_SECRET"); calls.push("complete"); return { ...job, status: "SUCCEEDED", phase: "COMPLETE" }; },
    async fail(_id: string, token: string, code: string) { assert.equal(token, "RAW_LEASE_SECRET"); calls.push(`fail:${code}`); return { ...job, status: "FAILED", lastErrorCode: code }; },
    toSafeJob(value: Record<string, unknown>) { return { status: value.status, lastErrorCode: value.lastErrorCode }; }
  };
  return {
    calls,
    jobs,
    setRefreshActive(value: boolean) { refreshActive = value; },
    setActivateRefreshAfterClaim(value: boolean) { activateRefreshAfterClaim = value; }
  };
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
  assert.deepEqual(fx.calls, ["claim", "refresh-check", "advance:VALIDATING_CAPABILITY", "advance:PLANNING_PUBLICATION", "advance:PUBLISHING", "advance:VERIFYING", "complete"]);
  assert.doesNotMatch(JSON.stringify(result), /RAW_LEASE_SECRET/);
});

test("fails closed with a redacted stable code and never exposes provider secrets", async () => {
  const execution: PublicationExecution = { async execute() { throw new Error("getConnection: password=super-secret token=abc"); } };
  const fx = fixture(execution);
  const result = await createPublicationJobWorker({ jobs: fx.jobs as never, execution, workerId: "worker" }).runNext();
  assert.equal(result.outcome, "FAILED");
  assert.match(String(result.job.lastErrorCode), /^PUBLICATION_WORKER_GETCONNECTION$/);
  assert.doesNotMatch(JSON.stringify(result), /super-secret|token=abc|RAW_LEASE_SECRET/);
  assert.deepEqual(fx.calls.slice(0, 2), ["claim", "refresh-check"]);
});

test("defers a claimed Business job if the master refresh claim appears before execution", async () => {
  let executionCalls = 0;
  const execution: PublicationExecution = { async execute() { executionCalls += 1; return {}; } };
  const fx = fixture(execution);
  fx.setActivateRefreshAfterClaim(true);

  const result = await createPublicationJobWorker({ jobs: fx.jobs as never, execution, workerId: "worker" }).runNext();

  assert.equal(result.outcome, "DEFERRED");
  assert.equal(result.job.status, "QUEUED");
  assert.equal(executionCalls, 0);
  assert.deepEqual(fx.calls, ["claim", "refresh-check", "defer"]);
  assert.doesNotMatch(JSON.stringify(result), /RAW_LEASE_SECRET/);
});

test("Product jobs execute while the Business master refresh claim is active", async () => {
  let executionCalls = 0;
  const execution: PublicationExecution = { async execute() { executionCalls += 1; return {}; } };
  const productJob: PublicationJob = { ...job, intent: { ...job.intent, ecosystemType: "PRODUCT" } };
  const fx = fixture(execution, productJob);
  fx.setRefreshActive(true);

  const result = await createPublicationJobWorker({ jobs: fx.jobs as never, execution, workerId: "worker" }).runNext();

  assert.equal(result.outcome, "SUCCEEDED");
  assert.equal(executionCalls, 1);
  assert.deepEqual(fx.calls, ["claim", "complete"]);
});

test("the real Business executor rechecks the refresh claim before reading the master or starting work", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "publication-worker-business-claim-race-"));
  const sources = resolve(root, "sources"); const targets = resolve(sources, ".publishing-targets");
  const output = resolve(root, "output"); const journals = resolve(root, "journals");
  await mkdir(targets, { recursive: true }); await mkdir(output); await mkdir(journals);
  const siteId = "ana-segura-business";
  const source = { ecosystemType: "BUSINESS", site: { id: siteId, domain: "negocio.anasegura.pro" } };
  const target = { version: 2, ownerKey: job.intent.ownerKey, siteId, ecosystemType: "BUSINESS", rootEcosystemType: "PERSONAL_BRAND",
    baseDomain: "anasegura.pro", publicHost: "negocio.anasegura.pro", remoteRoot: "/hosting/negocio", provisioningState: "READY", publicationState: "PENDING" };
  const sourceText = stringify(source); const targetText = stringify(target);
  await writeFile(resolve(sources, `${siteId}.json`), sourceText); await writeFile(resolve(targets, `${siteId}.json`), targetText);
  const master = resolve(output, "ganomaster-business"); await mkdir(master); await writeFile(resolve(master, "index.html"), "business-master");
  const executionJob: PublicationJob = { ...job, id: sha("business-race-job"), intentHash: sha("business-race-intent"),
    intent: { ...job.intent, siteId, ecosystemType: "BUSINESS", publicHost: target.publicHost, sourceHash: sha(sourceText), targetHash: sha(targetText), masterPackageHash: hash } };
  let refreshChecks = 0; let generationCalls = 0; let adapterFactoryCalls = 0; let providerCalls = 0;
  const isRefreshActive = async () => ++refreshChecks >= 2;
  const execution = createPublicationExecution({ sourceDirectory: sources, outputDirectory: output, journalDirectory: journals,
    isBusinessMasterPackageRefreshActive: isRefreshActive,
    generate: async () => { generationCalls += 1; throw new Error("generation should not begin"); },
    adapterFactory: async () => { adapterFactoryCalls += 1; return {
      async inventory() { providerCalls += 1; throw new Error("provider access should not begin"); },
      async close() {}
    } as never; },
    verifyPublic: async () => { providerCalls += 1; return { passed: true, reasons: [] }; } });
  const jobs = {
    async claimNext() { return { job: executionJob, leaseToken: "RAW_LEASE_SECRET" }; },
    isBusinessMasterPackageRefreshActive: isRefreshActive,
    async deferClaimedBusinessJob() { return { ...executionJob, status: "QUEUED", phase: "QUEUED", lease: undefined }; },
    async advance() { return executionJob; }, async complete() { return executionJob; }, async fail() { throw new Error("must defer, not fail"); },
    toSafeJob(value: Record<string, unknown>) { return { status: value.status }; }
  };

  const result = await createPublicationJobWorker({ jobs: jobs as never, execution, workerId: "worker" }).runNext();

  assert.equal(result.outcome, "DEFERRED");
  assert.equal(result.job.status, "QUEUED");
  assert.equal(refreshChecks, 2);
  assert.equal(generationCalls, 0);
  assert.equal(adapterFactoryCalls, 0);
  assert.equal(providerCalls, 0);
  assert.doesNotMatch(JSON.stringify(result), /RAW_LEASE_SECRET/);
});

test("the real Business executor stops before SFTP adapter creation when refresh starts mid-run", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "publication-worker-business-adapter-race-"));
  const sources = resolve(root, "sources"); const targets = resolve(sources, ".publishing-targets");
  const output = resolve(root, "output"); const journals = resolve(root, "journals");
  await mkdir(targets, { recursive: true }); await mkdir(output); await mkdir(journals);
  const siteId = "ana-segura-business";
  const source = { ecosystemType: "BUSINESS", site: { id: siteId, domain: "negocio.anasegura.pro" } };
  const target = { version: 2, ownerKey: job.intent.ownerKey, siteId, ecosystemType: "BUSINESS", rootEcosystemType: "PERSONAL_BRAND",
    baseDomain: "anasegura.pro", publicHost: "negocio.anasegura.pro", remoteRoot: "/hosting/negocio", provisioningState: "READY", publicationState: "PENDING" };
  const sourceText = stringify(source); const targetText = stringify(target); const masterText = "business-master";
  await writeFile(resolve(sources, `${siteId}.json`), sourceText); await writeFile(resolve(targets, `${siteId}.json`), targetText);
  const master = resolve(output, "ganomaster-business"); await mkdir(master); await writeFile(resolve(master, "index.html"), masterText);
  const executionJob: PublicationJob = { ...job, id: sha("business-adapter-race-job"), intentHash: sha("business-adapter-race-intent"),
    intent: { ...job.intent, siteId, ecosystemType: "BUSINESS", publicHost: target.publicHost, sourceHash: sha(sourceText), targetHash: sha(targetText),
      masterPackageHash: sha(JSON.stringify([{ path: "index.html", hash: sha(masterText) }])) } };
  let refreshActive = false; let generationCalls = 0; let adapterFactoryCalls = 0; let providerCalls = 0;
  const isRefreshActive = async () => refreshActive;
  const execution = createPublicationExecution({ sourceDirectory: sources, outputDirectory: output, workDirectory: resolve(root, "work"),
    journalDirectory: journals, isBusinessMasterPackageRefreshActive: isRefreshActive,
    generate: async (id) => {
      generationCalls += 1;
      const destination = resolve(output, id); await mkdir(destination); await writeFile(resolve(destination, "index.html"), "generated-business");
      return { siteId: id, generatedAt: "2026-10-19T12:00:00.000Z", outputDirectory: destination, previewUrl: "", files: [] };
    },
    adapterFactory: async () => { adapterFactoryCalls += 1; return {
      async inventory() { providerCalls += 1; throw new Error("provider access should not begin"); },
      async close() {}
    } as never; },
    verifyPublic: async () => { providerCalls += 1; return { passed: true, reasons: [] }; } });
  const jobs = {
    async claimNext() { return { job: executionJob, leaseToken: "RAW_LEASE_SECRET" }; },
    isBusinessMasterPackageRefreshActive: isRefreshActive,
    async deferClaimedBusinessJob() { return { ...executionJob, status: "QUEUED", phase: "QUEUED", lease: undefined }; },
    async advance(_id: string, _token: string, phase: string) {
      if (phase === "VALIDATING_CAPABILITY") refreshActive = true;
      return executionJob;
    }, async complete() { return executionJob; }, async fail() { throw new Error("must defer, not fail"); },
    toSafeJob(value: Record<string, unknown>) { return { status: value.status }; }
  };

  const result = await createPublicationJobWorker({ jobs: jobs as never, execution, workerId: "worker" }).runNext();

  assert.equal(result.outcome, "DEFERRED");
  assert.equal(result.job.status, "QUEUED");
  assert.equal(generationCalls, 1);
  assert.equal(adapterFactoryCalls, 0);
  assert.equal(providerCalls, 0);
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

test("the production execution generates, probes, atomically publishes and journals one generic customer without persisting credentials", async (t) => {
  const root = await mkdtemp(resolve(tmpdir(), "publication-worker-execution-"));
  const sources = resolve(root, "sources"); const targets = resolve(sources, ".publishing-targets");
  const output = resolve(root, "output"); const work = resolve(root, "work"); const journals = resolve(root, "journals");
  const previousEnvironment = { ...process.env };
  process.env.PRODUCT_PAGE_SOURCE_DIR = sources;
  process.env.PRODUCT_PAGE_OUTPUT_DIR = output;
  t.after(() => { process.env = previousEnvironment; });
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

test("a deferred Business job can retry the rolled-back attempt after local staging without EEXIST", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "publication-worker-business-retry-race-"));
  const sources = resolve(root, "sources"); const targets = resolve(sources, ".publishing-targets");
  const output = resolve(root, "output"); const work = resolve(root, "work"); const journals = resolve(root, "journals");
  await mkdir(targets, { recursive: true }); await mkdir(output); await mkdir(journals);
  const siteId = "ana-segura-business";
  const source = { ecosystemType: "BUSINESS", site: { id: siteId, domain: "negocio.anasegura.pro" },
    distributor: { whatsappNumber: "573001234567", defaultMessage: "Hola, quiero conocer el servicio." },
    vsl: { embedUrl: "https://media.example.test/business.mp4", thumbnailUrl: "https://media.example.test/business.jpg" } };
  const target = { version: 2, ownerKey: job.intent.ownerKey, siteId, ecosystemType: "BUSINESS", rootEcosystemType: "PERSONAL_BRAND",
    baseDomain: "anasegura.pro", publicHost: "negocio.anasegura.pro", remoteRoot: "/hosting/negocio", provisioningState: "READY", publicationState: "PENDING" };
  const sourceText = stringify(source); const targetText = stringify(target);
  await writeFile(resolve(sources, `${siteId}.json`), sourceText); await writeFile(resolve(targets, `${siteId}.json`), targetText);
  const masterText = "business-master"; const master = resolve(output, "ganomaster-business");
  await mkdir(master); await writeFile(resolve(master, "index.html"), masterText);
  const executionJob: PublicationJob = { ...job, id: sha("business-retry-race-job"), intentHash: sha("business-retry-race-intent"),
    intent: { ...job.intent, siteId, ecosystemType: "BUSINESS", publicHost: target.publicHost, sourceHash: sha(sourceText), targetHash: sha(targetText),
      masterPackageHash: sha(JSON.stringify([{ path: "index.html", hash: sha(masterText) }])) } };
  const adapter = new MemorySftp(); let refreshActive = false; let claimCount = 0;
  let generationCalls = 0; let adapterFactoryCalls = 0; let verificationCalls = 0;
  const environment = { HOSTINGER_SFTP_HOST: "sftp.example.test", HOSTINGER_SFTP_PORT: "65002", HOSTINGER_SFTP_USERNAME: "private-user",
    HOSTINGER_SFTP_PASSWORD: "super-secret-password", HOSTINGER_SFTP_HOST_KEY_SHA256: `SHA256:${"A".repeat(43)}=` } as NodeJS.ProcessEnv;
  const isRefreshActive = async () => refreshActive;
  const execution = createPublicationExecution({ sourceDirectory: sources, outputDirectory: output, workDirectory: work, journalDirectory: journals,
    environment, isBusinessMasterPackageRefreshActive: isRefreshActive,
    generate: async (id) => {
      generationCalls += 1;
      const destination = resolve(output, id);
      await rm(destination, { recursive: true, force: true });
      await mkdir(destination);
      const whatsappUrl = `https://wa.me/${source.distributor.whatsappNumber}?text=${encodeURIComponent(source.distributor.defaultMessage)}`;
      const config = `const CONFIG = ${JSON.stringify({ ...source, cta: { primaryUrl: whatsappUrl, secondaryUrl: whatsappUrl } })};\n`;
      for (const [name, value] of Object.entries({ "index.html": `business-${generationCalls}`, "app.js": "app", "styles.css": "css", "config.js": config, "favicon.svg": "svg" })) {
        await writeFile(resolve(destination, name), value);
      }
      return { siteId: id, generatedAt: `2026-10-19T12:00:0${generationCalls}.000Z`, outputDirectory: destination, previewUrl: "", files: [] };
    },
    adapterFactory: async () => { adapterFactoryCalls += 1; return adapter as never; },
    verifyPublic: async () => { verificationCalls += 1; return { passed: true, reasons: [] }; } });
  const jobs = {
    async claimNext() { claimCount += 1; return { job: { ...executionJob, attemptCount: 1 }, leaseToken: "RAW_LEASE_SECRET" }; },
    isBusinessMasterPackageRefreshActive: isRefreshActive,
    async deferClaimedBusinessJob() { return { ...executionJob, status: "QUEUED", phase: "QUEUED", attemptCount: 0, lease: undefined }; },
    async advance(_id: string, _token: string, phase: string) {
      if (claimCount === 1 && phase === "VALIDATING_CAPABILITY") refreshActive = true;
      return executionJob;
    },
    async complete() { return { ...executionJob, status: "SUCCEEDED", phase: "COMPLETE" }; },
    async fail(_id: string, _token: string, code: string) { return { ...executionJob, status: "FAILED", lastErrorCode: code }; },
    toSafeJob(value: Record<string, unknown>) { return { status: value.status, lastErrorCode: value.lastErrorCode, attemptCount: value.attemptCount }; }
  };
  const worker = createPublicationJobWorker({ jobs: jobs as never, execution, workerId: "worker" });

  const deferred = await worker.runNext();

  assert.equal(deferred.outcome, "DEFERRED");
  assert.equal(deferred.job.status, "QUEUED");
  assert.equal(deferred.job.attemptCount, 0);
  assert.equal(generationCalls, 1);
  assert.equal(adapterFactoryCalls, 0);
  assert.equal(verificationCalls, 0);
  const stagedAttempts = await readdir(work);
  assert.equal(stagedAttempts.length, 1);
  assert.ok((await readdir(resolve(work, stagedAttempts[0]))).includes("sftp-probe-manifest.json"));

  refreshActive = false;
  const retried = await worker.runNext();

  assert.equal(claimCount, 2);
  assert.equal(retried.outcome, "SUCCEEDED", JSON.stringify(retried));
  assert.equal(retried.job.status, "SUCCEEDED");
  assert.equal(generationCalls, 2);
  assert.equal(adapterFactoryCalls, 1);
  assert.equal(verificationCalls, 1);
  const attemptsAfterRetry = await readdir(work);
  assert.equal(attemptsAfterRetry.length, 2);
  assert.notEqual(attemptsAfterRetry[0], attemptsAfterRetry[1]);
  assert.doesNotMatch(JSON.stringify(retried), /RAW_LEASE_SECRET/);
});
