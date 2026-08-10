import assert from "node:assert/strict";
import test from "node:test";
import { resolve } from "node:path";

import {
  MASTER_SITE_IDS,
  resolveCanonicalTemplateDirectory,
  resolveMasterTemplateSiteId,
  type EcosystemType
} from "./ecosystemTemplateResolver.ts";

const productTemplateDirectory = resolve("plantillas-de-pagina", "producto");

const expectations: Array<{
  ecosystemType: EcosystemType;
  canonicalDirectory: string;
  masterSiteId: string;
}> = [
  { ecosystemType: "PRODUCT", canonicalDirectory: "producto", masterSiteId: "ganomaster" },
  { ecosystemType: "BUSINESS", canonicalDirectory: "business", masterSiteId: "ganomaster-business" },
  {
    ecosystemType: "PERSONAL_BRAND",
    canonicalDirectory: "personal-brand",
    masterSiteId: "ganomaster-personal-brand"
  }
];

for (const expectation of expectations) {
  test(`selects the ${expectation.ecosystemType} canonical template`, () => {
    assert.equal(
      resolveCanonicalTemplateDirectory(productTemplateDirectory, expectation.ecosystemType),
      resolve("plantillas-de-pagina", expectation.canonicalDirectory)
    );
  });

  test(`selects the ${expectation.ecosystemType} generated master`, () => {
    assert.equal(resolveMasterTemplateSiteId(expectation.ecosystemType), expectation.masterSiteId);
    assert.equal(MASTER_SITE_IDS[expectation.ecosystemType], expectation.masterSiteId);
  });
}

test("preserves an explicitly selected master from the same ecosystem", () => {
  assert.equal(resolveMasterTemplateSiteId("PRODUCT", "ganomaster"), "ganomaster");
});

test("rejects an explicitly selected master from another ecosystem", () => {
  assert.throws(
    () => resolveMasterTemplateSiteId("BUSINESS", "ganomaster"),
    /BUSINESS requires ganomaster-business/
  );
});
