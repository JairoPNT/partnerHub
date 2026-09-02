import assert from "node:assert/strict";
import test from "node:test";

import { buildBusinessWhatsappCta } from "./businessWhatsappCta.ts";

test("derives both Business CTAs from the validated WhatsApp identity", () => {
  const result = buildBusinessWhatsappCta({
    whatsappNumber: "+57 318 843 0283",
    defaultMessage: "Hola Jairo, quiero información & acompañamiento."
  }, {
    primaryText: " Conocer el negocio ",
    secondaryText: " Hablar con Jairo ",
    guaranteeText: " Sin compromiso ",
    directRegisterText: " Conocer el negocio "
  });
  const expected = `https://wa.me/573188430283?text=${encodeURIComponent("Hola Jairo, quiero información & acompañamiento.")}`;

  assert.equal(result.primaryUrl, expected);
  assert.equal(result.secondaryUrl, expected);
  assert.equal(result.directRegisterUrl, "");
  assert.equal(result.primaryText, "Conocer el negocio");
  assert.equal(result.secondaryText, "Hablar con Jairo");
  assert.equal(result.guaranteeText, "Sin compromiso");
  assert.equal(result.directRegisterText, "Conocer el negocio");
});

test("does not propagate source-supplied URLs or unrelated CTA fields", () => {
  const result = buildBusinessWhatsappCta({
    whatsappNumber: "573188430283",
    defaultMessage: "Hola Jairo"
  }, {
    primaryText: "Información",
    primaryUrl: "https://attacker.example/primary",
    secondaryUrl: "https://attacker.example/secondary",
    directRegisterUrl: "https://store.example/register",
    purchaseUrl: "https://store.example/product"
  } as never);

  assert.deepEqual(result, {
    primaryText: "Información",
    primaryUrl: "https://wa.me/573188430283?text=Hola%20Jairo",
    secondaryUrl: "https://wa.me/573188430283?text=Hola%20Jairo",
    directRegisterUrl: ""
  });
});

test("fails closed for an invalid number or empty message", () => {
  assert.throws(
    () => buildBusinessWhatsappCta({ whatsappNumber: "123", defaultMessage: "Hola" }),
    /BUSINESS_WHATSAPP_NUMBER_INVALID/
  );
  assert.throws(
    () => buildBusinessWhatsappCta({ whatsappNumber: "573188430283", defaultMessage: "   " }),
    /BUSINESS_WHATSAPP_MESSAGE_INVALID/
  );
});
