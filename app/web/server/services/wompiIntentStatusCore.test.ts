import assert from "node:assert/strict";
import test from "node:test";

import type { ManualPaymentRecord } from "./manualPaymentLedgerCore.ts";
import type { WompiIntentStatus, WompiPaymentIntent } from "./wompiSandboxCore.ts";
import {
  lookupWompiIntentStatus,
  wompiIntentStatusQuerySchema
} from "./wompiIntentStatusCore.ts";

const intentId = "b1671e5c-93e3-483f-905b-68ad1fcf46f8";
const activationLeadId = "a4b18faa-35c0-4163-bc02-b2f6fe030a44";

function intent(status: WompiIntentStatus = "PENDING"): WompiPaymentIntent {
  return {
    id: intentId,
    activationLeadId,
    offerCode: "PRODUCT_ONLY",
    reference: `PH-${intentId}`,
    amountCop: 180000,
    amountInCents: 18000000,
    currency: "COP",
    status,
    createdAt: "2026-08-17T12:00:00.000Z",
    updatedAt: "2026-08-17T12:00:00.000Z",
    transactionId: status === "APPROVED" ? "wompi-transaction-secret" : undefined,
    processedEventChecksums: ["a".repeat(64)]
  };
}

function payment(overrides: Partial<ManualPaymentRecord> = {}): ManualPaymentRecord {
  return {
    id: "payment-1",
    activationLeadId,
    siteId: null,
    category: "ACTIVATION",
    amountCop: 180000,
    method: "WOMPI",
    paidAt: "2026-08-17T12:05:00.000Z",
    reference: `PH-${intentId}`,
    idempotencyKey: "wompi:transaction-1",
    status: "CONFIRMED",
    createdAt: "2026-08-17T12:05:00.000Z",
    updatedAt: "2026-08-17T12:05:00.000Z",
    ...overrides
  };
}

test("returns null uniformly for an unknown or mismatched intent", () => {
  assert.equal(lookupWompiIntentStatus([intent()], [], {
    activationLeadId,
    intentId: "9e23e358-0147-46b2-b712-c41b95c33b25"
  }), null);
  assert.equal(lookupWompiIntentStatus([intent()], [], {
    activationLeadId: "different-lead-id",
    reference: `PH-${intentId}`
  }), null);
});

test("queries a persisted pending intent by reference and exposes only safe fields", () => {
  const result = lookupWompiIntentStatus([intent()], [], {
    activationLeadId,
    reference: `PH-${intentId}`
  });
  assert.deepEqual(result, {
    intentId,
    reference: `PH-${intentId}`,
    status: "PENDING",
    amountInCents: 18000000,
    currency: "COP",
    activationLeadId,
    paymentRecorded: false
  });
  assert.equal("transactionId" in result!, false);
  assert.equal("processedEventChecksums" in result!, false);
});

test("reports an approved webhook payment only for a matching confirmed WOMPI ledger record", () => {
  const approved = intent("APPROVED");
  assert.equal(lookupWompiIntentStatus([approved], [payment()], { activationLeadId, intentId })?.paymentRecorded, true);
  assert.equal(lookupWompiIntentStatus([approved], [payment({ method: "NEQUI" })], { activationLeadId, intentId })?.paymentRecorded, false);
  assert.equal(lookupWompiIntentStatus([approved], [payment({ status: "VOIDED" })], { activationLeadId, intentId })?.paymentRecorded, false);
});

test("keeps all persisted Wompi terminal states compatible", () => {
  for (const status of ["PENDING", "APPROVED", "DECLINED", "ERROR", "EXPIRED", "VOIDED"] as const) {
    assert.equal(lookupWompiIntentStatus([intent(status)], [], { activationLeadId, intentId })?.status, status);
  }
});

test("repeated reads are idempotent and do not mutate persisted inputs", () => {
  const intents = [intent("APPROVED")];
  const payments = [payment()];
  const before = JSON.stringify({ intents, payments });
  const first = lookupWompiIntentStatus(intents, payments, { activationLeadId, intentId });
  const second = lookupWompiIntentStatus(intents, payments, { activationLeadId, intentId });
  assert.deepEqual(second, first);
  assert.equal(JSON.stringify({ intents, payments }), before);
});

test("requires activationLeadId and exactly one lookup identifier", () => {
  assert.equal(wompiIntentStatusQuerySchema.safeParse({ intentId }).success, false);
  assert.equal(wompiIntentStatusQuerySchema.safeParse({ activationLeadId }).success, false);
  assert.equal(wompiIntentStatusQuerySchema.safeParse({ activationLeadId, intentId, reference: `PH-${intentId}` }).success, false);
});
