import assert from "node:assert/strict";
import test from "node:test";
import {
  masterSitesBusinessPrepareTargetRequestSchema, masterSitesBusinessPublishRequestSchema,
  masterSitesBusinessReadResponseSchema, masterSitesBusinessCommandResultSchema, masterSitesErrorResponseSchema
} from "./master-sites-business-contract.ts";

const prepare = {
  requestId: "b284fa45-226f-4684-a823-86f46e81563f",
  activationLeadId: "cf34c7d2-0000-4000-8000-123456789abc",
  templateId: "ganomaster-business", expectedRevision: "a".repeat(64),
  confirmation: "PREPARE_SELECTED_BUSINESS_TARGET"
};
const publish = { ...prepare, confirmation: "PUBLISH_SELECTED_BUSINESS_TEMPLATE" };
const safeJob = { id: "d".repeat(64), status: "QUEUED", phase: "QUEUED", attemptCount: 0, updatedAt: "2026-10-20T00:00:00.000Z" };
const response = {
  template: { id: "ganomaster-business", ecosystemType: "BUSINESS", available: true, revision: "b".repeat(64), previewUrl: null, blockedReasons: [] },
  partners: [{ activationLeadId: prepare.activationLeadId, displayName: "Partner", siteId: null, publicHost: null,
    status: "TARGET_REQUIRED", blockedReasons: [], reviewRevision: "c".repeat(64), canPrepareTarget: true, canPublish: false, currentJob: null }]
};

test("accepts single-partner commands and defaults publish to no existing update", () => {
  assert.equal(masterSitesBusinessPrepareTargetRequestSchema.parse(prepare).activationLeadId, prepare.activationLeadId);
  assert.equal(masterSitesBusinessPublishRequestSchema.parse(publish).updateExisting, false);
  assert.equal(masterSitesBusinessPublishRequestSchema.parse({ ...publish, updateExisting: true }).updateExisting, true);
});

// Dropping strict() or permitting client routing/identity would let these reach mutation.
test("rejects non-BUSINESS templates, routing/WhatsApp identity extras and partner lists", () => {
  for (const schema of [masterSitesBusinessPrepareTargetRequestSchema, masterSitesBusinessPublishRequestSchema]) {
    const base = schema === masterSitesBusinessPrepareTargetRequestSchema ? prepare : publish;
    for (const override of [
      { templateId: "ganomaster-product" }, { ecosystemType: "PRODUCT" }, { ecosystemType: "BUSINESS" },
      { remoteRoot: "/sites/other" }, { publicHost: "other.test" }, { siteId: "other" },
      { whatsapp: "123456" }, { whatsappNumber: "123456" }, { email: "admin@example.test" },
      { ownerKey: prepare.activationLeadId }, { role: "admin" }, { partners: [prepare.activationLeadId] },
      { activationLeadIds: [prepare.activationLeadId] }, { requestId: "bad" }, { activationLeadId: [prepare.activationLeadId] },
      { expectedRevision: "not-a-review" }, { confirmation: "PUBLISH_ALL" }
    ]) assert.equal(schema.safeParse({ ...base, ...override }).success, false, JSON.stringify(override));
    assert.equal(schema.safeParse([base]).success, false);
  }
  assert.equal(masterSitesBusinessPrepareTargetRequestSchema.safeParse({ ...prepare, updateExisting: true }).success, false);
  assert.equal(masterSitesBusinessPublishRequestSchema.safeParse({ ...publish, updateExisting: "true" }).success, false);
});

test("validates safe read/result DTOs including absent source and pending target", () => {
  assert.equal(masterSitesBusinessReadResponseSchema.parse(response).partners[0].siteId, null);
  assert.equal(masterSitesBusinessReadResponseSchema.parse({ ...response, partners: [] }).partners.length, 0);
  const result = { operationId: prepare.requestId, activationLeadId: prepare.activationLeadId, siteId: null,
    publicHost: null, outcome: "TARGET_PENDING", job: safeJob, blockedReasons: [] };
  assert.equal(masterSitesBusinessCommandResultSchema.parse(result).outcome, "TARGET_PENDING");
  for (const secret of ["lease", "token", "identityHash", "remoteRoot"]) {
    assert.equal(masterSitesBusinessCommandResultSchema.safeParse({ ...result, job: { ...safeJob, [secret]: "private" } }).success, false);
  }
  assert.equal(masterSitesBusinessReadResponseSchema.safeParse({ ...response, template: { ...response.template, ecosystemType: "PRODUCT" } }).success, false);
  assert.equal(masterSitesBusinessCommandResultSchema.safeParse({ ...result, outcome: "PUBLISHED" }).success, false);
  assert.equal(masterSitesErrorResponseSchema.safeParse({ error: "SAFE_FAILURE", blockedReasons: ["TARGET_REQUIRED"] }).success, true);
  assert.equal(masterSitesErrorResponseSchema.safeParse({ error: "Failed at /secret/path", stack: "private" }).success, false);
});

test("accepts same-origin preview paths without requiring an absolute URL", () => {
  assert.equal(masterSitesBusinessReadResponseSchema.safeParse({
    ...response, template: { ...response.template, previewUrl: "/api/internal/product-pages/master/preview?ecosystemType=BUSINESS" }
  }).success, true);
});
