import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import { createPublicationJobService } from "./publicationJobService.ts";

const HASH = "a".repeat(64);

async function fixture(ecosystemType: "PRODUCT" | "BUSINESS" | "PERSONAL_BRAND" = "BUSINESS") {
  const root = await mkdtemp(resolve(tmpdir(), "publication-jobs-"));
  const sources = resolve(root, "sources"); const targets = resolve(sources, ".publishing-targets"); const jobs = resolve(root, "jobs"); const output = resolve(root, "output");
  await mkdir(targets, { recursive: true }); await mkdir(output);
  const ownerSiteId = "client-one";
  const siteId = ecosystemType === "PERSONAL_BRAND" ? ownerSiteId : `${ownerSiteId}-${ecosystemType === "PRODUCT" ? "product" : "business"}`;
  const label = { PRODUCT: "producto", BUSINESS: "negocio", PERSONAL_BRAND: "brand" }[ecosystemType];
  const publicHost = `${label}.clientone.pro`;
  const source = { ecosystemType, site: { id: siteId, domain: publicHost, title: "Client" } };
  const target = { version: 2, ownerKey: "f403f29e-95c8-4825-9320-967376443020", siteId, ecosystemType, rootEcosystemType: "PERSONAL_BRAND",
    baseDomain: "clientone.pro", publicHost, remoteRoot: `/home/client/public_html/${label}`, provisioningState: "READY", publicationState: "PENDING" };
  await writeFile(resolve(sources, `${siteId}.json`), `${JSON.stringify(source, null, 2)}\n`);
  await writeFile(resolve(targets, `${siteId}.json`), `${JSON.stringify(target, null, 2)}\n`);
  const masterSiteId = { PRODUCT: "ganomaster", BUSINESS: "ganomaster-business", PERSONAL_BRAND: "ganomaster-personal-brand" }[ecosystemType];
  await mkdir(resolve(output, masterSiteId)); await writeFile(resolve(output, masterSiteId, "index.html"), `master-${ecosystemType}`);
  let clock = new Date("2026-09-02T20:00:00.000Z"); let sequence = 0;
  const service = createPublicationJobService({ sourceDirectory: sources, outputDirectory: output, jobDirectory: jobs, now: () => new Date(clock), token: () => `token-${++sequence}` });
  return { root, sources, targets, jobs, output, masterSiteId, ownerSiteId, siteId, publicHost, source, target, service, setClock: (value: string) => { clock = new Date(value); } };
}

test("enqueue derives immutable identity and deduplicates the exact publication intent", async () => {
  const fx = await fixture();
  const first = await fx.service.enqueue({ siteId: fx.siteId }, "cloudflare-subject-one");
  const second = await fx.service.enqueue({ siteId: fx.siteId }, "different-subject");
  assert.equal(first.created, true); assert.equal(second.created, false); assert.equal(second.job.id, first.job.id);
  assert.equal(first.job.intent.siteId, fx.siteId); assert.equal(first.job.intent.ownerSiteId, fx.ownerSiteId);
  assert.equal(first.job.intent.publicHost, fx.publicHost); assert.equal(first.job.status, "QUEUED");
  assert.match(first.job.intent.masterPackageHash, /^[0-9a-f]{64}$/);
  const persisted = await readFile(resolve(fx.jobs, `${first.job.id}.json`), "utf8");
  assert.equal(persisted.includes("cloudflare-subject-one"), false); assert.equal(persisted.includes("different-subject"), false);
  assert.equal(JSON.stringify(fx.service.toSafeJob(first.job)).includes(first.job.intent.ownerKey), false);
  assert.equal(JSON.stringify(fx.service.toSafeJob(first.job)).includes(first.job.requestedBySubjectHash), false);
});

test("previewIntent derives the enqueue identity without creating durable queue state", async () => {
  const fx = await fixture();
  const preview = await fx.service.previewIntent({ siteId: fx.siteId });
  assert.equal(preview.intent.siteId, fx.siteId);
  assert.match(preview.intentHash, /^[0-9a-f]{64}$/);
  assert.deepEqual(await fx.service.list(), []);
  const enqueued = await fx.service.enqueue({ siteId: fx.siteId }, "operator");
  assert.equal(enqueued.job.id, preview.intentHash);
  assert.deepEqual(enqueued.job.intent, preview.intent);
});

test("a canonical master package change creates a new publication intent", async () => {
  const fx = await fixture(); const first = await fx.service.enqueue({ siteId: fx.siteId }, "operator");
  await writeFile(resolve(fx.output, fx.masterSiteId, "index.html"), "master-v2");
  const second = await fx.service.enqueue({ siteId: fx.siteId }, "operator");
  assert.equal(second.created, true); assert.notEqual(second.job.id, first.job.id);
  assert.notEqual(second.job.intent.masterPackageHash, first.job.intent.masterPackageHash);
});

test("PRODUCT, BUSINESS and PERSONAL_BRAND canonical targets can be enqueued", async () => {
  for (const ecosystemType of ["PRODUCT", "BUSINESS", "PERSONAL_BRAND"] as const) {
    const fx = await fixture(ecosystemType); const result = await fx.service.enqueue({ siteId: fx.siteId }, `worker-${ecosystemType}`);
    assert.equal(result.job.intent.ecosystemType, ecosystemType); assert.equal(result.job.intent.publicHost, fx.publicHost);
  }
});

