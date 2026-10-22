import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test, { type TestContext } from "node:test";

import { activationLeadService } from "./activationLeadService.ts";
import { productPageHistoryService } from "./productPageHistoryService.ts";
import { productPageSourceService } from "./productPageSourceService.ts";
import { productPageVerificationService } from "./productPageVerificationService.ts";
import { BusinessSiteBusyError, withBusinessPublicationSite } from "./businessPublicationSiteCoordinator.ts";
import { acquireBusinessCutoverClosure, assertBusinessCutoverOwnership } from "./businessCutoverClaimStore.ts";

const operationId = "33333333-3333-4333-8333-333333333333";

function source(siteId: string, ecosystemType = "BUSINESS") {
  return {
    ecosystemType,
    site: { id: siteId, domain: "business.example.com", title: "Example" },
    distributor: { brandName: "Example", firstName: "Ana", fullName: "Ana Example", whatsappNumber: "573188430283" },
    hero: { desktop: "https://media.example.com/desktop.webp", mobile: "https://media.example.com/mobile.webp" }
  };
}

async function fixture(t: TestContext) {
  const directory = await mkdtemp(resolve(tmpdir(), "business-verify-cutover-"));
  const before = { output: process.env.PRODUCT_PAGE_OUTPUT_DIR, source: process.env.PRODUCT_PAGE_SOURCE_DIR };
  process.env.PRODUCT_PAGE_OUTPUT_DIR = directory;
  process.env.PRODUCT_PAGE_SOURCE_DIR = resolve(directory, ".sources");
  t.after(async () => {
    t.mock.restoreAll();
    if (before.output === undefined) delete process.env.PRODUCT_PAGE_OUTPUT_DIR;
    else process.env.PRODUCT_PAGE_OUTPUT_DIR = before.output;
    if (before.source === undefined) delete process.env.PRODUCT_PAGE_SOURCE_DIR;
    else process.env.PRODUCT_PAGE_SOURCE_DIR = before.source;
    await rm(directory, { recursive: true, force: true });
  });
  const effects = { reads: [] as string[], fetches: [] as string[], history: [] as string[], leads: [] as string[] };
  let configuration = source("ana-business");
  t.mock.method(productPageSourceService, "get", async (siteId: string) => { effects.reads.push(siteId); return configuration; });
  t.mock.method(productPageHistoryService, "append", async (event: { siteId: string }) => { effects.history.push(event.siteId); });
  t.mock.method(activationLeadService, "updatePublicationStateBySiteId", async (siteId: string) => { effects.leads.push(siteId); });
  t.mock.method(globalThis, "fetch", async (url: string | URL | Request) => {
    effects.fetches.push(String(url));
    const path = new URL(String(url)).pathname;
    return new Response(path === "/config.js" ? `const CONFIG = ${JSON.stringify(configuration)};`
      : path === "/app.js" ? "initPurchaseLinks product-btn-buy"
        : '<button class="product-btn-buy"></button><script src="config.js?v=1"></script><script src="app.js?v=1"></script>', { status: 200 });
  });
  return { directory, effects, setSource(value: ReturnType<typeof source>) { configuration = value; } };
}

test("direct_business_verify_under_closure_has_zero_fetch_or_write", async (t) => {
  const { directory, effects } = await fixture(t);
  const closure = await acquireBusinessCutoverClosure(directory, operationId);
  for (const siteId of ["ana-business", "ganomaster-business"]) {
    await assert.rejects(productPageVerificationService.verify({ siteId }), BusinessSiteBusyError);
  }
  assert.deepEqual(effects, { reads: [], fetches: [], history: [], leads: [] });
  await assert.rejects(readdir(resolve(directory, ".sources")), { code: "ENOENT" });
  await assertBusinessCutoverOwnership(closure);
});

test("publish_nested_verify_can_drain", async (t) => {
  const { directory, effects } = await fixture(t);
  await withBusinessPublicationSite("ana-business", async () => {
    const closure = await acquireBusinessCutoverClosure(directory, operationId);
    const result = await productPageVerificationService.verify({ siteId: "ana-business" });
    assert.equal(result.status, "VERIFIED");
    assert.equal(effects.fetches.length, 3);
    assert.deepEqual(effects.history, ["ana-business"]);
    assert.deepEqual(effects.leads, ["ana-business"]);
    assert.equal(await readFile(resolve(directory, ".sources/.verifications/ana-business.json"), "utf8"), `${JSON.stringify(result, null, 2)}\n`);
    await assertBusinessCutoverOwnership(closure);
  });
  await assert.rejects(productPageVerificationService.verify({ siteId: "ana-business" }), BusinessSiteBusyError);
  assert.deepEqual(await readdir(resolve(directory, ".business-publication-site-claims")), []);
});

test("product_and_brand_unchanged", async (t) => {
  const { directory, effects, setSource } = await fixture(t);
  const closure = await acquireBusinessCutoverClosure(directory, operationId);
  for (const [siteId, ecosystemType] of [["ana-product", "PRODUCT"], ["ana-personal-brand", "PERSONAL_BRAND"]]) {
    setSource(source(siteId, ecosystemType));
    const result = await productPageVerificationService.verify({ siteId });
    assert.equal(result.status, "VERIFIED");
    assert.equal(result.checks.some((check) => check.name === "product_buy_button_present"), ecosystemType === "PRODUCT");
  }
  assert.equal(effects.fetches.length, 6);
  assert.deepEqual(effects.history, ["ana-product", "ana-personal-brand"]);
  assert.deepEqual(effects.leads, ["ana-product", "ana-personal-brand"]);
  await assertBusinessCutoverOwnership(closure);
  await assert.rejects(productPageVerificationService.verify({ siteId: "../ana-business" }));
  assert.equal(effects.reads.length, 2);
});

test("business_source_identity_is_checked_before_fetch_or_write", async (t) => {
  const { directory, effects, setSource } = await fixture(t);
  for (const value of [source("foreign-business"), source("ana-business", "PRODUCT"), source("ana-product", "BUSINESS")]) {
    setSource(value);
    const siteId = value.site.id === "ana-product" ? "ana-product" : "ana-business";
    await assert.rejects(productPageVerificationService.verify({ siteId }), /BUSINESS_.*IDENTITY_INVALID/);
  }
  assert.deepEqual(effects.fetches, []);
  assert.deepEqual(effects.history, []);
  assert.deepEqual(effects.leads, []);
  await assert.rejects(readdir(resolve(directory, ".sources")), { code: "ENOENT" });
});
