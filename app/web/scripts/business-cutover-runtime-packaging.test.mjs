import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { lstat, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { build } from "esbuild";

const web = resolve(import.meta.dirname, "..");
const repo = resolve(web, "../..");
const node20 = process.env.BUSINESS_CUTOVER_TEST_NODE20 ?? process.execPath;
const commonBuild = { absWorkingDir: web, bundle: true, platform: "node", format: "esm", target: "node20",
  alias: { "server-only": "./server/runtime/serverOnlyRuntimeShim.mjs" } };

function environment(output) {
  // No inherited provider credentials or NODE_OPTIONS in child runtimes.
  return { ...Object.fromEntries(["PATH", "SystemRoot", "TEMP", "TMP"].filter((key) => process.env[key])
    .map((key) => [key, process.env[key]])), NODE_ENV: "production", PRODUCT_PAGE_OUTPUT_DIR: output };
}
function run(runtime, args, output) {
  return spawnSync(node20, args, { cwd: runtime, env: environment(output), encoding: "utf8", timeout: 30000 });
}
async function snapshot(root) {
  const result = {};
  async function visit(path, relative) {
    const stat = await lstat(path, { bigint: true });
    assert.equal(stat.isSymbolicLink(), false);
    result[relative] = { ino: String(stat.ino), mode: String(stat.mode), mtime: String(stat.mtimeNs),
      ctime: String(stat.ctimeNs), content: stat.isFile() ? createHash("sha256").update(await readFile(path)).digest("hex") : null };
    if (stat.isDirectory()) for (const name of (await readdir(path)).sort()) await visit(join(path, name), `${relative}/${name}`);
  }
  await visit(root, ""); return result;
}
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "business-cutover-runtime-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const runtime = join(root, "runtime"), output = join(root, "private-output");
  await mkdir(runtime); await mkdir(output);
  const version = run(runtime, ["--version"], output);
  assert.equal(version.status, 0, version.stderr);
  assert.match(version.stdout, /^v20\./, "set BUSINESS_CUTOVER_TEST_NODE20 to an actual Node20 executable");
  const cli = join(runtime, "business-cutover-maintenance.mjs");
  const built = await build({ ...commonBuild, entryPoints: ["scripts/business-cutover-maintenance.ts"],
    outfile: cli, logLevel: "silent" }).catch((error) => ({ errors: error.errors }));
  assert.deepEqual(built.errors, [], "the standalone STATUS CLI must build from production source");
  const service = join(runtime, "fixture-service.mjs");
  await build({ ...commonBuild, stdin: { contents: 'export { beginBusinessCutover } from "./server/services/businessCutoverMaintenanceService";',
    resolveDir: web, loader: "ts" }, outfile: service });
  return { root, runtime, output, cli, service };
}
function status(fx, expected, code = 0) {
  const result = run(fx.runtime, [fx.cli, "--mode=STATUS"], fx.output);
  assert.equal(result.status, code, result.stderr); assert.equal(result.stderr, "");
  const value = JSON.parse(result.stdout);
  assert.equal(value.requestId, "CDX-20261021-010"); assert.equal(value.protocolVersion, "business-cutover-v1");
  assert.equal(value.mode, "STATUS"); assert.equal(value.status, expected);
  assert.equal(value.changed, false); assert.equal(value.localWritesMade, false); assert.equal(value.providerCallsMade, false);
  assert.equal(result.stdout.includes(fx.root), false, "never emit private paths");
  return value;
}
function close(fx) {
  const result = run(fx.runtime, ["--input-type=module", "-e",
    `const m = await import(${JSON.stringify(pathToFileURL(fx.service).href)}); await m.beginBusinessCutover(process.env.PRODUCT_PAGE_OUTPUT_DIR, ${JSON.stringify(randomUUID())});`], fx.output);
  assert.equal(result.status, 0, result.stderr); assert.equal(result.stdout, "");
}

// Catches missing/incomplete runner wiring; behavioral tests below prove the actual bytes execute.
test("production packages the Node20 STATUS artifact and its readonly import smoke", async () => {
  const docker = await readFile(join(repo, "Dockerfile"), "utf8");
  const pkg = JSON.parse(await readFile(join(web, "package.json"), "utf8"));
  assert.equal(pkg.scripts["maintenance:business-cutover-status"], "node scripts/business-cutover-maintenance.mjs --mode=STATUS");
  assert.match(docker, /esbuild scripts\/business-cutover-maintenance\.ts --bundle --platform=node --format=esm --target=node20 --alias:server-only=\.\/server\/runtime\/serverOnlyRuntimeShim\.mjs --outfile=\/repo\/runtime-assets\/business-cutover-maintenance\.mjs/);
  assert.match(docker, /COPY --from=builder \/repo\/runtime-assets\/business-cutover-maintenance\.mjs \.\/scripts\/business-cutover-maintenance\.mjs/);
  assert.match(docker, /import\('\/repo\/runtime-assets\/business-cutover-maintenance\.mjs'\)/);
});

