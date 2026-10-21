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

const profile = { hero: { headline: 'Actividad independiente', subheadline: 'Decide con información.' }, benefits: [{ title: 'Apoyo', description: 'Resuelve tus dudas.' }], theme: { fontPreset: 'modern', palettePreset: 'indigo-lime' }, dedicationText: 'Requiere trabajo comercial.' };

test('Business normalization preserves the validated landing profile without changing derived contact identity', () => {
  const parsed = productPageGenerationInputSchema.parse({ ...source(), businessLandingContent: profile });
  const configuration = normalizeProductPageGenerationConfiguration(parsed);
  assert.deepEqual(configuration.businessLandingContent, profile);
  assert.equal(configuration.distributor.whatsappNumber, '573188430283');
  assert.match(configuration.cta!.primaryUrl, /^https:\/\/wa.me\/573188430283/);
});

test('Product and Personal Brand reject Business profiles and retain existing normalized output without one', () => {
  for (const ecosystemType of ['PRODUCT', 'PERSONAL_BRAND']) {
    const value = { ...source('PRODUCT'), ecosystemType };
    assert.equal(productPageGenerationInputSchema.safeParse({ ...value, businessLandingContent: profile }).success, false);
    const configuration = normalizeProductPageGenerationConfiguration(productPageGenerationInputSchema.parse(value));
    assert.equal('businessLandingContent' in configuration, false);
    assert.equal(configuration.hero.desktop, 'https://media.partnerhub.club/comunes/producto/v1/hero-desktop.webp');
    assert.equal(configuration.hero.mobile, 'https://media.partnerhub.club/comunes/producto/v1/hero-mobile.webp');
  }
  assert.throws(() => normalizeProductPageGenerationConfiguration({ ...productPageGenerationInputSchema.parse(source('PRODUCT')), businessLandingContent: profile } as never));
});
