import assert from "node:assert/strict";
import test from "node:test";

import { createComplimentaryGrant } from "./complimentaryEcosystemGrantCore.ts";
import {
  buildComplimentaryGrantReadback,
  complimentaryGrantLifecycleStatus,
  listComplimentaryGrantsByLead
} from "./complimentaryGrantReadbackCore.ts";
import { buildPartnerEcosystemEntitlement } from "./partnerEcosystemEntitlementCore.ts";

const leadId = "e905e20c-8ed7-413f-a7fb-9d61cd6834a4";
const context = {
  operatorSubject: "operator-subject",
  operatorEmail: "operator@example.com",
  existingEntitlements: [],
  now: "2026-08-19T15:00:00.000Z"
};

function grant(effectiveDate = "2026-08-19", cutoffDate: string | null = null) {
  return createComplimentaryGrant([], leadId, {
    ecosystemTypes: ["PRODUCT", "BUSINESS"],
    grantReason: "OBSEQUIO",
    effectiveDate,
    cutoffDate,
    notes: "Asignación sin costo"
  }, context).grant;
}

test("readback exposes persisted commercial audit fields and entitlement summary", () => {
  const persisted = grant();
  const entitlement = buildPartnerEcosystemEntitlement({
    id: leadId,
    onboardingData: { domain: "partner.pro" },
    complimentaryGrantEcosystems: ["PRODUCT", "BUSINESS"]
  }, []);
  const result = buildComplimentaryGrantReadback(leadId, [persisted], entitlement, "2026-08-19");
  assert.deepEqual(result.grants[0], {
    id: persisted.id,
    ecosystemTypes: ["PRODUCT", "BUSINESS"],
    grantReason: "OBSEQUIO",
    effectiveDate: "2026-08-19",
    cutoffDate: null,
    notes: "Asignación sin costo",
    operator: { subject: "operator-subject", email: "operator@example.com" },
    regenerationRequired: true,
    lifecycleStatus: "ACTIVE",
    createdAt: context.now
  });
  assert.deepEqual(result.entitlement.includedEcosystems, ["PRODUCT", "BUSINESS"]);
  assert.equal(result.entitlement.regenerationRequired, true);
});

test("a serialized grant can be reopened and selected by the same partner", () => {
  const persisted = grant();
  const other = { ...grant(), id: "other-grant", activationLeadId: "other-lead" };
  const reopened = JSON.parse(JSON.stringify([other, persisted]));
  assert.deepEqual(listComplimentaryGrantsByLead(reopened, leadId), [persisted]);
  assert.deepEqual(listComplimentaryGrantsByLead(reopened, "missing-lead"), []);
});

test("readback is compatible with partners that have no grants", () => {
  const entitlement = buildPartnerEcosystemEntitlement({ id: leadId }, []);
  const result = buildComplimentaryGrantReadback(leadId, [], entitlement, "2026-08-19");
  assert.deepEqual(result.grants, []);
  assert.equal(result.entitlement.commercialState, "UNKNOWN");
  assert.deepEqual(result.entitlement.includedEcosystems, []);
});

test("readback distinguishes scheduled, active, and expired grants at cutoff boundaries", () => {
  const scheduled = grant("2026-09-01", null);
  const active = grant("2026-08-01", "2026-08-19");
  assert.equal(complimentaryGrantLifecycleStatus(scheduled, "2026-08-19"), "SCHEDULED");
  assert.equal(complimentaryGrantLifecycleStatus(active, "2026-08-19"), "ACTIVE");
  assert.equal(complimentaryGrantLifecycleStatus(active, "2026-08-20"), "EXPIRED");
});

test("readback does not mutate grants or entitlement inputs", () => {
  const grants = [grant()];
  const entitlement = buildPartnerEcosystemEntitlement({
    id: leadId,
    complimentaryGrantEcosystems: ["PRODUCT", "BUSINESS"]
  }, []);
  const before = JSON.stringify({ grants, entitlement });
  buildComplimentaryGrantReadback(leadId, grants, entitlement, "2026-08-19");
  assert.equal(JSON.stringify({ grants, entitlement }), before);
});
