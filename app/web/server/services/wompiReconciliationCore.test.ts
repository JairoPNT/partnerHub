import assert from "node:assert/strict";
import test from "node:test";

import type { ManualPaymentRecord } from "./manualPaymentLedgerCore.ts";
import { reconcileWompiIntent, WOMPI_NO_TRANSACTION_REFERENCE } from "./wompiReconciliationCore.ts";
import type { WompiPaymentIntent } from "./wompiSandboxCore.ts";

function intent(reference = "PH-approved"): WompiPaymentIntent {
  return {
    id: "intent-1", activationLeadId: "lead-1", offerCode: "PRODUCT_ONLY", reference,
    amountCop: 350000, amountInCents: 35000000, currency: "COP", status: "PENDING",
    createdAt: "2026-08-17T20:00:00.000Z", updatedAt: "2026-08-17T20:00:00.000Z",
    processedEventChecksums: []
  };
}

const transaction = {
  id: "tx-approved", reference: "PH-approved", status: "APPROVED",
  amount_in_cents: 35000000, currency: "COP", finalized_at: "2026-08-17T20:05:00.000Z"
};

test("DRY_RUN validates an approved transaction without settling", async () => {
  let settlements = 0;
  const result = await reconcileWompiIntent({
    intent: intent(), transactions: [transaction], payments: [],
    settle: async () => { settlements += 1; return { idempotent: false }; }
  });
  assert.deepEqual(result, { outcome: "VALIDATED_DRY_RUN", mode: "DRY_RUN", transactionId: "tx-approved" });
  assert.equal(settlements, 0);
});

test("rejects incorrect amount and currency before settlement", async () => {
  const settle = async () => ({ idempotent: false });
  await assert.rejects(() => reconcileWompiIntent({
    intent: intent(), transactions: [{ ...transaction, amount_in_cents: 1 }], payments: [], settle
  }), /amount mismatch/);
  await assert.rejects(() => reconcileWompiIntent({
    intent: intent(), transactions: [{ ...transaction, currency: "USD" }], payments: [], settle
  }), /currency mismatch/);
});

test("does not settle non-approved transactions", async () => {
  let settlements = 0;
  const result = await reconcileWompiIntent({
    intent: intent(), transactions: [{ ...transaction, status: "DECLINED" }], payments: [], mode: "APPLY",
    settle: async () => { settlements += 1; return { idempotent: false }; }
  });
  assert.equal(result.outcome, "TRANSACTION_NOT_APPROVED");
  assert.equal(settlements, 0);
});

test("protects the known reference without a transaction", async () => {
  const result = await reconcileWompiIntent({
    intent: intent(WOMPI_NO_TRANSACTION_REFERENCE), transactions: [], payments: [],
    settle: async () => { throw new Error("must not settle"); }
  });
  assert.equal(result.outcome, "PROTECTED_NO_TRANSACTION_REFERENCE");
});

test("an existing WOMPI payment makes reconciliation idempotent by reference", async () => {
  const payment = {
    id: "payment-1", activationLeadId: "lead-1", siteId: null, category: "ACTIVATION",
    amountCop: 350000, method: "WOMPI", paidAt: "2026-08-17T20:05:00.000Z",
    reference: "PH-approved", idempotencyKey: "wompi:old-tx", status: "CONFIRMED",
    createdAt: "2026-08-17T20:06:00.000Z", updatedAt: "2026-08-17T20:06:00.000Z"
  } satisfies ManualPaymentRecord;
  let settlements = 0;
  const result = await reconcileWompiIntent({
    intent: intent(), transactions: [transaction], payments: [payment], mode: "APPLY",
    settle: async () => { settlements += 1; return { idempotent: true }; }
  });
  assert.equal(result.outcome, "ALREADY_RECORDED");
  assert.equal(settlements, 1);
});
