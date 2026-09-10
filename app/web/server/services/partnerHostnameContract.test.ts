import assert from "node:assert/strict";
import test from "node:test";

import {
  CANONICAL_MASTER_HOSTS,
  getPartnerCanonicalPublicHost,
  getCompatibleMasterHosts,
  getPartnerPublicHost,
  LEGACY_MASTER_HOST_ALIASES,
  PARTNER_HOST_LABELS,
  resolvePartnerRoute
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

test("resolves apex priority and serves active requested Product or Business subdomains", () => {
  const cases = [
    {
      activeEcosystems: ["PRODUCT"],
      requestedHost: "partner.pro",
      expected: {
        requestedHost: "partner.pro",
        canonicalHost: "producto.partner.pro",
        action: "REDIRECT",
        ecosystemType: "PRODUCT"
      }
    },
    {
      activeEcosystems: ["BUSINESS"],
      requestedHost: "producto.partner.pro",
      expected: {
        requestedHost: "producto.partner.pro",
        canonicalHost: "negocio.partner.pro",
        action: "REDIRECT",
        ecosystemType: "BUSINESS"
      }
    },
    {
      activeEcosystems: ["PRODUCT", "BUSINESS"],
      requestedHost: "partner.pro",
      expected: {
        requestedHost: "partner.pro",
        canonicalHost: "negocio.partner.pro",
        action: "REDIRECT",
        ecosystemType: "BUSINESS"
      }
    },
    {
      activeEcosystems: ["PRODUCT", "BUSINESS", "PERSONAL_BRAND"],
      requestedHost: "partner.pro",
      expected: {
        requestedHost: "partner.pro",
        canonicalHost: "partner.pro",
        action: "SERVE",
        ecosystemType: "PERSONAL_BRAND"
      }
    },
    {
      activeEcosystems: ["PRODUCT", "BUSINESS"],
      requestedHost: "producto.partner.pro",
      expected: {
        requestedHost: "producto.partner.pro",
        canonicalHost: "producto.partner.pro",
        action: "SERVE",
        ecosystemType: "PRODUCT"
      }
    },
    {
      activeEcosystems: ["PRODUCT", "BUSINESS"],
      requestedHost: "negocio.partner.pro",
      expected: {
        requestedHost: "negocio.partner.pro",
        canonicalHost: "negocio.partner.pro",
        action: "SERVE",
        ecosystemType: "BUSINESS"
      }
    },
    {
      activeEcosystems: ["PERSONAL_BRAND", "PRODUCT"],
      requestedHost: "producto.partner.pro",
      expected: {
        requestedHost: "producto.partner.pro",
        canonicalHost: "producto.partner.pro",
        action: "SERVE",
        ecosystemType: "PRODUCT"
      }
    },
    {
      activeEcosystems: ["PERSONAL_BRAND", "BUSINESS"],
      requestedHost: "negocio.partner.pro",
      expected: {
        requestedHost: "negocio.partner.pro",
        canonicalHost: "negocio.partner.pro",
        action: "SERVE",
        ecosystemType: "BUSINESS"
      }
    },
    {
      activeEcosystems: ["PERSONAL_BRAND", "PRODUCT"],
      requestedHost: "negocio.partner.pro",
      expected: {
        requestedHost: "negocio.partner.pro",
        canonicalHost: "partner.pro",
        action: "REDIRECT",
        ecosystemType: "PERSONAL_BRAND"
      }
    },
    {
      activeEcosystems: ["PERSONAL_BRAND", "BUSINESS"],
      requestedHost: "producto.partner.pro",
      expected: {
        requestedHost: "producto.partner.pro",
        canonicalHost: "partner.pro",
        action: "REDIRECT",
        ecosystemType: "PERSONAL_BRAND"
      }
    },
    {
      activeEcosystems: ["PERSONAL_BRAND", "PRODUCT", "BUSINESS"],
      requestedHost: "producto.partner.pro",
      expected: {
        requestedHost: "producto.partner.pro",
        canonicalHost: "producto.partner.pro",
        action: "SERVE",
        ecosystemType: "PRODUCT"
      }
    },
    {
      activeEcosystems: ["PERSONAL_BRAND", "PRODUCT", "BUSINESS"],
      requestedHost: "negocio.partner.pro",
      expected: {
        requestedHost: "negocio.partner.pro",
        canonicalHost: "negocio.partner.pro",
        action: "SERVE",
        ecosystemType: "BUSINESS"
      }
    }
  ] as const;

  for (const { activeEcosystems, requestedHost, expected } of cases) {
    assert.deepEqual(resolvePartnerRoute({ baseDomain: "partner.pro", requestedHost, activeEcosystems }), expected);
  }
});

test("derives canonical partner public hosts without letting Product or Business claim the apex", () => {
  assert.equal(getPartnerCanonicalPublicHost("partner.pro", "PRODUCT", "PERSONAL_BRAND"), "producto.partner.pro");
  assert.equal(getPartnerCanonicalPublicHost("partner.pro", "BUSINESS", "PERSONAL_BRAND"), "negocio.partner.pro");
  assert.equal(getPartnerCanonicalPublicHost("partner.pro", "PERSONAL_BRAND", "PERSONAL_BRAND"), "partner.pro");
  assert.throws(() => getPartnerCanonicalPublicHost("partner.pro", "PERSONAL_BRAND", "PRODUCT"));
});

test("rejects malformed partner route inputs", () => {
  assert.throws(() => resolvePartnerRoute({ baseDomain: "localhost", requestedHost: "localhost", activeEcosystems: ["PRODUCT"] }));
  assert.throws(() => resolvePartnerRoute({ baseDomain: "partner.pro", requestedHost: "brand.partner.pro", activeEcosystems: ["PRODUCT"] }));
  assert.throws(() => resolvePartnerRoute({ baseDomain: "partner.pro", requestedHost: "partner.pro", activeEcosystems: [] }));
  assert.throws(() => resolvePartnerRoute({ baseDomain: "partner.pro", requestedHost: "partner.pro", activeEcosystems: ["PRODUCT", "PRODUCT"] }));
  assert.throws(() => resolvePartnerRoute({ baseDomain: "partner.pro", requestedHost: "partner.pro", activeEcosystems: ["UNKNOWN"] as never[] }));
});
