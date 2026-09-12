import assert from "node:assert/strict";
import test from "node:test";

import { executeBusinessPosterPropagation } from "./businessProductHeroPropagationExecutionCore.ts";

const ownerKey = "f403f29e-95c8-4825-9320-967376443020";
const otherOwnerKey = "851a1c54-8866-4e50-946d-0e6fd332b777";
const targets = [
  { ownerKey, siteId: "client-product", ecosystemType: "PRODUCT" as const },
  { ownerKey, siteId: "client-business", ecosystemType: "BUSINESS" as const },
  { ownerKey: otherOwnerKey, siteId: "other-business", ecosystemType: "BUSINESS" as const }
];
const sources = {
  "client-product": { ecosystemType: "PRODUCT", hero: { desktop: "https://media.example.test/new-hero.webp" } },
  "client-business": { site: { id: "client-business" }, ecosystemType: "BUSINESS", hero: {}, vsl: { thumbnailUrl: "https://media.example.test/old-hero.webp" } },
  "other-business": { site: { id: "other-business" }, ecosystemType: "BUSINESS", hero: {}, vsl: { thumbnailUrl: "https://media.example.test/other.webp" } }
};

test("regenerates and enqueues only the derived Business for the triggering Product", async () => {
  const reads: string[] = [];
  const generated: string[] = [];
  const enqueued: string[] = [];

  const result = await executeBusinessPosterPropagation("client-product", {
    listTargets: async () => targets,
    getSource: async (siteId) => { reads.push(siteId); return sources[siteId as keyof typeof sources] ?? null; },
    generate: async (configuration) => { generated.push(String((configuration.site as { id?: string }).id)); },
    afterSourceChange: async (siteId) => { enqueued.push(siteId); }
  });

  assert.deepEqual(reads.sort(), ["client-business", "client-product"]);
  assert.deepEqual(generated, ["client-business"]);
  assert.deepEqual(enqueued, ["client-business"]);
  assert.deepEqual(result, { outcome: "REFRESHED", refreshedSiteIds: ["client-business"], skippedCount: 0 });
});

test("does not regenerate or enqueue when the derived poster is current", async () => {
  const generated: string[] = [];
  const enqueued: string[] = [];
  const result = await executeBusinessPosterPropagation("client-product", {
    listTargets: async () => targets,
    getSource: async (siteId) => siteId === "client-business"
      ? { ...sources["client-business"], vsl: { thumbnailUrl: "https://media.example.test/new-hero.webp" } }
      : sources[siteId as keyof typeof sources] ?? null,
    generate: async (configuration) => { generated.push(String((configuration.site as { id?: string }).id)); },
    afterSourceChange: async (siteId) => { enqueued.push(siteId); }
  });

  assert.deepEqual(generated, []);
  assert.deepEqual(enqueued, []);
  assert.deepEqual(result, { outcome: "SKIPPED", refreshedSiteIds: [], skippedCount: 0 });
});

test("fails safely without enqueueing Business when regeneration fails", async () => {
  const enqueued: string[] = [];
  const result = await executeBusinessPosterPropagation("client-product", {
    listTargets: async () => targets,
    getSource: async (siteId) => sources[siteId as keyof typeof sources] ?? null,
    generate: async () => { throw new Error("generation failed"); },
    afterSourceChange: async (siteId) => { enqueued.push(siteId); }
  });

  assert.deepEqual(enqueued, []);
  assert.deepEqual(result, { outcome: "FAILED_SAFE", refreshedSiteIds: [], skippedCount: 1 });
});
