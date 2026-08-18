import assert from "node:assert/strict";
import test from "node:test";

import { CATALOG_OFFERS, ECOSYSTEM_LABELS, type ManualPaymentEcosystem } from "./manualPaymentConstants.ts";

test("CATALOG_OFFERS structure aligns with backend manual payment catalog schema", () => {
  assert.equal(CATALOG_OFFERS.PLAN_360.amountCop, 350000);
  assert.deepEqual(CATALOG_OFFERS.PLAN_360.ecosystems, ["PRODUCT", "BUSINESS", "PERSONAL_BRAND"]);

  assert.equal(CATALOG_OFFERS.PRODUCT_ONLY.amountCop, 180000);
  assert.deepEqual(CATALOG_OFFERS.PRODUCT_ONLY.ecosystems, ["PRODUCT"]);

  assert.equal(CATALOG_OFFERS.BUSINESS_ONLY.amountCop, 180000);
  assert.deepEqual(CATALOG_OFFERS.BUSINESS_ONLY.ecosystems, ["BUSINESS"]);

  assert.equal(CATALOG_OFFERS.PERSONAL_BRAND_ONLY.amountCop, 100000);
  assert.deepEqual(CATALOG_OFFERS.PERSONAL_BRAND_ONLY.ecosystems, ["PERSONAL_BRAND"]);
});

test("ECOSYSTEM_LABELS has human-readable names for all manual payment ecosystems", () => {
  const ecosystems: ManualPaymentEcosystem[] = ["PRODUCT", "BUSINESS", "PERSONAL_BRAND"];
  for (const eco of ecosystems) {
    assert.ok(ECOSYSTEM_LABELS[eco], `Label for ${eco} must exist`);
    assert.ok(ECOSYSTEM_LABELS[eco].name.length > 0, `Name for ${eco} must not be empty`);
    assert.ok(ECOSYSTEM_LABELS[eco].color.length > 0, `Color for ${eco} must not be empty`);
  }
});
