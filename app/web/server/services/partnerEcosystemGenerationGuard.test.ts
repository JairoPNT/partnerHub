import assert from "node:assert/strict";
import test from "node:test";

import {
  assertPartnerEcosystemGenerationAllowed,
  PartnerEcosystemGenerationError
} from "./partnerEcosystemGenerationGuard.ts";

const siteId = "partner-ecosystem";

for (const ecosystemType of ["PRODUCT", "BUSINESS", "PERSONAL_BRAND"] as const) {
  test(`allows entitled ${ecosystemType} partner generation`, () => {
    assert.doesNotThrow(() => assertPartnerEcosystemGenerationAllowed({
      siteId,
      ecosystemType,
      masterSite: false,
      entitlement: { activationLeadId: "lead-1", includedEcosystems: [ecosystemType] }
    }));
  });
}

test("rejects a partner ecosystem that is not included in entitlement", () => {
  assert.throws(() => assertPartnerEcosystemGenerationAllowed({
    siteId,
    ecosystemType: "BUSINESS",
    masterSite: false,
    entitlement: { activationLeadId: "lead-1", includedEcosystems: ["PRODUCT"] }
  }), (error) => {
    assert.ok(error instanceof PartnerEcosystemGenerationError);
    assert.equal(error.code, "ECOSYSTEM_NOT_ENTITLED");
    assert.deepEqual(error.details, { siteId, ecosystemType: "BUSINESS" });
    return true;
  });
});

test("rejects unknown partner siteIds but exempts canonical master generation", () => {
  assert.throws(() => assertPartnerEcosystemGenerationAllowed({
    siteId,
    ecosystemType: "PERSONAL_BRAND",
    masterSite: false,
    entitlement: null
  }), (error) => error instanceof PartnerEcosystemGenerationError && error.code === "PARTNER_ENTITLEMENT_NOT_FOUND");
  assert.doesNotThrow(() => assertPartnerEcosystemGenerationAllowed({
    siteId: "ganomaster-personal-brand",
    ecosystemType: "PERSONAL_BRAND",
    masterSite: true,
    entitlement: null
  }));
});
