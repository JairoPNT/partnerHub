import assert from 'node:assert/strict';
import { copyFile, mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { build } from 'esbuild';
import { fixture } from './product-destination-reconcile.test.mjs';

test('staged production Node20 CLI imports real bundled coordinator, applies and replays without TypeScript support', async (t) => {
  const executable = process.env.PRODUCT_RECONCILE_NODE20 ?? process.execPath;
  const version = spawnSync(executable, ['--version'], { encoding: 'utf8' });
  assert.match(version.stdout, /^v20\./, 'Set PRODUCT_RECONCILE_NODE20 to a real Node20 executable');
  const f = await fixture(t); const runtime = join(f.root, 'runner');
  await mkdir(join(runtime, 'scripts'), { recursive: true }); await mkdir(join(runtime, 'runtime-assets'));
  await copyFile('scripts/product-destination-reconcile.mjs', join(runtime, 'scripts/product-destination-reconcile.mjs'));
  const gateAsset = join(runtime, 'runtime-assets/product-mutation-coordinator.mjs');
  await build({ entryPoints: [resolve(process.env.PRODUCT_RECONCILE_TEST_GATE ?? 'server/services/productMutationCoordinator.ts')], bundle: true, platform: 'node', format: 'esm', target: 'node20', outfile: gateAsset });
  f.manifest.evidence.observedAt = new Date().toISOString(); await writeFile(f.manifestPath, JSON.stringify(f.manifest));
  const environment = { ...process.env, PRODUCT_PAGE_OUTPUT_DIR: f.outputDirectory, PRODUCT_PAGE_SOURCE_DIR: f.sourceDirectory, PRODUCT_PAGE_ACTIVATION_DIR: join(f.outputDirectory, '.activation'), PRODUCT_PAGE_PUBLICATION_JOB_DIR: f.jobs, PRODUCT_PAGE_PUBLICATION_JOURNAL_DIR: join(f.outputDirectory, '.publication-journals'), PRODUCT_PAGE_COMMERCIAL_GRANT_DIR: join(f.outputDirectory, '.commercial-grants'), PRODUCT_PAGE_PAYMENT_DIR: join(f.outputDirectory, '.payments') };
  function cli(args = []) {
    const result = spawnSync(executable, ['scripts/product-destination-reconcile.mjs', '--manifest', f.manifestPath, ...args], { cwd: runtime, env: environment, encoding: 'utf8' });
    assert.equal(result.stderr, '');
    return { code: result.status, result: JSON.parse(result.stdout) };
  }
  const preview = cli(); assert.equal(preview.code, 0); assert.equal(preview.result.outcome, 'PREVIEW');
  const applyArgs = ['--mode', 'APPLY', '--plan-hash', preview.result.planHash, '--confirm', 'RECONCILE_PRODUCT_DESTINATION'];
  await rename(gateAsset, `${gateAsset}.unavailable`);
  assert.deepEqual(cli(applyArgs), { code: 1, result: { outcome: 'BLOCKED', code: 'PRODUCT_RECONCILE_GATE_UNAVAILABLE' } });
  assert.equal(await readFile(f.source, 'utf8'), f.bytes);
  await rename(`${gateAsset}.unavailable`, gateAsset);
  const realGate = await import(pathToFileURL(gateAsset));
  await realGate.createProductMutationCoordinator({ outputDirectory: f.outputDirectory })('blanca-ruiz', async () => {
    assert.deepEqual(cli(applyArgs), { code: 1, result: { outcome: 'BLOCKED', code: 'PRODUCT_RECONCILE_ACTIVE_CLAIM' } });
  });
  assert.equal(cli(applyArgs).result.outcome, 'APPLIED');
  assert.equal(cli(applyArgs).result.outcome, 'ALREADY_APPLIED');
  assert.equal(JSON.parse(await readFile(f.target)).publicationState, 'PENDING');
});
