import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { APPLY_CONFIRMATION, APPLY_MODE, cleanupComplimentaryGrant, planComplimentaryGrantCleanup } from "./complimentary-grant-cleanup.mjs";

const leadId = "22f9392f-69c2-4b80-861c-baa3cb10c5c1";
const removeGrantId = "7643baa459e83b782b9bf326206d9e9d2b4ebff4b872566305b4b0f40846a55d";
const keepGrantId = "83fa2c062bd49c5f53ddab957fe9b6e92b1649ef3986d8fc08f93ff93530ada7";
const manifest = { confirmation: APPLY_CONFIRMATION, activationLeadId: leadId, removeGrantId, keepGrantId, effectiveDate: "2026-08-20", expectedEntitlement: ["PRODUCT", "BUSINESS", "PERSONAL_BRAND"] };

function records() {
  return [
    { id: keepGrantId, activationLeadId: leadId, ecosystemTypes: ["PRODUCT", "BUSINESS", "PERSONAL_BRAND"], grantReason: "Founder user", effectiveDate: "2026-07-31", cutoffDate: null, createdAt: "2026-08-19T01:00:00.000Z" },
    { id: removeGrantId, activationLeadId: leadId, ecosystemTypes: ["PRODUCT", "BUSINESS", "PERSONAL_BRAND"], grantReason: "Beta Test", effectiveDate: "2026-08-19", cutoffDate: null, createdAt: "2026-08-19T02:00:00.000Z" },
    { id: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", activationLeadId: "other", ecosystemTypes: ["PRODUCT"], grantReason: "Protected", effectiveDate: "2026-08-19", cutoffDate: null, createdAt: "2026-08-19T03:00:00.000Z" }
  ];
}

async function fixture() {
  const directory = await mkdtemp(resolve(tmpdir(), "partnerhub-grant-cleanup-"));
  await writeFile(resolve(directory, "complimentary-ecosystem-grants.json"), `${JSON.stringify(records(), null, 2)}\n`);
  return directory;
}

test("plan selects only the explicit duplicate and preserves all expected ecosystems", () => {
  const plan = planComplimentaryGrantCleanup({ records: records(), manifest });
  assert.equal(plan.blocked, false);
  assert.equal(plan.remove.id, removeGrantId);
  assert.equal(plan.keep.id, keepGrantId);
  assert.deepEqual(plan.projectedEntitlement, ["PRODUCT", "BUSINESS", "PERSONAL_BRAND"]);
  assert.equal(plan.protectedGrantCount, 2);
});

test("DRY_RUN writes a complete backup without changing the ledger", async () => {
  const directory = await fixture();
  const before = await readFile(resolve(directory, "complimentary-ecosystem-grants.json"), "utf8");
  const result = await cleanupComplimentaryGrant({ storageDirectory: directory, manifest, now: new Date("2026-08-20T06:00:00.000Z") });
  assert.equal(result.changed, false);
  assert.equal(await readFile(resolve(directory, "complimentary-ecosystem-grants.json"), "utf8"), before);
  assert.equal(await readFile(resolve(result.backupDirectory, "complimentary-ecosystem-grants.json"), "utf8"), before);
});

test("missing keep grant or entitlement regression blocks APPLY", async () => {
  const missingKeep = { ...manifest, keepGrantId: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" };
  const plan = planComplimentaryGrantCleanup({ records: records(), manifest: missingKeep });
  assert.equal(plan.blocked, true);
  assert.ok(plan.blockedReasons.includes("KEEP_GRANT_NOT_FOUND"));
  const directory = await fixture();
  const dryRun = await cleanupComplimentaryGrant({ storageDirectory: directory, manifest: missingKeep });
  await assert.rejects(cleanupComplimentaryGrant({ storageDirectory: directory, manifest: missingKeep, mode: APPLY_MODE, confirmation: APPLY_CONFIRMATION, expectedLedgerHash: dryRun.ledgerHash }), /APPLY blocked/);
});

test("APPLY requires confirmation and the reviewed ledger hash", async () => {
  const directory = await fixture();
  const dryRun = await cleanupComplimentaryGrant({ storageDirectory: directory, manifest });
  await assert.rejects(cleanupComplimentaryGrant({ storageDirectory: directory, manifest, mode: APPLY_MODE, expectedLedgerHash: dryRun.ledgerHash }), /requires/);
  await assert.rejects(cleanupComplimentaryGrant({ storageDirectory: directory, manifest, mode: APPLY_MODE, confirmation: APPLY_CONFIRMATION, expectedLedgerHash: "wrong" }), /hash does not match/);
});
