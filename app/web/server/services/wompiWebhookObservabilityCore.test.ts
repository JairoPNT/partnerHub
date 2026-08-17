import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyWebhookFailure,
  safeWebhookIdentifiers,
  webhookSuccessObservation
} from "./wompiWebhookObservabilityCore.ts";

test("extracts only safe identifiers from a webhook", () => {
  assert.deepEqual(safeWebhookIdentifiers({
    data: { transaction: { id: "tx-1", reference: "PH-1", customer_email: "private@example.com" } },
    signature: { checksum: "secret" }
  }), { transactionId: "tx-1", reference: "PH-1" });
});

test("classifies invalid signatures and incorrect amounts without leaking messages", () => {
  assert.deepEqual(classifyWebhookFailure(new Error("Invalid Wompi event checksum.")), {
    stage: "SIGNATURE_VALIDATION", reason: "INVALID_SIGNATURE"
  });
  assert.deepEqual(classifyWebhookFailure(new Error("Wompi transaction amount mismatch.")), {
    stage: "TRANSACTION_VALIDATION", reason: "AMOUNT_MISMATCH"
  });
  assert.deepEqual(classifyWebhookFailure(new Error("Wompi payment intent was not found.")), {
    stage: "INTENT_LOOKUP", reason: "REFERENCE_NOT_FOUND"
  });
});

test("marks valid, duplicate, and approved ledger outcomes", () => {
  const base = {
    timestamp: "2026-08-17T23:00:00.000Z",
    reference: "PH-1",
    activationLeadId: "lead-1",
    transactionId: "tx-1"
  };
  assert.equal(webhookSuccessObservation({ ...base, status: "PENDING", duplicate: false }).outcome, "EVENT_ACCEPTED");
  assert.equal(webhookSuccessObservation({ ...base, status: "APPROVED", duplicate: false }).outcome, "LEDGER_PERSISTED");
  assert.equal(webhookSuccessObservation({ ...base, status: "APPROVED", duplicate: true }).outcome, "DUPLICATE");
});
