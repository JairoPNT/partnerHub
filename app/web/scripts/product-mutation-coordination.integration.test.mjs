import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { fork } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { posix, resolve } from "node:path";
import test from "node:test";
import { createProductMutationCoordinator, ProductMutationBusyError, withProductMutation } from "../server/services/productMutationCoordinator.ts";
import { productPageSourceService } from "../server/services/productPageSourceService.ts";
import { productPageGenerationInputSchema, productPageGenerationService } from "../server/services/productPageGenerationService.ts";
import { createPublicationJobService } from "../server/services/publicationJobService.ts";
import { createPublicationExecution, createPublicationJobWorker } from "../server/services/publicationJobWorkerService.ts";
import { partnerEcosystemEntitlementService } from "../server/services/partnerEcosystemEntitlementService.ts";
import { activationLeadService } from "../server/services/activationLeadService.ts";
import { productPageHistoryService } from "../server/services/productPageHistoryService.ts";
import { APPLY_MODE } from "./guarded-ecosystem-publication.mjs";
import { createSubdomainProvisioningService, getPublishingTarget } from "../server/services/subdomainProvisioningService.ts";
test("workers in different processes never execute different intents of one site together", { timeout: 15_000 }, async (t) => {
  const fx = await fixture(t);
  await fx.jobs.enqueue({ siteId: fx.siteId }, "first");
  fx.advanceClock();
  await writeFile(resolve(fx.root, "ganomaster/index.html"), "second-master");
  const second = await fx.jobs.enqueue({ siteId: fx.siteId }, "second");
  const start = () => {
    const child = fork(resolve("scripts/product-mutation-coordinator-child.mjs"), [fx.root, "worker"], {
      execArgv: ["--conditions=react-server", "--experimental-strip-types", "--experimental-loader", "./scripts/node-test-alias-loader.mjs"],
      stdio: ["ignore", "ignore", "pipe", "ipc"]
    });
    const closed = new Promise((done) => child.once("exit", done));
    const message = () => new Promise((done, reject) => {
      child.once("message", done); child.once("error", reject);
      child.once("exit", (code) => reject(new Error(`child exited before result: ${code}`)));
    });
    t.after(async () => { if (child.exitCode === null) child.kill(); await closed; });
    return { child, closed, message };
  };
  const owner = start();
  assert.equal(await owner.message(), "entered");
  const contender = start();
  assert.equal(await contender.message(), "DEFERRED");
  await contender.closed;
  assert.equal((await fx.jobs.get(second.job.id)).status, "QUEUED");
  assert.equal((await fx.jobs.get(second.job.id)).attemptCount, 0);
  await assert.rejects(productPageGenerationService.regenerateFromSavedSource(fx.siteId), ProductMutationBusyError);
  assert.equal(await readFile(fx.packagePath, "utf8"), "worker-package");
  const completed = owner.message();
  owner.child.send("release");
  assert.equal(await completed, "SUCCEEDED");
  await owner.closed;
});

async function enqueueOtherSite(fx, ownerSiteId, ecosystemType = "PRODUCT") {
  const siteId = `${ownerSiteId}-${ecosystemType === "PRODUCT" ? "product" : "business"}`;
  const baseDomain = `${ownerSiteId}.pro`;
  const publicHost = `${ecosystemType === "PRODUCT" ? "producto" : "negocio"}.${baseDomain}`;
  await writeFile(resolve(fx.sourceDirectory, `${siteId}.json`), JSON.stringify({
    ecosystemType, site: { id: siteId, domain: publicHost }
  }));
  await writeFile(resolve(fx.sourceDirectory, ".publishing-targets", `${siteId}.json`), JSON.stringify({
    ...fx.target, siteId, ecosystemType, baseDomain, publicHost
  }));
  if (ecosystemType === "BUSINESS") {
    await mkdir(resolve(fx.root, "ganomaster-business"), { recursive: true });
    await writeFile(resolve(fx.root, "ganomaster-business", "index.html"), "business-master");
  }
  fx.advanceClock();
  return fx.jobs.enqueue({ siteId }, "independent");
}

