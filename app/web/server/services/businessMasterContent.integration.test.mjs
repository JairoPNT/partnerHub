import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import process from "node:process";
import { runInNewContext } from "node:vm";
import test from "node:test";
import { productPageGenerationService, productPageGenerationInputSchema } from "./productPageGenerationService.ts";
import { productPageSourceService } from "./productPageSourceService.ts";
import { partnerEcosystemEntitlementService } from "./partnerEcosystemEntitlementService.ts";
import { activationLeadService } from "./activationLeadService.ts";
import { productPageHistoryService } from "./productPageHistoryService.ts";
import { businessProductHeroCorrelationService } from "./businessProductHeroCorrelationService.ts";
import { prepareBusinessMeasurementFixture } from './businessMeasurement.test-fixtures.ts';
import { createMasterSitesBusinessPreviewService, masterSitesBusinessPreviewService } from './masterSitesBusinessPreviewService.ts';

const canonical = resolve("../../plantillas-de-pagina/business");
const input = (type = "BUSINESS") => productPageGenerationInputSchema.parse({
  ecosystemType: type, site: { id: `claudia-calero-${type.toLowerCase()}`, domain: "negocio.claudiacalero.pro", title: "Claudia Calero", metaDescription: "Negocio de Claudia Calero" },
  distributor: { brandName: "Claudia", firstName: "Claudia", fullName: "Claudia Calero", whatsappNumber: "573001234567" },
  integrations: { meta: { pixelId: "123456789" } }
});
const configAt = async (dir) => JSON.parse(runInNewContext(`${await readFile(resolve(dir, "config.js"), "utf8")}\nJSON.stringify(CONFIG)`, {}, { timeout: 1000 }));

