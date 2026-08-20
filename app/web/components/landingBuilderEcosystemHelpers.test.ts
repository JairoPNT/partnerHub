import assert from "node:assert/strict";
import test from "node:test";

import {
  isEcosystemEntitledForPartner,
  getCanonicalHostForEcosystem,
  getDefaultSelectedEcosystem,
  ECOSYSTEM_CONFIGS,
  type PartnerEntitlementData
} from "./landingBuilderEcosystemHelpers.ts";

test("ECOSYSTEM_CONFIGS maps master domains and canonical subdomain prefixes correctly", () => {
  assert.equal(ECOSYSTEM_CONFIGS.PRODUCT.masterDomain, "product.partner.pro");
  assert.equal(ECOSYSTEM_CONFIGS.PRODUCT.canonicalSubdomainPrefix, "product");

  assert.equal(ECOSYSTEM_CONFIGS.BUSINESS.masterDomain, "negocio.partner.pro");
  assert.equal(ECOSYSTEM_CONFIGS.BUSINESS.canonicalSubdomainPrefix, "negocio");

  assert.equal(ECOSYSTEM_CONFIGS.PERSONAL_BRAND.masterDomain, "brand.partner.pro");
  assert.equal(ECOSYSTEM_CONFIGS.PERSONAL_BRAND.canonicalSubdomainPrefix, "brand");
});

test("isEcosystemEntitledForPartner allows all included ecosystems for Claudia (all 3)", () => {
  const claudiaEntitlement: PartnerEntitlementData = {
    activationLeadId: "claudia-lead",
    commercialState: "KNOWN",
    offerCode: "PLAN_360",
    includedEcosystems: ["PRODUCT", "BUSINESS", "PERSONAL_BRAND"],
    rootEcosystem: "PERSONAL_BRAND",
    rootRedirectTarget: null,
    expectedTargets: [],
    existingTargets: [],
    missingTargets: [],
    regenerationRequired: false,
    regenerationReasons: []
  };

  assert.equal(isEcosystemEntitledForPartner("PRODUCT", claudiaEntitlement), true);
  assert.equal(isEcosystemEntitledForPartner("BUSINESS", claudiaEntitlement), true);
  assert.equal(isEcosystemEntitledForPartner("PERSONAL_BRAND", claudiaEntitlement), true);
});

test("isEcosystemEntitledForPartner restricts unentitled ecosystems for product-only partner", () => {
  const productOnlyEntitlement: PartnerEntitlementData = {
    activationLeadId: "single-lead",
    commercialState: "KNOWN",
    offerCode: "PRODUCT_ONLY",
    includedEcosystems: ["PRODUCT"],
    rootEcosystem: "PRODUCT",
    rootRedirectTarget: null,
    expectedTargets: [],
    existingTargets: [],
    missingTargets: [],
    regenerationRequired: false,
    regenerationReasons: []
  };

  assert.equal(isEcosystemEntitledForPartner("PRODUCT", productOnlyEntitlement), true);
  assert.equal(isEcosystemEntitledForPartner("BUSINESS", productOnlyEntitlement), false);
  assert.equal(isEcosystemEntitledForPartner("PERSONAL_BRAND", productOnlyEntitlement), false);
});

test("getCanonicalHostForEcosystem builds canonical subdomain targets and avoids root domain target", () => {
  assert.equal(getCanonicalHostForEcosystem("PRODUCT", "carlossilva.com"), "product.carlossilva.com");
  assert.equal(getCanonicalHostForEcosystem("BUSINESS", "carlossilva.com"), "negocio.carlossilva.com");
  assert.equal(getCanonicalHostForEcosystem("PERSONAL_BRAND", "carlossilva.com"), "brand.carlossilva.com");
  assert.equal(getCanonicalHostForEcosystem("PRODUCT", ""), "product.[dominio]");
});

test("getDefaultSelectedEcosystem selects first entitled ecosystem", () => {
  const businessEntitlement: PartnerEntitlementData = {
    activationLeadId: "biz-lead",
    commercialState: "KNOWN",
    offerCode: "BUSINESS_ONLY",
    includedEcosystems: ["BUSINESS"],
    rootEcosystem: "BUSINESS",
    rootRedirectTarget: null,
    expectedTargets: [],
    existingTargets: [],
    missingTargets: [],
    regenerationRequired: false,
    regenerationReasons: []
  };

  assert.equal(getDefaultSelectedEcosystem(businessEntitlement), "BUSINESS");
  assert.equal(getDefaultSelectedEcosystem(null), "PRODUCT");
});