async function orphanSite(fx, siteId) {
  const claim = resolve(fx.root, ".product-mutation-claims", sha(siteId));
  await mkdir(claim, { recursive: true });
  await writeFile(resolve(claim, "owner.json"), JSON.stringify({ token: "orphan-owner", acquiredAt: "2000-01-01T00:00:00Z" }));
  return claim;
}

for (const ownership of ["held", "orphan"]) {
  test(`${ownership} oldest Product site does not starve other Business or Product jobs`, { timeout: 15_000 }, async (t) => {
    const fx = await fixture(t);
    const oldest = await fx.jobs.enqueue({ siteId: fx.siteId }, "oldest");
    const business = await enqueueOtherSite(fx, "bea", "BUSINESS");
    const product = await enqueueOtherSite(fx, "caro", "PRODUCT");
    const entered = barrier(); const finish = barrier();
    const owner = ownership === "held" ? withProductMutation(fx.siteId, async () => {
      entered.release(); await finish.promise;
    }) : orphanSite(fx, fx.siteId).then(() => entered.release());
    const executed = [];
    const worker = createPublicationJobWorker({ jobs: fx.jobs, execution: { async execute(job, advance) {
      executed.push(job.intent.siteId);
      for (const phase of ["VALIDATING_CAPABILITY", "PLANNING_PUBLICATION", "PUBLISHING", "VERIFYING"]) await advance(phase);
      return {};
    } } });
    try {
      await entered.promise;
      assert.equal((await worker.runNext()).outcome, "SUCCEEDED");
      assert.equal((await worker.runNext()).outcome, "SUCCEEDED");
      assert.deepEqual(executed, ["bea-business", "caro-product"]);
      assert.equal((await fx.jobs.get(business.job.id)).status, "SUCCEEDED");
      assert.equal((await fx.jobs.get(product.job.id)).status, "SUCCEEDED");
      assert.equal((await worker.runNext()).outcome, "DEFERRED");
      const blocked = await fx.jobs.get(oldest.job.id);
      assert.equal(blocked.status, "QUEUED"); assert.equal(blocked.attemptCount, 0);
      assert.equal(blocked.lastErrorCode, undefined);
    } finally { finish.release(); await owner; }
  });
}

test("all-busy scan is finite and defers at most one intent per busy site", { timeout: 15_000 }, async (t) => {
  const fx = await fixture(t);
  const first = await fx.jobs.enqueue({ siteId: fx.siteId }, "first");
  fx.advanceClock();
  await writeFile(resolve(fx.root, "ganomaster", "index.html"), "second-intent");
  const duplicateSite = await fx.jobs.enqueue({ siteId: fx.siteId }, "same-site-other-intent");
  const otherSite = await enqueueOtherSite(fx, "bea");
  await orphanSite(fx, fx.siteId); await orphanSite(fx, "bea-product");
  let claims = 0;
  const worker = createPublicationJobWorker({
    jobs: { ...fx.jobs, async claimNext(...args) { claims++; return fx.jobs.claimNext(...args); } },
    execution: { async execute() { assert.fail("busy job executed"); } }
  });
  assert.equal((await worker.runNext()).outcome, "DEFERRED");
  assert.equal(claims, 3);
  for (const id of [first.job.id, duplicateSite.job.id, otherSite.job.id]) {
    const item = await fx.jobs.get(id);
    assert.equal(item.status, "QUEUED"); assert.equal(item.attemptCount, 0);
  }
  assert.equal((await fx.jobs.get(first.job.id)).revision, 3);
  assert.equal((await fx.jobs.get(duplicateSite.job.id)).revision, 1);
  assert.equal((await fx.jobs.get(otherSite.job.id)).revision, 3);
});

