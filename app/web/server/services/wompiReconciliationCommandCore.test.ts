import assert from "node:assert/strict";
import test from "node:test";

import type { ManualPaymentRecord } from "./manualPaymentLedgerCore.ts";
import {
  approveReconciledWompiIntent,
  parseWompiReconciliationCommandArgs,
  runWompiReconciliationCommand,
  WOMPI_RECONCILIATION_ALLOWED_REFERENCES,
  WOMPI_RECONCILIATION_BLOCKED_REFERENCE
} from "./wompiReconciliationCommandCore.ts";
import type { WompiRemoteTransaction } from "./wompiReconciliationCore.ts";
import type { WompiPaymentIntent } from "./wompiSandboxCore.ts";

const reference = WOMPI_RECONCILIATION_ALLOWED_REFERENCES[0];

function intent(overrides: Partial<WompiPaymentIntent> = {}): WompiPaymentIntent {
  return {
    id: "intent-1",
    activationLeadId: "lead-1",
    offerCode: "PRODUCT_ONLY",
    reference,
    amountCop: 180000,
    amountInCents: 18000000,
    currency: "COP",
    status: "PENDING",
    createdAt: "2026-08-17T10:00:00.000Z",
    updatedAt: "2026-08-17T10:00:00.000Z",
    processedEventChecksums: [],
    ...overrides
  };
}

function transaction(overrides: Partial<WompiRemoteTransaction> = {}): WompiRemoteTransaction {
  return {
    id: "transaction-1",
    reference,
    status: "APPROVED",
    amount_in_cents: 18000000,
    currency: "COP",
    finalized_at: "2026-08-17T10:05:00.000Z",
    ...overrides
  };
}

function payment(): ManualPaymentRecord {
  return {
    id: "payment-1",
    activationLeadId: "lead-1",
    siteId: null,
    category: "ACTIVATION",
    amountCop: 180000,
    method: "WOMPI",
    paidAt: "2026-08-17T10:05:00.000Z",
    reference,
    idempotencyKey: "wompi:transaction-1",
    status: "CONFIRMED",
    createdAt: "2026-08-17T10:06:00.000Z",
    updatedAt: "2026-08-17T10:06:00.000Z"
  };
}

function dependencies(options: {
  remote?: WompiRemoteTransaction[];
  payments?: ManualPaymentRecord[];
  queryError?: Error;
} = {}) {
  let applies = 0;
  return {
    get applies() { return applies; },
    value: {
      loadIntent: async () => intent(),
      queryTransactions: async () => {
        if (options.queryError) throw options.queryError;
        return options.remote ?? [transaction()];
      },
      loadPayments: async () => options.payments ?? [],
      apply: async () => { applies += 1; }
    }
  };
}

test("DRY_RUN is the default and validates APPROVED without mutation", async () => {
  const deps = dependencies();
  const result = await runWompiReconciliationCommand({ reference }, deps.value);
  assert.equal(result.mode, "DRY_RUN");
  assert.equal(result.validation, "VALID");
  assert.equal(result.action, "CREATE_PAYMENT_AND_APPROVE_INTENT");
  assert.equal(result.transactionId, "transaction-1");
  assert.equal(deps.applies, 0);
});

test("DRY_RUN reports a missing transaction without mutation", async () => {
  const deps = dependencies({ remote: [] });
  const result = await runWompiReconciliationCommand({ reference }, deps.value);
  assert.equal(result.validation, "TRANSACTION_NOT_FOUND");
  assert.equal(result.action, "NONE");
  assert.equal(deps.applies, 0);
});

test("DRY_RUN rejects an incorrect remote amount", async () => {
  const deps = dependencies({ remote: [transaction({ amount_in_cents: 1 })] });
  const result = await runWompiReconciliationCommand({ reference }, deps.value);
  assert.equal(result.validation, "REJECTED");
  assert.equal(result.action, "NONE");
  assert.equal(deps.applies, 0);
});

test("APPLY is blocked unless explicitly confirmed", async () => {
  const deps = dependencies();
  await assert.rejects(
    runWompiReconciliationCommand({ reference, mode: "APPLY" }, deps.value),
    /explicit --apply/
  );
  assert.equal(deps.applies, 0);
  assert.equal(parseWompiReconciliationCommandArgs(["--reference", reference]).mode, "DRY_RUN");
});

test("APPLY rejects every non-APPROVED remote status", async () => {
  for (const status of ["PENDING", "DECLINED", "VOIDED", "EXPIRED", "ERROR"]) {
    const deps = dependencies({ remote: [transaction({ status })] });
    const result = await runWompiReconciliationCommand(
      { reference, mode: "APPLY", applyConfirmed: true },
      deps.value
    );
    assert.equal(result.validation, "REJECTED");
    assert.equal(deps.applies, 0);
  }
});

test("APPLY reuses an existing payment idempotently", async () => {
  const deps = dependencies({ payments: [payment()] });
  const result = await runWompiReconciliationCommand(
    { reference, mode: "APPLY", applyConfirmed: true },
    deps.value
  );
  assert.equal(result.action, "REUSE_PAYMENT_AND_APPROVE_INTENT");
  assert.equal(deps.applies, 1);
});

test("the known reference without a transaction is blocked before lookup", async () => {
  const deps = dependencies();
  await assert.rejects(
    runWompiReconciliationCommand({ reference: WOMPI_RECONCILIATION_BLOCKED_REFERENCE }, deps.value),
    /explicitly blocked/
  );
  assert.equal(deps.applies, 0);
});

test("credential or Wompi lookup errors fail closed", async () => {
  const deps = dependencies({ queryError: new Error("Wompi Sandbox credentials are incomplete.") });
  await assert.rejects(
    runWompiReconciliationCommand({ reference }, deps.value),
    /credentials are incomplete/
  );
  assert.equal(deps.applies, 0);
});

test("the reconciled intent is marked APPROVED and paymentRecorded", () => {
  const result = approveReconciledWompiIntent(
    intent(),
    "transaction-1",
    "2026-08-17T10:10:00.000Z"
  );
  assert.equal(result.status, "APPROVED");
  assert.equal(result.transactionId, "transaction-1");
  assert.equal(result.paymentRecorded, true);
  assert.equal(result.updatedAt, "2026-08-17T10:10:00.000Z");
  assert.throws(() => approveReconciledWompiIntent(intent(), " ", result.updatedAt), /transactionId/);
});
