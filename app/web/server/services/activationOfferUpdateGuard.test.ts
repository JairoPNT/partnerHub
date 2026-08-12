import assert from "node:assert/strict";
import test from "node:test";

import { createActivationOfferSnapshot } from "./activationOfferCatalog.ts";
import { assertActivationOfferEcosystemUpdate } from "./activationOfferUpdateGuard.ts";

test("accepts a matching ecosystem update for an individual offer snapshot", () => {
  assert.doesNotThrow(() =>
    assertActivationOfferEcosystemUpdate(
      createActivationOfferSnapshot("BUSINESS_ONLY"),
      "BUSINESS"
    )
  );
});

test("rejects an ecosystem update that contradicts an individual offer snapshot", () => {
  assert.throws(
    () =>
      assertActivationOfferEcosystemUpdate(
        createActivationOfferSnapshot("PERSONAL_BRAND_ONLY"),
        "PRODUCT"
      ),
    /PERSONAL_BRAND_ONLY requires ecosystemType PERSONAL_BRAND/
  );
});

test("rejects a single ecosystem update for PLAN_360", () => {
  assert.throws(
    () =>
      assertActivationOfferEcosystemUpdate(
        createActivationOfferSnapshot("PLAN_360"),
        "PRODUCT"
      ),
    /PLAN_360 must not use a single ecosystemType/
  );
});

test("preserves historical update behavior when no snapshot exists", () => {
  assert.doesNotThrow(() => assertActivationOfferEcosystemUpdate(undefined, "BUSINESS"));
  assert.doesNotThrow(() => assertActivationOfferEcosystemUpdate(undefined, undefined));
});
