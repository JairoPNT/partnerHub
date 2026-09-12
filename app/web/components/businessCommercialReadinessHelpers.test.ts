import assert from "node:assert/strict";
import test from "node:test";

import {
  BUSINESS_READINESS_STATUS_CONFIG,
  BUSINESS_BLOCKED_REASON_LABELS,
  getReadinessStatusInfo,
  getBlockedReasonDescription,
  formatReadinessErrorMessage,
  fetchBusinessCommercialReadiness,
  createReadinessSessionManager,
  isReadinessForLead,
  getActiveReadiness,
  resolveReadinessViewProps,
  type BusinessReadinessStatus,
  type BusinessReadinessBlockedReason,
  type BusinessCommercialReadinessResponse
} from "./businessCommercialReadinessHelpers.ts";

test("BUSINESS_READINESS_STATUS_CONFIG defines all 5 standard readiness statuses", () => {
  const expectedStatuses: BusinessReadinessStatus[] = [
    "READY_FOR_PUBLICATION_PREVIEW",
    "PUBLICATION_CURRENT",
    "PUBLICATION_SCHEDULED",
    "RETRY_REQUIRED",
    "BLOCKED"
  ];

  for (const status of expectedStatuses) {
    const config = BUSINESS_READINESS_STATUS_CONFIG[status];
    assert.ok(config, `Missing config for status ${status}`);
    assert.ok(config.label.length > 0, `Missing label for ${status}`);
    assert.ok(config.badgeClass.length > 0, `Missing badgeClass for ${status}`);
    assert.ok(config.description.length > 0, `Missing description for ${status}`);
  }

  assert.equal(BUSINESS_READINESS_STATUS_CONFIG.BLOCKED.isBlocked, true);
  assert.equal(BUSINESS_READINESS_STATUS_CONFIG.READY_FOR_PUBLICATION_PREVIEW.isBlocked, false);
  assert.equal(BUSINESS_READINESS_STATUS_CONFIG.PUBLICATION_CURRENT.isBlocked, false);
  assert.equal(BUSINESS_READINESS_STATUS_CONFIG.PUBLICATION_SCHEDULED.isBlocked, false);
  assert.equal(BUSINESS_READINESS_STATUS_CONFIG.RETRY_REQUIRED.isBlocked, false);
});

test("BUSINESS_BLOCKED_REASON_LABELS maps all 10 contract blocked reasons to Spanish explanations", () => {
  const expectedReasons: BusinessReadinessBlockedReason[] = [
    "ACTIVATION_NOT_APPROVED",
    "ENTITLEMENT_NOT_FOUND",
    "BUSINESS_NOT_ENTITLED",
    "TARGET_NOT_FOUND",
    "TARGET_OWNERSHIP_MISMATCH",
    "TARGET_NOT_READY",
    "ARTIFACT_MISSING",
    "ARTIFACT_INVALID",
    "MASTER_PACKAGE_MISSING",
    "INVENTORY_UNAVAILABLE"
  ];

  for (const reason of expectedReasons) {
    const label = BUSINESS_BLOCKED_REASON_LABELS[reason];
    assert.ok(label, `Missing label for reason ${reason}`);
    assert.ok(label.length > 10, `Label too short for reason ${reason}`);
  }
});

test("getReadinessStatusInfo returns correct metadata and handles fallback", () => {
  const readyInfo = getReadinessStatusInfo("READY_FOR_PUBLICATION_PREVIEW");
  assert.equal(readyInfo.label, "Listo para revisión");
  assert.equal(readyInfo.isBlocked, false);

  const blockedInfo = getReadinessStatusInfo("BLOCKED");
  assert.equal(blockedInfo.label, "Bloqueado para publicación");
  assert.equal(blockedInfo.isBlocked, true);

  // Fallback for unknown status
  const unknownInfo = getReadinessStatusInfo("UNKNOWN_STATUS" as unknown as BusinessReadinessStatus);
  assert.equal(unknownInfo.label, "UNKNOWN_STATUS");
  assert.equal(unknownInfo.isBlocked, false);
});

