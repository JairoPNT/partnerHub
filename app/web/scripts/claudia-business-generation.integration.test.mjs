import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import test from "node:test";

import { productPageGenerationInputSchema, productPageGenerationService } from "../server/services/productPageGenerationService.ts";
import { partnerEcosystemEntitlementService } from "../server/services/partnerEcosystemEntitlementService.ts";
import { activationLeadService } from "../server/services/activationLeadService.ts";
import { productPageHistoryService } from "../server/services/productPageHistoryService.ts";
import { prepareBusinessMeasurementFixture } from '../server/services/businessMeasurement.test-fixtures.ts';
import { createMasterSitesBusinessPreviewService, masterSitesBusinessPreviewService } from '../server/services/masterSitesBusinessPreviewService.ts';

test("Business generation and regeneration combine full master content with the same owner's legacy Product poster", async (t) => {
  const root = await mkdtemp(resolve(tmpdir(), "ph-claudia-business-integration-"));
  const oldEnvironment = { ...process.env };
  const restores = [];
  const replace = (object, key, value) => {
    const original = object[key];
    object[key] = value;
    restores.push(() => { object[key] = original; });
  };
  t.after(async () => {
    restores.reverse().forEach((restore) => restore());
    process.env = oldEnvironment;
    await rm(root, { recursive: true, force: true });
  });
  const sources = resolve(root, ".sources");
  const activation = resolve(root, ".activation");
  const targets = resolve(sources, ".publishing-targets");
  await mkdir(targets, { recursive: true });
  await mkdir(activation);
  process.env.PRODUCT_PAGE_OUTPUT_DIR = root;
  process.env.PRODUCT_PAGE_SOURCE_DIR = sources;
  process.env.PRODUCT_PAGE_ACTIVATION_DIR = activation;
  process.env.PRODUCT_PAGE_TEMPLATE_DIR = resolve('../../plantillas-de-pagina/producto');
  const ownerKey = "12345678-1234-4234-8234-123456789012";
  const lead = { id: ownerKey, siteId: 'claudia-calero', status: 'PAID', recordState: 'ACTIVE', fullName: 'Claudia Calero', brandName: 'Claudia Calero', whatsapp: '573001234567', onboardingData: { domain: 'claudiacalero.pro' } };
  await writeFile(resolve(activation, "leads.json"), JSON.stringify([
    lead
  ]));
  const productBytes = JSON.stringify({
    ecosystemType: "PRODUCT", site: { id: "claudia-calero", domain: "claudiacalero.pro" },
    hero: { desktop: "https://images.example.test/claudia-product.webp" }
  });
  const targetBytes = JSON.stringify({
    version: 2, ownerKey, siteId: "claudia-calero-business", ecosystemType: "BUSINESS", rootEcosystemType: 'PRODUCT', remoteRoot: '/home/fixture/public_html/negocio',
    baseDomain: "claudiacalero.pro", publicHost: "negocio.claudiacalero.pro", provisioningState: "READY", publicationState: "PENDING", dnsState: 'RESOLVED', sslState: 'READY'
  });
  await writeFile(resolve(sources, "claudia-calero.json"), productBytes);
  await writeFile(resolve(targets, "claudia-calero-business.json"), targetBytes);
  await cp(resolve("../../plantillas-de-pagina/business"), resolve(root, "ganomaster-business"), { recursive: true });
  await mkdir(resolve(root, "ganomaster-business/tipografia"), { recursive: true });
  await prepareBusinessMeasurementFixture(t, resolve(root, 'ganomaster-business'));
  const preview = createMasterSitesBusinessPreviewService({ listLeads: async () => [lead],
    getEntitlement: async () => ({ activationLeadId: ownerKey, commercialState: 'KNOWN', includedEcosystems: ['BUSINESS'], existingTargets: [] }) });
  const snapshot = await preview.getMeasurementAuthoritySnapshot(ownerKey);
  assert.notEqual(snapshot.input, null, snapshot.partner.blockedReasons.join(','));
  replace(masterSitesBusinessPreviewService, 'getMeasurementAuthoritySnapshot', preview.getMeasurementAuthoritySnapshot);
  replace(partnerEcosystemEntitlementService, "get", async () => ({ activationLeadId: ownerKey, includedEcosystems: ["BUSINESS"] }));
  replace(activationLeadService, "updatePublicationStateBySiteId", async () => null);
  replace(productPageHistoryService, "append", async () => undefined);
  const input = productPageGenerationInputSchema.parse({
    ecosystemType: "BUSINESS",
    site: { id: "claudia-calero-business", domain: "negocio.claudiacalero.pro", title: "Negocio de Claudia", metaDescription: "Presentación de negocio de Claudia Calero" },
    distributor: { brandName: "Claudia Calero", firstName: "Claudia", fullName: "Claudia Calero", whatsappNumber: "573001234567" }
  });
  await productPageGenerationService.generate(input);
  for (const attempt of ["initial", "regenerated"]) {
    if (attempt === "regenerated") await productPageGenerationService.regenerateFromSavedSource("claudia-calero-business");
    const source = await readFile(resolve(root, "claudia-calero-business/config.js"), "utf8");
    const configuration = JSON.parse(runInNewContext(`${source}\nJSON.stringify(CONFIG)`, {}, { timeout: 1000 }));
    assert.equal(configuration.benefits[0].title, "Socio Comercial Sólido");
    assert.ok(configuration.methodology.steps.length > 0);
    assert.ok(configuration.faq.items.length > 0);
    assert.equal(configuration.vsl.embedUrl, "https://media.partnerhub.club/comunes/business/v2/vsl/business-vsl-pilot-v2.mp4");
    assert.equal(configuration.vsl.thumbnailUrl, "https://images.example.test/claudia-product.webp");
    assert.equal(configuration.site.id, "claudia-calero-business");
    assert.match(configuration.cta.primaryUrl, /^https:\/\/wa\.me\/573001234567\?text=/);
    assert.equal(productPageGenerationInputSchema.safeParse(configuration).success, true);
  }
  assert.equal(await readFile(resolve(sources, "claudia-calero.json"), "utf8"), productBytes);
  assert.equal(await readFile(resolve(targets, "claudia-calero-business.json"), "utf8"), targetBytes);
});
