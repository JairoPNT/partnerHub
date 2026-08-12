import assert from "node:assert/strict";
import test from "node:test";

import type { ManualPaymentRecord } from "./manualPaymentLedgerCore.ts";
import {
  buildDashboardFinancialMetrics,
  resolveDashboardPeriods
} from "./dashboardFinancialMetricsCore.ts";

function payment(overrides: Partial<ManualPaymentRecord> = {}): ManualPaymentRecord {
  return {
    id: "payment-1",
    activationLeadId: "lead-1",
    siteId: "partner-one",
    category: "ACTIVATION",
    amountCop: 247000,
    method: "NEQUI",
    paidAt: "2026-08-01T05:30:00.000Z",
    status: "CONFIRMED",
    createdAt: "2026-08-01T05:30:00.000Z",
    updatedAt: "2026-08-01T05:30:00.000Z",
    ...overrides
  };
}

test("defaults to the current Bogota calendar month and an equal previous period", () => {
  assert.deepEqual(resolveDashboardPeriods({}, new Date("2026-08-12T03:00:00.000Z")), {
    current: { from: "2026-08-01", to: "2026-08-11" },
    previous: { from: "2026-07-21", to: "2026-07-31" }
  });
});

test("aggregates only confirmed ledger amounts using Bogota local dates", () => {
  const result = buildDashboardFinancialMetrics(
    [
      payment(),
      payment({ id: "payment-2", category: "MONTHLY_FEE", amountCop: 59900, paidAt: "2026-08-10T15:00:00.000Z" }),
      payment({ id: "payment-3", amountCop: 100000, paidAt: "2026-08-05T15:00:00.000Z", status: "VOIDED" }),
      payment({ id: "payment-4", amountCop: 123500, paidAt: "2026-07-31T15:00:00.000Z" })
    ],
    [
      { createdAt: "2026-08-03T15:00:00.000Z" },
      { createdAt: "2026-07-25T15:00:00.000Z" }
    ],
    { from: "2026-08-01", to: "2026-08-11" }
  );

  assert.deepEqual(result.revenueCop, { current: 306900, previous: 123500, changePercent: 148.5 });
  assert.deepEqual(result.confirmedPayments, { current: 2, previous: 1, changePercent: 100 });
  assert.deepEqual(result.partnerRegistrations, { current: 1, previous: 1, changePercent: 0 });
  assert.deepEqual(result.byCategory.find((item) => item.category === "MONTHLY_FEE"), {
    category: "MONTHLY_FEE",
    currentAmountCop: 59900,
    previousAmountCop: 0,
    currentPaymentCount: 1,
    previousPaymentCount: 0
  });
  assert.equal("method" in result, false);
});

test("returns null comparison when the previous value is zero", () => {
  const result = buildDashboardFinancialMetrics(
    [payment({ paidAt: "2026-08-05T15:00:00.000Z" })],
    [{ createdAt: "2026-08-05T15:00:00.000Z" }],
    { from: "2026-08-01", to: "2026-08-11" }
  );

  assert.equal(result.revenueCop.changePercent, null);
  assert.equal(result.confirmedPayments.changePercent, null);
  assert.equal(result.partnerRegistrations.changePercent, null);
});
