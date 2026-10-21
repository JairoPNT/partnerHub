import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

const ROOT = resolve(import.meta.dirname, "../../..");

test("production runtime packages the Business refresh entrypoint, canonical template and npm commands", async () => {
  const [dockerfile, packageBytes] = await Promise.all([
    readFile(resolve(ROOT, "Dockerfile"), "utf8"),
    readFile(resolve(ROOT, "app/web/package.json"), "utf8")
  ]);
  const packageJson = JSON.parse(packageBytes);

  assert.ok(dockerfile.includes("COPY plantillas-de-pagina/business ./plantillas-de-pagina/business"));
  assert.ok(dockerfile.includes("COPY --from=builder /repo/app/web/scripts/jairo-business-master-package-drift-recovery.mjs ./scripts/jairo-business-master-package-drift-recovery.mjs"));
  assert.equal(packageJson.scripts["maintenance:jairo-business-master-package-drift-recovery"], "node scripts/jairo-business-master-package-drift-recovery.mjs");
  assert.equal(packageJson.scripts["test:jairo-business-master-package-drift-recovery"], "node --test scripts/jairo-business-master-package-drift-recovery.test.mjs scripts/business-master-runtime-packaging.test.mjs");
});

// Exercise standalone staged entrypoints, without TS loaders or source imports.
// CI/productive evidence runs this with the explicit verified Node20 executable.
test("staged_mjs_entrypoints_generate_measurement_fixture_without_build_time_dependencies", async t => {
  const directory = await mkdtemp(resolve(tmpdir(), 'ph-business-runtime-stage-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const scripts = resolve(directory, 'scripts'); const template = resolve(directory, 'plantillas-de-pagina/business');
  await mkdir(scripts); await mkdir(template, { recursive: true });
  for (const name of ['jairo-business-master-package.mjs', 'jairo-business-master-package-drift-recovery.mjs']) await cp(resolve(ROOT, 'app/web/scripts', name), resolve(scripts, name));
  const config = { ecosystemType: 'BUSINESS', site: { id: 'ganomaster-business', appName: 'ganomaster-business' }, distributor: { brandName: '', firstName: '', fullName: '', role: '', whatsappNumber: '', phoneNumber: '', displayPhone: '', ctaUrl: '', defaultMessage: '' }, cta: { primaryUrl: '', secondaryUrl: '', directRegisterUrl: '' }, vsl: { provider: 'custom', embedUrl: 'https://fixture.example.test/video.mp4' } };
  const runtime = 'window.syntheticStageRuntime = true;\n';
  for (const [name, bytes] of Object.entries({ 'config.js': `const CONFIG = ${JSON.stringify(config)};`, 'index.html': '<html></html>', 'app.js': 'window.syntheticApp = true;', 'styles.css': 'body{}', 'favicon.svg': '<svg/>', 'measurement-runtime.js': runtime })) await writeFile(resolve(template, name), bytes);
  const output = execFileSync(process.execPath, ['--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    import { readFile } from 'node:fs/promises';
    import { resolve } from 'node:path';
    import * as create from './scripts/jairo-business-master-package.mjs';
    import * as refresh from './scripts/jairo-business-master-package-drift-recovery.mjs';
    assert.equal(typeof refresh.planBusinessMasterPackageRefresh, 'function');
    const options = { outputRoot: resolve('generated'), templateDirectory: resolve('plantillas-de-pagina/business') };
    const preview = await create.planBusinessMasterPackage(options);
    assert.equal(preview.blocked, false);
    const result = await create.applyBusinessMasterPackage({ ...options, mode: create.APPLY_MODE, confirmation: create.APPLY_CONFIRMATION, expectedPlanHash: preview.planHash });
    assert.equal(result.outcome, 'APPLIED');
    const path = resolve('generated/ganomaster-business');
    assert.equal(await readFile(resolve(path, 'measurement-runtime.js'), 'utf8'), ${JSON.stringify(runtime)});
    assert.ok(JSON.parse(await readFile(resolve(path, 'manifest.json'), 'utf8')).files.includes('measurement-runtime.js'));
    process.stdout.write(JSON.stringify({ node: process.versions.node, outcome: result.outcome }));
  `], { cwd: directory, encoding: 'utf8' });
  assert.deepEqual(JSON.parse(output), { node: process.versions.node, outcome: 'APPLIED' });
});
