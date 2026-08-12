import assert from "node:assert/strict";
import test from "node:test";

import { z } from "zod";

import {
  activationOfferSnapshotSchema,
  activationOfferSelectionSchema,
  createActivationOfferSelection,
  createActivationOfferSnapshot,
  getActivationOfferCatalog,
  immutableActivationOfferFieldsSchema,
  resolveActivationOffer,
  resolveActivationOfferEcosystemType,
  serializeActivationOfferSnapshot
} from "./activationOfferCatalog.ts";

const expectedOffers = [
  ["PRODUCT_ONLY", 180000, ["PRODUCT"]],
  ["BUSINESS_ONLY", 180000, ["BUSINESS"]],
  ["PERSONAL_BRAND_ONLY", 100000, ["PERSONAL_BRAND"]],
  ["PLAN_360", 350000, ["PRODUCT", "BUSINESS", "PERSONAL_BRAND"]]
] as const;

test("resolves every approved one-time COP offer exactly", () => {
  for (const [offerCode, amountCop, ecosystemTypes] of expectedOffers) {
    assert.deepEqual(resolveActivationOffer(offerCode), {
      offerCode,
      ecosystemTypes: [...ecosystemTypes],
      amountCop,
      currency: "COP",
      billingType: "ONE_TIME"
    });
  }
});

test("rejects unknown offer codes", () => {
  assert.throws(() => resolveActivationOffer("UNKNOWN"), z.ZodError);
});

test("returns defensive catalog copies", () => {
  const first = getActivationOfferCatalog();
  first[0].amountCop = 1;
  first[0].ecosystemTypes.push("BUSINESS");

  const second = getActivationOfferCatalog();
  assert.equal(second[0].amountCop, 180000);
  assert.deepEqual(second[0].ecosystemTypes, ["PRODUCT"]);
});

test("creates and validates a normalized immutable activation snapshot", () => {
  const snapshot = createActivationOfferSnapshot("PLAN_360", "2026-08-12T15:00:00.000Z");
  assert.deepEqual(snapshot, {
    offerCode: "PLAN_360",
    ecosystemTypes: ["PRODUCT", "BUSINESS", "PERSONAL_BRAND"],
    amountCop: 350000,
    currency: "COP",
    billingType: "ONE_TIME",
    selectedAt: "2026-08-12T15:00:00.000Z"
  });
  assert.equal(activationOfferSnapshotSchema.safeParse(snapshot).success, true);
});

test("accepts only offerCode from the client and rejects derived pricing fields", () => {
  assert.deepEqual(activationOfferSelectionSchema.parse({ offerCode: "BUSINESS_ONLY" }), {
    offerCode: "BUSINESS_ONLY"
  });
  for (const field of ["offerSnapshot", "amountCop", "ecosystemTypes", "currency", "billingType", "selectedAt"]) {
    assert.equal(
      activationOfferSelectionSchema.safeParse({ offerCode: "BUSINESS_ONLY", [field]: "client-value" }).success,
      false
    );
  }
});

test("serializes historical records without an offer snapshot", () => {
  assert.deepEqual(createActivationOfferSelection(undefined), {});
  assert.equal(serializeActivationOfferSnapshot(undefined), undefined);
});

test("builds the exact persisted selection from the server-side catalog", () => {
  assert.deepEqual(createActivationOfferSelection("PRODUCT_ONLY", "2026-08-12T15:00:00.000Z"), {
    offerCode: "PRODUCT_ONLY",
    offerSnapshot: {
      offerCode: "PRODUCT_ONLY",
      ecosystemTypes: ["PRODUCT"],
      amountCop: 180000,
      currency: "COP",
      billingType: "ONE_TIME",
      selectedAt: "2026-08-12T15:00:00.000Z"
    }
  });
});

test("forbids changing an offer or its snapshot after selection", () => {
  assert.equal(immutableActivationOfferFieldsSchema.safeParse({}).success, true);
  assert.equal(
    immutableActivationOfferFieldsSchema.safeParse({ offerCode: "PRODUCT_ONLY" }).success,
    false
  );
  assert.equal(immutableActivationOfferFieldsSchema.safeParse({ amountCop: 1 }).success, false);
});

test("accepts a matching offer and ecosystem combination", () => {
  assert.equal(resolveActivationOfferEcosystemType("PRODUCT_ONLY", "PRODUCT"), "PRODUCT");
});

test("derives the ecosystem when an individual offer omits it", () => {
  assert.equal(resolveActivationOfferEcosystemType("BUSINESS_ONLY", undefined), "BUSINESS");
  assert.equal(
    resolveActivationOfferEcosystemType("PERSONAL_BRAND_ONLY", undefined),
    "PERSONAL_BRAND"
  );
});

test("rejects an ecosystem that contradicts an individual offer", () => {
  assert.throws(
    () => resolveActivationOfferEcosystemType("BUSINESS_ONLY", "PRODUCT"),
    /BUSINESS_ONLY requires ecosystemType BUSINESS/
  );
});

test("PLAN_360 keeps all ecosystems in the snapshot and rejects a single ecosystemType", () => {
  assert.equal(resolveActivationOfferEcosystemType("PLAN_360", undefined), undefined);
  assert.throws(
    () => resolveActivationOfferEcosystemType("PLAN_360", "PRODUCT"),
    /PLAN_360 must not use a single ecosystemType/
  );
  assert.deepEqual(createActivationOfferSnapshot("PLAN_360").ecosystemTypes, [
    "PRODUCT",
    "BUSINESS",
    "PERSONAL_BRAND"
  ]);
});

test("preserves historical creation without an offer", () => {
  assert.equal(resolveActivationOfferEcosystemType(undefined, undefined), undefined);
  assert.equal(resolveActivationOfferEcosystemType(undefined, "BUSINESS"), "BUSINESS");
});
