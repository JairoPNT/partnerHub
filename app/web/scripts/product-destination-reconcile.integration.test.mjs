import assert from 'node:assert/strict';
import { readFile, writeFile, readdir, stat, rename } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import process from 'node:process';
import { Buffer } from 'node:buffer';
import test from 'node:test';
import { fixture } from './product-destination-reconcile.test.mjs';
import { runProductDestinationReconcile as run } from './product-destination-reconcile.mjs';

// Optional read-only path is solely for pre-integration testing of frozen 023 source.
const gate = await import(pathToFileURL(resolve(process.env.PRODUCT_RECONCILE_TEST_GATE ?? 'server/services/productMutationCoordinator.ts')));
async function ready(t, siteId, domain) {
  const f = await fixture(t, siteId, domain); const preview = await run(f.options);
  return { ...f, apply: { ...f.options, mode: 'APPLY', confirmation: 'RECONCILE_PRODUCT_DESTINATION', expectedPlanHash: preview.planHash, coordinatorModule: gate } };
}

test('real-gate APPLY creates canonical pending target and changes only source domain; replay is zero-effect', async (t) => {
  const f = await ready(t);
  const leadPath = join(f.outputDirectory, '.activation/leads.json'); const leadBefore = await readFile(leadPath);
  const verificationPath = join(f.sourceDirectory, '.verifications/blanca-ruiz.json'); const verificationBefore = await readFile(verificationPath);
  const result = await run(f.apply);
  assert.equal(result.outcome, 'APPLIED');
  assert.deepEqual(JSON.parse(await readFile(f.source)), { ...f.original, site: { ...f.original.site, domain: 'producto.blancastella.pro' } });
  const target = JSON.parse(await readFile(f.target));
  assert.deepEqual(target, { version: 2, ownerKey: 'f403f29e-95c8-4825-9320-967376443020', siteId: 'blanca-ruiz', ecosystemType: 'PRODUCT', rootEcosystemType: 'PRODUCT', baseDomain: 'blancastella.pro', publicHost: 'producto.blancastella.pro', remoteRoot: '/home/u708491435/domains/blancastella.pro/public_html/producto', provisioningState: 'READY', hostingerState: 'READY', dnsState: 'RESOLVED', sslState: 'READY', publicationState: 'PENDING', lastCheckedAt: '2026-10-20T18:00:00.000Z', createdAt: '2026-10-20T18:00:00.000Z', updatedAt: '2026-10-20T18:00:00.000Z' });
  assert.deepEqual(await readFile(leadPath), leadBefore); assert.deepEqual(await readFile(verificationPath), verificationBefore);
  const audit = join(f.outputDirectory, '.product-destination-reconcile/blanca-ruiz');
  assert.deepEqual(await readFile(join(audit, 'source.before.json')), Buffer.from(f.bytes));
  const entriesBefore = await readdir(audit); const sourceBefore = await stat(f.source); const targetBefore = await stat(f.target);
  assert.equal((await run(f.apply)).outcome, 'ALREADY_APPLIED');
  assert.equal((await stat(f.source)).mtimeMs, sourceBefore.mtimeMs); assert.equal((await stat(f.target)).mtimeMs, targetBefore.mtimeMs);
  assert.deepEqual(await readdir(audit), entriesBefore);
  assert.deepEqual(await readdir(join(f.outputDirectory, '.product-mutation-claims')), []);
});

for (const [siteId, domain] of [['claudia-calero', 'claudiacalero.pro'], ['dorian-higuita', 'dorianhiguita.pro'], ['jairo-pinto-product', 'jairopinto.pro'], ['lida-castaneda', 'lidacastaneda.pro'], ['yenny-garcia', 'yennygarcia.pro']]) test(`real-gate APPLY preserves approved ${siteId} legacy identity`, async (t) => {
  const f = await ready(t, siteId, domain);
  assert.equal((await run(f.apply)).outcome, 'APPLIED');
  const source = JSON.parse(await readFile(f.source)); const target = JSON.parse(await readFile(f.target));
  assert.equal(source.site.id, siteId); assert.equal(Object.hasOwn(source, 'ecosystemType'), false);
  assert.equal(target.rootEcosystemType, siteId === 'claudia-calero' ? 'BUSINESS' : 'PRODUCT');
  assert.equal(target.publicationState, 'PENDING');
});

test('wrong plan hash and wrong gate version block before metadata writes', async (t) => {
  const f = await ready(t);
  await assert.rejects(run({ ...f.apply, expectedPlanHash: '0'.repeat(64) }), { code: 'PRODUCT_RECONCILE_PLAN_DRIFT' });
  await assert.rejects(run({ ...f.apply, coordinatorModule: { ...gate, PRODUCT_MUTATION_COORDINATION_VERSION: 'old' } }), { code: 'PRODUCT_RECONCILE_GATE_VERSION' });
  assert.equal(await readFile(f.source, 'utf8'), f.bytes);
  await assert.rejects(stat(f.target), { code: 'ENOENT' });
});

