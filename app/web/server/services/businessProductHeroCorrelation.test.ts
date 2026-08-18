import assert from "node:assert/strict";
import test from "node:test";

import { applyBusinessVslPoster } from "./businessVslPoster.ts";
import { extractProductHero, findPartnerProductSiteId } from "./businessProductHeroCorrelation.ts";

const ownerKey = "6ce17715-89ef-4e67-8a5b-b5aa03c3d067";
const targets = [
  { ownerKey, siteId: "ana-product", ecosystemType: "PRODUCT" as const },
  { ownerKey, siteId: "ana-business", ecosystemType: "BUSINESS" as const },
  { ownerKey, siteId: "ana-personal-brand", ecosystemType: "PERSONAL_BRAND" as const }
];

test("correlates Product and Business only through the immutable ownerKey", () => {
  assert.equal(findPartnerProductSiteId("ana-business", targets), "ana-product");
  assert.equal(findPartnerProductSiteId("another-business", targets), null);
});

test("proves Product.hero.desktop equals Business.vsl.thumbnailUrl", () => {
  const product = {
    ecosystemType: "PRODUCT",
    hero: {
      desktop: "https://cdn.example/partner/product-desktop.webp",
      mobile: "https://cdn.example/partner/product-mobile.webp"
    }
  };
  const productHero = extractProductHero(product);
  const business = applyBusinessVslPoster({
    ecosystemType: "BUSINESS",
    hero: { desktop: "https://cdn.example/partner/business-exclusive.webp" },
    vsl: { thumbnailUrl: "https://cdn.example/legacy.webp" }
  }, true, productHero);

  assert.equal(business.vsl?.thumbnailUrl, product.hero.desktop);
  assert.notEqual(business.vsl?.thumbnailUrl, business.hero.desktop);
});

test("uses Product mobile then favicon without consulting the Business hero", () => {
  const business = {
    ecosystemType: "BUSINESS" as const,
    hero: { desktop: "https://cdn.example/partner/business-exclusive.webp" }
  };
  const mobile = applyBusinessVslPoster(business, true, extractProductHero({
    ecosystemType: "PRODUCT", hero: { mobile: "https://cdn.example/partner/product-mobile.webp" }
  }));
  const placeholder = applyBusinessVslPoster(business, true, extractProductHero({
    ecosystemType: "PRODUCT", hero: {}
  }));

  assert.equal(mobile.vsl?.thumbnailUrl, "https://cdn.example/partner/product-mobile.webp");
  assert.equal(placeholder.vsl?.thumbnailUrl, "favicon.svg");
});

test("preserves Product CDN URL bytes and rejects a source identified as Business", () => {
  const literal = "https://cdn.example/Ana/Hero%20Desktop.webp?version=ExactCase";
  assert.equal(extractProductHero({ ecosystemType: "PRODUCT", hero: { desktop: literal } }).desktop, literal);
  assert.deepEqual(extractProductHero({
    ecosystemType: "BUSINESS", hero: { desktop: "https://cdn.example/business.webp" }
  }), {});
});
