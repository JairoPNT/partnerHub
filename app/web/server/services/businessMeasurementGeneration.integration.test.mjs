import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import process from 'node:process';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { POST } from '../../app/api/internal/product-pages/generate/route.ts';
import { createBusinessMeasurementPreparer, businessMeasurementPreparer } from './businessMeasurementHtml.ts';
import { productPageGenerationService, productPageGenerationInputSchema } from './productPageGenerationService.ts';
import { productPageSourceService } from './productPageSourceService.ts';
import { partnerEcosystemEntitlementService } from './partnerEcosystemEntitlementService.ts';
import { createMasterSitesBusinessPreviewService, masterSitesBusinessPreviewService } from './masterSitesBusinessPreviewService.ts';
import { resolveBusinessMeasurementAuthority } from './businessMeasurementAuthority.ts';
import { activationLeadService } from './activationLeadService.ts';
import { productPageHistoryService } from './productPageHistoryService.ts';
import { businessProductHeroCorrelationService } from './businessProductHeroCorrelationService.ts';
import { applyMetaPixelToHtml } from './metaPixelHtml.ts';
import { publicationEventEnqueueService } from './publicationEventEnqueueService.ts';
import { businessProductHeroPropagationService } from './businessProductHeroPropagationService.ts';

const leadId = '11111111-1111-4111-8111-111111111111';
const html = '<html><head><link href="styles.css" rel="stylesheet"></head><body>\n<script src="config.js"></script><script src="measurement-runtime.js"></script><script src="app.js"></script></body></html>';
const app = 'window.fixtureApp = 1;'; const runtime = 'window.fixtureRuntime = 1;'; const css = 'body{color:black}';
const sha = value => createHash('sha256').update(value).digest('hex');
const artifact = { version: 1, indexHtmlSha256: sha(html), appJsSha256: sha(app), runtimeSha256: sha(runtime), stylesSha256: sha(css), providers: { ga4: true, meta: false } };
const originalMethods = new WeakMap();
function replace(t, object, key, value) {
  if (!originalMethods.has(t)) originalMethods.set(t, new Map());
  const originals = originalMethods.get(t);
  if (!originals.has(object)) originals.set(object, new Map());
  if (!originals.get(object).has(key)) {
    const previous = object[key]; originals.get(object).set(key, previous);
    t.after(() => { object[key] = previous; });
  }
  object[key] = value;
}
const input = () => productPageGenerationInputSchema.parse({ ecosystemType: 'BUSINESS', site: { id: 'ana-business', domain: 'wrong.example', title: 'Fixture', metaDescription: 'Fixture description' }, distributor: { brandName: 'Fixture', firstName: 'Ana', fullName: 'Ana Fixture', whatsappNumber: '573100000001' }, hero: {}, analytics: { measurementId: 'G-ATTACKER' }, integrations: { meta: { pixelId: '9999999999' } } });
const masterConfig = { ecosystemType: 'BUSINESS', site: { id: 'ganomaster-business' }, hero: { headline: 'Fixture', subheadline: 'Fixture' }, benefits: [{ title: 'Fixture', description: 'Fixture' }], comparison: { traditionalItems: ['A'], opportunityItems: ['B'] }, methodology: { steps: [{ title: 'Fixture', description: 'Fixture' }] }, faq: { items: [{ question: 'Fixture?', answer: 'Fixture' }] }, vsl: { provider: 'custom', embedUrl: 'https://media.example/video.mp4' }, analytics: { measurementId: 'G-MASTER' }, integrations: { meta: { pixelId: '8888888888' } }, businessMeasurement: { version: 1, expectedOrigin: 'https://forged.example', providers: { ga4: true, meta: true } } };

