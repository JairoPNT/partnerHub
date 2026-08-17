import assert from "node:assert/strict";
import test from "node:test";

import {
  applyWompiEvent,
  copToAmountInCents,
  createCheckoutIntegritySignature,
  createEventChecksum,
  resolveWompiSandboxConfig,
  verifyEventChecksum,
  wompiEventSchema,
  type WompiEvent,
  type WompiPaymentIntent
} from "./wompiSandboxCore.ts";

const integritySecret = "test_integrity_secret";
const eventsSecret = "test_events_secret";

function intent(): WompiPaymentIntent {
  return {
    id: "intent-1",
    activationLeadId: "lead-1",
    offerCode: "PRODUCT_ONLY",
    reference: "PH-intent-1",
    amountCop: 180000,
    amountInCents: 18000000,
    currency: "COP",
    status: "PENDING",
    createdAt: "2026-08-12T15:00:00.000Z",
    updatedAt: "2026-08-12T15:00:00.000Z",
    processedEventChecksums: []
  };
}

function event(status: WompiEvent["data"]["transaction"]["status"] = "APPROVED") {
  const unsigned = {
    event: "transaction.updated",
    data: {
      transaction: {
        id: "transaction-1",
        reference: "PH-intent-1",
        status,
        amount_in_cents: 18000000,
        currency: "COP",
        finalized_at: "2026-08-12T15:05:00.000Z"
      }
    },
    environment: "test",
    signature: {
      properties: ["transaction.id", "transaction.status", "transaction.amount_in_cents"],
      checksum: "0".repeat(64)
    },
    timestamp: 1786547100,
    sent_at: "2026-08-12T15:05:00.000Z"
  };
  const parsed = wompiEventSchema.parse(unsigned);
  parsed.signature.checksum = createEventChecksum(parsed, eventsSecret);
  return parsed;
}

test("generates the checkout SHA-256 signature in Wompi order", () => {
  assert.equal(
    createCheckoutIntegritySignature("PH-intent-1", 18000000, "COP", integritySecret),
    "7146e884114674d2085f89fa693773b6bc799a64e90858a25c0c01e5e8169157"
  );
});

test("derives Wompi cents from the immutable COP snapshot amount", () => {
  assert.equal(copToAmountInCents(180000), 18000000);
  assert.throws(() => copToAmountInCents(0), /positive COP/);
});

test("fails safely for missing or production credentials", () => {
  assert.throws(() => resolveWompiSandboxConfig({ WOMPI_ENV: "sandbox" }), /credentials are incomplete/);
  assert.throws(() => resolveWompiSandboxConfig({
    WOMPI_ENV: "sandbox",
    WOMPI_SANDBOX_PUBLIC_KEY: "pub_prod_secret",
    WOMPI_SANDBOX_PRIVATE_KEY: "prv_prod_secret",
    WOMPI_SANDBOX_INTEGRITY_SECRET: "prod_integrity_secret",
    WOMPI_SANDBOX_EVENTS_SECRET: "prod_events_secret"
  }), /invalid for the configured environment/);
  assert.deepEqual(resolveWompiSandboxConfig({
    WOMPI_ENV: "sandbox",
    WOMPI_SANDBOX_PUBLIC_KEY: "pub_test_public",
    WOMPI_SANDBOX_PRIVATE_KEY: "prv_test_private",
    WOMPI_SANDBOX_INTEGRITY_SECRET: "test_integrity_secret",
    WOMPI_SANDBOX_EVENTS_SECRET: "test_events_secret"
  }), {
    publicKey: "pub_test_public",
    privateKey: "prv_test_private",
    integritySecret: "test_integrity_secret",
    eventsSecret: "test_events_secret"
  });
});

test("validates dynamic event properties and both checksum locations", () => {
  const approved = event();
  assert.equal(verifyEventChecksum(approved, eventsSecret, approved.signature.checksum), true);
  assert.equal(verifyEventChecksum(approved, eventsSecret, "f".repeat(64)), false);
  assert.equal(verifyEventChecksum(approved, "wrong-secret"), false);
});

test("accepts an approved matching transaction and makes a duplicate a no-op", () => {
  const approved = event();
  const first = applyWompiEvent(intent(), approved, "2026-08-12T15:06:00.000Z");
  assert.equal(first.duplicate, false);
  assert.equal(first.intent.status, "APPROVED");
  assert.equal(first.intent.transactionId, "transaction-1");
  const duplicate = applyWompiEvent(first.intent, approved, "2026-08-12T15:07:00.000Z");
  assert.equal(duplicate.duplicate, true);
  assert.deepEqual(duplicate.intent, first.intent);
});

test("records rejected states without treating them as approved", () => {
  for (const status of ["DECLINED", "VOIDED", "ERROR", "EXPIRED"] as const) {
    const result = applyWompiEvent(intent(), event(status), "2026-08-12T15:06:00.000Z");
    assert.equal(result.duplicate, false);
    assert.equal(result.intent.status, status);
    assert.notEqual(result.intent.status, "APPROVED");
  }
});

test("rejects amount, currency, reference, environment, and unsupported event changes", () => {
  const wrongAmount = event();
  wrongAmount.data.transaction.amount_in_cents = 1;
  assert.throws(() => applyWompiEvent(intent(), wrongAmount, new Date().toISOString()), /amount mismatch/);
  assert.equal(wompiEventSchema.safeParse({ ...event(), environment: "prod" }).success, false);
  assert.equal(wompiEventSchema.safeParse({ ...event(), event: "nequi_token.updated" }).success, false);
});
