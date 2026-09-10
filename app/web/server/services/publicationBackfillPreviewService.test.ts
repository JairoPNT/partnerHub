import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { createPublicationBackfillPreviewService } from "./publicationBackfillPreviewService.ts";

type EcosystemType = "PRODUCT" | "BUSINESS" | "PERSONAL_BRAND";

const owners = {
  eligible: "f403f29e-95c8-4825-9320-967376443020",
  unapproved: "851a1c54-8866-4e50-946d-0e6fd332b777",
  unentitled: "3843c87f-7f93-4754-b2f0-c66f92965a57",
  incomplete: "7fd6c48d-71dc-4f66-b950-a642fdcf66e9",
  crossTenant: "03aa3301-7c9b-4084-916c-c572d46076fd",
  missingArtifact: "d743aa3d-e061-4c31-bc4c-80ee66509ec7"
};

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function target(ownerKey: string, ownerSiteId: string, ecosystemType: EcosystemType, overrides: Record<string, unknown> = {}) {
  const suffix = { PRODUCT: "product", BUSINESS: "business", PERSONAL_BRAND: "personal-brand" }[ecosystemType];
  const label = { PRODUCT: "producto", BUSINESS: "negocio", PERSONAL_BRAND: "marca" }[ecosystemType];
  return {
    ownerKey,
    siteId: `${ownerSiteId}-${suffix}`,
    ecosystemType,
    baseDomain: `${ownerSiteId}.example`,
    publicHost: `${label}.${ownerSiteId}.example`,
    provisioningState: "READY",
    publicationState: "PENDING",
    ...overrides
  };
}

const targets = [
  target(owners.eligible, "alpha", "BUSINESS"),
  target(owners.eligible, "alpha", "PRODUCT"),
  target(owners.eligible, "alpha", "PERSONAL_BRAND"),
  target(owners.unapproved, "bravo", "BUSINESS"),
  target(owners.unentitled, "charlie", "BUSINESS"),
  target(owners.incomplete, "delta", "BUSINESS", { provisioningState: "SSL_PENDING" }),
  target(owners.crossTenant, "echo", "BUSINESS"),
  target(owners.missingArtifact, "foxtrot", "BUSINESS")
];

const leads = [
  { id: owners.eligible, siteId: "alpha", status: "PAID", recordState: "ACTIVE" },
  { id: owners.unapproved, siteId: "bravo", status: "CONTACTED", recordState: "ACTIVE" },
  { id: owners.unentitled, siteId: "charlie", status: "CONVERTED", recordState: "ACTIVE" },
  { id: owners.incomplete, siteId: "delta", status: "PAID", recordState: "ACTIVE" },
  { id: owners.crossTenant, siteId: "echo", status: "PAID", recordState: "ACTIVE" },
  { id: owners.missingArtifact, siteId: "foxtrot", status: "PAID", recordState: "ACTIVE" }
];

function entitlement(ownerKey: string) {
  const existingTargets = targets.filter((candidate) => candidate.ownerKey === ownerKey);
  return {
    activationLeadId: ownerKey,
    commercialState: "KNOWN",
    includedEcosystems: existingTargets.map((candidate) => candidate.ecosystemType),
    existingTargets
  };
}

function fixture(options: { reverse?: boolean; rawArtifactFailure?: boolean } = {}) {
  const intentCalls: string[] = [];
  const jobReads: string[] = [];
  const orderedLeads = options.reverse ? [...leads].reverse() : leads;
  const orderedTargets = options.reverse ? [...targets].reverse() : targets;
  const jobs: Record<string, { status: "QUEUED" | "SUCCEEDED" | "FAILED" }> = {
    [hash("alpha-product")]: { status: "SUCCEEDED" },
    [hash("alpha-personal-brand")]: { status: "QUEUED" }
  };
  const service = createPublicationBackfillPreviewService({
    listLeads: async () => orderedLeads,
    listTargets: async () => orderedTargets,
    getEntitlement: async ({ activationLeadId }) => {
      if (activationLeadId === owners.unentitled) {
        return { ...entitlement(activationLeadId), includedEcosystems: [] };
      }
      if (activationLeadId === owners.crossTenant) {
        return { ...entitlement(activationLeadId), existingTargets: [{ ...targets.find((item) => item.ownerKey === activationLeadId)!, ownerKey: owners.eligible }] };
      }
      return entitlement(activationLeadId);
    },
    previewIntent: async ({ siteId }) => {
      intentCalls.push(siteId);
      if (siteId === "foxtrot-business") {
        throw new Error(options.rawArtifactFailure ? "provider token=must-not-leak" : "PUBLICATION_JOB_SOURCE_OR_TARGET_MISSING");
      }
      const candidate = targets.find((item) => item.siteId === siteId)!;
      const ownerSiteId = leads.find((lead) => lead.id === candidate.ownerKey)!.siteId;
      return {
        intentHash: hash(siteId),
        intent: {
          ownerKey: candidate.ownerKey,
          ownerSiteId: ownerSiteId!,
          siteId: candidate.siteId,
          ecosystemType: candidate.ecosystemType,
          baseDomain: candidate.baseDomain,
          publicHost: candidate.publicHost,
          sourceHash: hash(`source:${siteId}`),
          targetHash: hash(`target:${siteId}`),
          masterPackageHash: hash(`master:${candidate.ecosystemType}`)
        }
      };
    },
    getJob: async (id) => {
      jobReads.push(id);
      return jobs[id] ?? null;
    }
  });
  return { service, intentCalls, jobReads };
}

