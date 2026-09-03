import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  createPublicationBackfillExecutorService,
  PUBLICATION_BACKFILL_APPLY_MODE,
  PUBLICATION_BACKFILL_CONFIRMATION
} from "./publicationBackfillExecutorService.ts";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const PLAN_HASH = hash("reviewed-backfill-plan");

function candidate(siteId: string) {
  return {
    siteId,
    ecosystemType: "BUSINESS" as const,
    publicHost: `negocio.${siteId}.example`,
    intentHash: hash(`intent:${siteId}`),
    sourceHash: hash(`source:${siteId}`),
    targetHash: hash(`target:${siteId}`),
    masterPackageHash: hash("master:BUSINESS"),
    approvalHash: hash(`approval:${siteId}`)
  };
}

function preview(candidates = [candidate("alpha-business")]) {
  return {
    planHash: PLAN_HASH,
    summary: {
      targets: candidates.length,
      candidates: candidates.length,
      alreadyCurrent: 0,
      alreadyScheduled: 0,
      retryRequired: 0,
      blocked: 0
    },
    planMaterial: { candidates }
  };
}

function authorized(expectedPlanHash = PLAN_HASH) {
  return {
    mode: PUBLICATION_BACKFILL_APPLY_MODE,
    confirmation: PUBLICATION_BACKFILL_CONFIRMATION,
    expectedPlanHash
  };
}

function job(entry: ReturnType<typeof candidate>, status: "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED" = "QUEUED") {
  return {
    id: entry.intentHash,
    status,
    intent: {
      siteId: entry.siteId,
      ecosystemType: entry.ecosystemType,
      publicHost: entry.publicHost
    }
  };
}

test("exact reviewed plan enqueues only its candidates and wakes the worker once", async () => {
  const reviewed = preview();
  const calls: Array<{ siteId: string; subject: string; intentHash: string }> = [];
  let wakes = 0;
  const service = createPublicationBackfillExecutorService({
    preview: async () => reviewed,
    enqueueReviewed: async ({ siteId }, subject, intentHash) => {
      calls.push({ siteId, subject, intentHash });
      return { created: true, job: job(reviewed.planMaterial.candidates[0]) };
    },
    wake: () => { wakes += 1; }
  });

  const result = await service.apply(authorized(), "cloudflare-operator-subject");
  assert.equal(result.outcome, "ENQUEUED");
  assert.equal(result.changed, true);
  assert.equal(result.blocked, false);
  assert.deepEqual(result.summary, {
    authorizedCandidates: 1,
    processedCandidates: 1,
    createdJobs: 1,
    existingJobs: 0,
    remainingCandidates: 0
  });
  assert.deepEqual(calls, [{
    siteId: "alpha-business",
    subject: "cloudflare-operator-subject",
    intentHash: reviewed.planMaterial.candidates[0].intentHash
  }]);
  assert.equal(wakes, 1);
  assert.equal(JSON.stringify(result).includes("cloudflare-operator-subject"), false);
});

test("invalid confirmation and plan drift fail before any enqueue or wake", async () => {
  let previews = 0; let enqueues = 0; let wakes = 0;
  const service = createPublicationBackfillExecutorService({
    preview: async () => { previews += 1; return preview(); },
    enqueueReviewed: async () => { enqueues += 1; throw new Error("should not run"); },
    wake: () => { wakes += 1; }
  });

  await assert.rejects(
    service.apply({ ...authorized(), confirmation: "WRONG" as typeof PUBLICATION_BACKFILL_CONFIRMATION }, "operator")
  );
  await assert.rejects(service.apply(authorized(hash("stale-plan")), "operator"), /PUBLICATION_BACKFILL_PLAN_HASH_MISMATCH/);
  assert.equal(previews, 1);
  assert.equal(enqueues, 0);
  assert.equal(wakes, 0);
});

test("reviewed intent drift returns a safe blocked result without leaking the raw error", async () => {
  let wakes = 0;
  const service = createPublicationBackfillExecutorService({
    preview: async () => preview(),
    enqueueReviewed: async () => { throw new Error("secret provider detail"); },
    wake: () => { wakes += 1; }
  });
  const result = await service.apply(authorized(), "operator");
  assert.equal(result.blocked, true);
  assert.deepEqual(result.blockedReasons, ["PUBLICATION_BACKFILL_PARTIAL_ENQUEUE"]);
  assert.equal(result.summary.createdJobs, 0);
  assert.equal(result.summary.remainingCandidates, 1);
  assert.equal(result.nextAction, "RUN_NEW_PREVIEW_AND_REQUIRE_NEW_AUTHORIZATION");
  assert.equal(JSON.stringify(result).includes("secret provider detail"), false);
  assert.equal(wakes, 0);
});

test("partial multi-candidate enqueue preserves completed jobs and requires a new preview", async () => {
  const candidates = [candidate("alpha-business"), candidate("bravo-business")];
  const reviewed = preview(candidates);
  let calls = 0; let wakes = 0;
  const service = createPublicationBackfillExecutorService({
    preview: async () => reviewed,
    enqueueReviewed: async () => {
      const entry = candidates[calls++];
      if (calls === 2) throw new Error("disk failure");
      return { created: true, job: job(entry) };
    },
    wake: () => { wakes += 1; }
  });
  const result = await service.apply(authorized(), "operator");
  assert.equal(result.blocked, true);
  assert.equal(result.changed, true);
  assert.equal(result.summary.processedCandidates, 1);
  assert.equal(result.summary.remainingCandidates, 1);
  assert.equal(result.jobs[0].siteId, "alpha-business");
  assert.equal(wakes, 1);
});

test("an idempotent queued job is never duplicated and still wakes the worker", async () => {
  const reviewed = preview(); let wakes = 0;
  const service = createPublicationBackfillExecutorService({
    preview: async () => reviewed,
    enqueueReviewed: async () => ({ created: false, job: job(reviewed.planMaterial.candidates[0]) }),
    wake: () => { wakes += 1; }
  });
  const result = await service.apply(authorized(), "operator");
  assert.equal(result.outcome, "IDEMPOTENT");
  assert.equal(result.changed, false);
  assert.equal(result.summary.existingJobs, 1);
  assert.equal(wakes, 1);
});

test("an exact empty plan is a read-only no-op", async () => {
  const empty = preview([]); let wakes = 0;
  const service = createPublicationBackfillExecutorService({
    preview: async () => empty,
    enqueueReviewed: async () => { throw new Error("should not run"); },
    wake: () => { wakes += 1; }
  });
  const result = await service.apply(authorized(), "operator");
  assert.equal(result.outcome, "NO_CANDIDATES");
  assert.equal(result.changed, false);
  assert.equal(wakes, 0);
});
