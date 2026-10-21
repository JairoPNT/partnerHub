import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import test from 'node:test';
import { createBusinessMeasurementPreparer, versionBusinessMeasurementHtml } from './businessMeasurementHtml.ts';
import { applyMetaPixelToHtml } from './metaPixelHtml.ts';

const html = '<!doctype html><html><head><link rel="stylesheet" href="styles.css"></head><body>\n<noscript>Content needs no tracking.</noscript><script src="config.js"></script><script src="measurement-runtime.js"></script><script src="app.js"></script></body></html>';
const bytes = { 'index.html': html, 'app.js': 'window.appFixture = 1;', 'measurement-runtime.js': 'window.runtimeFixture = 1;', 'styles.css': 'body{color:black}' };
const sha = (value: string) => createHash('sha256').update(value).digest('hex');
const artifact = { version: 1 as const, indexHtmlSha256: sha(html), appJsSha256: sha(bytes['app.js']), runtimeSha256: sha(bytes['measurement-runtime.js']), stylesSha256: sha(bytes['styles.css']), providers: { ga4: false, meta: false } };
async function fixture(t: import('node:test').TestContext) {
  const root = await mkdtemp(resolve(tmpdir(), 'ph-measurement-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const directory = resolve(root, 'master'); await mkdir(directory);
  for (const [file, value] of Object.entries(bytes)) await writeFile(resolve(directory, file), value);
  return { root, directory, preparer: createBusinessMeasurementPreparer({ approvedArtifacts: [artifact] }) };
}

// Missing approval must never mutate either durable source or existing package.
test('rejects_unapproved_before_mutation', async (t) => {
  const f = await fixture(t); const sourcePath = resolve(f.root, 'source.json'); const outputSentinel = resolve(f.root, 'keep.txt');
  await writeFile(sourcePath, '{"existing":true}'); await writeFile(outputSentinel, 'approved output');
  const previousSource = await readFile(sourcePath); const previousOutput = await readFile(outputSentinel);
  await assert.rejects(() => createBusinessMeasurementPreparer({ approvedArtifacts: [] }).prepare(f.directory), /^Error: BUSINESS_MEASUREMENT_ARTIFACT_UNAPPROVED$/);
  assert.deepEqual(await readFile(outputSentinel), previousOutput);
  assert.deepEqual(await readFile(sourcePath), previousSource);
});

test('strips_only_managed_meta_and_noscript', async (t) => {
  const f = await fixture(t);
  await writeFile(resolve(f.directory, 'index.html'), applyMetaPixelToHtml(html, '1234567890'));
  const result = await f.preparer.prepare(f.directory);
  assert.equal(result.indexHtml, html);
  assert.match(result.indexHtml, /<noscript>Content needs no tracking\.<\/noscript>/);
  assert.doesNotMatch(result.indexHtml, /facebook|fbq|PartnerHub Meta Pixel/);
});

test('only_exact_asset_version_values_are_ignored_by_approval', async (t) => {
  const f = await fixture(t);
  await writeFile(resolve(f.directory, 'index.html'), html.replace(/(config\.js|app\.js|styles\.css|measurement-runtime\.js)/g, '$1?v=old-release'));
  assert.equal((await f.preparer.prepare(f.directory)).artifactVersion, 1);
  for (const suffix of ['?v=old&extra=1', '?other=1']) {
    await writeFile(resolve(f.directory, 'index.html'), html.replace('app.js', `app.js${suffix}`));
    await assert.rejects(f.preparer.prepare(f.directory), /BUSINESS_MEASUREMENT_(ARTIFACT_UNAPPROVED|TEMPLATE_INVALID)/);
  }
});

test('rejects_modified_app_runtime_css_and_unmanaged_pixel', async (t) => {
  const f = await fixture(t);
  for (const file of ['app.js', 'measurement-runtime.js', 'styles.css'] as const) {
    await writeFile(resolve(f.directory, file), `${bytes[file]} /* changed */`);
    await assert.rejects(f.preparer.prepare(f.directory), /BUSINESS_MEASUREMENT_ARTIFACT_UNAPPROVED/);
    await writeFile(resolve(f.directory, file), bytes[file]);
  }
  for (const tag of ['<script src="https://tracker.example/pixel.js"></script>', '<img src="https://tracker.example/pixel">']) {
    await writeFile(resolve(f.directory, 'index.html'), html.replace('</body>', `${tag}</body>`));
    await assert.rejects(f.preparer.prepare(f.directory), /BUSINESS_MEASUREMENT_ARTIFACT_UNAPPROVED/);
  }
});

test('copies_validated_bytes_not_later_master_reads', async (t) => {
  const f = await fixture(t); const prepared = await f.preparer.prepare(f.directory);
  for (const file of Object.keys(bytes)) await writeFile(resolve(f.directory, file), 'later mutation');
  assert.equal(prepared.indexHtml, html);
  assert.equal(prepared.appJs.toString(), bytes['app.js']);
  assert.equal(prepared.runtimeJs.toString(), bytes['measurement-runtime.js']);
  assert.equal(prepared.stylesCss.toString(), bytes['styles.css']);
  assert.deepEqual(prepared.providers, { ga4: false, meta: false });
});

test('rejects_missing_nonregular_and_reordered_runtime_without_exposing_paths', async (t) => {
  const f = await fixture(t);
  for (const invalid of [html.replace('measurement-runtime.js', 'runtime.js'), html.replace('<script src="app.js"></script>', '<script src="measurement-runtime.js"></script><script src="app.js"></script>'), html.replace('src="measurement-runtime.js"', 'defer src="measurement-runtime.js"'), html.replace('src="config.js"', 'src="app.js"')]) {
    await writeFile(resolve(f.directory, 'index.html'), invalid);
    await assert.rejects(f.preparer.prepare(f.directory), /^Error: BUSINESS_MEASUREMENT_TEMPLATE_INVALID$/);
  }
  await writeFile(resolve(f.directory, 'index.html'), html);
  await rm(resolve(f.directory, 'measurement-runtime.js')); await mkdir(resolve(f.directory, 'measurement-runtime.js'));
  await assert.rejects(f.preparer.prepare(f.directory), /^Error: BUSINESS_MEASUREMENT_TEMPLATE_INVALID$/);
});

test('rejects_physical_template_aliases', async (t) => {
  const f = await fixture(t); const alias = resolve(f.root, 'alias');
  await symlink(f.directory, alias, 'junction');
  await assert.rejects(f.preparer.prepare(alias), /^Error: BUSINESS_MEASUREMENT_TEMPLATE_INVALID$/);
});

test('does_not_normalize_script_text_disguised_as_asset_tags', async (t) => {
  const f = await fixture(t);
  const approvedHtml = html.replace('</head>', `<script>window.text = '<link href="styles.css?v=approved">';</script></head>`);
  const preparer = createBusinessMeasurementPreparer({ approvedArtifacts: [{ ...artifact, indexHtmlSha256: sha(approvedHtml) }] });
  await writeFile(resolve(f.directory, 'index.html'), approvedHtml.replace('v=approved', 'v=changed'));
  await assert.rejects(preparer.prepare(f.directory), /BUSINESS_MEASUREMENT_ARTIFACT_UNAPPROVED/);
  // An unchanged, reviewed inline literal must also remain byte-identical.
  await writeFile(resolve(f.directory, 'index.html'), approvedHtml);
  assert.equal((await preparer.prepare(f.directory)).indexHtml, approvedHtml);
});

test('cache_versions_do_not_rewrite_other_attributes_or_inline_text', () => {
  const original = `<script>window.text = '<link href="styles.css?v=literal">';</script><script data-example=' src="app.js?v=literal"' src="app.js?v=old"></script>`;
  assert.equal(versionBusinessMeasurementHtml(original, 'abc123'), `<script>window.text = '<link href="styles.css?v=literal">';</script><script data-example=' src="app.js?v=literal"' src="app.js?v=abc123"></script>`);
});

test('preserves_utf8_bom_in_the_approved_html_bytes', async (t) => {
  const f = await fixture(t); const withBom = '\ufeff' + html;
  await writeFile(resolve(f.directory, 'index.html'), withBom);
  const preparer = createBusinessMeasurementPreparer({ approvedArtifacts: [{ ...artifact, indexHtmlSha256: sha(withBom) }] });
  assert.equal((await preparer.prepare(f.directory)).indexHtml, withBom);
});