test("new queue arrivals cannot extend the fixed busy-site scan", { timeout: 15_000 }, async (t) => {
  const fx = await fixture(t);
  await fx.jobs.enqueue({ siteId: fx.siteId }, "first");
  await enqueueOtherSite(fx, "bea");
  await orphanSite(fx, fx.siteId); await orphanSite(fx, "bea-product");
  let late;
  const worker = createPublicationJobWorker({
    jobs: { ...fx.jobs, async deferClaimedJob(...args) {
      const deferred = await fx.jobs.deferClaimedJob(...args);
      if (deferred.intent.siteId === "bea-product") {
        late = await enqueueOtherSite(fx, "late");
        await orphanSite(fx, "late-product");
      }
      return deferred;
    } },
    execution: { async execute() { assert.fail("busy job executed"); } }
  });
  assert.equal((await worker.runNext()).outcome, "DEFERRED");
  assert.ok(late);
  const untouched = await fx.jobs.get(late.job.id);
  assert.equal(untouched.status, "QUEUED"); assert.equal(untouched.attemptCount, 0);
  assert.equal(untouched.revision, 1);
});


const sha = (value) => createHash("sha256").update(value).digest("hex");

function barrier() {
  let release;
  const promise = new Promise((done) => { release = done; });
  return { promise, release };
}

async function fixture(t) {
  const root = await mkdtemp(resolve(tmpdir(), "business-site-adapters-"));
  const oldEnvironment = { ...process.env };
  const sourceDirectory = resolve(root, ".sources");
  const jobDirectory = resolve(root, ".jobs");
  const siteId = "client-one-product";
  await mkdir(resolve(sourceDirectory, ".publishing-targets"), { recursive: true });
  process.env.PRODUCT_PAGE_OUTPUT_DIR = root;
  process.env.PRODUCT_PAGE_SOURCE_DIR = sourceDirectory;
  process.env.PRODUCT_PAGE_ACTIVATION_DIR = resolve(root, ".activation");
  const input = productPageGenerationInputSchema.parse({
    ecosystemType: "PRODUCT",
    site: { id: siteId, domain: "producto.clientone.pro", title: "Client Product", metaDescription: "Client Product presentation" },
    distributor: { brandName: "Client", firstName: "Client", fullName: "Client One", whatsappNumber: "573001234567" }
  });
  const sourcePath = resolve(sourceDirectory, `${siteId}.json`);
  await writeFile(sourcePath, JSON.stringify(input));
  const target = { version: 2, ownerKey: "f403f29e-95c8-4825-9320-967376443020", siteId,
    ecosystemType: "PRODUCT", rootEcosystemType: "PERSONAL_BRAND", baseDomain: "clientone.pro",
    publicHost: input.site.domain, remoteRoot: "/home/client/public_html/producto", provisioningState: "READY", publicationState: "PENDING" };
  await writeFile(resolve(sourceDirectory, ".publishing-targets", `${siteId}.json`), JSON.stringify(target));
  await mkdir(resolve(root, "ganomaster"));
  await writeFile(resolve(root, "ganomaster/index.html"), "master");
  await mkdir(resolve(root, siteId));
  const packagePath = resolve(root, siteId, "index.html");
  await writeFile(packagePath, "worker-package");
  let clock = new Date("2026-10-20T12:00:00Z");
  const jobs = createPublicationJobService({ sourceDirectory, outputDirectory: root, jobDirectory, now: () => clock });
  t.after(async () => { process.env = oldEnvironment; await rm(root, { recursive: true, force: true }); });
  return { root, sourceDirectory, siteId, input, sourcePath, packagePath, target, jobs, advanceClock() { clock = new Date(clock.getTime() + 60_000); } };
}

async function prepareGeneration(t, fx) {
  await cp(resolve("../../plantillas-de-pagina/producto"), resolve(fx.root, "ganomaster"), { recursive: true });
  await mkdir(resolve(fx.root, "ganomaster/tipografia"), { recursive: true });
  const replacements = [
    [partnerEcosystemEntitlementService, "get", async () => ({ activationLeadId: "f403f29e-95c8-4825-9320-967376443020", includedEcosystems: ["PRODUCT"] })],
    [activationLeadService, "updatePublicationStateBySiteId", async () => null],
    [productPageHistoryService, "append", async () => undefined]
  ];
  for (const [object, key, replacement] of replacements) {
    const original = object[key]; object[key] = replacement; t.after(() => { object[key] = original; });
  }
}

