import assert from "node:assert/strict";
import test from "node:test";

import {
  CANONICAL_MASTER_HOSTS,
  getCompatibleMasterHosts,
  getPartnerPublicHost,
  LEGACY_MASTER_HOST_ALIASES,
  PARTNER_HOST_LABELS
} from "./partnerHostnameContract.ts";

test("uses the canonical partner labels independently from master transition hosts", () => {
  assert.deepEqual(PARTNER_HOST_LABELS, {
    PRODUCT: "producto",
    BUSINESS: "negocio",
    PERSONAL_BRAND: "brand"
  });
  assert.equal(getPartnerPublicHost("partner.pro", "PRODUCT"), "producto.partner.pro");
  assert.equal(getPartnerPublicHost("partner.pro", "BUSINESS"), "negocio.partner.pro");
  assert.equal(getPartnerPublicHost("partner.pro", "PERSONAL_BRAND"), "brand.partner.pro");
});

test("defines canonical master hosts and preserves current production aliases for transition", () => {
  assert.deepEqual(CANONICAL_MASTER_HOSTS, {
    PRODUCT: "producto.ganomaster.pro",
    BUSINESS: "negocio.ganomaster.pro",
    PERSONAL_BRAND: "brand.ganomaster.pro"
  });
  assert.deepEqual(LEGACY_MASTER_HOST_ALIASES, {
    PRODUCT: "product.ganomaster.pro",
    BUSINESS: "business.ganomaster.pro"
  });
  assert.deepEqual(getCompatibleMasterHosts("PRODUCT"), ["producto.ganomaster.pro", "product.ganomaster.pro"]);
  assert.deepEqual(getCompatibleMasterHosts("BUSINESS"), ["negocio.ganomaster.pro", "business.ganomaster.pro"]);
  assert.deepEqual(getCompatibleMasterHosts("PERSONAL_BRAND"), ["brand.ganomaster.pro"]);
});
