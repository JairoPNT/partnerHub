import assert from "node:assert/strict";
import { spawnSync, execFileSync } from "node:child_process";
import { randomUUID, createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile, symlink, lstat, cp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { build } from "esbuild";
import { builder } from "./build-business-cutover-writer-inventory.test-fixtures.mjs";

const web = resolve(import.meta.dirname, "..");
const repo = resolve(web, "../..");
const node20 = process.env.BUSINESS_CUTOVER_TEST_NODE20;
const options = { absWorkingDir: web, bundle: true, platform: "node", format: "esm", target: "node20",
  alias: { "server-only": "./server/runtime/serverOnlyRuntimeShim.mjs" }, logLevel: "silent" };
function environment(output) {
  return { ...Object.fromEntries(["PATH", "SystemRoot", "TEMP", "TMP"].filter((key) => process.env[key])
    .map((key) => [key, process.env[key]])), NODE_ENV: "production", PRODUCT_PAGE_OUTPUT_DIR: output };
}
function run(runtime, args, output) {
  assert.ok(node20, "BUSINESS_CUTOVER_TEST_NODE20 must name actual Node20 (no fallback)");
  return spawnSync(node20, args, { cwd: runtime, env: environment(output), encoding: "utf8", timeout: 30000 });
}
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "cdx011-runner-runtime-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const runtime = join(root, "runtime"), output = join(root, "output");
  await mkdir(runtime); await mkdir(output);
  const version = run(runtime, ["--version"], output);
  assert.equal(version.status, 0, version.stderr); assert.match(version.stdout, /^v20\./);
  const cli = join(runtime, "business-consent-cutover.mjs");
  const artifact = await build({ ...options, entryPoints: ["scripts/business-consent-cutover.ts"], outfile: cli, metafile: true });
  for (const name of ["businessCutoverMigrationAuthority.ts", "businessCutoverMaintenanceService.ts", "businessCutoverReleaseService.ts", "businessCutoverReleaseVerification.ts"])
    assert.equal(Object.keys(artifact.metafile.inputs).filter((p) => p.endsWith("/" + name)).length, 1, `${name} must live in exactly one graph`);
  return { root, runtime, output, cli };
}
test("Node20 standalone import exposes no capability, handle, permit, proof or profile mint", async (t) => {
  const f = await fixture(t);
  const result = run(f.runtime, ["--input-type=module", "-e", `const m = await import(${JSON.stringify(pathToFileURL(f.cli).href)}); console.log(JSON.stringify(Object.keys(m).sort()));`], f.output);
  assert.equal(result.status, 0, result.stderr); assert.equal(result.stderr, "");
  assert.deepEqual(JSON.parse(result.stdout), ["parseBusinessConsentCutoverArguments", "runBusinessConsentCutover"]);
  assert.deepEqual(await readdir(f.output), []);
});
test("Node20 unavailable BEGIN blocks before claim and parser rejects secrets without echo", async (t) => {
  const f = await fixture(t), base = ["--mode=BEGIN", `--operation-id=${randomUUID()}`];
  const begin = run(f.runtime, [f.cli, ...base], f.output);
  assert.equal(begin.status, 2, begin.stderr); assert.equal(begin.stderr, "");
  assert.deepEqual(JSON.parse(begin.stdout), { requestId: "CDX-20261021-011", mode: "BEGIN", status: "BLOCKED",
    reasons: ["BUSINESS_CUTOVER_ARTIFACTS_UNAVAILABLE"], metadataWritesMade: false, packageWritesMade: false,
    providerCallsMade: false, publicationMade: false });
  for (const field of ["root", "output-root", "template-dir", "token", "profile", "runtime-hash", "force", "mode", "operation-id", "unknown"]) {
    const result = run(f.runtime, [f.cli, ...base, `--${field}=secret-${f.root}`], f.output);
    assert.equal(result.status, 1); assert.equal(result.stdout, "");
    assert.deepEqual(JSON.parse(result.stderr).reasons, ["BUSINESS_CUTOVER_ARGUMENT_INVALID"]);
    assert.equal(result.stderr.includes("secret-"), false); assert.equal(result.stderr.includes(f.root), false);
    assert.equal(result.stderr.includes("stack"), false);
  }
  assert.deepEqual(await readdir(f.output), []); assert.deepEqual(await readdir(f.runtime), ["business-consent-cutover.mjs"]);
});
async function snapshot(root) {
  const result = {};
  async function visit(path, name) {
    const info = await lstat(path, { bigint: true });
    assert.equal(info.isSymbolicLink(), false);
    result[name] = [String(info.ino), String(info.mode), String(info.mtimeNs), String(info.ctimeNs),
      info.isFile() ? createHash("sha256").update(await readFile(path)).digest("hex") : null];
    if (info.isDirectory()) for (const child of (await readdir(path)).sort()) await visit(join(path, child), `${name}/${child}`);
  }
  await visit(root, ""); return result;
}
test("Node20 rebuilt writer and direct verifier block before source, provider or filesystem effects", async (t) => {
  const f = await fixture(t), harness = join(f.runtime, "writer-verifier.mjs");
  await build({ ...options, stdin: { resolveDir: web, loader: "ts", contents: `
    export { beginBusinessCutover } from './server/services/businessCutoverMaintenanceService';
    export { productPageVerificationService } from './server/services/productPageVerificationService';
    export { productPageSourceService } from './server/services/productPageSourceService';
    export { productPageHistoryService } from './server/services/productPageHistoryService';
    export { activationLeadService } from './server/services/activationLeadService';
    export { generateJairoBusinessPackageIsolated } from './server/runtime/jairoBusinessPackageGenerator';` }, outfile: harness });
  const moduleUrl = JSON.stringify(pathToFileURL(harness).href);
  const closed = run(f.runtime, ["--input-type=module", "-e", `const m = await import(${moduleUrl}); await m.beginBusinessCutover(process.env.PRODUCT_PAGE_OUTPUT_DIR, ${JSON.stringify(randomUUID())});`], f.output);
  assert.equal(closed.status, 0, closed.stderr);
  const before = await snapshot(f.output), paths = { outputDirectory: f.output,
    sourceDirectory: join(f.output, ".sources"), activationDirectory: join(f.output, ".activation"),
    paymentDirectory: join(f.output, ".payments"), commercialGrantDirectory: join(f.output, ".grants") };
  const result = run(f.runtime, ["--input-type=module", "-e", `
    const m = await import(${moduleUrl}); const effects = [];
    globalThis.fetch = () => { effects.push('fetch'); throw new Error('UNEXPECTED_PROVIDER'); };
    m.productPageSourceService.get = async () => { effects.push('source'); throw new Error('UNEXPECTED_SOURCE'); };
    m.productPageHistoryService.append = async () => { effects.push('history'); throw new Error('UNEXPECTED_HISTORY'); };
    m.activationLeadService.updatePublicationStateBySiteId = async () => { effects.push('lead'); throw new Error('UNEXPECTED_LEAD'); };
    for (const siteId of ['ana-business','ganomaster-business']) {
      try { await m.productPageVerificationService.verify({siteId}); throw new Error('NOT_BLOCKED'); }
      catch (error) { if (error.message !== 'BUSINESS_SITE_BUSY') throw error; }
    }
    try { await m.generateJairoBusinessPackageIsolated(${JSON.stringify(paths)}); throw new Error('NOT_BLOCKED'); }
    catch (error) { if (error.message !== 'BUSINESS_SITE_BUSY') throw error; }
    console.log(JSON.stringify({status:'BUSINESS_SITE_BUSY', effects}));`], f.output);
  assert.equal(result.status, 0, result.stderr); assert.equal(result.stderr, "");
  assert.deepEqual(JSON.parse(result.stdout), { status: "BUSINESS_SITE_BUSY", effects: [] });
  assert.deepEqual(await snapshot(f.output), before, "zero source, history, package, claim or provider effects under closure");
});
test("production wiring has acyclic full-layout inventory before one-graph CLI addition", async () => {
  const docker = await readFile(join(repo, "Dockerfile"), "utf8"), pkg = JSON.parse(await readFile(join(web, "package.json"), "utf8"));
  assert.equal(pkg.scripts["maintenance:business-consent-cutover"], "node scripts/business-consent-cutover.mjs");
  assert.equal(pkg.scripts["test:business-consent-cutover-runtime"], "node --test scripts/business-consent-cutover-runtime-packaging.test.mjs");
  assert.match(docker, /AS runtime-layout/); assert.match(docker, /AS cutover-cli-builder/);
  assert.match(docker, /FROM runtime-layout AS runner/);
  assert.match(docker, /COPY --from=cutover-cli-builder \/repo\/runtime-assets\/business-consent-cutover.mjs \.\/scripts\/business-consent-cutover.mjs/);
  assert.equal(/USER\s+1000/.test(docker), false, "do not change the production volume UID");
});