test("Product source, generator and enqueue adapters reject another owner before changing source/package", async (t) => {
  const fx = await fixture(t);
  const entered = barrier(); const finish = barrier();
  const reviewed = await fx.jobs.previewIntent({ siteId: fx.siteId });
  const owner = withProductMutation(fx.siteId, async () => { entered.release(); await finish.promise; });
  try {
    await entered.promise;
    for (const action of [
      () => productPageSourceService.save(fx.siteId, fx.input),
      () => productPageGenerationService.generate(fx.input),
      () => productPageGenerationService.regenerateFromSavedSource(fx.siteId),
      () => fx.jobs.enqueue({ siteId: fx.siteId }, "operator"),
      () => fx.jobs.enqueueReviewed({ siteId: fx.siteId }, "operator", reviewed.intentHash)
    ]) await assert.rejects(action, ProductMutationBusyError);
    assert.equal(await readFile(fx.sourcePath, "utf8"), JSON.stringify(fx.input));
    assert.equal(await readFile(fx.packagePath, "utf8"), "worker-package");
    assert.deepEqual(await fx.jobs.list(), []);
  } finally { finish.release(); await owner; }
});

test("explicit Product provision and legacy target migration cannot mutate under another owner's claim", async (t) => {
  const fx = await fixture(t);
  const targetDirectory = resolve(fx.sourceDirectory, ".publishing-targets");
  const targetPath = resolve(targetDirectory, `${fx.siteId}.json`);
  const legacy = { ...fx.target, version: 1, publicHost: fx.target.baseDomain,
    hostingerState: "READY", dnsState: "RESOLVED", sslState: "READY",
    createdAt: "2026-10-20T12:00:00Z", updatedAt: "2026-10-20T12:00:00Z" };
  await writeFile(targetPath, JSON.stringify(legacy));
  const service = createSubdomainProvisioningService({
    storageDirectory: targetDirectory, outputDirectory: fx.root,
    hostingerClient: { async ensure() { assert.fail("provider invoked during busy claim"); } },
    dnsClient: { async ensureARecord() { assert.fail("DNS invoked during busy claim"); } }
  });
  const entered = barrier(); const finish = barrier();
  const owner = withProductMutation(fx.siteId, async () => { entered.release(); await finish.promise; });
  try {
    await entered.promise;
    await assert.rejects(service.provision({ ownerKey: fx.target.ownerKey, siteId: fx.siteId,
      ecosystemType: "PRODUCT", rootEcosystemType: "PERSONAL_BRAND", baseDomain: fx.target.baseDomain,
      ipv4: "192.0.2.1", confirmation: "PROVISION_SUBDOMAIN" }), ProductMutationBusyError);
    await assert.rejects(getPublishingTarget(fx.siteId, targetDirectory, "PRODUCT", fx.root), ProductMutationBusyError);
    assert.equal(await readFile(targetPath, "utf8"), JSON.stringify(legacy));
  } finally { finish.release(); await owner; }
  const migrated = await getPublishingTarget(fx.siteId, targetDirectory, "PRODUCT", fx.root);
  assert.equal(migrated.version, 2);
});

test("legacy unsuffixed source generation reenters the same Product gate without migrating its ID", async (t) => {
  const fx = await fixture(t); await prepareGeneration(t, fx);
  const siteId = "legacy-unsuffixed";
  const input = { ...fx.input, site: { ...fx.input.site, id: siteId } };
  await withProductMutation(siteId, async () => {
    await productPageSourceService.save(siteId, input);
    await productPageGenerationService.regenerateFromSavedSource(siteId);
  });
  assert.equal((await productPageSourceService.get(siteId)).site.id, siteId);
  assert.match(await readFile(resolve(fx.root, siteId, "index.html"), "utf8"), /html/i);
});

