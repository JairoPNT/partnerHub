import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { test, type TestContext } from 'node:test';
import { productPageSourceService as sources } from './productPageSourceService.ts';
import { withBusinessPublicationSite, withoutBusinessPublicationSiteOwnership } from './businessPublicationSiteCoordinator.ts';

const profile = { hero: { headline: 'Conoce la actividad', subheadline: 'Información para decidir.' }, benefits: [{ title: 'Apoyo', description: 'Resuelve tus dudas.' }], theme: { fontPreset: 'modern', palettePreset: 'indigo-lime' }, dedicationText: 'La actividad requiere trabajo comercial.' };
const configuration = { ecosystemType: 'BUSINESS', site: { id: 'ana-business', domain: 'negocio.ana.pro', title: 'Ana' }, distributor: { brandName: 'Ana', fullName: 'Ana Perez', firstName: 'Ana', whatsappNumber: '573101234567' }, hero: {} };
async function setup(t: TestContext) {
  const root = await mkdtemp(resolve(tmpdir(), 'ph-content-source-'));
  const env = { ...process.env };
  Object.assign(process.env, { PRODUCT_PAGE_OUTPUT_DIR: root, PRODUCT_PAGE_SOURCE_DIR: resolve(root, '.sources') });
  t.after(async () => { process.env = env; await rm(root, { recursive: true, force: true }); });
  const target = resolve(root, '.sources/ana-business.json');
  await mkdir(resolve(root, '.sources'));
  return { root, target, update: (expectedSourceHash: string | null, sourceConfiguration: unknown = configuration) => sources.updateBusinessLandingContent({ siteId: 'ana-business', expectedSourceHash, sourceConfiguration, profile }) };
}
const hash = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');

test('creates first Business source from server configuration and preserves raw unrelated fields on update', async (t) => {
  const f = await setup(t);
  await f.update(null);
  assert.deepEqual(JSON.parse(await readFile(f.target, 'utf8')), { ...configuration, businessLandingContent: profile });
  const raw = { ...configuration, hero: { headline: 'master copy', desktop: 'https://media.test/a.webp' }, extra: { preserved: true }, distributor: { ...configuration.distributor, extension: 'keep' } };
  const bytes = JSON.stringify(raw);
  await writeFile(f.target, bytes);
  await f.update(hash(bytes));
  assert.deepEqual(JSON.parse(await readFile(f.target, 'utf8')), { ...raw, businessLandingContent: profile });
});

test('byte CAS rejects stale and absent expected source without changing file', async (t) => {
  const f = await setup(t); const bytes = JSON.stringify(configuration);
  await writeFile(f.target, bytes);
  await assert.rejects(f.update(null), /BUSINESS_CONTENT_SOURCE_CONFLICT/);
  await assert.rejects(f.update(hash(`${bytes}\n`)), /BUSINESS_CONTENT_SOURCE_CONFLICT/);
  assert.equal(await readFile(f.target, 'utf8'), bytes);
});

test('rejects mismatched identity and Product sources without modifying them', async (t) => {
  const f = await setup(t);
  for (const value of [{ ...configuration, ecosystemType: 'PRODUCT' }, { ...configuration, site: { ...configuration.site, id: 'bob-business' } }, { ...configuration, site: { ...configuration.site, domain: 'negocio.bob.pro' } }]) {
    const bytes = JSON.stringify(value); await writeFile(f.target, bytes);
    await assert.rejects(f.update(hash(bytes)), /BUSINESS_CONTENT_SOURCE_IDENTITY_INVALID/);
    assert.equal(await readFile(f.target, 'utf8'), bytes);
  }
  await assert.rejects(sources.updateBusinessLandingContent({ siteId: 'ana-product', expectedSourceHash: null, sourceConfiguration: configuration, profile }), /BUSINESS_SITE_IDENTITY_INVALID/);
});

test('uses existing Business lock and permits owned reentrant updates', async (t) => {
  const f = await setup(t);
  await withBusinessPublicationSite('ana-business', async () => {
    await withoutBusinessPublicationSiteOwnership(() => assert.rejects(f.update(null), /BUSINESS_SITE_BUSY/));
    await f.update(null);
  });
  assert.deepEqual(JSON.parse(await readFile(f.target, 'utf8')).businessLandingContent, profile);
});

test('rejects symlink source paths instead of reading or replacing external files', async (t) => {
  const f = await setup(t); const external = resolve(f.root, 'external.json');
  await writeFile(external, JSON.stringify(configuration));
  try { await symlink(external, f.target); } catch (error) { if ((error as NodeJS.ErrnoException).code === 'EPERM') return t.skip('Windows symlink privilege unavailable'); throw error; }
  await assert.rejects(f.update(hash(JSON.stringify(configuration))), /BUSINESS_CONTENT_SOURCE_PATH_INVALID/);
  assert.equal(await readFile(external, 'utf8'), JSON.stringify(configuration));
});

test('rejects source directory junctions before writing outside configured physical tree', async (t) => {
  const f = await setup(t); const external = resolve(f.root, 'external'); await mkdir(external);
  const linked = resolve(f.root, 'linked'); await symlink(external, linked, 'junction');
  process.env.PRODUCT_PAGE_SOURCE_DIR = linked;
  await assert.rejects(f.update(null), /BUSINESS_CONTENT_SOURCE_PATH_INVALID/);
  await assert.rejects(readFile(resolve(external, 'ana-business.json')), { code: 'ENOENT' });
});
