import assert from "node:assert/strict";
import test from "node:test";

import {
  activeComplimentaryGrantEcosystems,
  complimentaryGrantInputSchema,
  createComplimentaryGrant,
  type ComplimentaryEcosystemGrant
} from "./complimentaryEcosystemGrantCore.ts";

const leadId = "e905e20c-8ed7-413f-a7fb-9d61cd6834a4";
const input = {
  ecosystemTypes: ["PERSONAL_BRAND", "PRODUCT"] as const,
  grantReason: "OBSEQUIO",
  effectiveDate: "2026-08-19",
  cutoffDate: "2027-08-19",
  notes: "Asignación comercial aprobada"
};
const context = {
  operatorSubject: "operator-subject",
  operatorEmail: "operator@example.com",
  existingEntitlements: ["PRODUCT"] as const,
  now: "2026-08-19T15:00:00.000Z"
};

test("creates an auditable grant without financial fields and marks new entitlement regeneration", () => {
  const result = createComplimentaryGrant([], leadId, input, context);
  assert.equal(result.idempotent, false);
  assert.deepEqual(result.grant.ecosystemTypes, ["PRODUCT", "PERSONAL_BRAND"]);
  assert.equal(result.grant.regenerationRequired, true);
  assert.equal(result.grant.operatorSubject, context.operatorSubject);
  assert.equal(result.grant.operatorEmail, context.operatorEmail);
  assert.equal(result.grant.grantReason, "OBSEQUIO");
  assert.equal("amountCop" in result.grant, false);
  assert.equal("paymentId" in result.grant, false);
});

test("repeating the same assignment is idempotent and does not duplicate entitlements", () => {
  const first = createComplimentaryGrant([], leadId, input, context);
  const second = createComplimentaryGrant(first.records, leadId, {
    ...input,
    ecosystemTypes: ["PRODUCT", "PERSONAL_BRAND"]
  }, { ...context, now: "2026-08-19T16:00:00.000Z" });
  assert.equal(second.idempotent, true);
  assert.equal(second.records.length, 1);
  assert.equal(second.grant.createdAt, context.now);
});

test("does not request regeneration when all granted ecosystems are already entitled", () => {
  const result = createComplimentaryGrant([], leadId, { ...input, ecosystemTypes: ["PRODUCT"] }, context);
  assert.equal(result.grant.regenerationRequired, false);
});

test("validates unique supported ecosystems, dates, and strict payload fields", () => {
  assert.equal(complimentaryGrantInputSchema.safeParse({ ...input, ecosystemTypes: [] }).success, false);
  assert.equal(complimentaryGrantInputSchema.safeParse({ ...input, ecosystemTypes: ["PRODUCT", "PRODUCT"] }).success, false);
  assert.equal(complimentaryGrantInputSchema.safeParse({ ...input, ecosystemTypes: ["UNKNOWN"] }).success, false);
  assert.equal(complimentaryGrantInputSchema.safeParse({ ...input, cutoffDate: "2026-08-18" }).success, false);
  assert.equal(complimentaryGrantInputSchema.safeParse({ ...input, amountCop: 0 }).success, false);
});

test("effective and cutoff dates determine active complimentary entitlements", () => {
  const first = createComplimentaryGrant([], leadId, input, context).grant;
  const records: ComplimentaryEcosystemGrant[] = [first];
  assert.deepEqual(activeComplimentaryGrantEcosystems(records, leadId, "2026-08-18"), []);
  assert.deepEqual(activeComplimentaryGrantEcosystems(records, leadId, "2026-08-19"), ["PRODUCT", "PERSONAL_BRAND"]);
  assert.deepEqual(activeComplimentaryGrantEcosystems(records, leadId, "2027-08-19"), ["PRODUCT", "PERSONAL_BRAND"]);
  assert.deepEqual(activeComplimentaryGrantEcosystems(records, leadId, "2027-08-20"), []);
});

test("grant planning leaves the payment ledger and revenue inputs byte-for-byte unchanged", () => {
  const ledger = [{ id: "payment-1", amountCop: 350000, status: "CONFIRMED" }];
  const before = JSON.stringify(ledger);
  createComplimentaryGrant([], leadId, input, context);
  assert.equal(JSON.stringify(ledger), before);
  assert.equal(ledger.reduce((total, payment) => total + payment.amountCop, 0), 350000);
});