test("legacy Product target migration cannot write a different site's target under the caller's claim", async (t) => {
  const fx = await fixture(t);
  const directory = resolve(fx.sourceDirectory, ".publishing-targets");
  const bytes = JSON.stringify({ ...fx.target, siteId: "foreign-product", version: 1, publicHost: fx.target.baseDomain,
    hostingerState: "READY", dnsState: "RESOLVED", sslState: "READY",
    createdAt: "2026-10-20T12:00:00Z", updatedAt: "2026-10-20T12:00:00Z" });
  await writeFile(resolve(directory, `${fx.siteId}.json`), bytes);
  await assert.rejects(getPublishingTarget(fx.siteId, directory, "PRODUCT", fx.root), /site identity/i);
  assert.equal(await readFile(resolve(directory, `${fx.siteId}.json`), "utf8"), bytes);
  await assert.rejects(readFile(resolve(directory, "foreign-product.json")), { code: "ENOENT" });
});

test("explicit Brand and master source writes retain their independent behavior", async (t) => {
  const fx = await fixture(t);
  for (const [siteId, ecosystemType] of [["brand-client", "PERSONAL_BRAND"], ["ganomaster", "PRODUCT"]]) {
    const entered = barrier(); const finish = barrier();
    const owner = withProductMutation(siteId, async () => { entered.release(); await finish.promise; });
    try {
      await entered.promise;
      await productPageSourceService.save(siteId, { ecosystemType, site: { id: siteId } });
      assert.equal((await productPageSourceService.get(siteId)).ecosystemType, ecosystemType);
    } finally { finish.release(); await owner; }
  }
});

test("custom-root jobs and worker use their factory claim even when the process default points elsewhere", async (t) => {
  const fx = await fixture(t);
  const queued = await fx.jobs.enqueue({ siteId: fx.siteId }, "custom");
  const reviewed = await fx.jobs.previewIntent({ siteId: fx.siteId });
  const withCustom = createProductMutationCoordinator({ outputDirectory: fx.root });
  const entered = barrier(); const finish = barrier();
  const owner = withCustom(fx.siteId, async () => { entered.release(); await finish.promise; });
  try {
    await entered.promise;
    process.env.PRODUCT_PAGE_OUTPUT_DIR = resolve(fx.root, "decoy-default");
    await assert.rejects(fx.jobs.enqueue({ siteId: fx.siteId }, "custom"), ProductMutationBusyError);
    await assert.rejects(fx.jobs.enqueueReviewed({ siteId: fx.siteId }, "custom", reviewed.intentHash), ProductMutationBusyError);
    const result = await createPublicationJobWorker({ jobs: fx.jobs, execution: { async execute() { assert.fail("worker used process default claim"); } } }).runNext();
    assert.equal(result.outcome, "DEFERRED");
    assert.equal((await fx.jobs.get(queued.job.id)).attemptCount, 0);
  } finally { finish.release(); await owner; }
});

test("manual owner reenters generate/save/enqueue and worker reenters regenerate/generate/save without deadlock", async (t) => {
  const fx = await fixture(t);
  await prepareGeneration(t, fx);
  await withProductMutation(fx.siteId, async () => {
    await productPageGenerationService.generate(fx.input);
    await fx.jobs.enqueue({ siteId: fx.siteId }, "manual");
  });
  const worker = createPublicationJobWorker({ jobs: fx.jobs, execution: { async execute(job, advance) {
    await productPageGenerationService.regenerateFromSavedSource(job.intent.siteId);
    for (const phase of ["VALIDATING_CAPABILITY", "PLANNING_PUBLICATION", "PUBLISHING", "VERIFYING"]) await advance(phase);
    return {};
  } } });
  const result = await worker.runNext();
  assert.equal(result.outcome, "SUCCEEDED", JSON.stringify(result));
  assert.equal((await productPageSourceService.get(fx.siteId)).site.id, fx.siteId);
  assert.match(await readFile(fx.packagePath, "utf8"), /html/i);
});

