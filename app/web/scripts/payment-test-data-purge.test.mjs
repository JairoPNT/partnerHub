import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { APPLY_CONFIRMATION, APPLY_MODE, planPaymentTestDataPurge, purgePaymentTestData } from "./payment-test-data-purge.mjs";

const ids = ["d5748ad7-181c-4f1a-a62e-2d09696a0331", "43ea2f4a-1f2c-496c-85f9-9072ef471c54"];
const protectedId = "1e2bd92a-340e-4d34-a62c-f33c2cd0d87e";
const manifest = { confirmation: APPLY_CONFIRMATION, paymentIds: ids };

function records() {
  return [
    { id: ids[0], activationLeadId: "lead-test", siteId: "partner-test", amountCop: 350000, paidAt: "2026-08-17T12:00:00.000Z", status: "CONFIRMED", method: "WOMPI", reference: "PH-test", commercialSnapshot: { version: 1 } },
    { id: ids[1], activationLeadId: "lead-test", siteId: null, amountCop: 1000, paidAt: "2026-08-18T12:00:00.000Z", status: "VOIDED", method: "BANCOLOMBIA" },
    { id: protectedId, activationLeadId: "lead-real", siteId: "partner-real", amountCop: 180000, paidAt: "2026-08-19T12:00:00.000Z", status: "CONFIRMED", method: "NEQUI", reference: "REAL", commercialSnapshot: { version: 1 } }
  ];
}

async function fixture() {
  const directory = await mkdtemp(resolve(tmpdir(), "partnerhub-payment-purge-"));
  await writeFile(resolve(directory, "payments.json"), `${JSON.stringify(records(), null, 2)}\n`);
  return directory;
}

test("plan reports the exact operator allowlist and financial impact", () => {
  const plan = planPaymentTestDataPurge({ payments: records(), manifest });
  assert.equal(plan.selectedCount, 2);
  assert.equal(plan.confirmedAmountCop, 350000);
  assert.equal(plan.commercialSnapshotCount, 1);
  assert.equal(plan.protectedPaymentCount, 1);
  assert.deepEqual(plan.inventory.map((payment) => payment.id), ids);
});

test("DRY_RUN writes a full backup and does not change the ledger", async () => {
  const directory = await fixture();
  const before = await readFile(resolve(directory, "payments.json"), "utf8");
  const result = await purgePaymentTestData({ storageDirectory: directory, manifest, now: new Date("2026-08-19T12:00:00.000Z") });
  assert.equal(result.changed, false);
  assert.equal(await readFile(resolve(directory, "payments.json"), "utf8"), before);
  assert.equal(await readFile(resolve(result.backupDirectory, "payments.json"), "utf8"), before);
});

test("missing, invalid, and duplicate IDs block unsafe selection", async () => {
  const directory = await fixture();
  const missingManifest = { confirmation: APPLY_CONFIRMATION, paymentIds: ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"] };
  const dryRun = await purgePaymentTestData({ storageDirectory: directory, manifest: missingManifest });
  assert.equal(dryRun.blocked, true);
  await assert.rejects(
    purgePaymentTestData({ storageDirectory: directory, manifest: missingManifest, mode: APPLY_MODE, confirmation: APPLY_CONFIRMATION, expectedLedgerHash: dryRun.ledgerHash }),
    /missing payment IDs/
  );
  assert.throws(() => planPaymentTestDataPurge({ payments: records(), manifest: { confirmation: APPLY_CONFIRMATION, paymentIds: [ids[0], ids[0]] } }), /duplicates/);
});

test("APPLY requires confirmation and the reviewed ledger hash", async () => {
  const directory = await fixture();
  const dryRun = await purgePaymentTestData({ storageDirectory: directory, manifest });
  await assert.rejects(purgePaymentTestData({ storageDirectory: directory, manifest, mode: APPLY_MODE, expectedLedgerHash: dryRun.ledgerHash }), /requires/);
  await writeFile(resolve(directory, "payments.json"), `${JSON.stringify([...records(), { ...records()[0], id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }], null, 2)}\n`);
  await assert.rejects(
    purgePaymentTestData({ storageDirectory: directory, manifest, mode: APPLY_MODE, confirmation: APPLY_CONFIRMATION, expectedLedgerHash: dryRun.ledgerHash }),
    /hash does not match/
  );
});

test("APPLY removes only selected payments and embedded snapshots", async () => {
  const directory = await fixture();
  const dryRun = await purgePaymentTestData({ storageDirectory: directory, manifest });
  const result = await purgePaymentTestData({ storageDirectory: directory, manifest, mode: APPLY_MODE, confirmation: APPLY_CONFIRMATION, expectedLedgerHash: dryRun.ledgerHash });
  const persisted = JSON.parse(await readFile(resolve(directory, "payments.json"), "utf8"));
  assert.equal(result.changed, true);
  assert.deepEqual(persisted.map((payment) => payment.id), [protectedId]);
  assert.deepEqual(result.verification, {
    remainingSelectedPayments: 0,
    remainingSelectedCommercialSnapshots: 0,
    remainingSelectedConfirmedAmountCop: 0,
    metricsDerivedFromSelectedPayments: false
  });
});
