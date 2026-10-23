import assert from "node:assert/strict";
import test from "node:test";
import {
  createBusinessDeliveryState,
  reduceBusinessDeliveryState,
  buildBusinessCommands,
  safeBusinessPreviewUrl,
  businessPollingDelay
} from "./master-sites-business-delivery-model.ts";
import type { MasterSitesBusinessReadResponse } from "../shared/master-sites-business-contract.ts";

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const revision = "a".repeat(64);
const templateRevision = "b".repeat(64);

function read(ids = [A, B]): MasterSitesBusinessReadResponse {
  return {
    template: { id: "ganomaster-business", ecosystemType: "BUSINESS", available: true, revision: templateRevision, previewUrl: "/preview/business", blockedReasons: [] },
    partners: ids.map((id, index) => ({
      activationLeadId: id,
      displayName: index === 0 ? "Ana" : "Bea",
      siteId: `partner-${index}-business`,
      publicHost: `negocio.partner${index}.example`,
      status: "READY" as const,
      blockedReasons: [],
      reviewRevision: revision,
      canPrepareTarget: false,
      canPublish: true,
      currentJob: null
    }))
  };
}

test("selection is empty after Business read and cannot exceed ten", () => {
  const ids = Array.from({ length: 11 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`);
  let state = reduceBusinessDeliveryState(createBusinessDeliveryState(), { type: "read", data: read(ids) });
  assert.deepEqual(state.selectedIds, []);
  for (const id of ids) state = reduceBusinessDeliveryState(state, { type: "toggle", id });
  assert.equal(state.selectedIds.length, 10);
  assert.equal(state.selectionError, "Puedes seleccionar hasta 10 partners.");
});

test("two confirmed rows create two single-partner commands with displayed revisions", () => {
  let state = reduceBusinessDeliveryState(createBusinessDeliveryState(), { type: "read", data: read() });
  state = reduceBusinessDeliveryState(state, { type: "toggle", id: A });
  state = reduceBusinessDeliveryState(state, { type: "toggle", id: B });
  const requestIds = [A, B];
  const commands = buildBusinessCommands(state, "publish", () => requestIds.shift()!);
  assert.equal(commands.length, 2);
  assert.deepEqual(commands.map(({ body }) => body), [
    { requestId: A, activationLeadId: A, templateId: "ganomaster-business", expectedRevision: revision, confirmation: "PUBLISH_SELECTED_BUSINESS_TEMPLATE", updateExisting: false },
    { requestId: B, activationLeadId: B, templateId: "ganomaster-business", expectedRevision: revision, confirmation: "PUBLISH_SELECTED_BUSINESS_TEMPLATE", updateExisting: false }
  ]);
});

test("success is not selected or resent after partial failure; lost-response retry reuses body", () => {
  let state = reduceBusinessDeliveryState(createBusinessDeliveryState(), { type: "read", data: read() });
  state = reduceBusinessDeliveryState(state, { type: "toggle", id: A });
  state = reduceBusinessDeliveryState(state, { type: "toggle", id: B });
  const [first, second] = buildBusinessCommands(state, "publish", () => A);
  state = reduceBusinessDeliveryState(state, { type: "result", command: first, result: { operationId: A, activationLeadId: A, siteId: "partner-0-business", publicHost: "negocio.partner0.example", outcome: "ENQUEUED", job: null, blockedReasons: [] } });
  state = reduceBusinessDeliveryState(state, { type: "uncertain", command: second });
  assert.deepEqual(state.selectedIds, [B]);
  assert.equal(state.results[A].status, "success");
  assert.equal(state.results[B].status, "uncertain");
  assert.deepEqual(state.results[B].command?.body, second.body);
  assert.deepEqual(buildBusinessCommands(state, "publish", () => B), []);
});

test("409 invalidates review until refreshed; stale data clears on access error", () => {
  let state = reduceBusinessDeliveryState(createBusinessDeliveryState(), { type: "read", data: read() });
  state = reduceBusinessDeliveryState(state, { type: "toggle", id: A });
  state = reduceBusinessDeliveryState(state, { type: "review", action: "publish" });
  assert.ok(state.review);
  state = reduceBusinessDeliveryState(state, { type: "conflict", id: A });
  assert.equal(state.review, null);
  assert.equal(state.needsRefresh, true);
  assert.deepEqual(buildBusinessCommands(state, "publish", () => A), []);
  state = reduceBusinessDeliveryState(state, { type: "error", error: "Acceso denegado", access: "forbidden" });
  assert.equal(state.data, null);
  assert.deepEqual(state.selectedIds, []);
  assert.equal(state.access, "forbidden");
});

test("CURRENT requires row-specific update confirmation", () => {
  const data = read([A]);
  data.partners[0].status = "CURRENT";
  let state = reduceBusinessDeliveryState(createBusinessDeliveryState(), { type: "read", data });
  state = reduceBusinessDeliveryState(state, { type: "toggle", id: A });
  assert.deepEqual(buildBusinessCommands(state, "publish", () => A), []);
  state = reduceBusinessDeliveryState(state, { type: "confirmUpdate", id: A, checked: true });
  const command = buildBusinessCommands(state, "publish", () => A)[0];
  assert.equal(command.body.confirmation, "PUBLISH_SELECTED_BUSINESS_TEMPLATE");
  assert.equal("updateExisting" in command.body && command.body.updateExisting, true);
});

test("preview rejects arbitrary external hosts and unsafe protocols", () => {
  assert.equal(safeBusinessPreviewUrl("/preview/business", "https://partnerhub.example"), "/preview/business");
  assert.equal(safeBusinessPreviewUrl("javascript:alert(1)", "https://partnerhub.example"), null);
  assert.equal(safeBusinessPreviewUrl("https://evil.example/preview", "https://partnerhub.example"), null);
  assert.equal(safeBusinessPreviewUrl("//evil.example/preview", "https://partnerhub.example"), null);
});

test("polling is bounded and only active for relevant jobs", () => {
  const data = read([A]);
  assert.equal(businessPollingDelay(data, 0), null);
  data.partners[0].currentJob = { id: revision, status: "QUEUED", phase: "QUEUED", attemptCount: 0, updatedAt: "2026-10-20T00:00:00.000Z" };
  assert.equal(businessPollingDelay(data, 0), 3000);
  assert.equal(businessPollingDelay(data, 10), 30000);
  data.partners[0].currentJob.status = "SUCCEEDED";
  assert.equal(businessPollingDelay(data, 0), null);
});

test("unchanged polling read preserves review but changed revision invalidates it", () => {
  let state = reduceBusinessDeliveryState(createBusinessDeliveryState(), { type: "read", data: read() });
  state = reduceBusinessDeliveryState(state, { type: "toggle", id: A });
  state = reduceBusinessDeliveryState(state, { type: "review", action: "publish" });
  state = reduceBusinessDeliveryState(state, { type: "read", data: read() });
  assert.ok(state.review);
  const changed = read();
  changed.partners[0].reviewRevision = "c".repeat(64);
  state = reduceBusinessDeliveryState(state, { type: "read", data: changed });
  assert.equal(state.review, null);
});

test("definite row failure requires fresh read before it can be selected again", () => {
  let state = reduceBusinessDeliveryState(createBusinessDeliveryState(), { type: "read", data: read([A]) });
  state = reduceBusinessDeliveryState(state, { type: "toggle", id: A });
  const command = buildBusinessCommands(state, "publish", () => A)[0];
  state = reduceBusinessDeliveryState(state, { type: "failed", command, error: "Solicitud rechazada" });
  assert.equal(state.needsRefresh, true);
  state = reduceBusinessDeliveryState(state, { type: "clearResult", id: A });
  assert.deepEqual(buildBusinessCommands(state, "publish", () => A), []);
  state = reduceBusinessDeliveryState(state, { type: "read", data: read([A]) });
  assert.equal(buildBusinessCommands(state, "publish", () => B).length, 1);
});

test("prepared target can be explicitly published after fresh READY read without repeating prepare", () => {
  const target = read([A]);
  target.partners[0].status = "TARGET_REQUIRED";
  target.partners[0].canPrepareTarget = true;
  target.partners[0].canPublish = false;
  let state = reduceBusinessDeliveryState(createBusinessDeliveryState(), { type: "read", data: target });
  state = reduceBusinessDeliveryState(state, { type: "toggle", id: A });
  const prepare = buildBusinessCommands(state, "prepare", () => A)[0];
  state = reduceBusinessDeliveryState(state, { type: "result", command: prepare, result: { operationId: A, activationLeadId: A, siteId: "partner-0-business", publicHost: "negocio.partner0.example", outcome: "TARGET_READY", job: null, blockedReasons: [] } });
  state = reduceBusinessDeliveryState(state, { type: "read", data: read([A]) });
  state = reduceBusinessDeliveryState(state, { type: "toggle", id: A });
  state = reduceBusinessDeliveryState(state, { type: "read", data: read([A]) });
  assert.deepEqual(state.selectedIds, [A]);
  assert.equal(buildBusinessCommands(state, "prepare", () => B).length, 0);
  assert.equal(buildBusinessCommands(state, "publish", () => B).length, 1);
});

test("failed GET hides partner data but preserves exact uncertain command for explicit retry", () => {
  let state = reduceBusinessDeliveryState(createBusinessDeliveryState(), { type: "read", data: read([A]) });
  state = reduceBusinessDeliveryState(state, { type: "toggle", id: A });
  const command = buildBusinessCommands(state, "publish", () => B)[0];
  state = reduceBusinessDeliveryState(state, { type: "uncertain", command });
  state = reduceBusinessDeliveryState(state, { type: "error", error: "Sin conexión" });
  assert.equal(state.data, null);
  assert.deepEqual(state.results[A].command.body, command.body);
  assert.equal(state.results[A].status, "uncertain");
  state = reduceBusinessDeliveryState(state, { type: "error", error: "Acceso denegado", access: "forbidden" });
  assert.deepEqual(state.results, {});
});

test("failed GET retains safe operation outcome without retaining partner read data", () => {
  let state = reduceBusinessDeliveryState(createBusinessDeliveryState(), { type: "read", data: read([A]) });
  state = reduceBusinessDeliveryState(state, { type: "toggle", id: A });
  const command = buildBusinessCommands(state, "publish", () => B)[0];
  state = reduceBusinessDeliveryState(state, { type: "result", command, result: { operationId: A, activationLeadId: A, siteId: "partner-0-business", publicHost: "negocio.partner0.example", outcome: "ENQUEUED", job: null, blockedReasons: [] } });
  state = reduceBusinessDeliveryState(state, { type: "error", error: "Sin conexión" });
  assert.equal(state.data, null);
  assert.equal(state.results[A].result?.outcome, "ENQUEUED");
});

test("unchanged polling read preserves CURRENT row update consent", () => {
  const data = read([A]);
  data.partners[0].status = "CURRENT";
  let state = reduceBusinessDeliveryState(createBusinessDeliveryState(), { type: "read", data });
  state = reduceBusinessDeliveryState(state, { type: "toggle", id: A });
  state = reduceBusinessDeliveryState(state, { type: "confirmUpdate", id: A, checked: true });
  state = reduceBusinessDeliveryState(state, { type: "read", data: structuredClone(data) });
  assert.deepEqual(state.updateConfirmedIds, [A]);
  assert.equal(buildBusinessCommands(state, "publish", () => B).length, 1);
});

test("a foreign partner result never marks the requested row successful", () => {
  let state = reduceBusinessDeliveryState(createBusinessDeliveryState(), { type: "read", data: read([A]) });
  state = reduceBusinessDeliveryState(state, { type: "toggle", id: A });
  const command = buildBusinessCommands(state, "publish", () => B)[0];
  state = reduceBusinessDeliveryState(state, { type: "result", command, result: { operationId: A, activationLeadId: B, siteId: "wrong-business", publicHost: "negocio.wrong.example", outcome: "ENQUEUED", job: null, blockedReasons: [] } });
  assert.equal(state.results[A].status, "uncertain");
  assert.equal(state.results[A].result, undefined);
  assert.deepEqual(state.results[A].command.body, command.body);
});
