import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import {
  materializeReviewedTemplate,
  reviewedArtifact,
  loadMeasurementBackend,
  directorySnapshot,
  generateReviewedPackage
} from './business-consent-browser-harness.mjs';
import { runBusinessConsentReadiness } from './business-consent-readiness.mjs';

test('actual committed assets require reviewed registry; modified/CRLF bytes reject', async (t) => {
  const f = await materializeReviewedTemplate(t);
  const backend = await loadMeasurementBackend();
  const prepared = await backend.businessMeasurementPreparer.prepare(
    f.directory
  );
  assert.deepEqual(prepared.providers, { ga4: false, meta: false });
  for (const name of [
    'index.html',
    'app.js',
    'measurement-runtime.js',
    'styles.css'
  ]) {
    const path = resolve(f.directory, name);
    const bytes = await readFile(path);
    await writeFile(path, Buffer.concat([bytes, Buffer.from(' ')]));
    await assert.rejects(
      backend.businessMeasurementPreparer.prepare(f.directory),
      /UNAPPROVED/
    );
    await writeFile(path, bytes.toString().replace(/\n/g, '\r\n'));
    await assert.rejects(
      backend.businessMeasurementPreparer.prepare(f.directory),
      /UNAPPROVED/
    );
    await writeFile(path, bytes);
  }
});

test('readiness hashes entire package deterministically and never claims provider/public activation', async (t) => {
  const f = await materializeReviewedTemplate(t);
  const options = {
    packageDirectory: f.directory,
    artifact: reviewedArtifact,
    fixtureOrigin: 'https://negocio.fixture.test'
  };
  const first = await runBusinessConsentReadiness(options);
  const second = await runBusinessConsentReadiness(options);
  assert.match(first.packageSha256, /^[a-f0-9]{64}$/);
  assert.equal(first.packageSha256, second.packageSha256);
  assert.deepEqual(first.providers, { ga4: 'BLOCKED', meta: 'BLOCKED' });
  assert.equal(first.publicVerification, 'NOT_RUN');
  assert.ok(
    first.checks.some((c) => c.name === 'asset-binding' && c.status === 'PASS')
  );
  await writeFile(
    resolve(f.directory, 'additional.txt'),
    'extra package bytes'
  );
  assert.notEqual(
    (await runBusinessConsentReadiness(options)).packageSha256,
    first.packageSha256
  );
  await writeFile(resolve(f.directory, 'app.js'), 'unreviewed');
  assert.ok(
    (await runBusinessConsentReadiness(options)).checks.some(
      (c) => c.name === 'asset-binding' && c.status === 'FAIL'
    )
  );
  await assert.rejects(
    runBusinessConsentReadiness({
      ...options,
      fixtureOrigin: 'https://negocio.claudiacalero.pro'
    }),
    /FIXTURE_ORIGIN_REQUIRED/
  );
});

test('readiness never treats caller true flags as production approval', async (t) => {
  const f = await materializeReviewedTemplate(t);
  const report = await runBusinessConsentReadiness({
    packageDirectory: f.directory,
    artifact: { ...reviewedArtifact, providers: { ga4: true, meta: true } },
    fixtureOrigin: 'https://negocio.fixture.test'
  });
  assert.deepEqual(report.providers, { ga4: 'BLOCKED', meta: 'BLOCKED' });
  assert.ok(
    report.checks.some(
      (c) => c.name === 'release-policy' && c.status === 'FAIL'
    )
  );
});

test('actual approved generator twice; forged master/source/HTTP cannot enable providers and changed byte rejects before mutation', async (t) => {
  const f = await generateReviewedPackage(t);
  assert.equal(f.generations, 2);
  assert.equal(f.forgedMetadataRejected, true);
  assert.equal(f.unreviewedRejectedBeforeMutation, true);
  const report = await runBusinessConsentReadiness({
    packageDirectory: f.directory,
    artifact: reviewedArtifact,
    fixtureOrigin: 'https://negocio.fixture.test'
  });
  assert.equal(
    report.checks.find((c) => c.name === 'asset-binding').status,
    'PASS'
  );
  assert.deepEqual(report.providers, { ga4: 'BLOCKED', meta: 'BLOCKED' });
  t.diagnostic(JSON.stringify(report));
});

