import assert from "node:assert/strict";
import test from "node:test";

import {
  activeComplimentaryGrantEcosystems,
  ComplimentaryGrantConflictError,
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

test("rejects a repeated assignment even when reason, date, or notes change", () => {
  const first = createComplimentaryGrant([], leadId, input, context);
  const active = activeComplimentaryGrantEcosystems(first.records, leadId, "2026-08-20");
  assert.throws(() => createComplimentaryGrant(first.records, leadId, {
    ...input,
    grantReason: "Motivo distinto",
    effectiveDate: "2026-08-20",
    notes: "Notas distintas"
  }, { ...context, activeComplimentaryGrantEcosystems: active }), (error) => {
    assert.ok(error instanceof ComplimentaryGrantConflictError);
    assert.deepEqual(error.conflicts, [
      { ecosystemType: "PRODUCT", sources: ["ACTIVE_COMPLIMENTARY_GRANT"] },
      { ecosystemType: "PERSONAL_BRAND", sources: ["ACTIVE_COMPLIMENTARY_GRANT"] }
    ]);
    return true;
  });
});

test("allows a distinct ecosystem for the same partner", () => {
  const first = createComplimentaryGrant([], leadId, { ...input, ecosystemTypes: ["PRODUCT"] }, context);
  const second = createComplimentaryGrant(first.records, leadId, { ...input, ecosystemTypes: ["BUSINESS"] }, {
    ...context,
    activeComplimentaryGrantEcosystems: ["PRODUCT"]
  });
  assert.equal(second.records.length, 2);
  assert.deepEqual(second.grant.ecosystemTypes, ["BUSINESS"]);
});

test("rejects the complete request when any ecosystem is covered by a confirmed payment", () => {
  assert.throws(() => createComplimentaryGrant([], leadId, { ...input, ecosystemTypes: ["PRODUCT", "BUSINESS"] }, {
    ...context,
    confirmedPaymentEcosystems: ["PRODUCT"]
  }), (error) => {
    assert.ok(error instanceof ComplimentaryGrantConflictError);
    assert.deepEqual(error.conflicts, [{ ecosystemType: "PRODUCT", sources: ["CONFIRMED_PAYMENT"] }]);
    return true;
  });
});

test("allows a new grant after the previous complimentary grant expired", () => {
  const expired = createComplimentaryGrant([], leadId, {
    ...input,
    ecosystemTypes: ["BUSINESS"],
    cutoffDate: "2026-08-19"
  }, context);
  const active = activeComplimentaryGrantEcosystems(expired.records, leadId, "2026-08-20");
  const replacement = createComplimentaryGrant(expired.records, leadId, {
    ...input,
    ecosystemTypes: ["BUSINESS"],
    effectiveDate: "2026-08-20",
    cutoffDate: null
  }, { ...context, activeComplimentaryGrantEcosystems: active });
  assert.equal(replacement.records.length, 2);
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
  assert.equal(complimentaryGrantInputSchema.safeParse({ ...input, monthlyCredits: 1 }).success, false);
  assert.equal(complimentaryGrantInputSchema.safeParse({ ...input, recurringMonths: 1 }).success, false);
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
