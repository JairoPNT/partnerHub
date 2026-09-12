import assert from "node:assert/strict";
import test from "node:test";

import { planBusinessPosterPropagation } from "./businessProductHeroPropagationCore.ts";

const ownerKey = "f403f29e-95c8-4825-9320-967376443020";
const otherOwnerKey = "851a1c54-8866-4e50-946d-0e6fd332b777";

const targets = [
  { ownerKey, siteId: "client-product", ecosystemType: "PRODUCT" as const },
  { ownerKey, siteId: "client-business", ecosystemType: "BUSINESS" as const },
  { ownerKey: otherOwnerKey, siteId: "other-business", ecosystemType: "BUSINESS" as const }
];

const sources = {
  "client-product": {
    ecosystemType: "PRODUCT",
    hero: { desktop: "https://media.example.test/client-product.webp" }
  },
  "client-business": {
    ecosystemType: "BUSINESS",
    hero: {},
    vsl: { thumbnailUrl: "https://media.example.test/obsolete.webp", videoUrl: "https://video.example.test/vsl" }
  },
  "other-business": {
    ecosystemType: "BUSINESS",
    hero: {},
    vsl: { thumbnailUrl: "https://media.example.test/other-obsolete.webp" }
  }
};

test("refreshes only the same owner's Business source when the Product hero changes", () => {
  const plan = planBusinessPosterPropagation("client-product", targets, sources);

  assert.deepEqual(plan.map((entry) => entry.siteId), ["client-business"]);
  assert.equal(plan[0]?.configuration.vsl?.thumbnailUrl, "https://media.example.test/client-product.webp");
  assert.equal(plan[0]?.configuration.vsl?.videoUrl, "https://video.example.test/vsl");
  assert.equal(sources["client-business"].vsl.thumbnailUrl, "https://media.example.test/obsolete.webp");
});

test("does not refresh Business when its derived poster is already current", () => {
  const plan = planBusinessPosterPropagation("client-product", targets, {
    ...sources,
    "client-business": {
      ...sources["client-business"],
      vsl: { thumbnailUrl: "https://media.example.test/client-product.webp" }
    }
  });

  assert.deepEqual(plan, []);
});

test("does not derive a Business refresh without the exact Product target", () => {
  const plan = planBusinessPosterPropagation("client-product", targets.filter((target) => target.ecosystemType !== "PRODUCT"), sources);

  assert.deepEqual(plan, []);
});

test("fails closed when an owner has more than one Product target", () => {
  const plan = planBusinessPosterPropagation("client-product", [
    ...targets,
    { ownerKey, siteId: "stale-product", ecosystemType: "PRODUCT" as const }
  ], sources);

  assert.deepEqual(plan, []);
});

test("does not replace a Business poster when the Product source is unavailable", () => {
  const plan = planBusinessPosterPropagation("client-product", targets, {
    "client-business": sources["client-business"],
    "other-business": sources["other-business"]
  });

  assert.deepEqual(plan, []);
});