test("standalone STATUS reads open, durable closed and corrupt roots without filesystem writes", async (t) => {
  const fx = await fixture(t);
  const imported = run(fx.runtime, ["--input-type=module", "-e",
    `const m = await import(${JSON.stringify(pathToFileURL(fx.cli).href)}); if (m.BUSINESS_CUTOVER_PROTOCOL_VERSION !== 'business-cutover-v1' || typeof m.readBusinessCutoverStatus !== 'function' || JSON.stringify(Object.keys(m).sort()) !== '["BUSINESS_CUTOVER_PROTOCOL_VERSION","readBusinessCutoverStatus"]') process.exit(1); console.log(JSON.stringify(await m.readBusinessCutoverStatus(process.env.PRODUCT_PAGE_OUTPUT_DIR)));`], fx.output);
  assert.equal(imported.status, 0, imported.stderr); assert.equal(JSON.parse(imported.stdout).status, "OPEN");
  let before = await snapshot(fx.output);
  assert.deepEqual(status(fx, "OPEN").reasons, []); assert.deepEqual(await snapshot(fx.output), before);
  close(fx); before = await snapshot(fx.output);
  assert.deepEqual(status(fx, "CLOSING").reasons, []); assert.deepEqual(await snapshot(fx.output), before);
  const operations = join(fx.output, ".business-cutover-operations");
  const operation = (await readdir(operations))[0];
  const credential = await readFile(join(operations, operation, "credential"), "utf8");
  const result = run(fx.runtime, [fx.cli, "--mode=STATUS"], fx.output);
  assert.equal(result.stdout.includes(credential), false, "never emit the private credential");
  await writeFile(join(operations, operation, "events", "00000001.json"), "corrupt-private-marker");
  before = await snapshot(fx.output);
  assert.deepEqual(status(fx, "BLOCKED", 2).reasons, ["BUSINESS_CUTOVER_STATE_UNSAFE"]);
  assert.deepEqual(await snapshot(fx.output), before);
});

test("STATUS rejects mutation, root, credential, hash, force, duplicate and unknown arguments safely", async (t) => {
  const fx = await fixture(t); close(fx);
  const before = await snapshot(fx.output);
  for (const args of [[], ["--mode=BEGIN"], ["--mode=RELEASE"], ["--mode=CANCEL"], ["--mode=STATUS", "--force"],
    ["--mode=STATUS", "--mode=STATUS"], ["--mode=STATUS", `--root=${fx.output}`], ["--mode=STATUS", "--token=secret-never-echo"],
    ["--mode=STATUS", "--hash=secret-never-echo"], ["--mode=STATUS", "--unknown=secret-never-echo"]]) {
    const result = run(fx.runtime, [fx.cli, ...args], fx.output);
    assert.equal(result.status, 1); assert.equal(result.stdout, "");
    const value = JSON.parse(result.stderr);
    assert.deepEqual(value.reasons, ["BUSINESS_CUTOVER_ARGUMENT_INVALID"]);
    assert.equal(value.changed, false); assert.equal(value.localWritesMade, false); assert.equal(value.providerCallsMade, false);
    assert.equal(result.stderr.includes(fx.root), false); assert.equal(result.stderr.includes("secret-never-echo"), false);
    assert.deepEqual(await snapshot(fx.output), before);
  }
});

test("rebuilt Jairo generator starts under a durable closure and never reaches generation", async (t) => {
  const fx = await fixture(t); close(fx);
  const generator = join(fx.runtime, "jairo-business-package-generator.mjs");
  await build({ ...commonBuild, entryPoints: ["server/runtime/jairoBusinessPackageGenerator.ts"], outfile: generator });
  const before = await snapshot(fx.output);
  const paths = { sourceDirectory: join(fx.output, "absent-sources"), activationDirectory: join(fx.output, "absent-activation"),
    paymentDirectory: join(fx.output, "absent-payments"), commercialGrantDirectory: join(fx.output, "absent-grants"), outputDirectory: fx.output };
  const result = run(fx.runtime, ["--input-type=module", "-e", `
    globalThis.fetch = () => { throw new Error('PROVIDER_CALL_ATTEMPTED'); };
    const m = await import(${JSON.stringify(pathToFileURL(generator).href)});
    try { await m.generateJairoBusinessPackageIsolated(${JSON.stringify(paths)}); process.exitCode = 3; }
    catch (error) { if (error.message !== 'BUSINESS_SITE_BUSY') throw error; console.log('BUSINESS_SITE_BUSY'); }
  `], fx.output);
  assert.equal(result.status, 0, result.stderr); assert.equal(result.stdout, "BUSINESS_SITE_BUSY\n"); assert.equal(result.stderr, "");
  assert.deepEqual(await snapshot(fx.output), before, "the closed entrypoint must not create sources, packages or site claims");
});