test("a worker holds site ownership through execution AND completion; other intent defers without consuming an attempt", async (t) => {
  const fx = await fixture(t);
  const first = await fx.jobs.enqueue({ siteId: fx.siteId }, "one");
  fx.advanceClock();
  await writeFile(resolve(fx.root, "ganomaster/index.html"), "new-master");
  const second = await fx.jobs.enqueue({ siteId: fx.siteId }, "two");
  const entered = barrier(); const finish = barrier(); const completing = barrier(); const complete = barrier();
  const workerJobs = { ...fx.jobs, async complete(...args) { completing.release(); await complete.promise; return fx.jobs.complete(...args); } };
  const owner = createPublicationJobWorker({ jobs: workerJobs, execution: { async execute(_job, advance) {
    entered.release(); await finish.promise;
    for (const phase of ["VALIDATING_CAPABILITY", "PLANNING_PUBLICATION", "PUBLISHING", "VERIFYING"]) await advance(phase);
    return {};
  } } }).runNext();
  try {
    await entered.promise;
    const contender = createPublicationJobWorker({ jobs: fx.jobs, execution: { async execute() { assert.fail("overlapping worker"); } } });
    assert.equal((await contender.runNext()).outcome, "DEFERRED");
    assert.equal((await fx.jobs.get(second.job.id)).status, "QUEUED");
    assert.equal((await fx.jobs.get(second.job.id)).attemptCount, 0);
    await assert.rejects(productPageGenerationService.regenerateFromSavedSource(fx.siteId), ProductMutationBusyError);
    assert.equal(await readFile(fx.packagePath, "utf8"), "worker-package");
    finish.release(); await completing.promise;
    await assert.rejects(productPageSourceService.save(fx.siteId, fx.input), ProductMutationBusyError);
    complete.release();
    assert.equal((await owner).outcome, "SUCCEEDED");
    assert.equal((await fx.jobs.get(first.job.id)).status, "SUCCEEDED");
  } finally { finish.release(); complete.release(); await owner; }
});

test("busy deferral validates the lease token and a live worker never loses site ownership when its job lease expires", async (t) => {
  const fx = await fixture(t);
  const queued = await fx.jobs.enqueue({ siteId: fx.siteId }, "one");
  const entered = barrier(); const finish = barrier();
  const worker = createPublicationJobWorker({ jobs: fx.jobs, leaseSeconds: 30, execution: { async execute() {
    entered.release(); await finish.promise; throw new Error("original lease has expired");
  } } }).runNext();
  const rejected = assert.rejects(worker, /PUBLICATION_JOB_LEASE_OWNERSHIP_LOST/);
  try {
    await entered.promise;
    await assert.rejects(fx.jobs.deferClaimedJob(queued.job.id, "wrong-token"), /PUBLICATION_JOB_LEASE_OWNERSHIP_LOST/);
    fx.advanceClock();
    const next = await createPublicationJobWorker({ jobs: fx.jobs, execution: { async execute() { assert.fail("entered while previous worker lives"); } } }).runNext();
    assert.equal(next.outcome, "DEFERRED");
    const state = await fx.jobs.get(queued.job.id);
    assert.equal(state.status, "QUEUED"); assert.equal(state.attemptCount, 1); assert.equal(state.lastErrorCode, undefined);
    await assert.rejects(productPageSourceService.save(fx.siteId, fx.input), ProductMutationBusyError);
  } finally { finish.release(); await rejected; }
});

