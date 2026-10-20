import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { productPageLeadSyncService } from "@/server/services/productPageLeadSyncService";
import { productPageSourceService } from "@/server/services/productPageSourceService";

// Catches the apex assignment in the real save path, including a second partner edit.
for (const [siteId, domain, expected] of [
  ["claudia-calero", "claudiacalero.pro", "producto.claudiacalero.pro"],
  ["jairo-pinto-product", " WWW.JairoPinto.Pro ", "producto.jairopinto.pro"],
  ["blanca-ruiz", "blancastella.pro", "producto.blancastella.pro"],
  ["dorian-higuita", "dorianhiguita.pro", "producto.dorianhiguita.pro"],
  ["lida-castaneda", "lidacastaneda.pro", "producto.lidacastaneda.pro"],
  ["yenny-garcia", "yennygarcia.pro", "producto.yennygarcia.pro"]
]) {
  test(`lead edits retain canonical Product host without renaming ${siteId}`, async (t) => {
    const root = await mkdtemp(join(tmpdir(), "product-lead-sync-"));
    const previous = process.env.PRODUCT_PAGE_SOURCE_DIR;
    process.env.PRODUCT_PAGE_SOURCE_DIR = root;
    t.after(async () => {
      if (previous === undefined) delete process.env.PRODUCT_PAGE_SOURCE_DIR;
      else process.env.PRODUCT_PAGE_SOURCE_DIR = previous;
      await rm(root, { recursive: true, force: true });
    });
    const original = {
      // Legacy sources legitimately omit ecosystemType.
      site: { id: siteId, domain: domain.trim().toLowerCase(), title: "Partner", baseDomain: "protected.example" },
      distributor: { brandName: "Partner", firstName: "Partner", fullName: "Partner Name", whatsappNumber: "573001234567", phoneNumber: "573001234567", displayPhone: "573001234567", purchaseUrl: "https://checkout.example/buy" },
      analytics: { measurementId: "G-ABC123" },
      integrations: { meta: { pixelId: "123456789" } },
      commercialState: { paid: true },
      hero: { desktop: "https://media.example/hero.webp" }
    };
    await productPageSourceService.save(siteId, original);
    const lead = { siteId, fullName: "Partner Name", brandName: "Partner", whatsapp: "573001234567", onboardingData: { domain } };
    const first = await productPageLeadSyncService.syncLeadToExistingSource(lead);
    assert.equal(first?.site.domain, expected);
    await productPageLeadSyncService.syncLeadToExistingSource(lead);
    const saved = await productPageSourceService.get(siteId) as typeof original;
    assert.equal(saved.site.id, siteId);
    assert.equal(saved.site.domain, expected);
    assert.equal(lead.onboardingData.domain, domain);
    assert.equal(saved.site.baseDomain, "protected.example");
    assert.deepEqual(saved.distributor, original.distributor);
    assert.deepEqual(saved.analytics, original.analytics);
    assert.deepEqual(saved.integrations.meta, original.integrations.meta);
    assert.deepEqual(saved.hero, original.hero);
    assert.deepEqual(saved.commercialState, original.commercialState);
  });
}

test("preserve-existing sync canonicalizes the selected source domain without switching tenants", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "product-lead-preserve-"));
  const previous = process.env.PRODUCT_PAGE_SOURCE_DIR;
  process.env.PRODUCT_PAGE_SOURCE_DIR = root;
  t.after(async () => {
    if (previous === undefined) delete process.env.PRODUCT_PAGE_SOURCE_DIR;
    else process.env.PRODUCT_PAGE_SOURCE_DIR = previous;
    await rm(root, { recursive: true, force: true });
  });
  await productPageSourceService.save("legacy-partner", {
    site: { id: "legacy-partner", domain: "www.producto.partner.pro", title: "Partner" },
    distributor: { brandName: "Partner", firstName: "Partner", fullName: "Partner Name", whatsappNumber: "573001234567" }
  });
  const result = await productPageLeadSyncService.syncLeadToExistingSource({
    siteId: "legacy-partner", fullName: "Partner Name", brandName: "Partner", whatsapp: "573001234567",
    onboardingData: { domain: "foreign.pro" }
  }, { overwriteExistingValues: false });
  assert.equal(result?.site.domain, "producto.partner.pro");
});

test("Product sync rejects an already prefixed base without writing a double prefix", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "product-lead-prefix-"));
  const previous = process.env.PRODUCT_PAGE_SOURCE_DIR;
  process.env.PRODUCT_PAGE_SOURCE_DIR = root;
  t.after(async () => {
    if (previous === undefined) delete process.env.PRODUCT_PAGE_SOURCE_DIR;
    else process.env.PRODUCT_PAGE_SOURCE_DIR = previous;
    await rm(root, { recursive: true, force: true });
  });
  await assert.rejects(productPageLeadSyncService.syncLeadToExistingSource({
    siteId: "legacy-partner", fullName: "Partner Name", brandName: "Partner", whatsapp: "573001234567",
    onboardingData: { domain: "producto.producto.partner.pro" }
  }));
  assert.equal(await productPageSourceService.get("legacy-partner"), null);
});

for (const [siteId, ecosystemType, domain] of [
  ["partner-business", "BUSINESS", "negocio.partner.pro"],
  ["partner-brand", "PERSONAL_BRAND", "partner.pro"],
  ["ganomaster", "PRODUCT", "product.ganomaster.pro"]
] as const) {
  test(`${ecosystemType} ${siteId} keeps its existing domain semantics`, async (t) => {
    const root = await mkdtemp(join(tmpdir(), "product-lead-exception-"));
    const previous = process.env.PRODUCT_PAGE_SOURCE_DIR;
    process.env.PRODUCT_PAGE_SOURCE_DIR = root;
    t.after(async () => {
      if (previous === undefined) delete process.env.PRODUCT_PAGE_SOURCE_DIR;
      else process.env.PRODUCT_PAGE_SOURCE_DIR = previous;
      await rm(root, { recursive: true, force: true });
    });
    await productPageSourceService.save(siteId, { ecosystemType, site: { id: siteId, domain, title: "Partner" }, distributor: {} });
    const result = await productPageLeadSyncService.syncLeadToExistingSource({ siteId, fullName: "Partner Name", brandName: "Partner", whatsapp: "573001234567", onboardingData: { domain } });
    assert.equal(result?.site.domain, domain);
    assert.equal(result?.ecosystemType, ecosystemType);
  });
}
