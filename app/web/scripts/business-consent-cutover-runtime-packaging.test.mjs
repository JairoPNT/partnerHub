import assert from "node:assert/strict";
import { spawnSync, execFileSync } from "node:child_process";
import { randomUUID, createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile, symlink, lstat, cp, chmod, link } from "node:fs/promises";
import fs from "node:fs/promises";
import { syncBuiltinESMExports } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep, toNamespacedPath } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { build } from "esbuild";
import { builder, image } from "./build-business-cutover-writer-inventory.test-fixtures.mjs";

const web = resolve(import.meta.dirname, "..");
const repo = resolve(web, "../..");
const node20 = process.env.BUSINESS_CUTOVER_TEST_NODE20;
const successorNames = ["app.js", "config.js", "favicon.svg", "index.html", "measurement-runtime.js", "styles.css"];
async function trackedSuccessor(destination) {
  await mkdir(destination, { recursive: true });
  for (const name of successorNames) {
    const bytes = execFileSync("git", ["show", `HEAD:runtime-assets/business-consent-successor/${name}`], { cwd: repo });
    await writeFile(join(destination, name), bytes);
  }
}
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

test("fixed Docker staging inputs make the predecessor inventory available without canonical changes", async (t) => {
  const root = await image(t), staging = join(root, "runtime-assets/business-consent-successor");
  const names = successorNames;
  const input = join(repo, "runtime-assets/business-consent-successor");
  for (const name of names) {
    assert.ok(await lstat(join(input, name)).then((s) => s.isFile(), () => false), `fixed staging input ${name} must exist`);
    const bytes = execFileSync("git", ["show", `HEAD:runtime-assets/business-consent-successor/${name}`], { cwd: repo });
    const reviewed = execFileSync("git", ["show", `82b6c5db71d158d8089af3207777249b5fb4e125:plantillas-de-pagina/business/${name}`], { cwd: repo });
    assert.deepEqual(bytes, reviewed, `${name} must retain reviewed Git bytes`);
  }
  assert.deepEqual((await readdir(input)).sort(), names);
  const canonical = await snapshot(join(root, "plantillas-de-pagina/business"));
  await rm(staging, { recursive: true });
  const docker = await readFile(join(repo, "Dockerfile"), "utf8");
  const builderStage = docker.split("FROM base AS builder")[1].split("FROM node:20-alpine AS runtime-layout")[0];
  const runtimeStage = docker.split("AS runtime-layout")[1].split("# Build tooling")[0];
  const copy = builderStage.match(/^COPY (runtime-assets\/business-consent-successor) (\.\/runtime-assets\/business-consent-successor)\r?$/m);
  assert.ok(copy, "builder must copy the fixed staging input");
  const built = await mkdtemp(join(tmpdir(), "cdx002-staged-builder-"));
  t.after(() => rm(built, { recursive: true, force: true }));
  await trackedSuccessor(join(built, copy[2]));
  const installed = runtimeStage.match(/^COPY --from=builder \/repo\/(runtime-assets\/business-consent-successor) (\.\/runtime-assets\/business-consent-successor)\r?$/m);
  assert.ok(installed, "runtime must carry the fixed builder staging");
  assert.ok(installed.index < runtimeStage.indexOf("RUN find /app -type d"), "staging must precede final hardening and inventory");
  await cp(join(built, installed[1]), join(root, installed[2]), { recursive: true });
  const inventory = await (await builder(root)).buildBusinessCutoverWriterInventory();
  assert.equal(inventory.releaseId, "business-consent-predecessor-v1");
  for (const name of names) assert.ok(inventory.files.some((file) => file.path === `runtime-assets/business-consent-successor/${name}`));
  assert.deepEqual(await snapshot(join(root, "plantillas-de-pagina/business")), canonical);
});

