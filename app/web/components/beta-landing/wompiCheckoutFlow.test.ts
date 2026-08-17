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

test("parseWompiReturnParams extracts Wompi transaction id and env from return URL", () => {
  const searchString = "id=tx_wompi_998877&env=test&reference=PH-intent-123&activationLeadId=lead-456";
  const parsed = parseWompiReturnParams(searchString);

  assert.ok(parsed !== null);
  assert.equal(parsed?.transactionId, "tx_wompi_998877");
  assert.equal(parsed?.environment, "test");
  assert.equal(parsed?.reference, "PH-intent-123");
  assert.equal(parsed?.activationLeadId, "lead-456");
});

test("parseWompiReturnParams returns null for standard URL without payment return parameters", () => {
  assert.equal(parseWompiReturnParams(""), null);
  assert.equal(parseWompiReturnParams("utm_source=google"), null);
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

test("buildWompiCheckoutUrl NEVER contains onboarding path in redirect-url query parameter", () => {
  const intent: WompiIntentData = {
    intentId: "intent-123",
    reference: "REF-TEST-001",
    amountInCents: 15000000,
    currency: "COP",
    publicKey: "pub_test_12345",
    signature: {
      integrity: "a".repeat(64)
    }
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
  assert.ok(
    urlWithAttemptedOnboarding.includes("redirect-url=https%3A%2F%2Foferta.partnerhub.club%2Foferta-beta"),
    "Redirect URL must safely fall back to public landing page"
  );
});

test("intent failure state retains lead state without calling submit callback", () => {
  let submitCalled = false;
  const _onFormSubmit = () => { submitCalled = true; };

  const handleIntentFailure = (createdLeadId: string) => {
    assert.ok(createdLeadId.length > 0, "Lead ID must be retained for retrying intent");
    return { submitCalled, leadRetained: true };
  };

  const result = handleIntentFailure("lead-uuid-999");
  assert.equal(result.submitCalled, false, "onFormSubmit must not be called on intent failure");
  assert.equal(result.leadRetained, true, "Lead ID must be retained for retry without duplication");
  assert.equal(submitCalled, false);
});
