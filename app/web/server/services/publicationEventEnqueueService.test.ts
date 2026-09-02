import assert from "node:assert/strict";
import test from "node:test";

import { createPublicationEventEnqueueService } from "./publicationEventEnqueueService.ts";

const ownerKey = "f403f29e-95c8-4825-9320-967376443020";
const otherOwner = "851a1c54-8866-4e50-946d-0e6fd332b777";
const targets = [
  { ownerKey, siteId: "client-product", ecosystemType: "PRODUCT" as const, provisioningState: "READY", publicationState: "PENDING" },
  { ownerKey, siteId: "client-business", ecosystemType: "BUSINESS" as const, provisioningState: "READY", publicationState: "READY" },
  { ownerKey, siteId: "client-personal-brand", ecosystemType: "PERSONAL_BRAND" as const, provisioningState: "SSL_PENDING", publicationState: "PENDING" },
  { ownerKey: otherOwner, siteId: "other-business", ecosystemType: "BUSINESS" as const, provisioningState: "READY", publicationState: "PENDING" }
];

function fixture(overrides: Record<string, unknown> = {}) {
  const calls: string[] = [];
  let wakeCount = 0;
  const lead = { id: ownerKey, siteId: "client", status: "PAID", recordState: "ACTIVE" };
  const entitlement = { activationLeadId: ownerKey, commercialState: "KNOWN", includedEcosystems: ["PRODUCT", "BUSINESS"] as Array<"PRODUCT" | "BUSINESS" | "PERSONAL_BRAND">, existingTargets: targets };
  const dependencies = {
    getLeadById: async () => lead,
    getEntitlement: async () => entitlement,
    listTargets: async () => targets,
    enqueue: async ({ siteId }: { siteId: string }) => { calls.push(siteId); return { created: true, job: { status: "QUEUED" } }; },
    wake: () => { wakeCount += 1; },
    ...overrides
  };
  return { service: createPublicationEventEnqueueService(dependencies), calls, wakeCount: () => wakeCount, lead, entitlement };
}

test("approved activation enqueues every entitled READY target for the same owner", async () => {
  const fx = fixture();
  const result = await fx.service.afterActivationChange(fx.lead);
  assert.deepEqual(fx.calls, ["client-business", "client-product"]);
  assert.equal(result.outcome, "ENQUEUED");
  assert.equal(result.createdCount, 2);
  assert.equal(fx.wakeCount(), 1);
});

test("unpaid, cancelled and archived activation records never enqueue", async () => {
  for (const lead of [
    { ...fixture().lead, status: "CONTACTED" },
    { ...fixture().lead, status: "CANCELLED" },
    { ...fixture().lead, recordState: "ARCHIVED" }
  ]) {
    const fx = fixture();
    const result = await fx.service.afterActivationChange(lead);
    assert.equal(result.reason, "ACTIVATION_NOT_APPROVED");
    assert.equal(fx.calls.length, 0);
    assert.equal(fx.wakeCount(), 0);
  }
});

test("source changes are scoped to the exact entitled site", async () => {
  const fx = fixture();
  const result = await fx.service.afterSourceChange("client-business");
  assert.deepEqual(fx.calls, ["client-business"]);
  assert.equal(result.eligibleCount, 1);
  assert.equal(result.outcome, "ENQUEUED");
});

test("cross-owner and unentitled source changes fail closed", async () => {
  for (const siteId of ["other-business", "client-personal-brand"]) {
    const fx = fixture();
    const result = await fx.service.afterSourceChange(siteId);
    assert.equal(result.outcome, "SKIPPED");
    assert.equal(fx.calls.length, 0);
  }
});

test("idempotent jobs still wake the worker without creating duplicates", async () => {
  const fx = fixture({ enqueue: async ({ siteId }: { siteId: string }) => { fx.calls.push(siteId); return { created: false, job: { status: "QUEUED" } }; } });
  const result = await fx.service.afterSourceChange("client-product");
  assert.equal(result.outcome, "IDEMPOTENT");
  assert.equal(result.idempotentCount, 1);
  assert.equal(fx.wakeCount(), 1);
});

test("missing artifacts do not fail the committed business event", async () => {
  const fx = fixture({ enqueue: async () => { throw new Error("PUBLICATION_JOB_SOURCE_OR_TARGET_MISSING"); } });
  const result = await fx.service.afterActivationChange(fx.lead);
  assert.equal(result.outcome, "SKIPPED");
  assert.equal(result.reason, "ARTIFACT_NOT_READY");
  assert.equal(result.skippedCount, 2);
  assert.equal(fx.wakeCount(), 0);
});

test("unexpected dependency failures return one bounded safe outcome", async () => {
  const fx = fixture({ getEntitlement: async () => { throw new Error("raw credential-bearing provider failure"); } });
  const result = await fx.service.afterSourceChange("client-business");
  assert.deepEqual(result, {
    event: "SOURCE_CHANGED",
    outcome: "FAILED_SAFE",
    eligibleCount: 0,
    createdCount: 0,
    idempotentCount: 0,
    skippedCount: 0,
    reason: "AUTOMATION_UNAVAILABLE"
  });
  assert.equal(JSON.stringify(result).includes("credential"), false);
});
