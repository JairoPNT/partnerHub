import assert from "node:assert/strict";
import test from "node:test";

import {
  quoteEcosystemPurchase,
  type CommercialPaymentEvidence,
  type PricingEcosystem
} from "./stagedEcosystemUpgradePricingCore.ts";

const ecosystemPrices: Record<PricingEcosystem, number> = {
  PRODUCT: 180000,
  BUSINESS: 180000,
  PERSONAL_BRAND: 100000
};

function payment(
  ecosystemType: PricingEcosystem,
  overrides: Partial<CommercialPaymentEvidence> = {}
): CommercialPaymentEvidence {
  return {
    id: `payment-${ecosystemType}`,
    reference: `REF-${ecosystemType}`,
    status: "CONFIRMED",
    amountCop: ecosystemPrices[ecosystemType],
    offerCode: `${ecosystemType}_ONLY`,
    ecosystemTypes: [ecosystemType],
    ...overrides
  };
}

test("quotes direct PLAN_360 at COP 350000", () => {
  const quote = quoteEcosystemPurchase({
    requestedEcosystems: ["PRODUCT", "BUSINESS", "PERSONAL_BRAND"],
    payments: [],
    quotedAt: "2026-08-18T12:00:00.000Z"
  });
  assert.equal(quote.offerCode, "PLAN_360");
  assert.equal(quote.pricingMode, "DIRECT_BUNDLE");
  assert.equal(quote.amountCop, 350000);
});

test("quotes the two remaining ecosystems at a COP 400000 historical total for every initial ecosystem", () => {
  for (const initial of ["PRODUCT", "BUSINESS", "PERSONAL_BRAND"] as const) {
    const remaining = (["PRODUCT", "BUSINESS", "PERSONAL_BRAND"] as const).filter((item) => item !== initial);
    const quote = quoteEcosystemPurchase({ requestedEcosystems: [...remaining], payments: [payment(initial)] });
    assert.equal(quote.pricingMode, "STAGED_BUNDLE_UPGRADE");
    assert.equal(quote.amountCop, 400000 - ecosystemPrices[initial]);
    assert.equal(quote.amountCop + quote.confirmedPaymentsTotalCop, 400000);
    assert.deepEqual(quote.alreadyConfirmedEcosystems, [initial]);
  }
});

test("successive individual addons receive no discount and total COP 460000", () => {
  const second = quoteEcosystemPurchase({
    requestedEcosystems: ["BUSINESS"],
    payments: [payment("PRODUCT")]
  });
  assert.equal(second.pricingMode, "INDIVIDUAL_ADDON");
  assert.equal(second.amountCop, 180000);

  const third = quoteEcosystemPurchase({
    requestedEcosystems: ["PERSONAL_BRAND"],
    payments: [
      payment("PRODUCT"),
      payment("BUSINESS", { pricingMode: "INDIVIDUAL_ADDON" })
    ]
  });
  assert.equal(third.pricingMode, "INDIVIDUAL_ADDON");
  assert.equal(third.eligibleForStagedUpgrade, false);
  assert.equal(third.amountCop, 100000);
  assert.equal(180000 + second.amountCop + third.amountCop, 460000);
});

test("pending, declined and voided payments produce no credit or ecosystems", () => {
  for (const status of ["PENDING", "DECLINED", "VOIDED"] as const) {
    const quote = quoteEcosystemPurchase({
      requestedEcosystems: ["PRODUCT", "BUSINESS", "PERSONAL_BRAND"],
      payments: [payment("PRODUCT", { status, amountCop: 999999 })]
    });
    assert.equal(quote.amountCop, 350000);
    assert.equal(quote.confirmedPaymentsTotalCop, 0);
    assert.deepEqual(quote.previousPaymentIds, []);
  }
});

test("APPROVED settled evidence is accepted equivalently to CONFIRMED", () => {
  const quote = quoteEcosystemPurchase({
    requestedEcosystems: ["PRODUCT", "BUSINESS"],
    payments: [payment("PERSONAL_BRAND", { status: "APPROVED" })]
  });
  assert.equal(quote.amountCop, 300000);
  assert.deepEqual(quote.previousPaymentIds, ["payment-PERSONAL_BRAND"]);
});

test("client input cannot supply the amount and the returned snapshot is immutable", () => {
  const request = {
    requestedEcosystems: ["BUSINESS", "PERSONAL_BRAND"] as PricingEcosystem[],
    payments: [payment("PRODUCT")],
    amountCop: 1
  };
  const quote = quoteEcosystemPurchase(request);
  assert.equal(quote.amountCop, 220000);
  assert.equal(Object.isFrozen(quote.snapshot), true);
  assert.equal(Object.isFrozen(quote.snapshot.includedEcosystems), true);
  assert.throws(() => quote.snapshot.includedEcosystems.push("PRODUCT"));
});

test("rejects ecosystems already confirmed and unsupported multi-addon combinations", () => {
  assert.throws(() => quoteEcosystemPurchase({
    requestedEcosystems: ["PRODUCT"],
    payments: [payment("PRODUCT")]
  }), /already confirmed/);
  assert.throws(() => quoteEcosystemPurchase({
    requestedEcosystems: ["BUSINESS", "PERSONAL_BRAND"],
    payments: [payment("PRODUCT"), payment("BUSINESS", { pricingMode: "INDIVIDUAL_ADDON" })]
  }));
});

test("rejects confirmed payments without explicit valid commercial evidence", () => {
  assert.throws(() => quoteEcosystemPurchase({
    requestedEcosystems: ["PRODUCT"],
    payments: [payment("BUSINESS", { ecosystemTypes: [] })]
  }), /no commercial ecosystem evidence/);
  assert.throws(() => quoteEcosystemPurchase({
    requestedEcosystems: ["PRODUCT"],
    payments: [payment("BUSINESS", { amountCop: -1 })]
  }), /invalid COP amount/);
});
