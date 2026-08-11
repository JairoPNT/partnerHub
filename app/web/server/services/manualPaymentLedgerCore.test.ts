import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import {
  createPaymentRecord,
  findIdempotentPayment,
  listPaymentRecords,
  manualPaymentCreateSchema,
  paymentListFilterSchema,
  voidPaymentRecord,
  type ManualPaymentRecord
} from "./manualPaymentLedgerCore.ts";

const baseInput = {
  activationLeadId: "lead-test-1",
  siteId: "partner-test",
  category: "ACTIVATION" as const,
  amountCop: 125000,
  method: "BANCOLOMBIA" as const,
  paidAt: "2026-08-11T02:30:00.000Z",
  reference: "REF-001",
  notes: "Test payment"
};

function payment(overrides: Partial<ManualPaymentRecord> = {}): ManualPaymentRecord {
  return createPaymentRecord(baseInput, {
    id: overrides.id ?? "payment-1",
    now: "2026-08-11T12:00:00.000Z",
    siteId: "partner-test"
  });
}

test("validates positive whole COP amounts, enums, and ISO paidAt", () => {
  assert.equal(manualPaymentCreateSchema.safeParse(baseInput).success, true);
  assert.equal(manualPaymentCreateSchema.safeParse({ ...baseInput, amountCop: 0 }).success, false);
  assert.equal(manualPaymentCreateSchema.safeParse({ ...baseInput, amountCop: 10.5 }).success, false);
  assert.equal(manualPaymentCreateSchema.safeParse({ ...baseInput, category: "BAD" }).success, false);
  assert.equal(manualPaymentCreateSchema.safeParse({ ...baseInput, paidAt: "not-a-date" }).success, false);
});

test("persists a normalized record in an isolated temporary directory", async () => {
  const directory = await mkdtemp(resolve(tmpdir(), "partnerhub-payments-"));
  const path = resolve(directory, "payments.json");
  try {
    const record = payment();
    await writeFile(path, `${JSON.stringify([record])}\n`, "utf8");
    const persisted = JSON.parse(await readFile(path, "utf8")) as ManualPaymentRecord[];
    assert.equal(persisted[0].id, "payment-1");
    assert.equal(persisted[0].status, "CONFIRMED");
    assert.equal(persisted[0].paidAt, "2026-08-11T02:30:00.000Z");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("returns the existing payment for a repeated idempotency key", () => {
  const original = payment({ id: "payment-idempotent" });
  const input = { ...baseInput, idempotencyKey: "same-request" };
  const existing = { ...original, idempotencyKey: "same-request" };
  assert.equal(findIdempotentPayment([existing], input)?.id, "payment-idempotent");
  assert.equal(findIdempotentPayment([original], input), null);
});

test("filters by lead and Bogota calendar dates, and totals only confirmed records", () => {
  const records = [
    payment(),
    payment({ id: "payment-2" }),
    { ...payment({ id: "payment-3" }), status: "VOIDED" as const }
  ];
  const result = listPaymentRecords(records, paymentListFilterSchema.parse({
    activationLeadId: "lead-test-1",
    from: "2026-08-10",
    to: "2026-08-10"
  }));
  assert.equal(result.payments.length, 3);
  assert.equal(result.totalAmountCop, 250000);
  assert.deepEqual(result.totalsByLocalDate, { "2026-08-10": 250000 });
});

test("voiding retains history and excludes the payment from confirmed totals", () => {
  const original = payment();
  const result = voidPaymentRecord([original], original.id, "Duplicate receipt", "2026-08-12T10:00:00.000Z");
  assert.equal(result.payment?.status, "VOIDED");
  assert.equal(result.payment?.voidReason, "Duplicate receipt");
  assert.equal(result.records.length, 1);
  assert.equal(listPaymentRecords(result.records, {}).totalAmountCop, 0);
});

test("repeated voiding is idempotent and does not change the original audit timestamp", () => {
  const original = payment();
  const first = voidPaymentRecord([original], original.id, "Correction", "2026-08-12T10:00:00.000Z");
  const second = voidPaymentRecord(first.records, original.id, "Different reason", "2026-08-13T10:00:00.000Z");
  assert.equal(second.alreadyVoided, true);
  assert.equal(second.payment?.voidReason, "Correction");
  assert.equal(second.payment?.updatedAt, "2026-08-12T10:00:00.000Z");
});

test("rejects inverted or invalid date bounds", () => {
  assert.equal(paymentListFilterSchema.safeParse({ from: "2026-08-12", to: "2026-08-11" }).success, false);
  assert.equal(paymentListFilterSchema.safeParse({ from: "2026-02-30" }).success, false);
});