// Real CLI modules receive explicit temp output/template/jobs paths; no /data defaults.
import {
  APPLY_MODE,
  APPLY_CONFIRMATION,
  planBusinessMasterPackage,
  applyBusinessMasterPackage
} from './jairo-business-master-package.mjs';
import {
  APPLY_MODE as REFRESH_MODE,
  APPLY_CONFIRMATION as REFRESH_CONFIRMATION,
  planBusinessMasterPackageRefresh,
  applyBusinessMasterPackageRefresh
} from './jairo-business-master-package-drift-recovery.mjs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const repo = resolve(fileURLToPath(new URL('../../..', import.meta.url)));
async function cliFixture(t, historical = false) {
  assert.equal(
    process.versions.node.split('.')[0],
    '20',
    'release rehearsal must execute on Node20'
  );
  const f = await materializeReviewedTemplate(t);
  const root = await mkdtemp(resolve(tmpdir(), 'ph-consent-cli-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const outputRoot = resolve(root, 'output');
  const businessJobsDirectory = resolve(outputRoot, '.publication-jobs');
  await mkdir(outputRoot);
  await mkdir(businessJobsDirectory);
  const destination = resolve(outputRoot, 'ganomaster-business');
  if (historical) {
    await mkdir(resolve(destination, 'tipografia'), { recursive: true });
    const files = [
      'app.js',
      'config.js',
      'favicon.svg',
      'index.html',
      'styles.css'
    ];
    for (const name of files)
      await writeFile(
        resolve(destination, name),
        execFileSync(
          'git',
          [
            'show',
            `16afb035f971b4495adb07983222f3461f87312c:plantillas-de-pagina/business/${name}`
          ],
          { cwd: repo }
        )
      );
    const legacyTemplateHash =
      '5aabc5e2a4402efd97ba8a6e33700e25ad338417143e6a84e97d5187d85a7e31';
    const htaccess =
      'DirectoryIndex index.html\n\n<IfModule mod_headers.c>\n  <FilesMatch "^(index\\.html|config\\.js|app\\.js|styles\\.css|manifest\\.json)$">\n    Header set Cache-Control "no-cache, must-revalidate"\n    Header set Pragma "no-cache"\n    Header set Expires "0"\n  </FilesMatch>\n</IfModule>\n';
    await writeFile(resolve(destination, '.htaccess'), htaccess);
    await writeFile(
      resolve(destination, 'manifest.json'),
      JSON.stringify(
        {
          schemaVersion: 1,
          siteId: 'ganomaster-business',
          ecosystemType: 'BUSINESS',
          publicHost: 'business.ganomaster.pro',
          source: 'CANONICAL_BUSINESS_TEMPLATE',
          canonicalTemplateHash: legacyTemplateHash,
          files: [...files, '.htaccess', 'tipografia/']
        },
        null,
        2
      ) + '\n'
    );
    const journal = resolve(
      outputRoot,
      '.master-package-audits/CDX-20260827-002'
    );
    await mkdir(journal, { recursive: true });
    await writeFile(
      resolve(journal, 'apply.json'),
      JSON.stringify(
        {
          requestId: 'CDX-20260827-002',
          mode: APPLY_MODE,
          outcome: 'APPLIED',
          siteId: 'ganomaster-business',
          planHash: 'a'.repeat(64),
          canonicalTemplateHash: legacyTemplateHash,
          expectedPackageHash:
            'e9a2f7339f80110ceb13f01499298a6e9caff2fb4ab2dffa7b35fb9f76f26a76',
          appliedAt: '2026-08-27T12:00:00.000Z'
        },
        null,
        2
      ) + '\n'
    );
  }
  return {
    ...f,
    options: {
      outputRoot,
      templateDirectory: f.directory,
      businessJobsDirectory
    },
    destination,
    outputRoot
  };
}
test('legacy_master_refresh_carries_runtime_and_new_plan_hash', async (t) => {
  const f = await cliFixture(t, true);
  const before = await directorySnapshot(f.destination);
  const journal = resolve(
    f.outputRoot,
    '.master-package-audits/CDX-20260827-002/apply.json'
  );
  const journalBytes = await readFile(journal);
  const plan = await planBusinessMasterPackageRefresh(f.options);
  assert.equal(plan.blocked, false, plan.blockedReasons.join(','));
  assert.equal(
    plan.planMaterial.previousPackageHash,
    'e9a2f7339f80110ceb13f01499298a6e9caff2fb4ab2dffa7b35fb9f76f26a76'
  );
  const result = await applyBusinessMasterPackageRefresh({
    ...f.options,
    mode: REFRESH_MODE,
    confirmation: REFRESH_CONFIRMATION,
    expectedPlanHash: plan.planHash
  });
  assert.equal(result.outcome, 'APPLIED');
  assert.deepEqual(
    await directorySnapshot(
      resolve(
        f.outputRoot,
        '.master-package-archives/CDX-20261019-003/ganomaster-business'
      )
    ),
    before
  );
  assert.deepEqual(await readFile(journal), journalBytes);
  assert.deepEqual(
    await readFile(resolve(f.destination, 'measurement-runtime.js')),
    await readFile(resolve(f.directory, 'measurement-runtime.js'))
  );
  assert.match(
    await readFile(resolve(f.destination, 'index.html'), 'utf8'),
    /measurement-runtime\.js/
  );
  assert.match(
    await readFile(resolve(f.destination, '.htaccess'), 'utf8'),
    /measurement-runtime/
  );
  assert.ok(
    JSON.parse(
      await readFile(resolve(f.destination, 'manifest.json'), 'utf8')
    ).files.includes('measurement-runtime.js')
  );
});
for (const historical of [false, true])
  test(`old_authorization_does_not_refresh_new_bytes: ${historical ? 'refresh' : 'create'}`, async (t) => {
    const f = await cliFixture(t, historical);
    const planFn = historical
      ? planBusinessMasterPackageRefresh
      : planBusinessMasterPackage;
    const apply = historical
      ? applyBusinessMasterPackageRefresh
      : applyBusinessMasterPackage;
    const plan = await planFn(f.options);
    assert.equal(plan.blocked, false, plan.blockedReasons.join(','));
    const before = await directorySnapshot(f.outputRoot);
    await writeFile(
      resolve(f.directory, 'measurement-runtime.js'),
      'unreviewed changed byte'
    );
    assert.notEqual((await planFn(f.options)).planHash, plan.planHash);
    await assert.rejects(
      apply({
        ...f.options,
        mode: historical ? REFRESH_MODE : APPLY_MODE,
        confirmation: historical ? REFRESH_CONFIRMATION : APPLY_CONFIRMATION,
        expectedPlanHash: plan.planHash
      }),
      /PLAN_HASH_MISMATCH/
    );
    assert.deepEqual(await directorySnapshot(f.outputRoot), before);
  });
test('second_generation_same_approved_asset', async (t) => {
  const f = await cliFixture(t);
  const plan = await planBusinessMasterPackage(f.options);
  assert.equal(plan.blocked, false, plan.blockedReasons.join(','));
  await applyBusinessMasterPackage({
    ...f.options,
    mode: APPLY_MODE,
    confirmation: APPLY_CONFIRMATION,
    expectedPlanHash: plan.planHash
  });
  const before = await directorySnapshot(f.destination);
  assert.equal(
    (await planBusinessMasterPackage(f.options)).disposition,
    'ALREADY_APPLIED'
  );
  const backend = await loadMeasurementBackend();
  assert.deepEqual(
    (await backend.businessMeasurementPreparer.prepare(f.destination))
      .providers,
    { ga4: false, meta: false }
  );
  assert.deepEqual(await directorySnapshot(f.destination), before);
});
