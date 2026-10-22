import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test, { type TestContext } from "node:test";
import { activationLeadService } from "@/server/services/activationLeadService";
import { productPageHistoryService } from "@/server/services/productPageHistoryService";
import { productPageSourceService } from "@/server/services/productPageSourceService";
import { acquireBusinessCutoverClosure, assertBusinessCutoverOwnership } from "@/server/services/businessCutoverClaimStore";
import { POST } from "./route.ts";

const request = (body: unknown) => new Request("http://localhost/api/internal/product-pages/verify", {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body)
});
async function fixture(t: TestContext) {
  const output = await mkdtemp(resolve(tmpdir(), "business-verify-route-"));
  const previous = { output: process.env.PRODUCT_PAGE_OUTPUT_DIR, source: process.env.PRODUCT_PAGE_SOURCE_DIR };
  process.env.PRODUCT_PAGE_OUTPUT_DIR = output; process.env.PRODUCT_PAGE_SOURCE_DIR = resolve(output, ".sources");
  t.after(async () => {
    t.mock.restoreAll();
    if (previous.output === undefined) delete process.env.PRODUCT_PAGE_OUTPUT_DIR; else process.env.PRODUCT_PAGE_OUTPUT_DIR = previous.output;
    if (previous.source === undefined) delete process.env.PRODUCT_PAGE_SOURCE_DIR; else process.env.PRODUCT_PAGE_SOURCE_DIR = previous.source;
    await rm(output, { recursive: true, force: true });
  });
  return output;
}

test("real_business_closure_returns_redacted_409_without_downstream_effects", async (t) => {
  const output = await fixture(t); const closure = await acquireBusinessCutoverClosure(output, randomUUID());
  const effects: string[] = [];
  t.mock.method(productPageSourceService, "get", async () => { effects.push("source"); throw new Error("must not read source"); });
  t.mock.method(productPageHistoryService, "append", async () => { effects.push("history"); });
  t.mock.method(activationLeadService, "updatePublicationStateBySiteId", async () => { effects.push("lead"); });
  t.mock.method(globalThis, "fetch", async () => { effects.push("fetch"); throw new Error("must not fetch"); });
  for (const siteId of ["ana-business", "ganomaster-business"]) {
    const response = await POST(request({ siteId }));
    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), { error: "BUSINESS_SITE_BUSY" });
  }
  assert.deepEqual(effects, []);
  await assert.rejects(readdir(resolve(output, ".sources")), { code: "ENOENT" });
  await assertBusinessCutoverOwnership(closure);
});

test("validation_and_unrelated_service_errors_keep_existing_statuses", async (t) => {
  await fixture(t);
  const invalid = await POST(request({ siteId: "../invalid" })); assert.equal(invalid.status, 400);
  assert.equal((await invalid.json()).error, "Invalid product page verification request");
  t.mock.method(productPageSourceService, "get", async () => { throw new Error("unrelated fixture failure"); });
  const failed = await POST(request({ siteId: "ana-product" }));
  assert.equal(failed.status, 500); assert.deepEqual(await failed.json(), { error: "unrelated fixture failure" });
});