test("journal recovery verifies remote and public evidence under the same site ownership", async (t) => {
  const fx = await fixture(t);
  const { job } = await fx.jobs.enqueue({ siteId: fx.siteId }, "recover");
  const targetPath = resolve(fx.sourceDirectory, ".publishing-targets", `${fx.siteId}.json`);
  const finalTarget = JSON.stringify({ ...fx.target, publicationState: "READY" });
  await writeFile(targetPath, finalTarget);
  const journalDirectory = resolve(fx.root, ".journals");
  await mkdir(resolve(journalDirectory, fx.siteId), { recursive: true });
  await writeFile(resolve(journalDirectory, fx.siteId, "committed.json"), JSON.stringify({
    publicationJobId: job.id, mode: APPLY_MODE, sourceHash: job.intent.sourceHash,
    initialTargetHash: job.intent.targetHash, finalTargetHash: sha(finalTarget),
    publicHost: fx.target.publicHost, remoteRoot: fx.target.remoteRoot, targetPath,
    packageHash: "a".repeat(64), capabilityHash: "b".repeat(64), planHash: "c".repeat(64)
  }));
  const entered = barrier(); const finish = barrier();
  let publicVerifications = 0; let closed = 0;
  const execution = createPublicationExecution({
    sourceDirectory: fx.sourceDirectory, outputDirectory: fx.root, journalDirectory,
    isBusinessMasterPackageRefreshActive: fx.jobs.isBusinessMasterPackageRefreshActive,
    generate: async () => assert.fail("recovery must not regenerate"),
    adapterFactory: async () => ({
      async inventory() { entered.release(); await finish.promise; return { exists: true, hash: "a".repeat(64) }; },
      async close() { closed++; }
    }),
    verifyPublic: async () => { publicVerifications++; return { passed: true, reasons: [] }; }
  });
  const owner = createPublicationJobWorker({ jobs: fx.jobs, execution }).runNext();
  try {
    await entered.promise;
    await assert.rejects(productPageSourceService.save(fx.siteId, fx.input), ProductMutationBusyError);
    await assert.rejects(productPageGenerationService.regenerateFromSavedSource(fx.siteId), ProductMutationBusyError);
    finish.release();
    assert.equal((await owner).outcome, "SUCCEEDED");
    assert.equal(publicVerifications, 1); assert.equal(closed, 1);
    assert.equal((await fx.jobs.get(job.id)).evidence.at(-1).phase, "COMPLETE");
  } finally { finish.release(); await owner; }
});

// External SFTP is replaced at its byte/directory boundary; source saves, generation,
// staging, guarded publication and job metadata all remain the actual implementations.
class MemorySftp {
  files = new Map();
  directories = new Set(["/"]);
  beforeSwap = async () => {};
  has(path) { return this.directories.has(path) || this.files.has(path); }
  async inventory(root) {
    const files = [...this.files].filter(([path]) => path.startsWith(`${root}/`))
      .map(([path, bytes]) => ({ path: path.slice(root.length + 1), hash: sha(bytes) }))
      .sort((a, b) => a.path.localeCompare(b.path));
    return { exists: this.has(root), files, hash: sha(JSON.stringify(files)) };
  }
  async mkdir(path, recursive = false) {
    if (this.has(path)) throw Object.assign(new Error("exists"), { code: "EEXIST" });
    if (recursive) await this.parents(path);
    else this.directories.add(path);
  }
  async parents(path) {
    let current = "";
    for (const part of path.split("/").filter(Boolean)) { current += `/${part}`; this.directories.add(current); }
  }
  async writeFile(path, bytes) { this.files.set(path, Buffer.from(bytes)); }
  async readFile(path) { if (!this.files.has(path)) throw new Error("ENOENT"); return this.files.get(path); }
  async put(local, remote) { await this.parents(posix.dirname(remote)); this.files.set(remote, await readFile(local)); }
  async rename(from, to) {
    await this.beforeSwap(from, to);
    if (!this.has(from) || this.has(to)) throw new Error("RENAME_CONFLICT");
    for (const [path, bytes] of [...this.files]) if (path === from || path.startsWith(`${from}/`)) {
      this.files.delete(path); this.files.set(`${to}${path.slice(from.length)}`, bytes);
    }
    for (const path of [...this.directories]) if (path === from || path.startsWith(`${from}/`)) {
      this.directories.delete(path); this.directories.add(`${to}${path.slice(from.length)}`);
    }
  }
  async remove(root) {
    for (const path of this.files.keys()) if (path === root || path.startsWith(`${root}/`)) this.files.delete(path);
    for (const path of this.directories) if (path === root || path.startsWith(`${root}/`)) this.directories.delete(path);
  }
  async close() {}
}