async function assembly(t) {
  const root = await mkdtemp(join(tmpdir(), "cdx011-assembly-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const standalone = join(root, "standalone"), dependencies = join(root, "node_modules"), destination = join(root, "assembled");
  await mkdir(standalone); await mkdir(dependencies);
  const source = await readFile(join(web, "scripts/assemble-business-cutover-runtime.mjs"), "utf8").catch(() => null);
  assert.ok(source, "closed-layout assembler must exist");
  const transformed = source.replaceAll('"/repo/app/web/.next/standalone"', JSON.stringify(standalone))
    .replaceAll('"/repo/app/web/node_modules"', JSON.stringify(dependencies))
    .replaceAll('"/repo/business-cutover-standalone"', JSON.stringify(destination));
  const module = await import(`data:text/javascript;base64,${Buffer.from(transformed).toString("base64")}#${randomUUID()}`);
  async function save(file, bytes = "same") { await mkdir(resolve(file, ".."), { recursive: true }); await writeFile(file, bytes); }
  return { root, standalone, dependencies, destination, save, assemble: module.assembleBusinessCutoverStandalone };
}
test("assembler flattens only the two closed layouts preserving bytes and traced root dependencies", async (t) => {
  for (const prefix of ["", "app/web"]) await t.test(prefix || "flat", async (st) => {
    const f = await assembly(st), selected = join(f.standalone, prefix);
    await f.save(join(selected, "server.js"), "server"); await f.save(join(selected, ".next/server/route.js"), "writer");
    await f.save(join(selected, "scripts/assemble-business-cutover-runtime.mjs"), "build-only");
    await f.save(join(selected, "scripts/keep-source.ts"), "preserved-source");
    await f.save(join(f.standalone, "node_modules/dependency/index.js"), "traced-root");
    await f.assemble();
    assert.equal(await readFile(join(f.destination, "server.js"), "utf8"), "server");
    assert.equal(await readFile(join(f.destination, ".next/server/route.js"), "utf8"), "writer");
    assert.equal(await readFile(join(f.destination, "node_modules/dependency/index.js"), "utf8"), "traced-root");
    await assert.rejects(lstat(join(f.destination, "scripts/assemble-business-cutover-runtime.mjs")), { code: "ENOENT" });
    assert.equal(await readFile(join(f.destination, "scripts/keep-source.ts"), "utf8"), "preserved-source");
  });
});
test("assembler rejects ambiguous layouts, different dependency collisions, and escaping links", async (t) => {
  for (const kind of ["missing", "ambiguous", "collision", "escape", "unknown-link", "dangling-link", "type-collision", "parent-escape"]) await t.test(kind, async (st) => {
    const f = await assembly(st); if (kind !== "missing" && kind !== "parent-escape") await f.save(join(f.standalone, "app/web/server.js"));
    if (kind === "ambiguous") await f.save(join(f.standalone, "server.js"));
    if (kind === "collision") {
      await f.save(join(f.standalone, "node_modules/pkg/index.js"), "first");
      await f.save(join(f.standalone, "app/web/node_modules/pkg/index.js"), "different");
    }
    if (kind === "escape") {
      const outside = join(f.root, "foreign"); await mkdir(outside);
      const link = join(f.standalone, "app/web/.next/node_modules/sharp-1234567890abcdef");
      await mkdir(resolve(link, ".."), { recursive: true }); await symlink(outside, link, process.platform === "win32" ? "junction" : "dir");
    }
    if (kind === "unknown-link" || kind === "dangling-link") {
      const target = join(f.dependencies, "sharp"); if (kind === "unknown-link") await mkdir(target);
      const link = join(f.standalone, "app/web", kind === "unknown-link" ? "unexpected-link" : ".next/node_modules/sharp-1234567890abcdef");
      await mkdir(resolve(link, ".."), { recursive: true }); await symlink(target, link, process.platform === "win32" ? "junction" : "dir");
    }
    if (kind === "type-collision") {
      await f.save(join(f.standalone, "app/web/node_modules/pkg"), "file");
      await f.save(join(f.standalone, "node_modules/pkg/index.js"), "directory-child");
    }
    if (kind === "parent-escape") {
      const foreign = join(f.root, "foreign"); await f.save(join(foreign, "web/server.js"));
      await symlink(foreign, join(f.standalone, "app"), process.platform === "win32" ? "junction" : "dir");
    }
    await assert.rejects(f.assemble(), /^Error: BUSINESS_CUTOVER_RUNTIME_LAYOUT_INVALID$/);
  });
});
test("assembler materializes approved Next dependency links and accepts byte-identical collision", async (t) => {
  const f = await assembly(t); await f.save(join(f.standalone, "app/web/server.js"));
  await f.save(join(f.standalone, "node_modules/pkg/index.js")); await f.save(join(f.standalone, "app/web/node_modules/pkg/index.js"));
  await f.save(join(f.dependencies, "sharp/lib/index.js"), "sharp-bytes");
  const link = join(f.standalone, "app/web/.next/node_modules/sharp-1234567890abcdef");
  await mkdir(resolve(link, ".."), { recursive: true }); await symlink(join(f.dependencies, "sharp"), link, process.platform === "win32" ? "junction" : "dir");
  await f.assemble();
  const materialized = join(f.destination, ".next/node_modules/sharp-1234567890abcdef");
  assert.equal((await lstat(materialized)).isSymbolicLink(), false);
  assert.equal(await readFile(join(materialized, "lib/index.js"), "utf8"), "sharp-bytes");
});

test("actual built standalone plus all Docker COPY bytes has a complete regular inventory and honest missing-staging gate", { timeout: 120000 }, async (t) => {
  const f = await assembly(t);
  // Reuse the production assembler with ONLY fixed build paths substituted for
  // this disposable test. No runtime root or approval option is introduced.
  const source = (await readFile(join(web, "scripts/assemble-business-cutover-runtime.mjs"), "utf8"))
    .replaceAll('"/repo/app/web/.next/standalone"', JSON.stringify(join(web, ".next/standalone")))
    .replaceAll('"/repo/app/web/node_modules"', JSON.stringify(join(web, "node_modules")))
    .replaceAll('"/repo/business-cutover-standalone"', JSON.stringify(f.destination));
  const assembler = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}#${randomUUID()}`);
  await assembler.assembleBusinessCutoverStandalone();
  const assets = join(f.root, "built-assets"), sftp = join(f.root, "sftp-runtime");
  await mkdir(assets); await mkdir(sftp);
  const entries = { "jairo-business-in-process-provisioner.mjs": "server/runtime/jairoBusinessInProcessProvisioner.ts",
    "jairo-business-package-generator.mjs": "server/runtime/jairoBusinessPackageGenerator.ts",
    "product-mutation-coordinator.mjs": "server/services/productMutationCoordinator.ts",
    "business-consent-master-package-migration.mjs": "scripts/business-consent-master-package-migration.mjs",
    "business-cutover-maintenance.mjs": "scripts/business-cutover-maintenance.ts" };
  for (const [file, entry] of Object.entries(entries)) await build({ ...options, entryPoints: [entry], outfile: join(assets, file) });
  for (const name of ["package.json", "package-lock.json", "smoke.mjs"]) await cp(join(web, "runtime-deps/sftp", name), join(sftp, name));
  const npmCandidates = [process.env.npm_execpath, join(dirname(node20), "node_modules/npm/bin/npm-cli.js"),
    resolve(dirname(node20), "../lib/node_modules/npm/bin/npm-cli.js")].filter(Boolean);
  let npmCli;
  for (const candidate of npmCandidates) if (await lstat(candidate).then((s) => s.isFile(), () => false)) { npmCli = candidate; break; }
  assert.ok(npmCli, "an npm CLI from the configured toolchain is required for the locked SFTP runtime");
  const installed = spawnSync(node20, [npmCli, "ci", "--omit=dev", "--omit=optional", "--ignore-scripts", "--no-audit", "--no-fund"],
    { cwd: sftp, env: environment(f.output), encoding: "utf8", timeout: 60000 });
  assert.equal(installed.status, 0, installed.stderr);
  const sftpSmoke = run(sftp, [join(sftp, "smoke.mjs")], f.output);
  assert.equal(sftpSmoke.status, 0, sftpSmoke.stderr);
  assert.deepEqual(JSON.parse(sftpSmoke.stdout), { status: "SFTP_RUNTIME_READY", providerCallsMade: false });
  const docker = await readFile(join(repo, "Dockerfile"), "utf8");
  const layout = docker.split("AS runtime-layout\n")[1]?.split("# Build tooling")[0] ?? docker.split("AS runtime-layout\r\n")[1]?.split("# Build tooling")[0];
  assert.ok(layout, "full runtime-layout COPY list must be read from production Dockerfile");
  for (const match of layout.matchAll(/^COPY --from=(builder|sftp-runtime-deps) (\S+) \.\/(\S+)\r?$/gm)) {
    const [, stage, sourcePath, target] = match;
    let path;
    if (sourcePath === "/repo/business-cutover-standalone") continue;
    if (stage === "sftp-runtime-deps") path = join(sftp, "node_modules");
    else if (sourcePath.startsWith("/repo/runtime-assets/")) {
      const name = sourcePath.slice("/repo/runtime-assets/".length);
      path = name === "business-config.js" ? join(repo, "plantillas-de-pagina/business/config.js")
        : name === "personal-brand-config.js" ? join(repo, "plantillas-de-pagina/personal-brand/config.js") : join(assets, name);
    } else { assert.ok(sourcePath.startsWith("/repo/")); path = join(repo, sourcePath.slice(6)); }
    await cp(path, join(f.destination, target), { recursive: true, dereference: false, force: true });
  }
  await assert.rejects(lstat(join(f.destination, "scripts/assemble-business-cutover-runtime.mjs")), { code: "ENOENT" });
  const inventoryBuilder = await builder(f.destination);
  const canonicalApp = await readFile(join(f.destination, "plantillas-de-pagina/business/app.js"));
  const reviewedAppHash = "5013e2523bb6dc69a5f886d201c034a182b06b8a346cf81f85b7e950263d30d9";
  const currentBytesReviewed = createHash("sha256").update(canonicalApp).digest("hex") === reviewedAppHash;
  await assert.rejects(inventoryBuilder.buildBusinessCutoverWriterInventory(), (error) => {
    assert.equal(error.message, currentBytesReviewed ? "BUSINESS_CUTOVER_ARTIFACTS_UNAVAILABLE" : "BUSINESS_CUTOVER_PROFILE_INVALID"); return true;
  }, "present non-pinned checkout bytes are fatal even when staging is absent");
  // Windows core.autocrlf changes the checkout's actual canonical bytes. Never
  // normalize production assets: use exact Git bytes ONLY in this temp fixture.
  for (const name of ["app.js", "config.js", "favicon.svg", "index.html", "styles.css"]) {
    const bytes = execFileSync("git", ["show", `a8d547c1cf9d754573bf20eb5cc154a03f9f5c60:plantillas-de-pagina/business/${name}`], { cwd: repo });
    await writeFile(join(f.destination, "plantillas-de-pagina/business", name), bytes);
    if (name === "config.js") await writeFile(join(f.destination, "runtime-assets/business-config.js"), bytes);
  }
  await assert.rejects(inventoryBuilder.buildBusinessCutoverWriterInventory(), (error) => {
    assert.equal(error.message, "BUSINESS_CUTOVER_ARTIFACTS_UNAVAILABLE"); return true;
  }, "exact canonical fixture without staging remains unavailable");
  // Composition fixtures only: exact reviewed009 bytes, not an approved image.
  const staging = join(f.destination, "runtime-assets/business-consent-successor"); await mkdir(staging);
  for (const name of ["app.js", "config.js", "favicon.svg", "index.html", "styles.css", "measurement-runtime.js"])
    await writeFile(join(staging, name), execFileSync("git", ["show", `88c003d8cbb419522c20c084dc4a019a22d33155:plantillas-de-pagina/business/${name}`], { cwd: repo }));
  const inventory = await inventoryBuilder.buildBusinessCutoverWriterInventory();
  assert.equal(inventory.releaseId, "business-consent-predecessor-v1");
  const installedFiles = [];
  async function collect(path, relative = "") {
    const info = await lstat(path); assert.equal(info.isSymbolicLink(), false);
    if (info.isDirectory()) for (const name of await readdir(path)) await collect(join(path, name), relative ? `${relative}/${name}` : name);
    else { assert.equal(info.isFile(), true); assert.equal(info.nlink, 1); installedFiles.push(relative); }
  }
  await collect(f.destination);
  assert.deepEqual(inventory.files.map((row) => row.path), installedFiles.sort());
  for (const required of ["server.js", "node_modules/next/package.json", "scripts/node_modules/ssh2-sftp-client/package.json",
    "scripts/business-consent-master-package-migration.mjs", "runtime-assets/jairo-business-package-generator.mjs"])
    assert.ok(installedFiles.includes(required), required);
  const cli = join(f.destination, "scripts/business-consent-cutover.mjs");
  await build({ ...options, entryPoints: ["scripts/business-consent-cutover.ts"], outfile: cli });
  await writeFile(join(f.destination, "runtime-assets/business-cutover-writer-inventory.json"), JSON.stringify(inventory));
  assert.deepEqual(await inventoryBuilder.buildBusinessCutoverWriterInventory(), inventory, "only the two exact exclusions may be added after inventory");
  const smoke = run(f.destination, ["--input-type=module", "-e", `await import(${JSON.stringify(pathToFileURL(cli).href)}); console.log('READY');`], f.output);
  assert.equal(smoke.status, 0, smoke.stderr); assert.equal(smoke.stdout, "READY\n");
  t.diagnostic(`actual flattened regular files inventoried: ${inventory.files.length}; Node20 ${spawnSync(node20, ["--version"], { encoding: "utf8" }).stdout.trim()}; no provider calls`);
});
