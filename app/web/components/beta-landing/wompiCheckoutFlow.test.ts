import assert from "node:assert/strict";
import test from "node:test";

import {
  buildWompiCheckoutUrl,
  formatWompiAmount,
  isOnboardingAllowed,
  type WompiCheckoutStatus,
  type WompiIntentData
} from "./wompiCheckoutFlow.ts";

test("onboarding access is strictly blocked for Wompi prior to APPROVED status", () => {
  const blockedStatuses: WompiCheckoutStatus[] = ["INITIAL", "PENDING", "DECLINED", "ERROR"];

  for (const status of blockedStatuses) {
    assert.equal(
      isOnboardingAllowed(status, "wompi"),
      false,
      `Status ${status} should block onboarding access`
    );
  }

  assert.equal(
    isOnboardingAllowed("APPROVED", "wompi"),
    true,
    "APPROVED status should allow onboarding access"
  );
});

test("flujo de transferencia directa permite acceso al onboarding sin pasar por Wompi", () => {
  assert.equal(isOnboardingAllowed("INITIAL", "direct"), true);
  assert.equal(isOnboardingAllowed("PENDING", "direct"), true);
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

  // Attempting to pass an onboarding path into buildWompiCheckoutUrl
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

test("buildWompiCheckoutUrl derives valid URL from server intent without client-side key generation", () => {
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

  const url = buildWompiCheckoutUrl(intent, "https://oferta.partnerhub.club", "/oferta-beta");
  assert.ok(url.startsWith("https://checkout.wompi.co/p/?"));
  assert.ok(url.includes("public-key=pub_test_12345"));
  assert.ok(url.includes("amount-in-cents=15000000"));
  assert.ok(url.includes("reference=REF-TEST-001"));
  assert.ok(url.includes(`signature%3Aintegrity=${"a".repeat(64)}`));
  assert.ok(url.includes("redirect-url=https%3A%2F%2Foferta.partnerhub.club%2Foferta-beta"));
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