test("getBlockedReasonDescription returns specific Spanish explanation or fallback", () => {
  const reasonText = getBlockedReasonDescription("BUSINESS_NOT_ENTITLED");
  assert.ok(reasonText.includes("Ecosistema de Negocio no incluido"));

  const fallback = getBlockedReasonDescription("CUSTOM_REASON");
  assert.equal(fallback, "Requisito no cumplido: CUSTOM_REASON");
});

test("formatReadinessErrorMessage returns Cloudflare Access error message for 401", () => {
  const msg401 = formatReadinessErrorMessage(401);
  assert.ok(msg401.includes("Cloudflare Access"));
  assert.ok(!msg401.includes("cortesía"));
});

test("formatReadinessErrorMessage returns 404 message", () => {
  const msg404 = formatReadinessErrorMessage(404);
  assert.ok(msg404.includes("No se encontró el registro del partner"));
});

test("formatReadinessErrorMessage returns fallback or custom error message for other codes", () => {
  const msg500Custom = formatReadinessErrorMessage(500, "Error interno del servidor");
  assert.equal(msg500Custom, "Error interno del servidor");

  const msg500Default = formatReadinessErrorMessage(500);
  assert.ok(msg500Default.includes("No se pudo consultar el estado"));
});

test("fetchBusinessCommercialReadiness returns parsed readiness data on 200 OK", async () => {
  const mockResponse = {
    status: "READY_FOR_PUBLICATION_PREVIEW" as const,
    blocked: false,
    blockedReasons: [],
    siteId: "partner-test-business",
    publicHost: "negocio.partner.pro",
    artifacts: null
  };

  const mockFetch: typeof fetch = async () =>
    new Response(JSON.stringify(mockResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  const data = await fetchBusinessCommercialReadiness({
    leadId: "lead-123",
    fetchFn: mockFetch
  });

  assert.equal(data.status, "READY_FOR_PUBLICATION_PREVIEW");
  assert.equal(data.siteId, "partner-test-business");
  assert.equal(data.blocked, false);
});

test("fetchBusinessCommercialReadiness throws formatted error on 401", async () => {
  const mockFetch: typeof fetch = async () =>
    new Response(JSON.stringify({ error: "UNAUTHORIZED" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });

  await assert.rejects(
    async () => {
      await fetchBusinessCommercialReadiness({
        leadId: "lead-123",
        fetchFn: mockFetch
      });
    },
    (err: Error) => {
      assert.ok(err.message.includes("Cloudflare Access"));
      return true;
    }
  );
});

test("createReadinessSessionManager discards stale response when partner selection changes out-of-order", async () => {
  // Simulate delay: Partner A is slow (40ms), Partner B is fast (5ms)
  const mockFetch: typeof fetch = async (input, init) => {
    const url = input.toString();
    const isPartnerA = url.includes("partner-A");
    const delay = isPartnerA ? 40 : 5;

    await new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, delay);
      if (init?.signal) {
        init.signal.addEventListener("abort", () => {
          clearTimeout(timer);
          const abortErr = new Error("The operation was aborted");
          abortErr.name = "AbortError";
          reject(abortErr);
        });
      }
    });

    const leadId = isPartnerA ? "partner-A" : "partner-B";
    const body = {
      status: isPartnerA ? "BLOCKED" : "PUBLICATION_CURRENT",
      blocked: isPartnerA,
      blockedReasons: isPartnerA ? ["BUSINESS_NOT_ENTITLED"] : [],
      siteId: `${leadId}-business`,
      publicHost: "negocio.partner.pro",
      artifacts: null
    };

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };

  const manager = createReadinessSessionManager(mockFetch);

  // User selects Partner A
  const promiseA = manager.request("partner-A");
  assert.equal(manager.getCurrentLeadId(), "partner-A");

  // User quickly switches to Partner B before Partner A completes
  const promiseB = manager.request("partner-B");
  assert.equal(manager.getCurrentLeadId(), "partner-B");

  const [resultA, resultB] = await Promise.all([promiseA, promiseB]);

  // Partner B's response is applied
  assert.ok(resultB !== null);
  assert.equal(resultB.siteId, "partner-B-business");
  assert.equal(resultB.status, "PUBLICATION_CURRENT");

  // Partner A's stale response was discarded (returns null)
  assert.equal(resultA, null);
});

