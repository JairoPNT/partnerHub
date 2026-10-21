import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { createMasterSitesBusinessContentService } from './masterSitesBusinessContentService.ts';
import { contentFixture, anaId, bobId, profile } from './masterSitesBusinessContent.test-fixtures.ts';
import { buildMasterSitesBusinessInput } from './masterSitesBusinessInput.ts';
import { normalizeProductPageGenerationConfiguration } from './productPageGenerationService.ts';
import { withBusinessPublicationSite, withoutBusinessPublicationSiteOwnership } from './businessPublicationSiteCoordinator.ts';

test('GET projects null until saved; PUT carries profile into only the selected Business input and normalization', async (t) => {
  const f = await contentFixture(t); const service = createMasterSitesBusinessContentService(f);
  const before = await service.get(anaId);
  assert.deepEqual(before, { activationLeadId: anaId, displayName: 'Ana Perez', siteId: 'ana-business', publicHost: 'negocio.ana.pro', revision: (await f.preview.getPartner(anaId)).reviewRevision, profile: null });
  const saved = await service.put({ activationLeadId: anaId, expectedRevision: before.revision, profile });
  assert.notEqual(saved.revision, before.revision); assert.deepEqual(saved.profile, profile);
  assert.deepEqual(await service.get(anaId), saved);
  assert.equal((await service.get(bobId)).profile, null);
  const snapshot = await f.preview.getPartner(anaId);
  const input = buildMasterSitesBusinessInput(snapshot);
  assert.deepEqual(input.businessLandingContent, profile);
  assert.deepEqual(normalizeProductPageGenerationConfiguration(input).businessLandingContent, profile);
  assert.equal(input.site.id, 'ana-business'); assert.equal(input.distributor.whatsappNumber, '573101234567');
  assert.equal(input.distributor.purchaseUrl, undefined);
});

test('stale revision and substituted partner reject without overwriting either source', async (t) => {
  const f = await contentFixture(t); const service = createMasterSitesBusinessContentService(f);
  const before = await service.get(anaId);
  await assert.rejects(service.put({ activationLeadId: bobId, expectedRevision: before.revision, profile }), /MASTER_SITES_REVIEW_CONFLICT/);
  await service.put({ activationLeadId: anaId, expectedRevision: before.revision, profile });
  const path = resolve(f.directory, 'ana-business.json'); const bytes = await readFile(path, 'utf8');
  await assert.rejects(service.put({ activationLeadId: anaId, expectedRevision: before.revision, profile }), /MASTER_SITES_REVIEW_CONFLICT/);
  assert.equal(await readFile(path, 'utf8'), bytes);
  assert.equal((await service.get(bobId)).profile, null);
});

test('missing and ineligible partners fail closed; validated profiles cannot alter contact or site identity', async (t) => {
  const f = await contentFixture(t); const service = createMasterSitesBusinessContentService(f);
  await assert.rejects(service.get('33333333-3333-4333-8333-333333333333'), /MASTER_SITES_PARTNER_NOT_FOUND/);
  const before = await service.get(anaId);
  await assert.rejects(service.put({ activationLeadId: anaId, expectedRevision: before.revision, profile: { ...profile, siteId: 'bob-business' } } as never));
  f.state.eligible = false;
  await assert.rejects(service.get(anaId), /MASTER_SITES_CONTENT_BLOCKED/);
  await assert.rejects(service.put({ activationLeadId: anaId, expectedRevision: before.revision, profile }), /MASTER_SITES_CONTENT_BLOCKED/);
});

test('profile save preserves raw generated presentation and obtains fresh review under existing site lock', async (t) => {
  const f = await contentFixture(t); const service = createMasterSitesBusinessContentService(f);
  await service.put({ activationLeadId: anaId, expectedRevision: (await service.get(anaId)).revision, profile });
  const path = resolve(f.directory, 'ana-business.json');
  const source = JSON.parse(await readFile(path, 'utf8')); source.generatedPresentation = { title: 'preserve' }; source.hero.headline = 'master';
  await writeFile(path, JSON.stringify(source));
  const before = await service.get(anaId);
  await withBusinessPublicationSite('ana-business', async () => {
    await withoutBusinessPublicationSiteOwnership(() => assert.rejects(service.put({ activationLeadId: anaId, expectedRevision: before.revision, profile }), /BUSINESS_SITE_BUSY/));
    await service.put({ activationLeadId: anaId, expectedRevision: before.revision, profile: { ...profile, dedicationText: 'Consulta las tareas de la actividad.' } });
  });
  const after = JSON.parse(await readFile(path, 'utf8'));
  assert.deepEqual(after.generatedPresentation, { title: 'preserve' }); assert.equal(after.hero.headline, 'master');
});