test("Business generation and saved-source regeneration retain master content without master tenant settings", async (t) => {
  const leadId = '11111111-1111-4111-8111-111111111111';
  const root = await mkdtemp(resolve(tmpdir(), "ph-business-content-"));
  const oldEnv = { ...process.env };
  const restores = [];
  const replace = (object, key, value) => { const old = object[key]; object[key] = value; restores.push(() => { object[key] = old; }); };
  t.after(async () => { restores.reverse().forEach((restore) => restore()); process.env = oldEnv; await rm(root, { recursive: true, force: true }); });
  process.env.PRODUCT_PAGE_OUTPUT_DIR = root;
  process.env.PRODUCT_PAGE_SOURCE_DIR = resolve(root, ".sources");
  replace(partnerEcosystemEntitlementService, "get", async () => ({ activationLeadId: leadId, includedEcosystems: ["BUSINESS", "PRODUCT"] }));
  replace(activationLeadService, "updatePublicationStateBySiteId", async () => null);
  replace(productPageHistoryService, "append", async () => undefined);
  replace(businessProductHeroCorrelationService, "resolveForBusinessSite", async () => ({ desktop: "https://images.example/claudia-product.webp" }));
  const master = resolve(root, "ganomaster-business");
  await cp(canonical, master, { recursive: true });
  await mkdir(resolve(master, "tipografia"), { recursive: true });
  await prepareBusinessMeasurementFixture(t, master);
  const template = await configAt(master);
  const preview = createMasterSitesBusinessPreviewService({
    listLeads: async () => [{ id: leadId, siteId: 'claudia-calero', status: 'PAID', recordState: 'ACTIVE', fullName: 'Claudia Calero', brandName: 'Claudia', whatsapp: '573001234567', onboardingData: { domain: 'claudiacalero.pro', metaPixelId: '123456789' } }],
    getEntitlement: async () => ({ activationLeadId: leadId, commercialState: 'KNOWN', includedEcosystems: ['BUSINESS'], existingTargets: [] }),
    readTargets: async () => [], listJobs: async () => [], readJournals: async () => [], readSources: async () => [],
    readMaster: async () => ({ revision: 'a'.repeat(64), packageHash: 'b'.repeat(64), previewUrl: null, content: template })
  });
  assert.notEqual((await preview.getMeasurementAuthoritySnapshot(leadId)).input, null);
  replace(masterSitesBusinessPreviewService, 'getMeasurementAuthoritySnapshot', preview.getMeasurementAuthoritySnapshot);
  await writeFile(resolve(master, "config.js"), `const CONFIG = ${JSON.stringify({ ...template, distributor: { whatsappNumber: "19999999999" }, analytics: { measurementId: "G-MASTER" }, integrations: { meta: { pixelId: "99999999" } } })};`);
  const generated = await productPageGenerationService.generate(input());
  for (const configuration of [await configAt(generated.outputDirectory), await productPageSourceService.get(input().site.id)]) {
    assert.equal(configuration.benefits?.[0]?.title, "Socio Comercial Sólido");
    assert.equal(configuration.methodology?.steps?.[0]?.title, "Consume y Conecta");
    assert.equal(configuration.faq?.items?.length, 4);
    assert.equal(configuration.hero.headline, "Construye Libertad Financiera con un Hábito Diario");
    assert.equal(configuration.vsl.embedUrl, "https://media.partnerhub.club/comunes/business/v2/vsl/business-vsl-pilot-v2.mp4");
    assert.equal(configuration.vsl.thumbnailUrl, "https://images.example/claudia-product.webp");
    assert.equal(configuration.site.id, "claudia-calero-business");
    assert.equal(configuration.distributor.whatsappNumber, "573001234567");
    assert.match(configuration.cta.primaryUrl, /^https:\/\/wa.me\/573001234567\?text=/);
    assert.equal(configuration.integrations.meta.pixelId, "123456789");
    assert.doesNotMatch(JSON.stringify(configuration), /G-MASTER|19999999999|99999999/);
  }
  await productPageGenerationService.regenerateFromSavedSource(input().site.id);
  const regenerated = await configAt(generated.outputDirectory);
  assert.doesNotThrow(() => productPageGenerationInputSchema.parse(regenerated));
  assert.equal(regenerated.benefits[0].title, "Socio Comercial Sólido");
  assert.equal(regenerated.methodology.steps.length, 3);
  assert.equal(regenerated.faq.items.length, 4);
  assert.equal(regenerated.distributor.fullName, "Claudia Calero");
  await t.test("explicit partner VSL overrides the master and keeps the correlated poster", async () => {
    const override = { ...input(), vsl: { embedUrl: "https://video.example/partner.mp4", thumbnailUrl: "https://images.example/stale.webp" } };
    await productPageGenerationService.generate(override);
    const configuration = await configAt(generated.outputDirectory);
    assert.equal(configuration.vsl.embedUrl, "https://video.example/partner.mp4");
    assert.equal(configuration.vsl.thumbnailUrl, "https://images.example/claudia-product.webp");
  });

  await t.test("Product does not inherit Business presentation", async () => {
    await cp(master, resolve(root, "ganomaster"), { recursive: true });
    const product = await productPageGenerationService.generate(input("PRODUCT"));
    const configuration = await configAt(product.outputDirectory);
    assert.equal(configuration.benefits, undefined);
    assert.equal(configuration.vsl, undefined);
    assert.equal(configuration.hero.desktop, "https://media.partnerhub.club/comunes/producto/v1/hero-desktop.webp");
  });

  const malformedSections = [
    ["inherited desktop hero HTTP URL", { hero: { ...template.hero, desktop: "http://images.example/hero.webp" } }],
    ["inherited mobile hero HTTP URL", { hero: { ...template.hero, mobile: "http://images.example/mobile.webp" } }],
    ["VSL empty caption", { vsl: { ...template.vsl, caption: "" } }],
    ["VSL provider", { vsl: { ...template.vsl, provider: "unsupported" } }],
    ["VSL aspect ratio", { vsl: { ...template.vsl, aspectRatio: "9:16" } }],
    ["VSL autoplay type", { vsl: { ...template.vsl, autoPlay: "false" } }],
    ["comparison list", { comparison: { ...template.comparison, traditionalItems: "not an array" } }],
    ["methodology item", { methodology: { ...template.methodology, steps: [{}] } }],
    ["FAQ item", { faq: { ...template.faq, items: [{}] } }]
  ];
  for (const [name, section] of malformedSections) {
    await t.test(`rejects malformed ${name} before deleting the existing package`, async () => {
      const sentinel = resolve(generated.outputDirectory, "keep.txt");
      await writeFile(sentinel, "existing package");
      await writeFile(resolve(master, "config.js"), `const CONFIG=${JSON.stringify({ ...template, ...section })};`);
      await assert.rejects(productPageGenerationService.generate(input()), /BUSINESS_MASTER_CONFIGURATION/);
      assert.equal(await readFile(sentinel, "utf8"), "existing package");
    });
  }

  for (const [name, content] of [["foreign", "const CONFIG={ecosystemType:'PRODUCT',site:{id:'ganomaster'}};"], ["malformed", "const CONFIG={ecosystemType:'BUSINESS',site:{id:'ganomaster-business'},hero:{},benefits:[],comparison:{},methodology:{},faq:{},vsl:{}};"], ["invalid", "while(true){}"], ["missing", null]]) {
    await t.test(`${name} master fails before replacing an existing partner package`, async () => {
      const sentinel = resolve(generated.outputDirectory, "keep.txt");
      await writeFile(sentinel, "existing package");
      if (content === null) await rm(resolve(master, "config.js"));
      else await writeFile(resolve(master, "config.js"), content);
      await assert.rejects(productPageGenerationService.generate(input()), /BUSINESS_MASTER_CONFIGURATION/);
      assert.equal(await readFile(sentinel, "utf8"), "existing package");
    });
  }
});
