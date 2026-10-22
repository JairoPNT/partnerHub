import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import { APPLY_MODE, APPLY_CONFIRMATION, applyBusinessMasterPackage, planBusinessMasterPackage } from './jairo-business-master-package.mjs';
import { APPLY_MODE as REFRESH_MODE, APPLY_CONFIRMATION as REFRESH_CONFIRMATION, applyBusinessMasterPackageRefresh, planBusinessMasterPackageRefresh } from './jairo-business-master-package-drift-recovery.mjs';

const root = resolve(import.meta.dirname, '../../..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const legacyFiles = ['app.js', 'config.js', 'favicon.svg', 'index.html', 'styles.css'];
const legacyHash = 'e9a2f7339f80110ceb13f01499298a6e9caff2fb4ab2dffa7b35fb9f76f26a76';
const legacyTemplateHash = '5aabc5e2a4402efd97ba8a6e33700e25ad338417143e6a84e97d5187d85a7e31';
const runtime = 'window.fixtureMeasurementRuntime = true;\n';
const htaccess = `DirectoryIndex index.html

<IfModule mod_headers.c>
  <FilesMatch "^(index\\.html|config\\.js|app\\.js|styles\\.css|manifest\\.json)$">
    Header set Cache-Control "no-cache, must-revalidate"
    Header set Pragma "no-cache"
    Header set Expires "0"
  </FilesMatch>
</IfModule>
`;
const config = `const CONFIG = ${JSON.stringify({ ecosystemType: 'BUSINESS', site: { id: 'ganomaster-business', appName: 'ganomaster-business' }, distributor: { brandName: '', firstName: '', fullName: '', role: '', whatsappNumber: '', phoneNumber: '', displayPhone: '', ctaUrl: '', defaultMessage: '' }, cta: { primaryUrl: '', secondaryUrl: '', directRegisterUrl: '' }, vsl: { provider: 'custom', embedUrl: 'https://media.example.test/fixture.mp4' } })};`;

async function snapshot(directory) {
  const result = [];
  async function visit(path, prefix = '') {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      const name = `${prefix}${entry.name}`;
      if (entry.isDirectory()) { result.push([`${name}/`, 'directory']); await visit(resolve(path, entry.name), `${name}/`); }
      else result.push([name, hash(await readFile(resolve(path, entry.name)))]);
    }
  }
  await visit(directory);
  return result.sort(([a], [b]) => a.localeCompare(b));
}
async function fixture(t, historical = false) {
  const directory = await mkdtemp(resolve(tmpdir(), 'ph-measurement-package-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const outputRoot = resolve(directory, 'output'); const templateDirectory = resolve(directory, 'template');
  const businessJobsDirectory = resolve(outputRoot, '.publication-jobs');
  await mkdir(businessJobsDirectory, { recursive: true }); await mkdir(templateDirectory);
  const files = { 'app.js': 'window.fixtureApp = true;', 'config.js': config, 'favicon.svg': '<svg/>', 'index.html': '<html><script src="config.js"></script><script src="measurement-runtime.js"></script><script src="app.js"></script></html>', 'styles.css': 'body{}', 'measurement-runtime.js': runtime };
  for (const [name, bytes] of Object.entries(files)) await writeFile(resolve(templateDirectory, name), bytes);
  const options = { outputRoot, templateDirectory, businessJobsDirectory };
  const destination = resolve(outputRoot, 'ganomaster-business');
  if (historical) {
    await mkdir(resolve(destination, 'tipografia'), { recursive: true });
    for (const name of legacyFiles) await writeFile(resolve(destination, name), execFileSync('git', ['show', `16afb035f971b4495adb07983222f3461f87312c:plantillas-de-pagina/business/${name}`], { cwd: root, maxBuffer: 2 * 1024 * 1024 }));
    await writeFile(resolve(destination, '.htaccess'), htaccess);
    await writeFile(resolve(destination, 'manifest.json'), `${JSON.stringify({ schemaVersion: 1, siteId: 'ganomaster-business', ecosystemType: 'BUSINESS', publicHost: 'business.ganomaster.pro', source: 'CANONICAL_BUSINESS_TEMPLATE', canonicalTemplateHash: legacyTemplateHash, files: [...legacyFiles, '.htaccess', 'tipografia/'] }, null, 2)}\n`);
    const journal = resolve(outputRoot, '.master-package-audits/CDX-20260827-002/apply.json');
    await mkdir(resolve(journal, '..'), { recursive: true });
    await writeFile(journal, `${JSON.stringify({ requestId: 'CDX-20260827-002', mode: APPLY_MODE, outcome: 'APPLIED', siteId: 'ganomaster-business', planHash: 'a'.repeat(64), canonicalTemplateHash: legacyTemplateHash, expectedPackageHash: legacyHash, appliedAt: '2026-08-27T12:00:00.000Z' }, null, 2)}\n`);
  }
  return { options, destination, outputRoot, templateDirectory };
}

// Omitting the runtime from the copied inventory must fail observable package/manifest/hash checks.
test('new_master_contains_runtime_and_manifest_hash', async t => {
  const f = await fixture(t); const preview = await planBusinessMasterPackage(f.options);
  assert.equal(preview.blocked, false, preview.blockedReasons.join(','));
  assert.deepEqual(preview.planMaterial.canonicalTemplateFiles.find(file => file.path === 'measurement-runtime.js'), { path: 'measurement-runtime.js', hash: hash(runtime) });
  await applyBusinessMasterPackage({ ...f.options, mode: APPLY_MODE, confirmation: APPLY_CONFIRMATION, expectedPlanHash: preview.planHash });
  assert.equal(await readFile(resolve(f.destination, 'measurement-runtime.js'), 'utf8'), runtime);
  assert.ok(JSON.parse(await readFile(resolve(f.destination, 'manifest.json'), 'utf8')).files.includes('measurement-runtime.js'));
  assert.match(await readFile(resolve(f.destination, '.htaccess'), 'utf8'), /measurement-runtime\\\.js/);
});

// Reinterpreting the old archive using the new file list must fail this real refresh.
test('legacy_archives_remain_byte_valid', async t => {
  const f = await fixture(t, true); const before = await snapshot(f.destination);
  const journal = resolve(f.outputRoot, '.master-package-audits/CDX-20260827-002/apply.json'); const previousJournal = await readFile(journal);
  const preview = await planBusinessMasterPackageRefresh(f.options);
  assert.equal(preview.blocked, false, preview.blockedReasons.join(','));
  assert.equal(preview.planMaterial.previousPackageHash, legacyHash);
  const result = await applyBusinessMasterPackageRefresh({ ...f.options, mode: REFRESH_MODE, confirmation: REFRESH_CONFIRMATION, expectedPlanHash: preview.planHash });
  assert.equal(result.outcome, 'APPLIED');
  assert.deepEqual(await snapshot(resolve(f.outputRoot, '.master-package-archives/CDX-20261019-003/ganomaster-business')), before);
  assert.deepEqual(await readFile(journal), previousJournal);
  assert.equal(await readFile(resolve(f.destination, 'measurement-runtime.js'), 'utf8'), runtime);
  assert.equal((await planBusinessMasterPackage(f.options)).disposition, 'ALREADY_APPLIED');
});

// Ignoring runtime drift could reuse an authorization for different executable bytes.
test('refresh_runtime_drift_changes_plan', async t => {
  const f = await fixture(t, true); const preview = await planBusinessMasterPackageRefresh(f.options); const before = await snapshot(f.outputRoot);
  await writeFile(resolve(f.templateDirectory, 'measurement-runtime.js'), 'window.changedRuntime = true;');
  const changed = await planBusinessMasterPackageRefresh(f.options);
  assert.equal(changed.blocked, false, changed.blockedReasons.join(','));
  assert.notEqual(changed.planHash, preview.planHash); assert.notEqual(changed.planMaterial.refreshedPackageHash, preview.planMaterial.refreshedPackageHash);
  await assert.rejects(applyBusinessMasterPackageRefresh({ ...f.options, mode: REFRESH_MODE, confirmation: REFRESH_CONFIRMATION, expectedPlanHash: preview.planHash }), /PLAN_HASH_MISMATCH/);
  assert.deepEqual(await snapshot(f.outputRoot), before);
});

// A preview from the pre-runtime CLI must never authorize the new inventory.
for (const operation of ['create', 'refresh']) test(`old_${operation}_authorization_cannot_install_new_inventory`, async t => {
  const f = await fixture(t, operation === 'refresh');
  const script = operation === 'create' ? 'jairo-business-master-package.mjs' : 'jairo-business-master-package-drift-recovery.mjs';
  const oldScript = resolve(f.templateDirectory, '..', `old-${script}`);
  await writeFile(oldScript, execFileSync('git', ['show', `a8d547c1cf9d754573bf20eb5cc154a03f9f5c60:app/web/scripts/${script}`], { cwd: root, maxBuffer: 2 * 1024 * 1024 }));
  const previous = await import(pathToFileURL(oldScript).href);
  const plan = operation === 'create' ? planBusinessMasterPackage : planBusinessMasterPackageRefresh;
  const oldPlan = await (operation === 'create' ? previous.planBusinessMasterPackage : previous.planBusinessMasterPackageRefresh)(f.options);
  assert.equal(oldPlan.blocked, false, oldPlan.blockedReasons.join(','));
  const currentPlan = await plan(f.options); assert.equal(currentPlan.blocked, false, currentPlan.blockedReasons.join(','));
  assert.notEqual(currentPlan.planHash, oldPlan.planHash);
  const before = await snapshot(f.outputRoot);
  const apply = operation === 'create' ? applyBusinessMasterPackage : applyBusinessMasterPackageRefresh;
  await assert.rejects(apply({ ...f.options, mode: operation === 'create' ? APPLY_MODE : REFRESH_MODE,
    confirmation: operation === 'create' ? APPLY_CONFIRMATION : REFRESH_CONFIRMATION, expectedPlanHash: oldPlan.planHash }), /PLAN_HASH_MISMATCH/);
  assert.deepEqual(await snapshot(f.outputRoot), before);
});

// Changing the final read's bytes then restoring the template defeats a later
// preview unless the captured template/package hashes are pinned to authorization.
for (const operation of ['create', 'refresh']) test(`${operation}_rejects_final_capture_mutate_read_revert_before_staging`, async t => {
  const f = await fixture(t, operation === 'refresh');
  await mkdir(resolve(f.outputRoot, '.master-package-claims'));
  const unrelated = resolve(f.outputRoot, 'unrelated-business');
  await mkdir(unrelated); await writeFile(resolve(unrelated, 'index.html'), 'unrelated approved package');
  const unrelatedJournal = resolve(f.outputRoot, '.master-package-audits/unrelated');
  await mkdir(unrelatedJournal, { recursive: true });
  await writeFile(resolve(unrelatedJournal, 'apply.json'), 'original journal bytes\n');
  const before = await snapshot(f.outputRoot);
  const script = operation === 'create' ? 'jairo-business-master-package.mjs' : 'jairo-business-master-package-drift-recovery.mjs';
  const output = execFileSync(process.execPath, ['--input-type=module', '-e', `
    import fs from 'node:fs/promises';
    import { syncBuiltinESMExports } from 'node:module';
    import { resolve } from 'node:path';
    const cli = await import(${JSON.stringify(pathToFileURL(resolve(root, 'app/web/scripts', script)).href)});
    const options = ${JSON.stringify(f.options)};
    const runtimePath = resolve(options.templateDirectory, 'measurement-runtime.js');
    const readFile = fs.readFile;
    const mkdir = fs.mkdir;
    const approved = await readFile(runtimePath);
    const plan = await cli.${operation === 'create' ? 'planBusinessMasterPackage' : 'planBusinessMasterPackageRefresh'}(options);
    if (plan.blocked) throw new Error(plan.blockedReasons.join(','));
    let reads = 0; let injected = false; let stagingCreated = false; let result;
    fs.mkdir = async (path, ...args) => {
      if (String(path).includes('.staging')) stagingCreated = true;
      return mkdir(path, ...args);
    };
    fs.readFile = async (path, ...args) => {
      if (resolve(path) === runtimePath && ++reads === 3) {
        await fs.writeFile(runtimePath, 'window.unreviewedCapturedRuntime = true;');
        try {
          const captured = await readFile(path, ...args);
          injected = true;
          return captured;
        } finally { await fs.writeFile(runtimePath, approved); }
      }
      return readFile(path, ...args);
    };
    syncBuiltinESMExports();
    try {
      const applied = await cli.${operation === 'create' ? 'applyBusinessMasterPackage' : 'applyBusinessMasterPackageRefresh'}({ ...options, mode: cli.APPLY_MODE, confirmation: cli.APPLY_CONFIRMATION, expectedPlanHash: plan.planHash });
      result = { outcome: applied.outcome };
    } catch (error) { result = { outcome: 'REJECTED', error: error.message }; }
    finally { fs.readFile = readFile; fs.mkdir = mkdir; syncBuiltinESMExports(); }
    process.stdout.write(JSON.stringify({ ...result, injected, reads, stagingCreated, runtimeRestored: (await readFile(runtimePath)).equals(approved) }));
  `], { encoding: 'utf8' });
  const result = JSON.parse(output);
  assert.equal(result.injected, true, 'probe must capture unreviewed bytes on the final (third) runtime read');
  assert.equal(result.runtimeRestored, true, 'later previews would see only the reviewed template');
  assert.equal(result.outcome, 'REJECTED', 'old authorization must not install the changed capture');
  assert.equal(result.error, operation === 'create' ? 'BUSINESS_MASTER_PACKAGE_DRIFT_BEFORE_INSTALL' : 'BUSINESS_MASTER_PACKAGE_REFRESH_DRIFT_BEFORE_STAGE');
  assert.equal(result.reads, 3, 'rejection must use the captured bytes, without another filesystem preview');
  assert.equal(result.stagingCreated, false, 'unreviewed captured bytes must be rejected before staging');
  assert.deepEqual(await snapshot(f.outputRoot), before, 'original packages, journals and output shape must survive rejection');
});

// Missing or non-regular runtime must reject before touching the old master or journals.
for (const kind of ['missing', 'directory']) test(`missing_runtime_rejects_without_replacing_master_${kind}`, async t => {
  const f = await fixture(t, true); const preview = await planBusinessMasterPackageRefresh(f.options); const before = await snapshot(f.outputRoot);
  await rm(resolve(f.templateDirectory, 'measurement-runtime.js'));
  if (kind === 'directory') await mkdir(resolve(f.templateDirectory, 'measurement-runtime.js'));
  const refresh = await planBusinessMasterPackageRefresh(f.options); const create = await planBusinessMasterPackage(f.options);
  assert.equal(refresh.blocked, true); assert.equal(create.blocked, true);
  assert.match(refresh.blockedReasons.join(','), /CANONICAL_TEMPLATE_INVALID/);
  await assert.rejects(applyBusinessMasterPackageRefresh({ ...f.options, mode: REFRESH_MODE, confirmation: REFRESH_CONFIRMATION, expectedPlanHash: preview.planHash }), /PLAN_HASH_MISMATCH|BLOCKED/);
  assert.deepEqual(await snapshot(f.outputRoot), before);
});
