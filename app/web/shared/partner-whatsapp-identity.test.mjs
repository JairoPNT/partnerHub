import assert from "node:assert/strict";
import test from "node:test";
import { assertPartnerWhatsappIdentity, resolvePartnerWhatsappIdentity } from "./partner-whatsapp-identity.mjs";

test("rejects Jairo's exact valid-length conflicting WhatsApp values", () => {
  assert.deepEqual(resolvePartnerWhatsappIdentity({
    leadWhatsapp: "+573188430283",
    onboardingWhatsapp: "+5673188430283"
  }), {
    value: null,
    leadWhatsapp: "573188430283",
    onboardingWhatsapp: "5673188430283",
    conflict: true
  });
});

test("accepts the CEO-authorized E.164 representation after normalization", () => {
  assert.equal(resolvePartnerWhatsappIdentity({
    leadWhatsapp: "+573188430283",
    onboardingWhatsapp: "573188430283"
  }).value, "573188430283");
});

test("the write guard rejects the conflict with an explicit code", () => {
  assert.throws(() => assertPartnerWhatsappIdentity({
    leadWhatsapp: "+573188430283",
    onboardingWhatsapp: "+5673188430283"
  }), /PARTNER_WHATSAPP_CONFLICT/);
});