for (const point of ['intent', 'source', 'target', 'readback']) test(`fault at ${point} restores only owned source/target and retains blocked audit`, async (t) => {
  const f = await ready(t);
  await assert.rejects(run({ ...f.apply, checkpoint: async (phase) => { if (phase === point) throw new Error('injected disk fault'); } }), { code: 'PRODUCT_RECONCILE_ROLLED_BACK' });
  assert.equal(await readFile(f.source, 'utf8'), f.bytes);
  await assert.rejects(stat(f.target), { code: 'ENOENT' });
  assert.equal(JSON.parse(await readFile(join(f.outputDirectory, '.product-destination-reconcile/blanca-ruiz/rollback.json'))).state, 'ROLLED_BACK');
  await assert.rejects(run(f.apply), { code: 'PRODUCT_RECONCILE_AUDIT_REQUIRES_REVIEW' });
});

test('foreign source drift after own write is never overwritten by rollback', async (t) => {
  const f = await ready(t);
  await assert.rejects(run({ ...f.apply, checkpoint: async (phase) => { if (phase === 'source') { await writeFile(f.source, '{"foreign":true}'); throw new Error('foreign drift'); } } }), { code: 'PRODUCT_RECONCILE_RECOVERY_REQUIRED' });
  assert.equal(await readFile(f.source, 'utf8'), '{"foreign":true}');
  await assert.rejects(stat(f.target), { code: 'ENOENT' });
});

test('foreign identical-byte replacement is not treated as rollback-owned inode', async (t) => {
  const f = await ready(t);
  let replacement;
  await assert.rejects(run({ ...f.apply, checkpoint: async (phase) => { if (phase === 'target') { replacement = await readFile(f.target); const temp = join(f.root, 'foreign-target.json'); await writeFile(temp, replacement); await rename(temp, f.target); throw new Error('foreign replacement'); } } }), { code: 'PRODUCT_RECONCILE_RECOVERY_REQUIRED' });
  assert.deepEqual(await readFile(f.target), replacement);
});

test('idempotent replay rejects protected lead drift and existing target without complete receipt', async (t) => {
  const f = await ready(t); await run(f.apply);
  await writeFile(join(f.outputDirectory, '.activation/leads.json'), '[]');
  await assert.rejects(run(f.apply), { code: /^PRODUCT_RECONCILE_/ });
});

test('expired exact completed receipt replays with no second metadata effect but drift still blocks', async (t) => {
  const f = await ready(t); await run(f.apply);
  const sourceBefore = await stat(f.source); const targetBefore = await stat(f.target);
  const later = { ...f.apply, now: () => new Date('2026-10-21T18:00:00.000Z') };
  assert.equal((await run(later)).outcome, 'ALREADY_APPLIED');
  assert.equal((await stat(f.source)).mtimeMs, sourceBefore.mtimeMs); assert.equal((await stat(f.target)).mtimeMs, targetBefore.mtimeMs);
  await writeFile(f.target, '{}');
  await assert.rejects(run(later), { code: 'PRODUCT_RECONCILE_RECEIPT_DRIFT' });
});

test('expired incomplete apply never uses receipt replay exemption', async (t) => {
  const f = await ready(t);
  await assert.rejects(run({ ...f.apply, now: () => new Date('2026-10-21T18:00:00.000Z') }), { code: 'PRODUCT_RECONCILE_EVIDENCE_STALE' });
  assert.equal(await readFile(f.source, 'utf8'), f.bytes);
  await assert.rejects(stat(f.target), { code: 'ENOENT' });
});

test('completed receipt must agree with its original durable intent', async (t) => {
  const f = await ready(t); await run(f.apply);
  await writeFile(join(f.outputDirectory, '.product-destination-reconcile/blanca-ruiz/intent.json'), '{}');
  await assert.rejects(run(f.apply), { code: 'PRODUCT_RECONCILE_RECEIPT_MISMATCH' });
});

test('a live writer claim blocks CLI apply and a claimed apply blocks independent writer and second apply', async (t) => {
  const f = await ready(t); const writer = gate.createProductMutationCoordinator({ outputDirectory: f.outputDirectory });
  await writer('blanca-ruiz', async () => {
    await assert.rejects(gate.withoutProductMutationOwnership(() => run(f.apply)), { code: 'PRODUCT_RECONCILE_ACTIVE_CLAIM' });
  });
  await run({ ...f.apply, checkpoint: async (phase) => {
    if (phase !== 'intent') return;
    await assert.rejects(gate.withoutProductMutationOwnership(() => writer('blanca-ruiz', async () => writeFile(f.source, '{}'))), { code: 'PRODUCT_MUTATION_BUSY' });
    await assert.rejects(gate.withoutProductMutationOwnership(() => run(f.apply)), { code: /^PRODUCT_RECONCILE_/ });
  } });
  assert.equal(JSON.parse(await readFile(f.source)).site.domain, 'producto.blancastella.pro');
});
