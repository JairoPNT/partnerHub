import assert from "node:assert/strict";
import test from "node:test";
import { fetchBusinessRead, sendBusinessCommand, BusinessDeliveryHttpError, BusinessDeliveryUncertainError } from "./master-sites-business-delivery-api.ts";

const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const revision = "a".repeat(64);

test("GET uses only Business endpoint and rejects non-JSON HTML without rendering it", async () => {
  let called = "";
  const fetcher = async (url: string) => { called = url; return new Response("<script>alert(1)</script>", { status: 200, headers: { "content-type": "text/html" } }); };
  await assert.rejects(fetchBusinessRead(fetcher as typeof fetch), (error: unknown) => error instanceof BusinessDeliveryHttpError && error.message === "La respuesta del servidor no fue válida. Actualiza e inténtalo de nuevo.");
  assert.equal(called, "/api/internal/master-sites/business");
});

test("POST sends strict one-partner body once and preserves 409 as a conflict", async () => {
  const body = { requestId: id, activationLeadId: id, templateId: "ganomaster-business" as const, expectedRevision: revision, confirmation: "PREPARE_SELECTED_BUSINESS_TARGET" as const };
  let actual: { url: string; options: RequestInit } = { url: "", options: {} };
  const fetcher = async (url: string, options: RequestInit) => {
    actual = { url, options };
    return Response.json({ error: "MASTER_SITES_REVIEW_REVISION_MISMATCH" }, { status: 409 });
  };
  await assert.rejects(sendBusinessCommand({ action: "prepare", body }, fetcher as typeof fetch), (error: unknown) => error instanceof BusinessDeliveryHttpError && error.status === 409);
  assert.equal(actual.url, "/api/internal/master-sites/business/prepare-target");
  assert.deepEqual(JSON.parse(String(actual.options.body)), body);
});

test("401 and 403 retain access meaning but never expose server markup", async () => {
  for (const status of [401, 403]) {
    const fetcher = async () => new Response("<h1>login</h1>", { status, headers: { "content-type": "text/html" } });
    await assert.rejects(fetchBusinessRead(fetcher as typeof fetch), (error: unknown) => error instanceof BusinessDeliveryHttpError && error.status === status && !error.message.includes("login"));
  }
});

test("POST 5xx, non-JSON, and malformed 2xx results are uncertain even when HTTP returned", async () => {
  const body = { requestId: id, activationLeadId: id, templateId: "ganomaster-business" as const, expectedRevision: revision, confirmation: "PREPARE_SELECTED_BUSINESS_TARGET" as const };
  for (const response of [Response.json({ error: "TEMPORARY" }, { status: 503 }), new Response("<html>gateway</html>", { status: 202, headers: { "content-type": "text/html" } }), Response.json({ outcome: "ENQUEUED" }, { status: 202 })]) {
    await assert.rejects(sendBusinessCommand({ action: "prepare", body }, (async () => response) as typeof fetch), BusinessDeliveryUncertainError);
  }
});