async function fixture(t, approved = true) {
  const root = await mkdtemp(resolve(tmpdir(), 'ph-measurement-gen-')); const sources = resolve(root, '.sources'); const master = resolve(root, 'ganomaster-business');
  await mkdir(sources); await mkdir(master); await mkdir(resolve(master, 'tipografia'));
  const oldEnv = { ...process.env }; Object.assign(process.env, { PRODUCT_PAGE_OUTPUT_DIR: root, PRODUCT_PAGE_SOURCE_DIR: sources });
  t.after(async () => { process.env = oldEnv; await rm(root, { recursive: true, force: true }); });
  for (const [name, value] of Object.entries({ 'index.html': applyMetaPixelToHtml(html, '1234567890'), 'app.js': app, 'measurement-runtime.js': runtime, 'styles.css': css, 'favicon.svg': '<svg/>', 'config.js': `const CONFIG = ${JSON.stringify(masterConfig)};` })) await writeFile(resolve(master, name), value);
  replace(t, businessMeasurementPreparer, 'prepare', createBusinessMeasurementPreparer({ approvedArtifacts: approved ? [artifact] : [] }).prepare);
  replace(t, partnerEcosystemEntitlementService, 'get', async () => ({ activationLeadId: leadId, includedEcosystems: ['BUSINESS', 'PRODUCT', 'PERSONAL_BRAND'] }));
  replace(t, activationLeadService, 'updatePublicationStateBySiteId', async () => null);
  replace(t, productPageHistoryService, 'append', async () => undefined);
  replace(t, businessProductHeroCorrelationService, 'resolveForBusinessSite', async () => ({}));
  const effects = { enqueue: 0, propagation: 0 };
  replace(t, publicationEventEnqueueService, 'afterSourceChange', async () => { effects.enqueue++; return { outcome: 'SKIPPED' }; });
  replace(t, businessProductHeroPropagationService, 'afterProductSourceChange', async () => { effects.propagation++; return { outcome: 'SKIPPED' }; });
  const authoritativeInput = input(); authoritativeInput.site.domain = 'negocio.ana.example'; authoritativeInput.analytics = { measurementId: 'G-ANAFIXTURE' }; authoritativeInput.integrations = { analytics: { provider: 'GA4', measurementId: 'G-ANAFIXTURE' }, meta: { pixelId: '1234500000' } };
  const snapshot = { activationLeadId: leadId, ownerKey: leadId, siteId: 'ana-business', publicHost: 'negocio.ana.example', lead: { id: leadId }, partner: { activationLeadId: leadId, siteId: 'ana-business', publicHost: 'negocio.ana.example', status: 'READY' }, entitlement: { activationLeadId: leadId, commercialState: 'KNOWN', includedEcosystems: ['BUSINESS'] }, input: authoritativeInput };
  replace(t, masterSitesBusinessPreviewService, 'getPartner', async id => { assert.equal(id, leadId); return snapshot; });
  replace(t, masterSitesBusinessPreviewService, 'getMeasurementAuthoritySnapshot', async id => { assert.equal(id, leadId); return snapshot; });
  const config = async (siteId = 'ana-business') => JSON.parse(runInNewContext(`${await readFile(resolve(root, siteId, 'config.js'), 'utf8')}\nJSON.stringify(CONFIG)`));
  return { root, sources, master, snapshot, config, effects };
}