test("createReadinessSessionManager cancels in-flight request on unmount", async () => {
  let wasAborted = false;
  const mockFetch: typeof fetch = async (_input, init) => {
    return new Promise((_resolve, reject) => {
      if (init?.signal) {
        init.signal.addEventListener("abort", () => {
          wasAborted = true;
          const abortErr = new Error("The operation was aborted");
          abortErr.name = "AbortError";
          reject(abortErr);
        });
      }
    });
  };

  const manager = createReadinessSessionManager(mockFetch);
  const promise = manager.request("partner-unmount");
  manager.cancel();

  assert.equal(manager.getCurrentLeadId(), null);
  assert.equal(wasAborted, true);

  const result = await promise;
  assert.equal(result, null);
});

test("getActiveReadiness guarantees Jairo state never renders while Claudia is selected, even during brief transitions", () => {
  const jairoState: BusinessCommercialReadinessResponse = {
    activationLeadId: "lead-jairo",
    status: "READY_FOR_PUBLICATION_PREVIEW",
    blocked: false,
    blockedReasons: [],
    siteId: "jairo-pinto-business",
    publicHost: "negocio.partner.pro",
    artifacts: null
  };

  const claudiaState: BusinessCommercialReadinessResponse = {
    activationLeadId: "lead-claudia",
    status: "BLOCKED",
    blocked: true,
    blockedReasons: ["BUSINESS_NOT_ENTITLED"],
    siteId: "claudia-business",
    publicHost: "negocio.partner.pro",
    artifacts: null
  };

  // 1. When Claudia is the selected lead, Jairo's state returns null synchronously
  const resultForClaudia = getActiveReadiness(jairoState, "lead-claudia");
  assert.equal(
    resultForClaudia,
    null,
    "Jairo's state must NEVER be returned while Claudia is selected"
  );
  assert.equal(isReadinessForLead(jairoState, "lead-claudia"), false);

  // 2. When Jairo is selected, Jairo's state returns valid
  const resultForJairo = getActiveReadiness(jairoState, "lead-jairo");
  assert.equal(resultForJairo?.siteId, "jairo-pinto-business");
  assert.equal(isReadinessForLead(jairoState, "lead-jairo"), true);

  // 3. When switching from Jairo to Claudia, before async fetch completes, Jairo's state is strictly hidden
  let currentSelectedLead: string = "lead-jairo";
  let activeData = getActiveReadiness(jairoState, currentSelectedLead);
  assert.equal(activeData?.siteId, "jairo-pinto-business");

  // Synchronous transition: user selects Claudia
  currentSelectedLead = "lead-claudia";
  // The UI re-evaluates activeReadiness in the exact same render pass
  activeData = getActiveReadiness(jairoState, currentSelectedLead);
  assert.equal(
    activeData,
    null,
    "During the transition render frame, Jairo's data must immediately evaluate to null"
  );

  // 4. Once Claudia's data arrives, only Claudia's state is returned
  activeData = getActiveReadiness(claudiaState, currentSelectedLead);
  assert.equal(activeData?.siteId, "claudia-business");
  assert.equal(activeData?.status, "BLOCKED");

  // 5. If Claudia is closed/deselected (leadId is null or undefined), state is null
  assert.equal(getActiveReadiness(claudiaState, null), null);
  assert.equal(getActiveReadiness(claudiaState, undefined), null);
  assert.equal(getActiveReadiness(null, "lead-claudia"), null);
});

