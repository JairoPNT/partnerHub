import assert from "node:assert/strict";
import test from "node:test";

import { createActivationOfferSnapshot } from "./activationOfferCatalog.ts";
import {
  buildPartnerEcosystemEntitlement,
  type EntitlementLead,
  type EntitlementTarget,
  type EcosystemType
} from "./partnerEcosystemEntitlementCore.ts";

const leadId = "e905e20c-8ed7-413f-a7fb-9d61cd6834a4";

function lead(offerCode: "PRODUCT_ONLY" | "BUSINESS_ONLY" | "PERSONAL_BRAND_ONLY" | "PLAN_360"): EntitlementLead {
  return {
    id: leadId,
    offerCode,
    offerSnapshot: createActivationOfferSnapshot(offerCode, "2026-08-18T12:00:00.000Z"),
    onboardingData: { domain: "partner.pro" }
  };
}

function target(ecosystemType: EcosystemType, publicHost: string, publicationState = "READY"): EntitlementTarget {
  return {
    ownerKey: leadId,
    siteId: `opaque-${ecosystemType.toLowerCase()}`,
    ecosystemType,
    baseDomain: "partner.pro",
    publicHost,
    provisioningState: "READY",
    publicationState
  };
}

test("maps each individual offer to its only ecosystem at the root", () => {
  const cases = [
    ["PRODUCT_ONLY", "PRODUCT"],
    ["BUSINESS_ONLY", "BUSINESS"],
    ["PERSONAL_BRAND_ONLY", "PERSONAL_BRAND"]
  ] as const;
  for (const [offerCode, ecosystem] of cases) {
    const result = buildPartnerEcosystemEntitlement(lead(offerCode), []);
    assert.deepEqual(result.includedEcosystems, [ecosystem]);
    assert.equal(result.rootEcosystem, ecosystem);
    assert.deepEqual(result.expectedTargets, [{ ecosystemType: ecosystem, role: "ROOT", publicHost: "partner.pro" }]);
  }
});

test("maps PLAN_360 to Personal Brand root plus Product and Business subdomains", () => {
  const result = buildPartnerEcosystemEntitlement(lead("PLAN_360"), []);
  assert.deepEqual(result.includedEcosystems, ["PRODUCT", "BUSINESS", "PERSONAL_BRAND"]);
  assert.equal(result.rootEcosystem, "PERSONAL_BRAND");
  assert.deepEqual(result.expectedTargets, [
    { ecosystemType: "PRODUCT", role: "SUBDOMAIN", publicHost: "producto.partner.pro" },
    { ecosystemType: "BUSINESS", role: "SUBDOMAIN", publicHost: "negocio.partner.pro" },
    { ecosystemType: "PERSONAL_BRAND", role: "ROOT", publicHost: "partner.pro" }
  ]);
});

test("returns UNKNOWN for a legacy partner without inventing ecosystems", () => {
  const result = buildPartnerEcosystemEntitlement({ id: leadId, siteId: "opaque-site" }, [
    target("PRODUCT", "partner.pro")
  ]);
  assert.equal(result.commercialState, "UNKNOWN");
  assert.deepEqual(result.includedEcosystems, []);
  assert.deepEqual(result.expectedTargets, []);
  assert.equal(result.regenerationRequired, false);
});

test("reports complete targets without regeneration", () => {
  const targets = [
    target("PRODUCT", "producto.partner.pro"),
    target("BUSINESS", "negocio.partner.pro"),
    target("PERSONAL_BRAND", "partner.pro")
  ];
  const result = buildPartnerEcosystemEntitlement(lead("PLAN_360"), targets);
  assert.deepEqual(result.missingTargets, []);
  assert.equal(result.regenerationRequired, false);
  assert.deepEqual(result.regenerationReasons, []);
});

test("reports missing and publication-pending targets deterministically", () => {
  const result = buildPartnerEcosystemEntitlement(lead("PLAN_360"), [
    target("PRODUCT", "producto.partner.pro", "PENDING"),
    target("PERSONAL_BRAND", "partner.pro")
  ]);
  assert.deepEqual(result.missingTargets, [
    { ecosystemType: "BUSINESS", role: "SUBDOMAIN", publicHost: "negocio.partner.pro" }
  ]);
  assert.equal(result.regenerationRequired, true);
  assert.deepEqual(result.regenerationReasons, [
    "TARGET_MISSING:BUSINESS",
    "TARGET_PUBLICATION_PENDING:PRODUCT"
  ]);
});

test("the entitlement calculation does not mutate lead, snapshot, or targets", () => {
  const inputLead = lead("PLAN_360");
  const targets = [target("PRODUCT", "producto.partner.pro")];
  const before = JSON.stringify({ inputLead, targets });
  buildPartnerEcosystemEntitlement(inputLead, targets);
  assert.equal(JSON.stringify({ inputLead, targets }), before);
});