test("runtime static COPY removes only group and other writes before inventory", async (t) => {
  if (process.platform === "win32") { t.skip("native POSIX mode/owner assertions require the Linux Node20 gate"); return; }
  const root = await mkdtemp(join(tmpdir(), "cdx011-static-modes-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const directory = join(root, "static"); await mkdir(directory);
  const files = [["chunk.js", 0o664, 0o644], ["executable.js", 0o777, 0o755], ["private.css", 0o600, 0o600]];
  const before = new Map();
  for (const [name, mode] of files) {
    const path = join(directory, name); await writeFile(path, `${name}-immutable-bytes`); await chmod(path, mode);
    before.set(name, { stat: await lstat(path), bytes: await readFile(path) });
  }
  assert.equal(before.get("chunk.js").stat.mode & 0o022, 0o020, "fixture reproduces the native0664 inventory rejection");
  const outside = join(root, "outside.js"); await writeFile(outside, "outside-unchanged"); await chmod(outside, 0o664);
  await symlink(outside, join(directory, "outside-link.js"), "file");
  await link(outside, join(directory, "outside-hardlink.js"));
  const docker = await readFile(join(repo, "Dockerfile"), "utf8");
  const command = docker.match(/^RUN (find \/app\/\.next\/static -type f(?: -links 1)? -exec chmod go-w \{\} \+)\r?$/m)?.[1];
  assert.ok(command, "production must remove generated static group/other write bits");
  const copyIndex = docker.indexOf("COPY --from=builder /repo/app/web/.next/static ./.next/static");
  assert.ok(copyIndex >= 0 && docker.indexOf(`RUN ${command}`) > copyIndex);
  assert.ok(docker.indexOf(`RUN ${command}`) < docker.indexOf("COPY --from=builder /repo/app/web/scripts/build-business-cutover-writer-inventory.mjs"));
  // Execute the exact production command with only its immutable deployment
  // path substituted for this private fixture, never a runtime root option.
  const result = spawnSync("sh", ["-c", command.replace("/app/.next/static", JSON.stringify(directory))], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  for (const [name, , expected] of files) {
    const stat = await lstat(join(directory, name)), original = before.get(name);
    assert.equal(stat.mode & 0o777, expected); assert.equal(stat.uid, original.stat.uid); assert.equal(stat.gid, original.stat.gid);
    assert.equal(stat.ino, original.stat.ino); assert.equal(stat.nlink, original.stat.nlink);
    assert.deepEqual(await readFile(join(directory, name)), original.bytes);
    assert.equal(createHash("sha256").update(await readFile(join(directory, name))).digest("hex"), createHash("sha256").update(original.bytes).digest("hex"));
  }
  assert.equal((await lstat(outside)).mode & 0o777, 0o664, "find must not follow a static symlink or chmod an external hardlink");
  assert.equal((await lstat(outside)).nlink, 2, "an external hardlink must remain for the unchanged inventory rejection");
  assert.equal((await lstat(join(directory, "outside-link.js"))).isSymbolicLink(), true, "normalization must not launder a link past the inventory guard");
});

test("final runtime COPY hardening handles GitHub modes without touching external links", async (t) => {
  if (process.platform === "win32") { t.skip("native GitHub0775/0664 modes and hardlinks require the Linux Node20 gate"); return; }
  const root = await mkdtemp(join(tmpdir(), "cdx001-runtime-modes-")); t.after(() => rm(root, { recursive: true, force: true }));
  const app = join(root, "app"), before = new Map();
  for (const name of [".next/static", "runtime-assets", "scripts", "public", "plantillas-de-pagina/business"]) await mkdir(join(app, name), { recursive: true });
  for (const [name, mode] of [["runtime-assets/business-config.js", 0o664], ["scripts/guarded-ecosystem-publication.mjs", 0o664],
    ["plantillas-de-pagina/business/app.js", 0o664], ["public/asset.svg", 0o664], ["public/executable.sh", 0o777], ["public/private.txt", 0o600]]) {
    const path = join(app, name); await writeFile(path, `${name}-exact-source-bytes`); await chmod(path, mode);
    before.set(path, { stat: await lstat(path), bytes: await readFile(path) });
  }
  for (const name of ["", "public", "runtime-assets", "scripts", "plantillas-de-pagina", "plantillas-de-pagina/business"]) {
    const path = join(app, name); await chmod(path, 0o775); before.set(path, { stat: await lstat(path), bytes: null });
  }
  const outside = join(root, "outside"); await mkdir(outside); await chmod(outside, 0o775);
  const foreign = join(outside, "shared.js"); await writeFile(foreign, "outside-original-bytes"); await chmod(foreign, 0o664);
  const foreignBefore = await lstat(foreign), foreignBytes = await readFile(foreign);
  await symlink(outside, join(app, "public/outside-dir"), "dir"); await symlink(foreign, join(app, "public/outside-link.js"), "file");
  await link(foreign, join(app, ".next/static/outside-hardlink.js"));
  const docker = await readFile(join(repo, "Dockerfile"), "utf8"), stage = docker.split("AS runtime-layout")[1].split("FROM builder AS cutover-cli-builder")[0];
  const final = stage.match(/^RUN (find \/app -type d -exec chmod go-w \{\} \+ && find \/app -type f -links 1 -exec chmod go-w \{\} \+)\r?$/m)?.[1];
  assert.ok(final, "all final directly copied runtime directories/single-link files must be hardened");
  const step = stage.indexOf(`RUN ${final}`), copies = [...stage.matchAll(/^COPY .* \.\/.*$/gm)];
  assert.ok(copies.length > 0 && copies.every((entry) => entry.index < step), "harden after every final runtime COPY");
  assert.ok(step < stage.indexOf("buildBusinessCutoverWriterInventory()"), "harden before inventory construction");
  const commands = [...stage.matchAll(/^RUN (find \/app[^\r\n]*)\r?$/gm)].map((entry) => entry[1]);
  for (const command of commands) {
    const result = spawnSync("sh", ["-c", command.replaceAll("/app", JSON.stringify(app))], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
  }
  for (const [path, original] of before) {
    const current = await lstat(path);
    assert.equal(current.mode & 0o777, (original.stat.mode & 0o777) & ~0o022);
    for (const key of ["uid", "gid", "ino", "nlink"]) assert.equal(current[key], original.stat[key]);
    assert.equal(current.mode & 0o111, original.stat.mode & 0o111);
    if (original.bytes) {
      const bytes = await readFile(path); assert.deepEqual(bytes, original.bytes);
      assert.equal(createHash("sha256").update(bytes).digest("hex"), createHash("sha256").update(original.bytes).digest("hex"));
    }
  }
  assert.equal((await lstat(outside)).mode & 0o777, 0o775);
  const foreignAfter = await lstat(foreign); assert.equal(foreignAfter.mode & 0o777, 0o664);
  assert.equal(foreignAfter.ino, foreignBefore.ino); assert.equal(foreignAfter.nlink, 2); assert.deepEqual(await readFile(foreign), foreignBytes);
  assert.equal((await lstat(join(app, "public/outside-link.js"))).isSymbolicLink(), true);
  assert.equal((await lstat(join(app, ".next/static/outside-hardlink.js"))).nlink, 2, "hardlink remains invalid for the unchanged inventory guard");
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

test("assembler materializes exact package aliases inside the selected standalone subtree", async (t) => {
  for (const prefix of ["", "app/web"]) for (const name of ["sharp", "cpu-features", "@aws-sdk/client-s3"])
    await t.test(`${prefix || "flat"}:${name}`, async (st) => {
      const f = await assembly(st), selected = join(f.standalone, prefix), target = join(selected, "node_modules", name);
      await f.save(join(selected, "server.js"));
      await f.save(join(target, "lib/index.js"), `${name}-traced-bytes`);
      const alias = join(selected, ".next/node_modules", `${name}-1234567890abcdef`);
      await mkdir(dirname(alias), { recursive: true }); await symlink(target, alias, process.platform === "win32" ? "junction" : "dir");
      await f.assemble();
      const materialized = join(f.destination, ".next/node_modules", `${name}-1234567890abcdef`);
      assert.equal((await lstat(materialized)).isSymbolicLink(), false);
      assert.equal(await readFile(join(materialized, "lib/index.js"), "utf8"), `${name}-traced-bytes`);
      assert.equal(await readFile(join(f.destination, "node_modules", name, "lib/index.js"), "utf8"), `${name}-traced-bytes`);
    });
});

test("assembler rejects traced aliases to wrong package, outside directory or symlinked dependency root", async (t) => {
  for (const kind of ["wrong-package", "outside", "symlinked-root"]) await t.test(kind, async (st) => {
    const f = await assembly(st), selected = join(f.standalone, "app/web");
    await f.save(join(selected, "server.js"));
    let target = join(selected, "node_modules/cpu-features");
    if (kind === "outside") target = join(f.root, "outside/sharp");
    if (kind === "symlinked-root") {
      const outside = join(f.root, "outside"); await f.save(join(outside, "sharp/lib/index.js"));
      await symlink(outside, join(selected, "node_modules"), process.platform === "win32" ? "junction" : "dir");
      target = join(selected, "node_modules/sharp");
    } else await f.save(join(target, "lib/index.js"));
    const alias = join(selected, ".next/node_modules/sharp-1234567890abcdef");
    await mkdir(dirname(alias), { recursive: true }); await symlink(target, alias, process.platform === "win32" ? "junction" : "dir");
    await assert.rejects(f.assemble(), /^Error: BUSINESS_CUTOVER_RUNTIME_LAYOUT_INVALID$/);
  });
});

test("assembler rejects approved Next package aliases whose exact target is a regular file", async (t) => {
  for (const location of ["original", "selected"]) for (const name of ["sharp", "cpu-features", "@aws-sdk/client-s3"]) await t.test(`${location}:${name}`, async (st) => {
    const f = await assembly(st), target = join(location === "original" ? f.dependencies : join(f.standalone, "app/web/node_modules"), name);
    await f.save(join(f.standalone, "app/web/server.js"));
    await f.save(target, "not-a-package-directory");
    const alias = join(f.standalone, "app/web/.next/node_modules", `${name}-1234567890abcdef`);
    await mkdir(dirname(alias), { recursive: true });
    try {
      await symlink(target, alias, "file");
      st.diagnostic("native file symlink created; real target/copy filesystem exercised");
    } catch (error) {
      if (process.platform !== "win32" || error.code !== "EPERM") throw error;
      // Windows disallows file symlinks without the relevant privilege. Only
      // this exact alias's link identity/resolution is instrumented; its fixed
      // target and every other stat/read/copy remain actual filesystem work.
      await f.save(alias, "private-link-placeholder");
      const originalLstat = fs.lstat, originalRealpath = fs.realpath;
      st.mock.method(fs, "lstat", async (...args) => String(args[0]) === alias
        ? { isSymbolicLink: () => true } : originalLstat(...args));
      st.mock.method(fs, "realpath", async (...args) => String(args[0]) === alias ? target : originalRealpath(...args));
      syncBuiltinESMExports();
      st.after(() => { st.mock.restoreAll(); syncBuiltinESMExports(); });
      st.diagnostic("native Windows file symlink EPERM; exact-alias lstat/realpath instrumented, not a native-link PASS");
    }
    await assert.rejects(f.assemble(), /^Error: BUSINESS_CUTOVER_RUNTIME_LAYOUT_INVALID$/);
    await assert.rejects(lstat(join(f.destination, ".next/node_modules", `${name}-1234567890abcdef`)), { code: "ENOENT" });
  });
});

test("actual built standalone plus all Docker COPY bytes has a complete regular inventory and fixture-only missing-staging gate", { timeout: 600000 }, async (t) => {
  const f = await assembly(t);
  let standalone = join(web, ".next/standalone");
  const nestedDependencies = join(standalone, "app/web/node_modules");
  if (process.platform === "win32" && await lstat(nestedDependencies).then((s) => s.isSymbolicLink(), () => false)) {
    const dependencyRoot = await fs.realpath(join(web, "node_modules"));
    assert.equal(await fs.realpath(nestedDependencies), dependencyRoot, "only the locked local dependency junction is materialized");
    const staged = join(f.root, "standalone-from-build");
    await cp(standalone, staged, { recursive: true, filter: (path) => path !== nestedDependencies });
    await cp(dependencyRoot, join(staged, "app/web/node_modules"), { recursive: true });
    standalone = staged;
  }
  // Reuse the production assembler with ONLY fixed build paths substituted for
  // this disposable test. No runtime root or approval option is introduced.
  const source = (await readFile(join(web, "scripts/assemble-business-cutover-runtime.mjs"), "utf8"))
    .replaceAll('"/repo/app/web/.next/standalone"', JSON.stringify(standalone))
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
  const sftpLock = JSON.parse(await readFile(join(sftp, "package-lock.json"), "utf8"));
  const webLock = JSON.parse(await readFile(join(web, "package-lock.json"), "utf8"));
  for (const [path, record] of Object.entries(sftpLock.packages)) {
    if (!path.startsWith("node_modules/") || record.optional) continue;
    const source = join(web, path), target = join(sftp, path);
    assert.equal(webLock.packages[path]?.integrity, record.integrity, `${path} must match the locked dependency bytes`);
    assert.equal(JSON.parse(await readFile(join(source, "package.json"), "utf8")).version, record.version);
    await cp(source, target, { recursive: true });
  }
  const sftpSmoke = run(sftp, [join(sftp, "smoke.mjs")], f.output);
  assert.equal(sftpSmoke.status, 0, sftpSmoke.stderr);
  assert.deepEqual(JSON.parse(sftpSmoke.stdout), { status: "SFTP_RUNTIME_READY", providerCallsMade: false });
  const docker = await readFile(join(repo, "Dockerfile"), "utf8");
  // Model only literal build-context exclusions for this source directory.
  // No wildcard pruning or inventory exception: Docker also never receives
  // these exact source-only tests, while all approved assets/starter remain.
  const excludedContextPaths = new Set((await readFile(join(repo, ".dockerignore"), "utf8"))
    .split(/\r?\n/).filter((line) => line.startsWith("plantillas-de-pagina/business/") && !/[*!?[]/.test(line)));
  const trackedStaging = join(f.root, "tracked-staging");
  await trackedSuccessor(trackedStaging);
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
        : name === "personal-brand-config.js" ? join(repo, "plantillas-de-pagina/personal-brand/config.js")
          : name === "business-consent-successor" ? trackedStaging : join(assets, name);
    } else { assert.ok(sourcePath.startsWith("/repo/")); path = join(repo, sourcePath.slice(6)); }
    await cp(path, join(f.destination, target), { recursive: true, dereference: false, force: true,
      ...(sourcePath === "/repo/plantillas-de-pagina/business" ? {
        filter: (source) => !excludedContextPaths.has(relative(toNamespacedPath(repo), toNamespacedPath(source)).split(sep).join("/"))
      } : {}) });
  }
  for (const name of ["consent-ui.test.mjs", "measurement-runtime.test.mjs", "measurement-test-harness.mjs"])
    await assert.rejects(lstat(join(f.destination, "plantillas-de-pagina/business", name)), { code: "ENOENT" });
  await assert.rejects(lstat(join(f.destination, "scripts/assemble-business-cutover-runtime.mjs")), { code: "ENOENT" });
  const inventoryBuilder = await builder(f.destination);
  const canonicalApp = await readFile(join(f.destination, "plantillas-de-pagina/business/app.js"));
  const reviewedProfiles = {
    "5013e2523bb6dc69a5f886d201c034a182b06b8a346cf81f85b7e950263d30d9": "business-consent-predecessor-v1",
    "fca1eb4fda4c7602ca1ab5448b81323b7b1af55ee2a3a2a537c85b2f625546de": "business-consent-successor-v1",
  };
  const currentProfile = reviewedProfiles[createHash("sha256").update(canonicalApp).digest("hex")];
  if (currentProfile) assert.equal((await inventoryBuilder.buildBusinessCutoverWriterInventory()).releaseId, currentProfile);
  else await assert.rejects(inventoryBuilder.buildBusinessCutoverWriterInventory(), (error) => {
    assert.equal(error.message, "BUSINESS_CUTOVER_PROFILE_INVALID"); return true;
  }, "present non-pinned checkout bytes are fatal even when fixed staging is present");
  if (currentProfile === "business-consent-successor-v1") {
    const staging = join(f.destination, "runtime-assets/business-consent-successor");
    await rm(staging, { recursive: true });
    assert.equal((await inventoryBuilder.buildBusinessCutoverWriterInventory()).releaseId, currentProfile,
      "exact canonical successor does not depend on the predecessor staging overlay");
    await cp(trackedStaging, staging, { recursive: true });
  }
  // Windows core.autocrlf changes the checkout's actual canonical bytes. Never
  // normalize production assets: use exact Git bytes ONLY in this temp fixture.
  const canonicalDirectory = join(f.destination, "plantillas-de-pagina/business");
  await rm(canonicalDirectory, { recursive: true }); await mkdir(canonicalDirectory);
  for (const name of ["app.js", "config.js", "favicon.svg", "index.html", "styles.css"]) {
    const bytes = execFileSync("git", ["show", `a8d547c1cf9d754573bf20eb5cc154a03f9f5c60:plantillas-de-pagina/business/${name}`], { cwd: repo });
    await writeFile(join(f.destination, "plantillas-de-pagina/business", name), bytes);
    if (name === "config.js") await writeFile(join(f.destination, "runtime-assets/business-config.js"), bytes);
  }
  const stagedInventory = await inventoryBuilder.buildBusinessCutoverWriterInventory();
  assert.equal(stagedInventory.releaseId, "business-consent-predecessor-v1");
  // Only the disposable image loses staging for the negative scenario. The
  // production source input and all canonical repository files stay untouched.
  const staging = join(f.destination, "runtime-assets/business-consent-successor");
  await rm(staging, { recursive: true });
  await assert.rejects(inventoryBuilder.buildBusinessCutoverWriterInventory(), (error) => {
    assert.equal(error.message, "BUSINESS_CUTOVER_ARTIFACTS_UNAVAILABLE"); return true;
  }, "exact canonical fixture without staging remains unavailable");
  await cp(trackedStaging, staging, { recursive: true });
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