const request = body => new globalThis.Request('https://app.partnerhub.club/api/internal/product-pages/generate', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://foreign.example' }, body: JSON.stringify(body) });

test('rejects_unapproved_before_mutation_in_real_generator', async t => {
  const f = await fixture(t, false); const output = resolve(f.root, 'ana-business'); await mkdir(output);
  await productPageSourceService.save('ana-business', input());
  const sourcePath = resolve(f.sources, 'ana-business.json'); const previousSource = await readFile(sourcePath);
  const sentinel = resolve(output, 'keep.txt'); await writeFile(sentinel, 'approved package'); const previous = await readFile(sentinel);
  let history = 0; replace(t, productPageHistoryService, 'append', async () => { history++; });
  // Invalid config must not be evaluated before artifact approval.
  await writeFile(resolve(f.master, 'config.js'), 'throw new Error("must not evaluate")');
  await assert.rejects(productPageGenerationService.generate(input()), /^Error: BUSINESS_MEASUREMENT_ARTIFACT_UNAPPROVED$/);
  const response = await POST(request(input())); assert.equal(response.status, 500); assert.deepEqual(await response.json(), { error: 'BUSINESS_MEASUREMENT_ARTIFACT_UNAPPROVED' });
  assert.deepEqual(await readFile(sourcePath), previousSource); assert.deepEqual(await readFile(sentinel), previous); assert.equal(history, 0);
  assert.deepEqual(f.effects, { enqueue: 0, propagation: 0 });
});

test('copies_validated_bytes_not_later_master_reads_in_real_generator', async t => {
  await fixture(t); const prepare = businessMeasurementPreparer.prepare;
  replace(t, businessMeasurementPreparer, 'prepare', async directory => {
    const prepared = await prepare(directory);
    for (const name of ['index.html', 'app.js', 'measurement-runtime.js', 'styles.css']) await writeFile(resolve(directory, name), 'unapproved later master bytes');
    return prepared;
  });
  const result = await productPageGenerationService.generate(input());
  assert.equal(await readFile(resolve(result.outputDirectory, 'app.js'), 'utf8'), app);
  assert.equal(await readFile(resolve(result.outputDirectory, 'measurement-runtime.js'), 'utf8'), runtime);
  assert.equal(await readFile(resolve(result.outputDirectory, 'styles.css'), 'utf8'), css);
  const output = await readFile(resolve(result.outputDirectory, 'index.html'), 'utf8');
  assert.doesNotMatch(output, /later master|facebook|noscript|fbq/);
  assert.match(output, /config\.js\?v=[^"']+.*measurement-runtime\.js\?v=[^"']+.*app\.js\?v=/);
  assert.ok(result.files.includes('measurement-runtime.js'));
  assert.ok(JSON.parse(await readFile(resolve(result.outputDirectory, 'manifest.json'), 'utf8')).files.includes('measurement-runtime.js'));
  assert.match(await readFile(resolve(result.outputDirectory, '.htaccess'), 'utf8'), /measurement-runtime/);
});

test('legacy_body_and_master_cannot_override_partner_measurement_ids', async t => {
  const f = await fixture(t);
  const bob = input(); bob.site.id = 'bob-business'; bob.analytics.measurementId = 'G-BOBFIXTURE'; bob.integrations.meta.pixelId = '2222200000';
  await productPageSourceService.save('bob-business', bob); const bobBefore = await readFile(resolve(f.sources, 'bob-business.json'));
  const hostile = input(); hostile.analytics.measurementId = 'G-BOBFIXTURE'; hostile.integrations.meta.pixelId = '2222200000';
  await productPageGenerationService.generate(hostile); const config = await f.config();
  assert.equal(config.site.domain, 'negocio.ana.example'); assert.equal(config.analytics.measurementId, 'G-ANAFIXTURE');
  assert.equal(config.integrations.analytics.measurementId, 'G-ANAFIXTURE'); assert.equal(config.integrations.meta.pixelId, '1234500000');
  const saved = await productPageSourceService.get('ana-business');
  assert.equal(saved.analytics.measurementId, 'G-ANAFIXTURE'); assert.doesNotMatch(JSON.stringify(saved), /G-ATTACKER|G-MASTER|9999999999|8888888888/);
  assert.deepEqual(await readFile(resolve(f.sources, 'bob-business.json')), bobBefore);
});

test('mismatched_lead_site_entitlement_fails_before_write', async t => {
  const f = await fixture(t); await productPageSourceService.save('ana-business', input());
  const sentinel = resolve(f.root, 'ana-business'); await mkdir(sentinel); await writeFile(resolve(sentinel, 'keep.txt'), 'unchanged');
  const before = await readFile(resolve(f.sources, 'ana-business.json'));
  f.snapshot.entitlement.activationLeadId = '22222222-2222-4222-8222-222222222222';
  await assert.rejects(productPageGenerationService.generate(input()), /BUSINESS_MEASUREMENT_AUTHORITY_INVALID/);
  assert.equal(await readFile(resolve(sentinel, 'keep.txt'), 'utf8'), 'unchanged'); assert.deepEqual(await readFile(resolve(f.sources, 'ana-business.json')), before);
});

test('fresh_onboarding_disable_overrides_saved_id', async t => {
  const f = await fixture(t); await productPageGenerationService.generate(input());
  delete f.snapshot.input.analytics; f.snapshot.input.integrations = {};
  await productPageGenerationService.regenerateFromSavedSource('ana-business'); const config = await f.config();
  assert.equal(config.analytics, undefined); assert.equal(config.integrations.analytics, undefined); assert.equal(config.integrations.meta, undefined);
});

test('source_master_and_http_cannot_override_release_policy', async t => {
  const f = await fixture(t); const forged = { version: 1, expectedOrigin: 'https://forged.example', providers: { ga4: true, meta: true } };
  const parsed = productPageGenerationInputSchema.parse({ ...input(), businessMeasurement: forged }); assert.equal(parsed.businessMeasurement, undefined);
  await productPageSourceService.save('ana-business', { ...input(), businessMeasurement: forged });
  const response = await POST(request({ ...input(), businessMeasurement: forged })); assert.equal(response.status, 201, JSON.stringify(await response.json()));
  assert.deepEqual((await f.config()).businessMeasurement, { version: 1, expectedOrigin: 'https://negocio.ana.example', providers: { ga4: true, meta: false } });
});

test('Business_master_never_resolves_partner_authority_and_disables_both_providers', async t => {
  const f = await fixture(t); replace(t, masterSitesBusinessPreviewService, 'getPartner', async () => { throw new Error('master must not resolve a partner'); });
  replace(t, masterSitesBusinessPreviewService, 'getMeasurementAuthoritySnapshot', async () => { throw new Error('master must not resolve a partner'); });
  const canonical = resolve(f.root, 'templates', 'business'); await cp(f.master, canonical, { recursive: true });
  process.env.PRODUCT_PAGE_TEMPLATE_DIR = resolve(f.root, 'templates', 'producto');
  const value = input(); value.site = { ...value.site, id: 'ganomaster-business', domain: 'master.example' };
  await productPageGenerationService.generate(value, { templateSource: 'canonical' }); const config = await f.config('ganomaster-business');
  assert.deepEqual(config.businessMeasurement, { version: 1, expectedOrigin: 'https://master.example', providers: { ga4: false, meta: false } });
  assert.equal(config.analytics, undefined); assert.equal(config.integrations.analytics, undefined); assert.equal(config.integrations.meta, undefined);
});

for (const ecosystemType of ['PRODUCT', 'PERSONAL_BRAND']) test(`${ecosystemType}_retains_previous_html_config_manifest_without_Business_asset`, async t => {
  const f = await fixture(t); const masterId = ecosystemType === 'PRODUCT' ? 'ganomaster' : 'ganomaster-personal-brand'; const master = resolve(f.root, masterId);
  await mkdir(master); await mkdir(resolve(master, 'tipografia'));
  const legacyHtml = '<html><head><link href="styles.css"></head><body><script src="config.js"></script><script src="app.js"></script></body></html>';
  for (const [name, value] of Object.entries({ 'index.html': legacyHtml, 'app.js': app, 'styles.css': css, 'favicon.svg': '<svg/>' })) await writeFile(resolve(master, name), value);
  replace(t, businessMeasurementPreparer, 'prepare', async () => { throw new Error('not a Business package'); });
  const value = input(); value.ecosystemType = ecosystemType; value.site.id = ecosystemType === 'PRODUCT' ? 'ana' : 'ana-personal-brand';
  const result = await productPageGenerationService.generate(value); const config = await f.config(value.site.id); const manifest = JSON.parse(await readFile(resolve(result.outputDirectory, 'manifest.json'), 'utf8'));
  assert.equal(config.businessMeasurement, undefined); assert.equal(config.analytics.measurementId, 'G-ATTACKER'); assert.equal(config.integrations.meta.pixelId, '9999999999');
  assert.deepEqual(manifest.files, ['index.html', 'styles.css', 'app.js', 'favicon.svg', '.htaccess', 'config.js', 'tipografia/']);
  assert.equal(await readFile(resolve(result.outputDirectory, 'index.html'), 'utf8'), applyMetaPixelToHtml(legacyHtml, '9999999999').replace(/(config\.js|styles\.css|app\.js)(["'])/g, `$1?v=${manifest.assetVersion}$2`));
  assert.doesNotMatch(await readFile(resolve(result.outputDirectory, '.htaccess'), 'utf8'), /measurement-runtime/);
});

test('approved_generation_preserves_fresh_PR226_profile_and_contact_identity', async t => {
  const f = await fixture(t); const original = input(); await productPageSourceService.save('ana-business', original);
  const profile = { hero: { headline: 'Fresh approved headline', subheadline: 'Fixture' }, benefits: [{ title: 'Fixture', description: 'Fixture' }], theme: { fontPreset: 'modern', palettePreset: 'indigo-lime' }, dedicationText: 'Fresh fixture profile' };
  const savedBytes = await readFile(resolve(f.sources, 'ana-business.json'));
  await productPageSourceService.updateBusinessLandingContent({ siteId: 'ana-business', expectedSourceHash: sha(savedBytes), sourceConfiguration: original, profile });
  await productPageGenerationService.generate({ ...original, businessLandingContent: { ...profile, dedicationText: 'Stale input' } });
  const config = await f.config(); const saved = await productPageSourceService.get('ana-business');
  assert.deepEqual(config.businessLandingContent, profile); assert.deepEqual(saved.businessLandingContent, profile);
  assert.equal(config.distributor.whatsappNumber, '573100000001'); assert.match(config.cta.primaryUrl, /^https:\/\/wa.me\/573100000001\?/);
});

async function runningAuthorityFixture(t) {
  const f = await fixture(t);
  const timestamp = '2026-10-21T12:00:00.000Z';
  const state = { entitled: true, jobs: [] };
  const job = {
    schemaVersion: 1, id: sha('running-job'), intentHash: sha('running-job'),
    intent: { schemaVersion: 1, operation: 'PUBLISH_PARTNER_ECOSYSTEM', ownerKey: leadId, ownerSiteId: 'ana', siteId: 'ana-business', ecosystemType: 'BUSINESS',
      baseDomain: 'ana.example', publicHost: 'negocio.ana.example', sourceHash: sha('source'), targetHash: sha('target'), masterPackageHash: sha('master') },
    status: 'RUNNING', phase: 'PREPARING_PACKAGE', revision: 2, attemptCount: 1,
    requestedBySubjectHash: sha('operator'), createdAt: timestamp, updatedAt: timestamp, evidence: [],
    lease: { tokenHash: sha('token'), workerHash: sha('worker'), acquiredAt: timestamp, expiresAt: '2026-10-21T12:05:00.000Z' }
  };
  state.jobs = [job];
  const lead = { id: leadId, siteId: 'ana', status: 'PAID', recordState: 'ACTIVE', fullName: 'Ana Fixture', brandName: 'Fixture', whatsapp: '573100000001',
    onboardingData: { domain: 'ana.example', analyticsMeasurementId: 'G-RUNNINGFIXTURE', metaPixelId: '1234500000' } };
  const preview = createMasterSitesBusinessPreviewService({
    listLeads: async () => [lead],
    getEntitlement: async () => ({ activationLeadId: leadId, commercialState: 'KNOWN', includedEcosystems: state.entitled ? ['BUSINESS'] : [], existingTargets: [] }),
    readTargets: async () => [], readJournals: async () => [], listJobs: async () => state.jobs,
    readSources: async () => Promise.all((await readdir(f.sources)).filter(name => name.endsWith('.json')).map(async name => {
      const bytes = await readFile(resolve(f.sources, name)); return { siteId: name.slice(0, -5), hash: sha(bytes), value: JSON.parse(bytes.toString()) };
    })),
    readMaster: async () => ({ revision: sha('master-revision'), packageHash: sha('master'), previewUrl: null, content: { hero: {}, vsl: { provider: 'custom', embedUrl: 'https://media.partnerhub.club/comunes/business/v1/vsl/business-vsl-fixture-v1.mp4' } } })
  });
  replace(t, masterSitesBusinessPreviewService, 'getMeasurementAuthoritySnapshot', preview.getMeasurementAuthoritySnapshot);
  const saved = input(); saved.site.domain = 'negocio.ana.example'; saved.integrations.googleAds = { conversionId: 'AW-FIXTURE' }; await productPageSourceService.save(saved.site.id, saved);
  return { ...f, preview, state, job, lead };
}

test('RUNNING_real_preview_snapshot_resolves_fresh_authority_and_regenerates_without_unlocking_UI', async t => {
  const f = await runningAuthorityFixture(t);
  const ui = await f.preview.getPartner(leadId); assert.equal(ui.partner.status, 'RUNNING'); assert.equal(ui.input, null);
  assert.equal(ui.partner.canPublish, false); assert.equal(ui.partner.canPrepareTarget, false);
  assert.deepEqual(await resolveBusinessMeasurementAuthority({ siteId: 'ana-business', activationLeadId: leadId }, { getPartner: f.preview.getMeasurementAuthoritySnapshot }), {
    expectedOrigin: 'https://negocio.ana.example', ga4MeasurementId: 'G-RUNNINGFIXTURE', metaPixelId: '1234500000'
  });
  await productPageGenerationService.regenerateFromSavedSource('ana-business');
  const config = await f.config(); assert.equal(config.analytics.measurementId, 'G-RUNNINGFIXTURE'); assert.equal(config.integrations.meta.pixelId, '1234500000');
  assert.deepEqual(config.integrations.googleAds, { conversionId: 'AW-FIXTURE' });
  const pinnedSource = await readFile(resolve(f.sources, 'ana-business.json'));
  await productPageGenerationService.regenerateFromSavedSource('ana-business');
  assert.deepEqual(await readFile(resolve(f.sources, 'ana-business.json')), pinnedSource, 'stable authority regeneration preserves source hash pins');
  f.lead.onboardingData.analyticsMeasurementId = ''; f.lead.onboardingData.metaPixelId = '';
  await productPageGenerationService.regenerateFromSavedSource('ana-business');
  const disabled = await f.config(); assert.equal(disabled.analytics, undefined); assert.equal(disabled.integrations.meta, undefined);
  assert.equal((await f.preview.getPartner(leadId)).input, null);
});

for (const reason of ['blocked', 'mismatched', 'ambiguous']) test(`RUNNING_real_preview_${reason}_rejects_before_source_package_or_history_mutation`, async t => {
  const f = await runningAuthorityFixture(t);
  if (reason === 'blocked') f.state.entitled = false;
  if (reason === 'mismatched') f.state.jobs = [{ ...f.job, intent: { ...f.job.intent, ownerKey: '22222222-2222-4222-8222-222222222222' } }];
  if (reason === 'ambiguous') f.state.jobs = [f.job, { ...f.job, id: sha('second-job'), intentHash: sha('second-job') }];
  const directory = resolve(f.root, 'ana-business'); await mkdir(directory); const sentinel = resolve(directory, 'keep.txt'); await writeFile(sentinel, 'approved package');
  const before = await readFile(resolve(f.sources, 'ana-business.json')); let history = 0; replace(t, productPageHistoryService, 'append', async () => { history++; });
  await assert.rejects(productPageGenerationService.regenerateFromSavedSource('ana-business'), /BUSINESS_MEASUREMENT_AUTHORITY_INVALID/);
  assert.deepEqual(await readFile(resolve(f.sources, 'ana-business.json')), before); assert.equal(await readFile(sentinel, 'utf8'), 'approved package'); assert.equal(history, 0);
});
