import assert from 'node:assert/strict';
import { cp, mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';
import { POST } from '../../app/api/internal/product-pages/generate/route.ts';
import { PATCH } from '../../app/api/internal/product-pages/[siteId]/route.ts';
import { contentFixture, anaId, profile } from './masterSitesBusinessContent.test-fixtures.ts';
import { createMasterSitesBusinessContentService } from './masterSitesBusinessContentService.ts';
import { buildMasterSitesBusinessInput } from './masterSitesBusinessInput.ts';
import { productPageGenerationService } from './productPageGenerationService.ts';
import { partnerEcosystemEntitlementService } from './partnerEcosystemEntitlementService.ts';
import { activationLeadService } from './activationLeadService.ts';
import { productPageHistoryService } from './productPageHistoryService.ts';
import { businessProductHeroCorrelationService } from './businessProductHeroCorrelationService.ts';
import { publicationEventEnqueueService } from './publicationEventEnqueueService.ts';
import { businessProductHeroPropagationService } from './businessProductHeroPropagationService.ts';
import { withBusinessPublicationSite } from './businessPublicationSiteCoordinator.ts';

const request = (method, body) => new globalThis.Request('https://app.partnerhub.club/api/internal/product-pages/generate', { method,
  headers: { Origin: 'https://foreign.test', 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const call = (method, body) => method === 'POST' ? POST(request(method, body)) : PATCH(request(method, body), { params: Promise.resolve({ siteId: body.site.id }) });
function replaceForTest(t, object, key, value) { const old = object[key]; object[key] = value; t.after(() => { object[key] = old; }); }
async function localGeneration(t) {
  const f = await contentFixture(t);
  replaceForTest(t, partnerEcosystemEntitlementService, 'get', async () => ({ activationLeadId: anaId, includedEcosystems: ['BUSINESS', 'PRODUCT', 'PERSONAL_BRAND'] }));
  replaceForTest(t, activationLeadService, 'updatePublicationStateBySiteId', async () => null);
  replaceForTest(t, productPageHistoryService, 'append', async () => undefined);
  replaceForTest(t, businessProductHeroCorrelationService, 'resolveForBusinessSite', async () => ({}));
  replaceForTest(t, publicationEventEnqueueService, 'afterSourceChange', async () => ({ outcome: 'SKIPPED' }));
  replaceForTest(t, businessProductHeroPropagationService, 'afterProductSourceChange', async () => ({ outcome: 'SKIPPED' }));
  const master = resolve(f.root, 'ganomaster-business');
  await cp(resolve('../../plantillas-de-pagina/business'), master, { recursive: true }); await mkdir(resolve(master, 'tipografia'), { recursive: true });
  const content = createMasterSitesBusinessContentService(f);
  const input = buildMasterSitesBusinessInput(await f.preview.getPartner(anaId));
  return { ...f, content, input, config: async () => JSON.parse(runInNewContext(`${await readFile(resolve(f.root, 'ana-business/config.js'), 'utf8')}\nJSON.stringify(CONFIG)`, {}, { timeout: 1000 })) };
}

for (const method of ['POST', 'PATCH']) test(`real legacy ${method} rejects explicit profiles before generation even without JWT and with foreign Origin`, async (t) => {
  const f = await contentFixture(t); const input = buildMasterSitesBusinessInput(await f.preview.getPartner(anaId));
  let generations = 0;
  replaceForTest(t, productPageGenerationService, 'generate', async () => { generations++; return { siteId: 'ana-business', previewUrl: '/preview', files: [] }; });
  replaceForTest(t, publicationEventEnqueueService, 'afterSourceChange', async () => ({ outcome: 'SKIPPED' }));
  replaceForTest(t, businessProductHeroPropagationService, 'afterProductSourceChange', async () => ({ outcome: 'SKIPPED' }));
  for (const businessLandingContent of [profile, null, {}]) {
    const response = await call(method, { ...input, businessLandingContent });
    assert.equal(response.status, 400, method);
  }
  assert.equal(generations, 0);
  assert.equal(await f.sources.get('ana-business'), null);
});

for (const method of ['POST', 'PATCH']) test(`legacy ${method} omission preserves the approved saved profile in source and generated config`, async (t) => {
  const f = await localGeneration(t);
  await f.content.put({ activationLeadId: anaId, expectedRevision: (await f.content.get(anaId)).revision, profile });
  const response = await call(method, f.input);
  assert.equal(response.status, method === 'POST' ? 201 : 200, JSON.stringify(await response.json()));
  assert.deepEqual((await f.sources.get('ana-business')).businessLandingContent, profile);
  assert.deepEqual((await f.config()).businessLandingContent, profile);
});

test('generation ignores stale server snapshots after a content update under the Business lock', async (t) => {
  const f = await localGeneration(t);
  await f.content.put({ activationLeadId: anaId, expectedRevision: (await f.content.get(anaId)).revision, profile });
  const stale = buildMasterSitesBusinessInput(await f.preview.getPartner(anaId));
  const current = { ...profile, dedicationText: 'Consulta el trabajo comercial y sus tareas.' };
  await withBusinessPublicationSite('ana-business', async () => {
    await f.content.put({ activationLeadId: anaId, expectedRevision: (await f.content.get(anaId)).revision, profile: current });
    // Poster propagation and replication both call this real shared generator
    // with previously composed source snapshots; neither owns content changes.
    await productPageGenerationService.generate(stale);
  });
  assert.deepEqual((await f.config()).businessLandingContent, current);
  assert.deepEqual((await f.sources.get('ana-business')).businessLandingContent, current);
});

test('generic source saves cannot insert erase or restore profiles outside the guarded content method', async (t) => {
  const f = await contentFixture(t); const input = buildMasterSitesBusinessInput(await f.preview.getPartner(anaId));
  await f.sources.save('ana-business', { ...input, businessLandingContent: profile });
  assert.equal((await f.sources.get('ana-business')).businessLandingContent, undefined);
  const content = createMasterSitesBusinessContentService(f);
  await content.put({ activationLeadId: anaId, expectedRevision: (await content.get(anaId)).revision, profile });
  await f.sources.save('ana-business', input);
  assert.deepEqual((await f.sources.get('ana-business')).businessLandingContent, profile);
  await f.sources.save('ana-business', { ...input, businessLandingContent: { ...profile, dedicationText: 'Texto obsoleto.' } });
  assert.deepEqual((await f.sources.get('ana-business')).businessLandingContent, profile);
});

test('a generic save cannot bypass Business profile authority by switching its ecosystem type', async (t) => {
  const f = await contentFixture(t); const input = buildMasterSitesBusinessInput(await f.preview.getPartner(anaId));
  const content = createMasterSitesBusinessContentService(f);
  await content.put({ activationLeadId: anaId, expectedRevision: (await content.get(anaId)).revision, profile });
  const before = await readFile(resolve(f.directory, 'ana-business.json'), 'utf8');
  await assert.rejects(f.sources.save('ana-business', { ...input, ecosystemType: 'PRODUCT' }), /BUSINESS_CONTENT_SOURCE_IDENTITY_INVALID/);
  assert.equal(await readFile(resolve(f.directory, 'ana-business.json'), 'utf8'), before);
});
