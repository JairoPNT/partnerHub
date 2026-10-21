import assert from 'node:assert/strict';
import { cp, mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';
import { contentFixture, anaId, profile } from './masterSitesBusinessContent.test-fixtures.ts';
import { createMasterSitesBusinessContentService } from './masterSitesBusinessContentService.ts';
import { buildMasterSitesBusinessInput } from './masterSitesBusinessInput.ts';
import { productPageGenerationService } from './productPageGenerationService.ts';
import { partnerEcosystemEntitlementService } from './partnerEcosystemEntitlementService.ts';
import { activationLeadService } from './activationLeadService.ts';
import { productPageHistoryService } from './productPageHistoryService.ts';
import { businessProductHeroCorrelationService } from './businessProductHeroCorrelationService.ts';

test('saved Business content reaches generated config.js and survives source regeneration without provider calls', async (t) => {
  const f = await contentFixture(t);
  const restores = [];
  const replace = (object, key, replacement) => { const original = object[key]; object[key] = replacement; restores.push(() => { object[key] = original; }); };
  t.after(() => restores.reverse().forEach((restore) => restore()));
  // Only local package generation is real; external authority/state collaborators
  // are replaced at their I/O boundaries and never create a runtime client.
  replace(partnerEcosystemEntitlementService, 'get', async ({ siteId }) => {
    assert.equal(siteId, 'ana-business'); return { activationLeadId: anaId, includedEcosystems: ['BUSINESS'] };
  });
  replace(activationLeadService, 'updatePublicationStateBySiteId', async () => null);
  replace(productPageHistoryService, 'append', async () => undefined);
  replace(businessProductHeroCorrelationService, 'resolveForBusinessSite', async () => ({}));
  const master = resolve(f.root, 'ganomaster-business');
  await cp(resolve('../../plantillas-de-pagina/business'), master, { recursive: true });
  await mkdir(resolve(master, 'tipografia'), { recursive: true });
  const content = createMasterSitesBusinessContentService(f);
  await content.put({ activationLeadId: anaId, expectedRevision: (await content.get(anaId)).revision, profile });
  const input = buildMasterSitesBusinessInput(await f.preview.getPartner(anaId));
  const generated = await productPageGenerationService.generate(input);
  const config = async () => JSON.parse(runInNewContext(`${await readFile(resolve(generated.outputDirectory, 'config.js'), 'utf8')}\nJSON.stringify(CONFIG)`, {}, { timeout: 1000 }));
  assert.deepEqual((await config()).businessLandingContent, profile);
  await productPageGenerationService.regenerateFromSavedSource('ana-business');
  const regenerated = await config();
  assert.deepEqual(regenerated.businessLandingContent, profile);
  assert.equal(regenerated.site.id, 'ana-business'); assert.equal(regenerated.site.domain, 'negocio.ana.pro');
  assert.equal(regenerated.distributor.whatsappNumber, '573101234567');
  assert.match(regenerated.cta.primaryUrl, /^https:\/\/wa.me\/573101234567/);
});
