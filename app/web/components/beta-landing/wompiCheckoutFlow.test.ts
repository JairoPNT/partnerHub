import assert from "node:assert/strict";
import test from "node:test";

import {
  buildWompiCheckoutUrl,
  buildWompiStatusQueryUrl,
  formatWompiAmount,
  isOnboardingAllowed,
  parseWompiReturnParams,
  type WompiCheckoutStatus,
  type WompiIntentData
} from "./wompiCheckoutFlow.ts";

test("onboarding access is strictly blocked for Wompi unless status === APPROVED AND paymentRecorded === true", () => {
  const blockedStatuses: WompiCheckoutStatus[] = ["INITIAL", "PENDING", "DECLINED", "VOIDED", "ERROR", "EXPIRED"];

  for (const status of blockedStatuses) {
    assert.equal(
      isOnboardingAllowed(status, "wompi", true),
      false,
      `Status ${status} should block onboarding access even if paymentRecorded is true`
    );
  }

  assert.equal(
    isOnboardingAllowed("APPROVED", "wompi", false),
    false,
    "APPROVED status MUST block onboarding if paymentRecorded is false"
  );

  assert.equal(
    isOnboardingAllowed("APPROVED", "wompi", true),
    true,
    "APPROVED status WITH paymentRecorded === true MUST allow onboarding access"
  );
});

test("flujo de transferencia directa permite acceso al onboarding sin pasar por Wompi", () => {
  assert.equal(isOnboardingAllowed("INITIAL", "direct"), true);
  assert.equal(isOnboardingAllowed("PENDING", "direct"), true);
});

test("buildWompiCheckoutUrl encodes correlation parameters (activationLeadId, reference, intentId) in redirect-url", () => {
  const intent: WompiIntentData = {
    intentId: "intent-uuid-100",
    reference: "PH-ref-200",
    amountInCents: 15000000,
    currency: "COP",
    publicKey: "pub_test_12345",
    signature: {
      integrity: "a".repeat(64)
    },
    activationLeadId: "lead-uuid-300"
  };

  const url = buildWompiCheckoutUrl(intent, "https://oferta.partnerhub.club", "/oferta-beta");
  const parsedUrl = new URL(url);
  const redirectUrlParam = parsedUrl.searchParams.get("redirect-url");

  assert.ok(redirectUrlParam !== null, "redirect-url query parameter must be present");
  const returnUrl = new URL(redirectUrlParam);

  assert.equal(returnUrl.searchParams.get("activationLeadId"), "lead-uuid-300");
  assert.equal(returnUrl.searchParams.get("reference"), "PH-ref-200");
  assert.equal(returnUrl.searchParams.get("intentId"), "intent-uuid-100");
});

test("buildWompiCheckoutUrl NEVER contains onboarding path in redirect-url query parameter", () => {
  const intent: WompiIntentData = {
    intentId: "intent-123",
    reference: "REF-TEST-001",
    amountInCents: 15000000,
    currency: "COP",
    publicKey: "pub_test_12345",
    signature: {
      integrity: "a".repeat(64)
    },
    activationLeadId: "lead-123"
  };

  const urlWithAttemptedOnboarding = buildWompiCheckoutUrl(
    intent,
    "https://oferta.partnerhub.club",
    "/onboarding/tok-secret-123"
  );

  assert.equal(
    urlWithAttemptedOnboarding.includes("onboarding"),
    false,
    "Checkout URL MUST NEVER contain the onboarding path parameter"
  );
});

test("parseWompiReturnParams does NOT convert Wompi transaction id into a PH- reference", () => {
  // Wompi return URL with ONLY id and env (no PartnerHub correlation)
  const wompiOnlyReturnUrl = "id=12345-6789-000&env=test";
  const parsed = parseWompiReturnParams(wompiOnlyReturnUrl);

  assert.equal(
    parsed,
    null,
    "Return URL without activationLeadId and reference MUST NOT be parsed into a PH reference"
  );
});

test("retorno sin correlacion (sin activationLeadId/reference) NO crea intent artificial ni usa montos fijos", () => {
  const searchString = "id=tx_998877&env=sandbox";
  const parsed = parseWompiReturnParams(searchString);

  assert.equal(parsed, null, "Uncorrelated return URL must return null so no artificial intent is created");
});

test("parseWompiReturnParams extracts valid correlated return parameters", () => {
  const correlatedReturnUrl = "id=tx_998877&env=test&reference=PH-intent-123&activationLeadId=lead-456&intentId=uuid-789";
  const parsed = parseWompiReturnParams(correlatedReturnUrl);

  assert.ok(parsed !== null);
  assert.equal(parsed?.transactionId, "tx_998877");
  assert.equal(parsed?.environment, "test");
  assert.equal(parsed?.reference, "PH-intent-123");
  assert.equal(parsed?.activationLeadId, "lead-456");
  assert.equal(parsed?.intentId, "uuid-789");
});

test("buildWompiStatusQueryUrl constructs exact GET endpoint with activationLeadId and reference or intentId", () => {
  const refUrl = buildWompiStatusQueryUrl("lead-123", { reference: "PH-ref-001" });
  assert.equal(refUrl, "/api/public/payments/wompi/status?activationLeadId=lead-123&reference=PH-ref-001");

  const intentUrl = buildWompiStatusQueryUrl("lead-123", { intentId: "uuid-intent-456" });
  assert.equal(intentUrl, "/api/public/payments/wompi/status?activationLeadId=lead-123&intentId=uuid-intent-456");
});

test("formatWompiAmount formats cents correctly in COP currency", () => {
  assert.equal(formatWompiAmount(15000000).replace(/\s/g, " "), "$ 150.000");
  assert.equal(formatWompiAmount(30000000).replace(/\s/g, " "), "$ 300.000");
});
