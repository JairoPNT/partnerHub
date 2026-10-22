import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { compiled } from "./businessCutoverReleaseVerification.test-fixtures.ts";
import { builder } from "../../scripts/build-business-cutover-writer-inventory.test-fixtures.mjs";

test("uncompiled_profile_is_unavailable_not_caller_approval", async () => {
  const p = await import("./businessCutoverReleaseProfile.ts");
  assert.deepEqual(p.readBusinessCutoverReleaseProfile(), { status: "UNAVAILABLE" });
  await assert.rejects(p.inspectBusinessCutoverReleaseProfile(), /BUSINESS_CUTOVER_ARTIFACTS_UNAVAILABLE/);
});
test("own_inventory_integrity_is_not_external_image_provenance", async (t) => {
  const c = await compiled(t);
  // Fixture executables deliberately aren't reviewed/cooperative writers. A
  // self-inventory can only report local integrity; no provenance approval,
  // stored VERIFIED state, or BEGIN authority is produced by this reader.
  const facts = await c.m.inspectBusinessCutoverReleaseProfile();
  assert.deepEqual(Object.keys(facts).sort(), ["inventorySha256", "releaseId"]);
  assert.equal(facts.releaseId, "business-consent-predecessor-v1");
  assert.match(facts.inventorySha256, /^[0-9a-f]{64}$/);
});
test("edited_self_inventory_does_not_override_compiled_digest", async (t) => {
  const c = await compiled(t), file = resolve(c.root, "runtime-assets/business-cutover-writer-inventory.json");
  await writeFile(file, Buffer.concat([await readFile(file), Buffer.from("\n")]));
  await assert.rejects(c.m.inspectBusinessCutoverReleaseProfile(), /BUSINESS_CUTOVER_PROFILE_INVALID/);
});
test("compiled_malformed_descriptor_is_fatal_not_unavailable", async (t) => {
  const c = await compiled(t, false, { version: 1, releaseId: "business-consent-successor-v1", inventorySha256: "fake", approved: true });
  assert.throws(c.m.readBusinessCutoverReleaseProfile, /BUSINESS_CUTOVER_PROFILE_INVALID/);
  await assert.rejects(c.m.inspectBusinessCutoverReleaseProfile(), /BUSINESS_CUTOVER_PROFILE_INVALID/);
});
test("compiled_digest_cannot_be_a_coercible_array", async (t) => {
  const c = await compiled(t, false, { version: 1, releaseId: "business-consent-predecessor-v1", inventorySha256: ["a".repeat(64)] });
  assert.throws(c.m.readBusinessCutoverReleaseProfile, /BUSINESS_CUTOVER_PROFILE_INVALID/);
});
test("inventory_parser_rejects_traversal_duplicates_unknown_fields_and_exclusions", async (t) => {
  const c = await compiled(t), b = await builder(c.root);
  const row = { path: "server.js", sha256: "a".repeat(64), size: 1 };
  for (const files of [[{ ...row, path: "../escape" }], [{ ...row, path: "/app/server.js" }],
    [{ ...row, path: "scripts\\escape.js" }], [row, row], [{ ...row, approved: true }], [{ ...row, sha256: [row.sha256] }],
    [{ ...row, path: "scripts/business-consent-cutover.mjs" }]]) {
    assert.throws(() => b.validateBusinessCutoverWriterInventory({ version: 1, releaseId: "business-consent-predecessor-v1", files }), /BUSINESS_CUTOVER_PROFILE_INVALID/);
  }
});
