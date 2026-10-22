import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { build } from "esbuild";

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

test("runtime ships the bundled consent CLI and legacy shared lifecycle with dedicated npm commands", async () => {
  const dockerfile = await readFile(resolve(ROOT, "Dockerfile"), "utf8");
  const pkg = JSON.parse(await readFile(resolve(ROOT, "app/web/package.json"), "utf8"));
  assert.match(dockerfile, /esbuild scripts\/business-consent-master-package-migration\.mjs --bundle --platform=node --format=esm --target=node20 --alias:server-only=\.\/server\/runtime\/serverOnlyRuntimeShim\.mjs --outfile=\/repo\/runtime-assets\/business-consent-master-package-migration\.mjs/);
  assert.ok(dockerfile.includes("COPY --from=builder /repo/runtime-assets/business-consent-master-package-migration.mjs ./scripts/business-consent-master-package-migration.mjs"));
  assert.ok(dockerfile.includes("COPY --from=builder /repo/app/web/scripts/business-master-transition-lifecycle.mjs ./scripts/business-master-transition-lifecycle.mjs"));
  assert.equal(pkg.scripts["maintenance:business-consent-master-migration"], "node scripts/business-consent-master-package-migration.mjs");
  assert.equal(pkg.scripts["test:business-consent-master-migration"], "node --test scripts/business-consent-master-package-migration.test.mjs scripts/business-master-runtime-packaging.test.mjs");
});

test("bundled PREVIEW, READBACK and fail-closed APPLY execute without TS or installed runtime dependencies", async () => {
  const root = await mkdtemp(join(tmpdir(), "partnerhub-consent-runtime-"));
  try {
    const runtime = join(root, "runtime"), outputRoot = join(root, "disposable-output");
    await mkdir(runtime); await mkdir(outputRoot);
    const bundlePath = join(runtime, "business-consent-master-package-migration.mjs");
    const bundled = await build({ entryPoints: [resolve(ROOT, "app/web/scripts/business-consent-master-package-migration.mjs")],
      absWorkingDir: resolve(ROOT, "app/web"), alias: { "server-only": "./server/runtime/serverOnlyRuntimeShim.mjs" },
      outfile: bundlePath, bundle: true, platform: "node", format: "esm", target: "node20", metafile: true });
    assert.ok(Object.keys(bundled.metafile.inputs).some((p) => p.endsWith("businessCutoverMigrationAuthority.ts")),
      "dynamic internal authority is compiled, never loaded as TS by Node20");
    const env = { ...process.env, NODE_ENV: "production", PRODUCT_PAGE_OUTPUT_DIR: outputRoot,
      PRODUCT_PAGE_PUBLICATION_JOB_DIR: join(outputRoot, ".publication-jobs"),
      BUSINESS_MASTER_WRITER_EXCLUSION_PROVEN: "true", BUSINESS_MAINTENANCE_PROOF: "approved" };
    const node20 = process.env.BUSINESS_CUTOVER_TEST_NODE20;
    assert.ok(node20, "BUSINESS_CUTOVER_TEST_NODE20 is required, without fallback");
    const run = (args) => spawnSync(node20, args, { cwd: runtime, env, encoding: "utf8", timeout: 30000 });
    assert.match(run(["--version"]).stdout, /^v20\./);
    const preview = run([bundlePath]);
    assert.equal(preview.status, 2, preview.stderr); assert.equal(preview.stderr, "");
    const p = JSON.parse(preview.stdout);
    assert.equal(p.requestId, "CDX-20261021-009"); assert.equal(p.mode, "PREVIEW");
    assert.equal(p.operationalGate.writerExclusionProven, false); assert.equal(p.safety.localWritesMade, false);
    const candidate = join(root, "exact-reviewed-candidate"); await mkdir(candidate);
    for (const name of ["app.js", "config.js", "favicon.svg", "index.html", "styles.css", "measurement-runtime.js"]) {
      const bytes = execFileSync("git", ["show", "88c003d8cbb419522c20c084dc4a019a22d33155:plantillas-de-pagina/business/" + name], { cwd: ROOT });
      await writeFile(join(candidate, name), bytes);
    }
    const staged = run([bundlePath, "--template-dir=" + candidate]);
    assert.equal(staged.status, 2, staged.stderr);
    const stagedPlan = JSON.parse(staged.stdout);
    assert.equal(stagedPlan.planMaterial.paths.templateDirectory, candidate);
    assert.deepEqual(stagedPlan.artifactGate.blockedReasons, ["BUSINESS_CONSENT_MASTER_MIGRATION_JOURNAL_INVALID"],
      "exact six-file staged candidate passes byte validation but empty disposable output has no lineage");
    const stagedReadback = run([bundlePath, "--mode=READBACK", "--template-dir=" + candidate]);
    assert.equal(stagedReadback.status, 2); assert.equal(JSON.parse(stagedReadback.stdout).outcome, "BLOCKED");
    const stagedApply = run([bundlePath, "--mode=APPLY_GUARDED_BUSINESS_CONSENT_MASTER_MIGRATION", "--template-dir=" + candidate]);
    assert.equal(stagedApply.status, 1); assert.match(JSON.parse(stagedApply.stderr).error, /READ_ONLY_ARGUMENT/);
    const rb = run([bundlePath, "--mode=READBACK"]);
    assert.equal(rb.status, 2, rb.stderr); assert.equal(JSON.parse(rb.stdout).outcome, "BLOCKED");
    const applied = run([bundlePath, "--mode=APPLY_GUARDED_BUSINESS_CONSENT_MASTER_MIGRATION",
      "--confirm=MIGRATE_REVIEWED_BUSINESS_CONSENT_MASTER", "--expected-plan-hash=" + p.planHash]);
    assert.equal(applied.status, 1); assert.match(JSON.parse(applied.stderr).error, /WRITER_EXCLUSION_UNPROVEN/);
    for (const option of ["--writer-exclusion-proven=true", "--profile=consent", "--output-root=" + outputRoot]) {
      const refused = run([bundlePath, option]); assert.equal(refused.status, 1);
      assert.match(JSON.parse(refused.stderr).error, /ARGUMENT_INVALID/);
    }
    const exports = run(["--input-type=module", "-e",
      `const m = await import(${JSON.stringify(pathToFileURL(bundlePath).href)}); console.log(JSON.stringify(Object.keys(m).sort()));`]);
    assert.equal(exports.status, 0, exports.stderr);
    assert.deepEqual(JSON.parse(exports.stdout), ["APPLY_CONFIRMATION", "APPLY_MODE", "applyBusinessConsentMasterMigration",
      "planBusinessConsentMasterMigration", "readBusinessConsentMasterMigration"].sort());
    // The historical entrypoint is still shipped as standalone JS plus its
    // extracted helper, and must not accidentally require TS or node_modules.
    for (const name of ["jairo-business-master-package-drift-recovery.mjs", "business-master-transition-lifecycle.mjs"]) {
      await cp(resolve(ROOT, "app/web/scripts", name), join(runtime, name));
    }
    const historical = run([join(runtime, "jairo-business-master-package-drift-recovery.mjs")]);
    assert.equal(historical.status, 2, historical.stderr);
    assert.equal(JSON.parse(historical.stdout).requestId, "CDX-20261019-003");
    assert.deepEqual(await readdir(outputRoot), []);
    assert.deepEqual((await readdir(runtime)).sort(), ["business-consent-master-package-migration.mjs",
      "business-master-transition-lifecycle.mjs", "jairo-business-master-package-drift-recovery.mjs"].sort());
  } finally { await rm(root, { recursive: true, force: true }); }
});