test("the real worker paused before remote swap prevents a concurrent generator from deleting its package or source", async (t) => {
  const fx = await fixture(t);
  await prepareGeneration(t, fx);
  await productPageGenerationService.generate(fx.input);
  const sourceBefore = await readFile(fx.sourcePath, "utf8");
  const { job } = await fx.jobs.enqueue({ siteId: fx.siteId }, "real-worker");
  const entered = barrier(); const finish = barrier();
  const adapter = new MemorySftp();
  await adapter.parents(posix.dirname(fx.target.remoteRoot));
  adapter.beforeSwap = async (_from, to) => { if (to === fx.target.remoteRoot) { entered.release(); await finish.promise; } };
  const execution = createPublicationExecution({
    sourceDirectory: fx.sourceDirectory, outputDirectory: fx.root, workDirectory: resolve(fx.root, ".work"), journalDirectory: resolve(fx.root, ".journals"),
    environment: { HOSTINGER_SFTP_HOST: "sftp.example.test", HOSTINGER_SFTP_PORT: "65002", HOSTINGER_SFTP_USERNAME: "fixture",
      HOSTINGER_SFTP_PASSWORD: "fixture", HOSTINGER_SFTP_HOST_KEY_SHA256: `SHA256:${"A".repeat(43)}=` },
    isBusinessMasterPackageRefreshActive: fx.jobs.isBusinessMasterPackageRefreshActive,
    adapterFactory: async () => adapter, verifyPublic: async () => ({ passed: true, reasons: [] })
  });
  const owner = createPublicationJobWorker({ jobs: fx.jobs, execution }).runNext();
  try {
    await Promise.race([entered.promise, owner.then((result) => assert.fail(`worker ended before swap: ${JSON.stringify(result)}`))]);
    const packageBefore = await readFile(fx.packagePath, "utf8");
    await assert.rejects(productPageGenerationService.generate({ ...fx.input, site: { ...fx.input.site, title: "Concurrent replacement" } }), ProductMutationBusyError);
    assert.equal(await readFile(fx.packagePath, "utf8"), packageBefore);
    assert.equal(await readFile(fx.sourcePath, "utf8"), sourceBefore);
    finish.release();
    const result = await owner;
    assert.equal(result.outcome, "SUCCEEDED", JSON.stringify(result));
    assert.equal((await fx.jobs.get(job.id)).phase, "COMPLETE");
  } finally { finish.release(); await owner; }
});

test("contention surfaced by a Product execution is deferred rather than FAILED", async (t) => {
  const fx = await fixture(t);
  const { job } = await fx.jobs.enqueue({ siteId: fx.siteId }, "busy");
  const result = await createPublicationJobWorker({ jobs: fx.jobs, execution: { async execute() { throw new ProductMutationBusyError(); } } }).runNext();
  assert.equal(result.outcome, "DEFERRED");
  assert.equal((await fx.jobs.get(job.id)).status, "QUEUED");
  assert.equal((await fx.jobs.get(job.id)).attemptCount, 0);
});

test("a worker started inside a manual owner's async context does not inherit its reentrant capability", async (t) => {
  const fx = await fixture(t);
  const { job } = await fx.jobs.enqueue({ siteId: fx.siteId }, "manual");
  await withProductMutation(fx.siteId, async () => {
    const result = await createPublicationJobWorker({ jobs: fx.jobs, execution: { async execute() {
      assert.fail("background worker inherited manual ownership");
    } } }).runNext();
    assert.equal(result.outcome, "DEFERRED");
  });
  assert.equal((await fx.jobs.get(job.id)).status, "QUEUED");
  assert.equal((await fx.jobs.get(job.id)).attemptCount, 0);
});


