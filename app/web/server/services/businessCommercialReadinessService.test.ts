import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { createBusinessCommercialReadinessService } from "./businessCommercialReadinessService.ts";

const owner = "f403f29e-95c8-4825-9320-967376443020";

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function target(overrides: Record<string, unknown> = {}) {
  return {
    ownerKey: owner,
    siteId: "alpha-business",
    ecosystemType: "BUSINESS" as const,
    baseDomain: "alpha.example",
    publicHost: "negocio.alpha.example",
    provisioningState: "READY",
    publicationState: "PENDING",
    ...overrides
  };
}

function fixture(options: {
  lead?: Record<string, unknown> | null;
  entitlement?: Record<string, unknown> | null;
  inventory?: Record<string, unknown>[];
  job?: "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED" | null;
  previewError?: string;
} = {}) {
  const candidate = target();
  const writes: string[] = [];
  const service = createBusinessCommercialReadinessService({
    getLeadById: async () => options.lead === undefined
      ? { id: owner, siteId: "alpha", status: "PAID", recordState: "ACTIVE" }
      : options.lead as never,
    getEntitlement: async () => options.entitlement === undefined
      ? {
          activationLeadId: owner,
          commercialState: "KNOWN",
          includedEcosystems: ["BUSINESS"],
          existingTargets: [candidate]
        }
      : options.entitlement as never,
    listTargets: async () => options.inventory === undefined ? [candidate] as never : options.inventory as never,
    previewIntent: async () => {
      if (options.previewError) throw new Error(options.previewError);
      return {
        intentHash: hash("alpha-business"),
        intent: {
          ownerKey: owner,
          ownerSiteId: "alpha",
          siteId: "alpha-business",
          ecosystemType: "BUSINESS" as const,
          baseDomain: "alpha.example",
          publicHost: "negocio.alpha.example",
          sourceHash: hash("source"),
          targetHash: hash("target"),
          masterPackageHash: hash("master")
        }
      };
    },
    getJob: async () => options.job ? { status: options.job } : null,
    onRead: (name) => writes.push(name)
  });
  return { service, writes };
}

test("returns a safe ready-for-preview commercial state without performing a write", async () => {
  const fx = fixture();
  const result = await fx.service.get({ activationLeadId: owner });

  assert.equal(result.status, "READY_FOR_PUBLICATION_PREVIEW");
  assert.equal(result.blocked, false);
  assert.deepEqual(result.blockedReasons, []);
  assert.deepEqual(result.artifacts, {
    sourceHash: hash("source"),
    targetHash: hash("target"),
    masterPackageHash: hash("master"),
    intentHash: hash("alpha-business")
  });
  assert.deepEqual(fx.writes, ["lead", "entitlement", "targets", "intent", "job"]);
});

test("classifies existing publication jobs without requeueing", async () => {
  for (const [job, expected] of [
    ["SUCCEEDED", "PUBLICATION_CURRENT"],
    ["QUEUED", "PUBLICATION_SCHEDULED"],
    ["RUNNING", "PUBLICATION_SCHEDULED"],
    ["FAILED", "RETRY_REQUIRED"],
    ["CANCELLED", "RETRY_REQUIRED"]
  ] as const) {
    const result = await fixture({ job }).service.get({ activationLeadId: owner });
    assert.equal(result.status, expected);
    assert.equal(result.blocked, false);
  }
});

test("treats a legacy target already marked READY as current when no durable job exists", async () => {
  const result = await fixture({ inventory: [target({ publicationState: "READY" })] }).service.get({ activationLeadId: owner });

  assert.equal(result.status, "PUBLICATION_CURRENT");
  assert.equal(result.blocked, false);
});

test("fails closed with bounded blockers for commercial, target, and artifact problems", async () => {
  const scenarios = [
    { options: { lead: { id: owner, siteId: "alpha", status: "CONTACTED", recordState: "ACTIVE" } }, reason: "ACTIVATION_NOT_APPROVED" },
    { options: { entitlement: { activationLeadId: owner, commercialState: "KNOWN", includedEcosystems: [], existingTargets: [target()] } }, reason: "BUSINESS_NOT_ENTITLED" },
    { options: { inventory: [target({ provisioningState: "PENDING" })] }, reason: "TARGET_NOT_READY" },
    { options: { previewError: "PUBLICATION_JOB_MASTER_PACKAGE_MISSING" }, reason: "MASTER_PACKAGE_MISSING" },
    { options: { previewError: "provider token=must-not-leak" }, reason: "INVENTORY_UNAVAILABLE" }
  ] as const;

  for (const scenario of scenarios) {
    const result = await fixture(scenario.options).service.get({ activationLeadId: owner });
    assert.equal(result.status, "BLOCKED");
    assert.equal(result.blocked, true);
    assert.deepEqual(result.blockedReasons, [scenario.reason]);
  }
});

test("does not expose owner keys or raw dependency errors in the public readiness projection", async () => {
  const result = await fixture({ previewError: "secret=do-not-return" }).service.get({ activationLeadId: owner });
  const serialized = JSON.stringify(result);

  assert.equal(serialized.includes(owner), false);
  assert.equal(serialized.includes("do-not-return"), false);
  assert.equal(result.status, "BLOCKED");
});