// Exercise standalone staged entrypoints, without TS loaders or source imports.
// CI/productive evidence runs this with the explicit verified Node20 executable.
test("staged_mjs_entrypoints_generate_measurement_fixture_without_build_time_dependencies", async t => {
  const directory = await mkdtemp(resolve(tmpdir(), 'ph-business-runtime-stage-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const scripts = resolve(directory, 'scripts'); const template = resolve(directory, 'plantillas-de-pagina/business');
  await mkdir(scripts); await mkdir(template, { recursive: true });
  for (const name of ['jairo-business-master-package.mjs', 'jairo-business-master-package-drift-recovery.mjs', 'business-master-transition-lifecycle.mjs']) await cp(resolve(ROOT, 'app/web/scripts', name), resolve(scripts, name));
  const config = { ecosystemType: 'BUSINESS', site: { id: 'ganomaster-business', appName: 'ganomaster-business' }, distributor: { brandName: '', firstName: '', fullName: '', role: '', whatsappNumber: '', phoneNumber: '', displayPhone: '', ctaUrl: '', defaultMessage: '' }, cta: { primaryUrl: '', secondaryUrl: '', directRegisterUrl: '' }, vsl: { provider: 'custom', embedUrl: 'https://fixture.example.test/video.mp4' } };
  const runtime = 'window.syntheticStageRuntime = true;\n';
  for (const [name, bytes] of Object.entries({ 'config.js': `const CONFIG = ${JSON.stringify(config)};`, 'index.html': '<html></html>', 'app.js': 'window.syntheticApp = true;', 'styles.css': 'body{}', 'favicon.svg': '<svg/>', 'measurement-runtime.js': runtime })) await writeFile(resolve(template, name), bytes);
  const node20 = process.env.BUSINESS_CUTOVER_TEST_NODE20;
  assert.ok(node20, "BUSINESS_CUTOVER_TEST_NODE20 is required, without fallback");
  assert.match(execFileSync(node20, ["--version"], { encoding: "utf8" }), /^v20\./);
  const output = execFileSync(node20, ['--input-type=module', '-e', `
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
  assert.match(JSON.parse(output).node, /^20\./);
  assert.equal(JSON.parse(output).outcome, 'APPLIED');
});
