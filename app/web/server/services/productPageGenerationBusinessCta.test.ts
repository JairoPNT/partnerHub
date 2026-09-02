import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeProductPageGenerationConfiguration,
  productPageGenerationInputSchema
} from "./productPageGenerationService.ts";

function source(ecosystemType: "BUSINESS" | "PRODUCT" = "BUSINESS") {
  return {
    ecosystemType,
    site: {
      id: ecosystemType === "BUSINESS" ? "jairo-pinto-business" : "jairo-pinto-product",
      domain: ecosystemType === "BUSINESS" ? "negocio.jairopinto.pro" : "producto.jairopinto.pro",
      title: "Jairo Pinto"
    },
    distributor: {
      brandName: "Equipo Jairo Pinto",
      firstName: "Jairo",
      fullName: "Jairo Pinto",
      whatsappNumber: "+57 318 843 0283",
      defaultMessage: "Hola Jairo, quiero conocer tu proyecto."
    },
    hero: {},
    cta: {
      primaryText: "Conocer el negocio",
      secondaryText: "Hablar con Jairo",
      guaranteeText: "Información sin compromiso",
      directRegisterText: "Conocer el negocio",
      primaryUrl: "https://attacker.example/primary",
      secondaryUrl: "https://attacker.example/secondary",
      directRegisterUrl: "https://store.example/register"
    }
  };
}

test("the production normalizer emits guarded Business WhatsApp CTAs", () => {
  const parsed = productPageGenerationInputSchema.parse(source());
  const configuration = normalizeProductPageGenerationConfiguration(parsed);
  const expected = `https://wa.me/573188430283?text=${encodeURIComponent("Hola Jairo, quiero conocer tu proyecto.")}`;

  assert.deepEqual(configuration.cta, {
    primaryText: "Conocer el negocio",
    secondaryText: "Hablar con Jairo",
    guaranteeText: "Información sin compromiso",
    directRegisterText: "Conocer el negocio",
    primaryUrl: expected,
    secondaryUrl: expected,
    directRegisterUrl: ""
  });
  assert.doesNotMatch(JSON.stringify(configuration), /attacker\.example|store\.example/);
});

test("Product generation does not receive the Business CTA contract", () => {
  const parsed = productPageGenerationInputSchema.parse(source("PRODUCT"));
  const configuration = normalizeProductPageGenerationConfiguration(parsed);

  assert.equal("cta" in configuration, false);
});