test("preview classifies eligible, current, scheduled and blocked targets without enqueueing", async () => {
  const fx = fixture();
  const result = await fx.service.preview();
  assert.deepEqual(result.summary, {
    targets: 8,
    candidates: 1,
    alreadyCurrent: 1,
    alreadyScheduled: 1,
    retryRequired: 0,
    blocked: 5
  });
  assert.deepEqual(result.planMaterial.candidates.map((entry) => entry.siteId), ["alpha-business"]);
  assert.deepEqual(result.planMaterial.alreadyCurrent.map((entry) => entry.siteId), ["alpha-product"]);
  assert.deepEqual(result.planMaterial.alreadyScheduled.map((entry) => entry.siteId), ["alpha-personal-brand"]);
  assert.deepEqual(result.planMaterial.blocked.map((entry) => [entry.siteId, entry.reason]), [
    ["bravo-business", "ACTIVATION_NOT_APPROVED"],
    ["charlie-business", "ENTITLEMENT_NOT_ACTIVE"],
    ["delta-business", "TARGET_NOT_READY"],
    ["echo-business", "TARGET_OWNERSHIP_MISMATCH"],
    ["foxtrot-business", "ARTIFACT_MISSING"]
  ]);
  assert.deepEqual(fx.intentCalls, ["alpha-business", "alpha-personal-brand", "alpha-product", "foxtrot-business"]);
  assert.equal(fx.jobReads.length, 3);
  assert.equal(result.changed, false);
  assert.equal(result.writesMade, false);
  assert.equal(result.providerCallsMade, false);
});

test("failed and cancelled current intents are separated for an explicitly authorized retry", async () => {
  for (const status of ["FAILED", "CANCELLED"] as const) {
    const candidate = targets[0];
    const service = createPublicationBackfillPreviewService({
      listLeads: async () => [leads[0]],
      listTargets: async () => [candidate],
      getEntitlement: async () => entitlement(owners.eligible),
      previewIntent: async () => ({
        intentHash: hash(candidate.siteId),
        intent: {
          ownerKey: candidate.ownerKey,
          ownerSiteId: "alpha",
          siteId: candidate.siteId,
          ecosystemType: candidate.ecosystemType,
          baseDomain: candidate.baseDomain,
          publicHost: candidate.publicHost,
          sourceHash: hash("source"),
          targetHash: hash("target"),
          masterPackageHash: hash("master")
        }
      }),
      getJob: async () => ({ status })
    });
    const result = await service.preview();
    assert.equal(result.summary.retryRequired, 1);
    assert.equal(result.planMaterial.retryRequired[0].jobStatus, status);
    assert.equal(result.summary.candidates, 0);
  }
});

test("reordered storage inputs produce the same sorted inventory and plan hash", async () => {
  const normal = await fixture().service.preview();
  const reversed = await fixture({ reverse: true }).service.preview();
  assert.deepEqual(reversed.planMaterial, normal.planMaterial);
  assert.equal(reversed.planHash, normal.planHash);
});

test("preview returns only bounded reason codes and never owner identifiers or raw dependency errors", async () => {
  const result = await fixture({ rawArtifactFailure: true }).service.preview();
  const serialized = JSON.stringify(result);
  for (const owner of Object.values(owners)) assert.equal(serialized.includes(owner), false);
  assert.equal(serialized.includes("must-not-leak"), false);
  assert.equal(result.planMaterial.blocked.find((entry) => entry.siteId === "foxtrot-business")?.reason, "INVENTORY_UNAVAILABLE");
});

test("an intent whose owner site does not match the activation record fails closed", async () => {
  const candidate = targets[0];
  const service = createPublicationBackfillPreviewService({
    listLeads: async () => [leads[0]],
    listTargets: async () => [candidate],
    getEntitlement: async () => entitlement(owners.eligible),
    previewIntent: async () => ({
      intentHash: hash(candidate.siteId),
      intent: {
        ownerKey: candidate.ownerKey,
        ownerSiteId: "another-tenant",
        siteId: candidate.siteId,
        ecosystemType: candidate.ecosystemType,
        baseDomain: candidate.baseDomain,
        publicHost: candidate.publicHost,
        sourceHash: hash("source"),
        targetHash: hash("target"),
        masterPackageHash: hash("master")
      }
    }),
    getJob: async () => null
  });
  const result = await service.preview();
  assert.equal(result.summary.candidates, 0);
  assert.equal(result.planMaterial.blocked[0].reason, "TARGET_OWNERSHIP_MISMATCH");
});