test("fetchBusinessCommercialReadiness preserves and attaches activationLeadId to returned response", async () => {
  const mockFetch: typeof fetch = async () =>
    new Response(
      JSON.stringify({
        status: "PUBLICATION_CURRENT",
        blocked: false,
        blockedReasons: [],
        siteId: "claudia-business",
        publicHost: "negocio.partner.pro",
        artifacts: null
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  const result = await fetchBusinessCommercialReadiness({
    leadId: "lead-claudia",
    fetchFn: mockFetch
  });

  assert.equal(result.activationLeadId, "lead-claudia");
  assert.equal(isReadinessForLead(result, "lead-claudia"), true);
  assert.equal(isReadinessForLead(result, "lead-jairo"), false);
});

test("resolveReadinessViewProps guarantees Jairo readiness is never rendered for Claudia during transitions or delays", () => {
  const jairoState: BusinessCommercialReadinessResponse = {
    activationLeadId: "lead-jairo",
    status: "READY_FOR_PUBLICATION_PREVIEW",
    blocked: false,
    blockedReasons: [],
    siteId: "jairo-pinto-business",
    publicHost: "negocio.partner.pro",
    artifacts: null
  };

  const claudiaState: BusinessCommercialReadinessResponse = {
    activationLeadId: "lead-claudia",
    status: "BLOCKED",
    blocked: true,
    blockedReasons: ["BUSINESS_NOT_ENTITLED"],
    siteId: "claudia-business",
    publicHost: "negocio.partner.pro",
    artifacts: null
  };

  // Case 1: Jairo is currently selected, data matches -> DATA
  const jairoView = resolveReadinessViewProps({
    selectedLeadId: "lead-jairo",
    storedReadiness: jairoState,
    storedError: null,
    isNetworkLoading: false
  });
  assert.equal(jairoView.status, "DATA");
  assert.equal(jairoView.data?.siteId, "jairo-pinto-business");

  // Case 2: Operator switches selection to Claudia, but storedReadiness still has Jairo's data
  // Even if isNetworkLoading is false (before effect fires), status MUST BE "LOADING" and data MUST BE null
  const claudiaTransitionView = resolveReadinessViewProps({
    selectedLeadId: "lead-claudia",
    storedReadiness: jairoState,
    storedError: null,
    isNetworkLoading: false
  });
  assert.equal(claudiaTransitionView.status, "LOADING");
  assert.equal(claudiaTransitionView.data, null);
  assert.equal(claudiaTransitionView.error, null);

  // Case 3: Transition with network loading active
  const claudiaLoadingView = resolveReadinessViewProps({
    selectedLeadId: "lead-claudia",
    storedReadiness: jairoState,
    storedError: null,
    isNetworkLoading: true
  });
  assert.equal(claudiaLoadingView.status, "LOADING");
  assert.equal(claudiaLoadingView.data, null);

  // Case 4: Stored error is for Jairo, Claudia is selected -> status LOADING, error null (no error leakage)
  const claudiaWithErrorFromJairo = resolveReadinessViewProps({
    selectedLeadId: "lead-claudia",
    storedReadiness: null,
    storedError: { leadId: "lead-jairo", message: "Error de Jairo" },
    isNetworkLoading: false
  });
  assert.equal(claudiaWithErrorFromJairo.status, "LOADING");
  assert.equal(claudiaWithErrorFromJairo.data, null);
  assert.equal(claudiaWithErrorFromJairo.error, null);

  // Case 5: Claudia's fetch resolves successfully -> status DATA with Claudia's data
  const claudiaResolvedView = resolveReadinessViewProps({
    selectedLeadId: "lead-claudia",
    storedReadiness: claudiaState,
    storedError: null,
    isNetworkLoading: false
  });
  assert.equal(claudiaResolvedView.status, "DATA");
  assert.equal(claudiaResolvedView.data?.siteId, "claudia-business");
  assert.equal(claudiaResolvedView.data?.status, "BLOCKED");

  // Case 6: Claudia's fetch returns an error -> status ERROR with Claudia's error
  const claudiaErrorView = resolveReadinessViewProps({
    selectedLeadId: "lead-claudia",
    storedReadiness: null,
    storedError: { leadId: "lead-claudia", message: "Error consultando a Claudia" },
    isNetworkLoading: false
  });
  assert.equal(claudiaErrorView.status, "ERROR");
  assert.equal(claudiaErrorView.error, "Error consultando a Claudia");
  assert.equal(claudiaErrorView.data, null);

  // Case 7: Drawer closed or unselected (no lead selected) -> status EMPTY
  const emptyView = resolveReadinessViewProps({
    selectedLeadId: null,
    storedReadiness: claudiaState,
    storedError: null,
    isNetworkLoading: false
  });
  assert.equal(emptyView.status, "EMPTY");
  assert.equal(emptyView.data, null);
  assert.equal(emptyView.error, null);
});