test("enqueue rejects noncanonical hosts, source substitution and non-READY targets", async () => {
  const host = await fixture(); host.target.publicHost = "business.clientone.pro";
  await writeFile(resolve(host.targets, `${host.siteId}.json`), `${JSON.stringify(host.target)}\n`);
  await assert.rejects(host.service.enqueue({ siteId: host.siteId }, "operator"), /PUBLICATION_JOB_SOURCE_TARGET_IDENTITY_MISMATCH/);

  const source = await fixture(); source.source.ecosystemType = "PRODUCT";
  await writeFile(resolve(source.sources, `${source.siteId}.json`), `${JSON.stringify(source.source)}\n`);
  await assert.rejects(source.service.enqueue({ siteId: source.siteId }, "operator"), /PUBLICATION_JOB_SOURCE_TARGET_IDENTITY_MISMATCH/);

  const pending = await fixture(); pending.target.provisioningState = "SSL_PENDING";
  await writeFile(resolve(pending.targets, `${pending.siteId}.json`), `${JSON.stringify(pending.target)}\n`);
  await assert.rejects(pending.service.enqueue({ siteId: pending.siteId }, "operator"), /PUBLICATION_JOB_SOURCE_OR_TARGET_INVALID/);
});

test("one worker exclusively claims and completes a monotonic publication lifecycle", async () => {
  const fx = await fixture(); const { job } = await fx.service.enqueue({ siteId: fx.siteId }, "operator");
  const claim = await fx.service.claimNext("worker-one", 300); assert.ok(claim); assert.equal(claim.job.attemptCount, 1);
  assert.equal(await fx.service.claimNext("worker-two", 300), null);
  await assert.rejects(fx.service.advance(job.id, claim.leaseToken, "PUBLISHING"), /PUBLICATION_JOB_PHASE_TRANSITION_INVALID/);
  await fx.service.advance(job.id, claim.leaseToken, "VALIDATING_CAPABILITY", { capabilityHash: HASH });
  await fx.service.advance(job.id, claim.leaseToken, "PLANNING_PUBLICATION", { planHash: HASH });
  await fx.service.advance(job.id, claim.leaseToken, "PUBLISHING", { packageHash: HASH });
  await fx.service.advance(job.id, claim.leaseToken, "VERIFYING");
  const completed = await fx.service.complete(job.id, claim.leaseToken, { journalHash: HASH });
  assert.equal(completed.status, "SUCCEEDED"); assert.equal(completed.phase, "COMPLETE"); assert.equal(completed.evidence.length, 5);
  assert.equal(JSON.stringify(completed).includes(claim.leaseToken), false);
  await assert.rejects(fx.service.retry(job.id), /PUBLICATION_JOB_RETRY_INVALID/);
});

test("concurrent transitions are serialized by a short atomic job lock", async () => {
  const fx = await fixture(); const { job } = await fx.service.enqueue({ siteId: fx.siteId }, "operator");
  const claim = await fx.service.claimNext("worker", 300); assert.ok(claim);
  const results = await Promise.allSettled([
    fx.service.advance(job.id, claim.leaseToken, "VALIDATING_CAPABILITY", { capabilityHash: HASH }),
    fx.service.advance(job.id, claim.leaseToken, "VALIDATING_CAPABILITY", { capabilityHash: HASH })
  ]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.filter((result) => result.status === "rejected").length, 1);
  assert.equal((await fx.service.get(job.id))?.phase, "VALIDATING_CAPABILITY");
});

test("safe failures can retry and queued jobs can cancel", async () => {
  const fx = await fixture(); const { job } = await fx.service.enqueue({ siteId: fx.siteId }, "operator");
  const claim = await fx.service.claimNext("worker", 300); assert.ok(claim);
  await assert.rejects(fx.service.fail(job.id, claim.leaseToken, "unsafe message with spaces"), /PUBLICATION_JOB_ERROR_CODE_INVALID/);
  const failed = await fx.service.fail(job.id, claim.leaseToken, "SFTP_CAPABILITY_EXPIRED"); assert.equal(failed.status, "FAILED");
  const retried = await fx.service.retry(job.id); assert.equal(retried.status, "QUEUED"); assert.equal(retried.attemptCount, 1);
  const cancelled = await fx.service.cancel(job.id); assert.equal(cancelled.status, "CANCELLED");
  const requeued = await fx.service.retry(job.id); assert.equal(requeued.status, "QUEUED"); assert.equal(requeued.cancelledAt, undefined);
});

test("an expired worker lease is recovered without allowing the old worker to commit", async () => {
  const fx = await fixture(); const { job } = await fx.service.enqueue({ siteId: fx.siteId }, "operator");
  const first = await fx.service.claimNext("worker-one", 30); assert.ok(first);
  fx.setClock("2026-09-02T20:00:31.000Z");
  const recovered = await fx.service.claimNext("worker-two", 300); assert.ok(recovered); assert.equal(recovered.job.attemptCount, 2);
  await assert.rejects(fx.service.advance(job.id, first.leaseToken, "PLANNING_PUBLICATION"), /PUBLICATION_JOB_LEASE_OWNERSHIP_LOST/);
  assert.notEqual(first.leaseToken, recovered.leaseToken);
});

test("list filters jobs and corrupt durable records fail closed", async () => {
  const fx = await fixture(); const { job } = await fx.service.enqueue({ siteId: fx.siteId }, "operator");
  assert.equal((await fx.service.list({ siteId: fx.siteId, status: "QUEUED" })).length, 1);
  assert.equal((await fx.service.list({ status: "SUCCEEDED" })).length, 0);
  await writeFile(resolve(fx.jobs, `${job.id}.json`), "{}\n");
  await assert.rejects(fx.service.get(job.id), /PUBLICATION_JOB_CORRUPT/);
});
