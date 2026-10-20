import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, readdir, writeFile, rm, link, symlink, rename } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { URL } from 'node:url';
import test from 'node:test';

const implementation = await import('./product-destination-reconcile.mjs').catch(() => ({}));
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const ownerKey = 'f403f29e-95c8-4825-9320-967376443020';
const now = new Date('2026-10-20T18:00:00.000Z');

export async function fixture(t, siteId = 'blanca-ruiz', baseDomain = 'blancastella.pro') {
  const root = await mkdtemp(join(tmpdir(), 'product-reconcile-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const outputDirectory = join(root, 'generated');
  const sourceDirectory = join(outputDirectory, '.sources');
  const source = join(sourceDirectory, `${siteId}.json`);
  const targets = join(sourceDirectory, '.publishing-targets');
  const target = join(targets, `${siteId}.json`);
  const activation = join(outputDirectory, '.activation');
  const jobs = join(outputDirectory, '.publication-jobs');
  for (const directory of [targets, activation, jobs, join(outputDirectory, siteId), join(sourceDirectory, '.verifications')]) await mkdir(directory, { recursive: true });
  const original = { site: { id: siteId, domain: baseDomain, unknownSiteField: 123 }, content: { unchanged: ['opaque', { x: true }] }, arbitraryLegacy: { preserve: null } };
  const bytes = JSON.stringify(original, null, 4) + '\n';
  await writeFile(source, bytes);
  await writeFile(join(activation, 'leads.json'), JSON.stringify([{ id: ownerKey, siteId: siteId === 'jairo-pinto-product' ? 'jairo-pinto' : siteId, status: 'NEW', onboardingData: { domain: baseDomain }, email: 'private@example.invalid', publicationState: 'VERIFIED' }]));
  await writeFile(join(outputDirectory, siteId, 'index.html'), '<h1>historical publication</h1>');
  await writeFile(join(sourceDirectory, '.verifications', `${siteId}.json`), '{"historical":true}');
  const manifest = { version: 1, ticket: 'CDX-20261020-022', siteId, ownerKey, baseDomain, expectedSourceHash: sha(bytes), expectedTargetState: 'ABSENT', evidence: {
    observedAt: now.toISOString(), evidenceSha256: 'a'.repeat(64),
    provider: { username: 'u708491435', baseDomain, publicHost: `producto.${baseDomain}`, remoteRoot: `/home/u708491435/domains/${baseDomain}/public_html/producto` },
    dns: { publicHost: `producto.${baseDomain}`, resolved: true },
    https: { url: `https://producto.${baseDomain}/`, status: 200 },
    rootRouting: { baseDomain, ecosystemType: siteId === 'claudia-calero' ? 'BUSINESS' : 'PRODUCT' }
  } };
  const manifestPath = join(root, 'reviewed-manifest.json');
  await writeFile(manifestPath, JSON.stringify(manifest));
  return { root, outputDirectory, sourceDirectory, source, target, targets, jobs, manifest, manifestPath, original, bytes, options: { outputDirectory, manifestPath, now: () => now } };
}

async function tree(directory) {
  const result = {};
  async function walk(path, prefix = '') {
    for (const entry of (await readdir(path, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const key = `${prefix}${entry.name}`;
      result[key] = entry.isDirectory() ? 'directory' : sha(await readFile(join(path, entry.name)));
      if (entry.isDirectory()) await walk(join(path, entry.name), `${key}/`);
    }
  }
  await walk(directory);
  return result;
}

test('PREVIEW is default, binds canonical destination, and changes zero filesystem bytes or entries', async (t) => {
  assert.equal(typeof implementation.runProductDestinationReconcile, 'function', 'reconcile entrypoint missing');
  const f = await fixture(t);
  const before = await tree(f.root);
  const result = await implementation.runProductDestinationReconcile(f.options);
  assert.equal(result.outcome, 'PREVIEW');
  assert.equal(result.plan.siteId, 'blanca-ruiz');
  assert.equal(result.plan.publicHost, 'producto.blancastella.pro');
  assert.equal(result.plan.remoteRoot, '/home/u708491435/domains/blancastella.pro/public_html/producto');
  assert.equal(result.plan.publicationState, 'PENDING');
  assert.match(result.planHash, /^[a-f0-9]{64}$/);
  assert.deepEqual(await tree(f.root), before);
  assert.equal(JSON.stringify(result).includes('private@example.invalid'), false);
  assert.equal(JSON.stringify(result).includes('arbitraryLegacy'), false);
});

test('derived Jairo identity requires unique matching raw lead domain without renaming source ID', async (t) => {
  const f = await fixture(t, 'jairo-pinto-product', 'jairopinto.pro');
  const result = await implementation.runProductDestinationReconcile(f.options);
  assert.equal(result.outcome, 'PREVIEW');
  assert.equal(result.plan.siteId, 'jairo-pinto-product');
});

for (const [name, modify] of [
  ['unknown manifest property', (m) => { m.quiesced = true; }],
  ['traversal identity', (m) => { m.siteId = '../blanca-ruiz'; }],
  ['wrong provider username', (m) => { m.evidence.provider.username = 'u0000'; }],
  ['foreign domain', (m) => { m.baseDomain = 'foreign.pro'; }],
  ['wrong provider root', (m) => { m.evidence.provider.remoteRoot += '/nested'; }],
  ['wrong root routing', (m) => { m.evidence.rootRouting.ecosystemType = 'PERSONAL_BRAND'; }],
  ['missing HTTPS evidence', (m) => { delete m.evidence.https; }],
  ['stale evidence', (m) => { m.evidence.observedAt = '2026-10-20T17:29:59.000Z'; }],
  ['future evidence', (m) => { m.evidence.observedAt = '2026-10-20T18:01:00.000Z'; }],
  ['stale source hash', (m) => { m.expectedSourceHash = '0'.repeat(64); }],
  ['wrong owner', (m) => { m.ownerKey = 'b403f29e-95c8-4825-9320-967376443020'; }]
]) test(`rejects ${name} without writes`, async (t) => {
  const f = await fixture(t); modify(f.manifest);
  await writeFile(f.manifestPath, JSON.stringify(f.manifest));
  const before = await tree(f.root);
  await assert.rejects(implementation.runProductDestinationReconcile(f.options), { code: /^PRODUCT_RECONCILE_/ });
  assert.deepEqual(await tree(f.root), before);
});

test('raw legacy target blocks without triggering read-time migration', async (t) => {
  const f = await fixture(t); await writeFile(f.target, '{"version":1,"historical":true}');
  const before = await tree(f.root);
  await assert.rejects(implementation.runProductDestinationReconcile(f.options), { code: 'PRODUCT_RECONCILE_TARGET_EXISTS' });
  assert.deepEqual(await tree(f.root), before);
});

test('duplicate JSON fields cannot smuggle alternate reviewed identity', async (t) => {
  const f = await fixture(t);
  await writeFile(f.manifestPath, JSON.stringify(f.manifest).replace('"version":1', '"version":2,"version":1'));
  await assert.rejects(implementation.runProductDestinationReconcile(f.options), { code: 'PRODUCT_RECONCILE_INVALID_JSON' });
});

test('hardlinked source and junction-linked source directory are rejected', async (t) => {
  const f = await fixture(t); await link(f.source, join(f.root, 'external-source.json'));
  await assert.rejects(implementation.runProductDestinationReconcile(f.options), { code: 'PRODUCT_RECONCILE_UNSAFE_FILE' });
  await rm(join(f.root, 'external-source.json'));
  await rename(f.sourceDirectory, join(f.root, 'external-sources'));
  await symlink(join(f.root, 'external-sources'), f.sourceDirectory, 'junction');
  await assert.rejects(implementation.runProductDestinationReconcile(f.options), { code: 'PRODUCT_RECONCILE_UNSAFE_DIRECTORY' });
});

test('APPLY requires exact hash and confirmation and blocks absent real runtime gate', async (t) => {
  const f = await fixture(t);
  const preview = await implementation.runProductDestinationReconcile(f.options);
  const before = await tree(f.root);
  await assert.rejects(implementation.runProductDestinationReconcile({ ...f.options, mode: 'APPLY' }), { code: 'PRODUCT_RECONCILE_CONFIRMATION_REQUIRED' });
  await assert.rejects(implementation.runProductDestinationReconcile({ ...f.options, mode: 'APPLY', expectedPlanHash: preview.planHash, confirmation: 'RECONCILE_PRODUCT_DESTINATION' }), { code: 'PRODUCT_RECONCILE_GATE_UNAVAILABLE' });
  assert.deepEqual(await tree(f.root), before);
});

test('CLI rejects unknown flags and quiesced bypass without exposing file contents', () => {
  const result = spawnSync(process.execPath, ['scripts/product-destination-reconcile.mjs', '--quiesced'], { cwd: new URL('..', import.meta.url), encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stdout, /PRODUCT_RECONCILE_INVALID_ARGUMENTS/);
});

for (const [name, change, code] of [
  ['duplicate lead', async (f) => { const p = join(f.outputDirectory, '.activation/leads.json'); const rows = JSON.parse(await readFile(p)); await writeFile(p, JSON.stringify([...rows, { ...rows[0], id: 'a403f29e-95c8-4825-9320-967376443020' }])); }, 'LEAD_IDENTITY'],
  ['same-domain product source', async (f) => { await writeFile(join(f.sourceDirectory, 'other-product.json'), JSON.stringify({ site: { id: 'other-product', domain: 'blancastella.pro' } })); }, 'SOURCE_COLLISION'],
  ['foreign target root overlap', async (f) => { await writeFile(join(f.targets, 'other-business.json'), JSON.stringify({ version: 2, siteId: 'other-business', ownerKey: 'a403f29e-95c8-4825-9320-967376443020', ecosystemType: 'BUSINESS', baseDomain: 'other.pro', publicHost: 'negocio.other.pro', remoteRoot: '/home/u708491435/domains/blancastella.pro/public_html' })); }, 'TARGET_ROOT_OVERLAP'],
  ['queued tenant job', async (f) => { await writeFile(join(f.jobs, `${'b'.repeat(64)}.json`), JSON.stringify({ status: 'QUEUED', intent: { siteId: 'blanca-ruiz' } })); }, 'ACTIVE_JOB'],
  ['orphan job claim', async (f) => { await mkdir(join(f.jobs, '.claims')); await writeFile(join(f.jobs, '.claims', `${'b'.repeat(64)}.json`), '{}'); }, 'ACTIVE_JOB_CLAIM'],
  ['orphan product claim', async (f) => { await mkdir(join(f.outputDirectory, '.product-mutation-claims', sha('blanca-ruiz')), { recursive: true }); }, 'ACTIVE_CLAIM'],
  ['orphan migration audit', async (f) => { await mkdir(join(f.outputDirectory, '.product-destination-reconcile', 'blanca-ruiz'), { recursive: true }); }, 'AUDIT_REQUIRES_REVIEW']
]) test(`blocks ${name}`, async (t) => {
  const f = await fixture(t); await change(f); const before = await tree(f.root);
  await assert.rejects(implementation.runProductDestinationReconcile(f.options), { code: `PRODUCT_RECONCILE_${code}` });
  assert.deepEqual(await tree(f.root), before);
});

test('custom source root cannot detach migration from application roots', async (t) => {
  const f = await fixture(t);
  await assert.rejects(implementation.runProductDestinationReconcile({ ...f.options, sourceDirectory: f.root }), { code: 'PRODUCT_RECONCILE_ROOT_CONFIG_MISMATCH' });
});

test('normalized same-domain lead under unrelated site ID blocks unique-looking exact owner', async (t) => {
  const f = await fixture(t); const path = join(f.outputDirectory, '.activation/leads.json');
  const rows = JSON.parse(await readFile(path));
  rows.push({ id: 'a403f29e-95c8-4825-9320-967376443020', siteId: 'unrelated-owner', onboardingData: { domain: 'HTTPS://BLANCASTELLA.PRO/' } });
  await writeFile(path, JSON.stringify(rows));
  await assert.rejects(implementation.runProductDestinationReconcile(f.options), { code: 'PRODUCT_RECONCILE_LEAD_IDENTITY' });
});

test('environment output override without matching application source defaults blocks', async (t) => {
  const f = await fixture(t);
  await assert.rejects(implementation.runProductDestinationReconcile({ manifestPath: f.manifestPath, now: f.options.now, environment: { PRODUCT_PAGE_OUTPUT_DIR: f.outputDirectory } }), { code: 'PRODUCT_RECONCILE_ROOT_CONFIG_MISMATCH' });
});

test('target directory absent blocks PREVIEW instead of discovering unsupported layout during APPLY', async (t) => {
  const f = await fixture(t); await rm(f.targets, { recursive: true });
  await assert.rejects(implementation.runProductDestinationReconcile(f.options), { code: 'PRODUCT_RECONCILE_TARGET_DIRECTORY_REQUIRED' });
});

for (const [name, change] of [
  ['source owner mismatch', (source) => { source.ownerKey = 'foreign-owner'; }],
  ['source site owner mismatch', (source) => { source.site.ownerKey = 'foreign-owner'; }],
  ['source identity mismatch', (source) => { source.site.id = 'other-person'; }],
  ['Business source', (source) => { source.ecosystemType = 'BUSINESS'; }],
  ['foreign source domain', (source) => { source.site.domain = 'foreign.pro'; }]
]) test(`blocks ${name} even when reviewed source hash matches`, async (t) => {
  const f = await fixture(t); change(f.original);
  const content = JSON.stringify(f.original); await writeFile(f.source, content);
  f.manifest.expectedSourceHash = sha(content); await writeFile(f.manifestPath, JSON.stringify(f.manifest));
  await assert.rejects(implementation.runProductDestinationReconcile(f.options), { code: /^PRODUCT_RECONCILE_/ });
});

test('malformed and oversized manifest cannot produce a plan', async (t) => {
  const f = await fixture(t);
  await writeFile(f.manifestPath, '{');
  await assert.rejects(implementation.runProductDestinationReconcile(f.options), { code: 'PRODUCT_RECONCILE_INVALID_JSON' });
  await writeFile(f.manifestPath, ' '.repeat(65537));
  await assert.rejects(implementation.runProductDestinationReconcile(f.options), { code: 'PRODUCT_RECONCILE_UNSAFE_FILE' });
});

for (const domain of ['BLANCASTELLA.PRO', 'blancastella.pro.', 'HTTPS://BLANCASTELLA.PRO/', 'PRODUCTO.BLANCASTELLA.PRO']) test(`normalized inventory source collision blocks ${domain}`, async (t) => {
  const f = await fixture(t);
  await writeFile(join(f.sourceDirectory, 'other-product.json'), JSON.stringify({ site: { id: 'other-product', domain } }));
  const before = await tree(f.root);
  await assert.rejects(implementation.runProductDestinationReconcile(f.options), { code: 'PRODUCT_RECONCILE_SOURCE_COLLISION' });
  assert.deepEqual(await tree(f.root), before);
});

for (const [publicHost, baseDomain] of [['PRODUCTO.BLANCASTELLA.PRO', 'foreign.pro'], ['producto.blancastella.pro.', 'foreign.pro'], ['negocio.foreign.pro', 'BLANCASTELLA.PRO']]) test(`normalized inventory target identity blocks ${publicHost}/${baseDomain}`, async (t) => {
  const f = await fixture(t);
  await writeFile(join(f.targets, 'other-business.json'), JSON.stringify({ version: 2, ownerKey: 'a403f29e-95c8-4825-9320-967376443020', siteId: 'other-business', ecosystemType: 'BUSINESS', baseDomain, publicHost, remoteRoot: null }));
  const before = await tree(f.root);
  await assert.rejects(implementation.runProductDestinationReconcile(f.options), { code: 'PRODUCT_RECONCILE_TARGET_COLLISION' });
  assert.deepEqual(await tree(f.root), before);
});

test('same canonical Product host under a Business source identity still blocks', async (t) => {
  const f = await fixture(t);
  await writeFile(join(f.sourceDirectory, 'other-business.json'), JSON.stringify({ ecosystemType: 'BUSINESS', site: { id: 'other-business', domain: 'PRODUCTO.BLANCASTELLA.PRO' } }));
  await assert.rejects(implementation.runProductDestinationReconcile(f.options), { code: 'PRODUCT_RECONCILE_SOURCE_COLLISION' });
});

test('legitimate Jairo Brand apex source and same-owner Business target remain distinct from Product', async (t) => {
  const f = await fixture(t, 'jairo-pinto-product', 'jairopinto.pro');
  await writeFile(join(f.sourceDirectory, 'jairo-pinto.json'), JSON.stringify({ ownerKey, ecosystemType: 'PERSONAL_BRAND', site: { id: 'jairo-pinto', domain: 'JAIROPINTO.PRO' } }));
  await writeFile(join(f.targets, 'jairo-pinto-business.json'), JSON.stringify({ version: 2, ownerKey, siteId: 'jairo-pinto-business', ecosystemType: 'BUSINESS', baseDomain: 'JAIROPINTO.PRO', publicHost: 'NEGOCIO.JAIROPINTO.PRO', remoteRoot: null }));
  const before = await tree(f.root);
  assert.equal((await implementation.runProductDestinationReconcile(f.options)).outcome, 'PREVIEW');
  assert.deepEqual(await tree(f.root), before);
});

for (const domain of [null, 123, {}, 'blancastella.pro:443']) test(`ambiguous inventory source domain blocks ${JSON.stringify(domain)}`, async (t) => {
  const f = await fixture(t);
  await writeFile(join(f.sourceDirectory, 'other-product.json'), JSON.stringify({ site: { id: 'other-product', domain } }));
  await assert.rejects(implementation.runProductDestinationReconcile(f.options), { code: 'PRODUCT_RECONCILE_SOURCE_INVENTORY_AMBIGUOUS' });
});

for (const [publicHost, baseDomain] of [[123, 'foreign.pro'], ['negocio.foreign.pro', null], ['PRODUCTO.BLANCASTELLA.PRO:443', 'foreign.pro']]) test(`ambiguous inventory target DNS fields block ${JSON.stringify([publicHost, baseDomain])}`, async (t) => {
  const f = await fixture(t);
  await writeFile(join(f.targets, 'other-business.json'), JSON.stringify({ version: 2, ownerKey: 'a403f29e-95c8-4825-9320-967376443020', siteId: 'other-business', ecosystemType: 'BUSINESS', baseDomain, publicHost, remoteRoot: null }));
  await assert.rejects(implementation.runProductDestinationReconcile(f.options), { code: 'PRODUCT_RECONCILE_TARGET_INVENTORY_AMBIGUOUS' });
});

for (const ecosystemType of ['TYPO', 'product', null, 123, {}, []]) test(`invalid raw source ecosystem blocks ${JSON.stringify(ecosystemType)} instead of disguising legacy Product`, async (t) => {
  const f = await fixture(t);
  await writeFile(join(f.sourceDirectory, 'other-product.json'), JSON.stringify({ ecosystemType, site: { id: 'other-product', domain: 'BLANCASTELLA.PRO' } }));
  const before = await tree(f.root);
  await assert.rejects(implementation.runProductDestinationReconcile(f.options), { code: 'PRODUCT_RECONCILE_SOURCE_INVENTORY_AMBIGUOUS' });
  assert.deepEqual(await tree(f.root), before);
});
