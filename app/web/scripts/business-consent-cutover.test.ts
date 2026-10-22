import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile, readdir, writeFile, mkdir, lstat, readlink } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import test from "node:test";
import { fixture } from "../server/services/businessConsentCutoverMigration.test-fixtures.ts";
import { readBusinessCutoverStatus, bindBusinessCutoverMigration } from "../server/services/businessCutoverMaintenanceService.ts";
import { image, builder } from "./build-business-cutover-writer-inventory.test-fixtures.mjs";

async function api() {
  const entry = "./business-consent-cutover.ts";
  const m = await import(entry).catch(() => null);
  assert.ok(m, "the administrative runner must exist");
  return m;
}
const id = "12345678-1234-4234-9234-123456789abc";
const args = (mode: string, operationId = id) => [`--mode=${mode}`, `--operation-id=${operationId}`];

test("parser enforces exact modes, required operation and mode-specific confirmations", async () => {
  const { parseBusinessConsentCutoverArguments: parse } = await api();
  assert.deepEqual(Object.keys(await api()).sort(), ["parseBusinessConsentCutoverArguments", "runBusinessConsentCutover"]);
  for (const mode of ["BEGIN", "DRAIN", "PREVIEW", "VERIFY"]) assert.equal(parse(args(mode)).mode, mode);
  assert.equal(parse([...args("DRAIN"), "--timeout-ms=30000"]).timeoutMs, 30000);
  assert.equal(parse([...args("DRAIN"), "--timeout-ms=0"]).timeoutMs, 0);
  assert.equal(parse([...args("APPLY"), "--confirm=MIGRATE_REVIEWED_BUSINESS_CONSENT_MASTER", `--expected-plan-hash=${"a".repeat(64)}`]).expectedPlanHash, "a".repeat(64));
  for (const [mode, confirmation] of [["REOPEN", "REOPEN_VERIFIED_BUSINESS_CONSENT_MASTER"], ["CANCEL", "CANCEL_UNSTARTED_BUSINESS_CONSENT_CUTOVER"]])
    assert.equal(parse([...args(mode), `--confirm=${confirmation}`]).mode, mode);
  const bad = [[], ["--mode=BEGIN"], args("STATUS"), args("begin"), args("BEGIN", "secret/path"),
    [...args("DRAIN"), "--timeout-ms=30001"], [...args("DRAIN"), "--timeout-ms=-1"], [...args("DRAIN"), "--timeout-ms=1.5"],
    [...args("DRAIN"), "--timeout-ms=01"], [...args("BEGIN"), "--timeout-ms=0"], args("APPLY"), args("REOPEN"), args("CANCEL"),
    [...args("APPLY"), "--confirm=MIGRATE_REVIEWED_BUSINESS_CONSENT_MASTER", `--expected-plan-hash=${"A".repeat(64)}`],
    [...args("BEGIN"), "--mode=BEGIN"], [...args("BEGIN"), `--operation-id=${id}`], [...args("BEGIN"), "extra"]];
  for (const field of ["root", "output-root", "template-dir", "token", "profile", "runtime-hash", "force", "unknown", "confirm", "expected-plan-hash"])
    bad.push([...args("BEGIN"), `--${field}=private-secret`]);
  for (const input of bad) assert.throws(() => parse(input), /^Error: BUSINESS_CUTOVER_ARGUMENT_INVALID$/);
});

const web = resolve(import.meta.dirname, "..");
type Fixture = Awaited<ReturnType<typeof fixture>>;
type TestContext = Parameters<typeof fixture>[0];
// Whole physical tree, not only selected evidence bytes. Reads may update atime;
// no identity, mode, link, content, mtime or ctime change is permitted here.
async function physicalSnapshot(root: string): Promise<unknown[]> {
  const rows: unknown[] = [];
  async function visit(relative: string) {
    const path = resolve(root, relative), s = await lstat(path, { bigint: true });
    rows.push({ path: relative, stat: [s.dev, s.ino, s.birthtimeNs, s.mode, s.uid, s.gid, s.nlink, s.size, s.mtimeNs, s.ctimeNs].map(String),
      bytes: s.isFile() ? (await readFile(path)).toString("base64") : s.isSymbolicLink() ? await readlink(path) : null });
    if (s.isDirectory()) for (const name of (await readdir(path)).sort()) await visit(relative ? `${relative}/${name}` : name);
  }
  await visit(""); return rows;
}
function diagnostic(result: ReturnType<typeof spawnSync>, status: "CLOSED" | "RELEASED" | "UNKNOWN", writes: boolean | null = false) {
  assert.equal(result.stderr, "", String(result.stderr));
  const value = JSON.parse(String(result.stdout));
  assert.equal(result.status, status === "RELEASED" ? 3 : 2, JSON.stringify(value));
  assert.equal(value.status, status); assert.equal(value.persistenceConfirmed, false);
  assert.equal(value.commitObserved, status === "RELEASED" ? true : undefined);
  assert.deepEqual(value.reasons, [status === "RELEASED" ? "RELEASE_COMMIT_UNCONFIRMED" :
    status === "CLOSED" ? "BUSINESS_CUTOVER_CLOSED" : "BUSINESS_CUTOVER_OUTCOME_UNKNOWN"]);
  assert.equal(value.metadataWritesMade, writes); assert.equal(value.packageWritesMade, false);
  assert.equal(value.providerCallsMade, false); assert.equal(value.publicationMade, false);
  return value;
}
async function runtime(t: TestContext, f: Fixture, available = false, successor = false) {
  const node20 = process.env.BUSINESS_CUTOVER_TEST_NODE20;
  assert.ok(node20, "BUSINESS_CUTOVER_TEST_NODE20 must be actual Node20; no fallback");
  const root = available ? await image(t, successor) : resolve(f.root, "runtime");
  await mkdir(resolve(root, "scripts"), { recursive: true });
  let descriptor = null;
  if (available) {
    const inventory = await (await builder(root)).buildBusinessCutoverWriterInventory(), bytes = Buffer.from(JSON.stringify(inventory));
    await writeFile(resolve(root, "runtime-assets/business-cutover-writer-inventory.json"), bytes);
    descriptor = { version: 1, releaseId: inventory.releaseId, inventorySha256: createHash("sha256").update(bytes).digest("hex") };
  }
  const cli = resolve(root, "scripts/business-consent-cutover.mjs");
  await build({ absWorkingDir: web, entryPoints: ["scripts/business-consent-cutover.ts"], outfile: cli,
    bundle: true, platform: "node", format: "esm", target: "node20", alias: { "server-only": "./server/runtime/serverOnlyRuntimeShim.mjs" },
    define: { __BUSINESS_CUTOVER_RELEASE_DESCRIPTOR__: JSON.stringify(descriptor) },
    plugins: [{ name: "private-fixed-fixture-paths", setup(b) {
      b.onLoad({ filter: /build-business-cutover-writer-inventory\.mjs$/ }, async (a) =>
        ({ contents: (await readFile(a.path, "utf8")).replaceAll('"/app"', JSON.stringify(root)), loader: "js" }));
      b.onLoad({ filter: /businessCutoverReleaseProfile\.ts$/ }, async (a) =>
        ({ contents: (await readFile(a.path, "utf8")).replaceAll('"/app/runtime-assets/business-cutover-writer-inventory.json"', JSON.stringify(resolve(root, "runtime-assets/business-cutover-writer-inventory.json"))), loader: "ts" }));
      b.onLoad({ filter: /businessCutoverMigrationAuthority\.ts$|business-consent-master-release\.mjs$/ }, async (a) =>
        ({ contents: (await readFile(a.path, "utf8")).replaceAll('"/app/runtime-assets/business-consent-successor"', JSON.stringify(f.staging)), loader: a.path.endsWith(".ts") ? "ts" : "js" }));
    } }] });
  const env = { ...Object.fromEntries(["PATH", "SystemRoot", "TEMP", "TMP"].filter((key) => process.env[key]).map((key) => [key, process.env[key]])),
    NODE_ENV: "production", PRODUCT_PAGE_OUTPUT_DIR: f.output };
  const run = (argv: string[], code?: string, output = f.output) => spawnSync(node20, code ? ["--input-type=module", "-e", code] : [cli, ...argv],
    { cwd: root, env: { ...env, PRODUCT_PAGE_OUTPUT_DIR: output }, encoding: "utf8", timeout: 30000 });
  assert.match(spawnSync(node20, ["--version"], { encoding: "utf8" }).stdout, /^v20\./);
  return { run, cli, root };
}

test("actual Node20 outside source completes DRAIN, PREVIEW, APPLY and retains closure", { timeout: 30000 }, async (t) => {
  const f = await fixture(t), r = await runtime(t, f);
  const drained = r.run([...args("DRAIN", f.id), "--timeout-ms=0"]);
  assert.equal(drained.status, 0, drained.stderr); assert.equal(JSON.parse(drained.stdout).status, "DRAINED");
  const preview = r.run(args("PREVIEW", f.id)); assert.equal(preview.status, 0, preview.stderr);
  const applied = r.run([...args("APPLY", f.id), "--confirm=MIGRATE_REVIEWED_BUSINESS_CONSENT_MASTER", `--expected-plan-hash=${JSON.parse(preview.stdout).planHash}`]);
  assert.equal(applied.status, 0, applied.stderr); assert.equal(JSON.parse(applied.stdout).status, "APPLIED");
  assert.equal(JSON.parse(applied.stdout).packageWritesMade, true);
  assert.equal((await readBusinessCutoverStatus(f.output)).migrationStarted, true);
  assert.equal(applied.stdout.includes(f.root), false); assert.equal(applied.stderr, "");
  const replay = r.run([...args("APPLY", f.id), "--confirm=MIGRATE_REVIEWED_BUSINESS_CONSENT_MASTER", `--expected-plan-hash=${JSON.parse(preview.stdout).planHash}`]);
  assert.equal(replay.status, 2, replay.stderr);
  assert.deepEqual(JSON.parse(replay.stdout).reasons, ["BUSINESS_CUTOVER_PLAN_MISMATCH"]);
  assert.equal(JSON.parse(replay.stdout).packageWritesMade, false);
});

test("Node20 dispatcher awaits terminal cleanup and uses private observed error identity", { timeout: 90000 }, async (t) => {
  for (const fault of ["none", "receipt", "cleanup", "lookalike"]) await t.test(fault, async (st) => {
    const f = await fixture(st), r = await runtime(st, f, true);
    assert.equal(r.run([...args("DRAIN", f.id), "--timeout-ms=0"]).status, 0);
    const argv = [...args("CANCEL", f.id), "--confirm=CANCEL_UNSTARTED_BUSINESS_CONSENT_CUTOVER"];
    const result = r.run([], `import fs from 'node:fs/promises'; import { constants } from 'node:fs'; import { syncBuiltinESMExports } from 'node:module';
      const originalOpen = fs.open, originalUnlink = fs.unlink, originalRename = fs.rename;
      const fault = ${JSON.stringify(fault)}; let renamed = false;
      fs.rename = async (...a) => { if (fault === 'lookalike') throw Object.assign(new Error('RELEASE_COMMIT_UNCONFIRMED'), { commitObserved:true, persistenceConfirmed:false }); const value = await originalRename(...a); renamed = true; return value; };
      fs.open = async (...a) => { const fd = await originalOpen(...a); if (fault === 'receipt' && String(a[0]).replaceAll('\\\\','/').endsWith('/release-receipt.json') && typeof a[1] === 'number' && (a[1] & constants.O_CREAT)) fd.sync = async () => { throw new Error('private receipt fault'); }; return fd; };
      fs.unlink = async (...a) => { if (fault === 'cleanup' && renamed && String(a[0]).replaceAll('\\\\','/').endsWith('/.controller/owner.json')) throw new Error('private cleanup fault'); return originalUnlink(...a); };
      syncBuiltinESMExports(); const m = await import(${JSON.stringify(pathToFileURL(r.cli).href)});
      const result = await m.runBusinessConsentCutover(${JSON.stringify(argv)}); console.log(JSON.stringify(result.output)); process.exitCode = result.exitCode;`);
    assert.equal(result.stderr, "", result.stderr);
    const value = JSON.parse(result.stdout);
    assert.equal(result.status, fault === "none" ? 0 : fault === "lookalike" ? 1 : 3, JSON.stringify(value));
    if (fault === "none") { assert.equal(value.status, "CANCELLED"); assert.equal(value.persistenceConfirmed, true); }
    else if (fault === "lookalike") { assert.equal(value.status, "ERROR"); assert.equal(value.commitObserved, undefined); }
    else { assert.equal(value.status, "RELEASE_COMMIT_UNCONFIRMED"); assert.equal(value.commitObserved, true); assert.equal(value.persistenceConfirmed, false); }
    assert.equal(result.stdout.includes(f.root), false); assert.equal(result.stdout.includes("private"), false);
    if (fault !== "lookalike") {
      const before = await physicalSnapshot(f.output);
      diagnostic(r.run(args("VERIFY", f.id)), "RELEASED");
      assert.deepEqual(await physicalSnapshot(f.output), before, "historical VERIFY must be wholly read-only, including orphan cleanup evidence");
    }
  });
});

test("Node20 VERIFY diagnoses a released historical operation without touching a newer global claim", async (t) => {
  const f = await fixture(t), r = await runtime(t, f, true), nextId = randomUUID();
  assert.equal(r.run([...args("DRAIN", f.id), "--timeout-ms=0"]).status, 0);
  assert.equal(r.run([...args("CANCEL", f.id), "--confirm=CANCEL_UNSTARTED_BUSINESS_CONSENT_CUTOVER"]).status, 0);
  const next = r.run(args("BEGIN", nextId)); assert.equal(next.status, 0, next.stderr);
  const before = await physicalSnapshot(f.output);
  // Any mutation/authority acquisition would fail this invocation. Only the
  // original CLI exports exist: historical data never becomes a capability.
  const result = r.run([], `import fs from 'node:fs/promises'; import { constants } from 'node:fs'; import { syncBuiltinESMExports } from 'node:module';
    const originalOpen = fs.open;
    for (const key of ['mkdir','unlink','rmdir','rename','writeFile','appendFile','rm','chmod','chown','truncate','link','symlink','copyFile'])
      fs[key] = async () => { throw new Error('private diagnostic write attempt'); };
    fs.open = async (...a) => { if (typeof a[1] !== 'number' || (a[1] & (constants.O_CREAT | constants.O_WRONLY | constants.O_RDWR | constants.O_TRUNC))) throw new Error('private diagnostic writable open'); return originalOpen(...a); };
    syncBuiltinESMExports(); const m = await import(${JSON.stringify(pathToFileURL(r.cli).href)});
    if (Object.keys(m).sort().join(',') !== 'parseBusinessConsentCutoverArguments,runBusinessConsentCutover') throw new Error('unexpected authority export');
    const result = await m.runBusinessConsentCutover(${JSON.stringify(args("VERIFY", f.id))}); console.log(JSON.stringify(result.output)); process.exitCode = result.exitCode;`);
  diagnostic(result, "RELEASED");
  assert.deepEqual(await physicalSnapshot(f.output), before);
  assert.equal((await readBusinessCutoverStatus(f.output)).operationId, nextId);
});

test("Node20 VERIFY reports orphan and crash-shaped closure without recovering or writing", async (t) => {
  for (const shape of ["orphan", "incomplete-orphan", "journal"]) await t.test(shape, async (st) => {
    const f = await fixture(st), r = await runtime(st, f, true);
    const operation = resolve(f.output, ".business-cutover-operations", f.id);
    if (shape !== "journal") {
      await mkdir(resolve(operation, ".controller"), { mode: 0o700 });
      if (shape === "orphan") await writeFile(resolve(operation, ".controller/owner.json"),
        JSON.stringify({ version: 1, operationId: f.id, token: "a".repeat(64) }), { mode: 0o600 });
    }
    else await writeFile(resolve(operation, "events", (await readdir(resolve(operation, "events")))[0]), "incomplete private crash event");
    const before = await physicalSnapshot(f.output);
    diagnostic(r.run(args("VERIFY", f.id)), shape === "incomplete-orphan" ? "UNKNOWN" : "CLOSED", shape === "incomplete-orphan" ? false : null);
    assert.deepEqual(await physicalSnapshot(f.output), before);
  });
});

test("Node20 VERIFY unknown, conflicting receipt and failed reads never claim success or persistence", async (t) => {
  for (const shape of ["unknown", "conflict", "read-failure"]) await t.test(shape, async (st) => {
    const f = await fixture(st), r = await runtime(st, f, true);
    let operationId = randomUUID();
    if (shape !== "unknown") {
      operationId = f.id;
      assert.equal(r.run([...args("DRAIN", f.id), "--timeout-ms=0"]).status, 0);
      assert.equal(r.run([...args("CANCEL", f.id), "--confirm=CANCEL_UNSTARTED_BUSINESS_CONSENT_CUTOVER"]).status, 0);
      if (shape === "conflict") await writeFile(resolve(f.output, ".business-cutover-operations", f.id, "release-receipt.json"), "private conflicting receipt");
    }
    const before = await physicalSnapshot(f.output);
    const result = shape === "read-failure" ? r.run([], `import fs from 'node:fs/promises'; import { syncBuiltinESMExports } from 'node:module';
      fs.lstat = async () => { throw new Error('private reader failure'); }; syncBuiltinESMExports();
      const m = await import(${JSON.stringify(pathToFileURL(r.cli).href)});
      const result = await m.runBusinessConsentCutover(${JSON.stringify(args("VERIFY", operationId))}); console.log(JSON.stringify(result.output)); process.exitCode = result.exitCode;`)
      : r.run(args("VERIFY", operationId));
    diagnostic(result, "UNKNOWN");
    assert.equal(String(result.stdout).includes("private"), false); assert.equal(String(result.stdout).includes(f.root), false);
    assert.deepEqual(await physicalSnapshot(f.output), before);
  });
});

test("Node20 VERIFY diagnosis retains true write flags after controller acquisition but unavailable scope", async (t) => {
  const f = await fixture(t), r = await runtime(t, f, true);
  const marker = resolve(f.output, ".master-package-claims/ganomaster-business/owner.json"), before = await readFile(marker);
  // One transient read failure at exclusive acquisition, after the controller
  // callback has started. Real controller cleanup still runs before diagnosis.
  const result = r.run([], `import fs from 'node:fs/promises'; import { syncBuiltinESMExports } from 'node:module';
    const original = fs.readdir; let checks = 0;
    fs.readdir = async (...a) => { if (String(a[0]).replaceAll('\\\\','/').endsWith('/.controller') && ++checks === 3) throw new Error('private exclusive acquisition fault'); return original(...a); };
    syncBuiltinESMExports(); const m = await import(${JSON.stringify(pathToFileURL(r.cli).href)});
    const result = await m.runBusinessConsentCutover(${JSON.stringify(args("VERIFY", f.id))}); console.log(JSON.stringify(result.output)); process.exitCode = result.exitCode;`);
  diagnostic(result, "CLOSED", true);
  assert.deepEqual(await readFile(marker), before);
  await assert.rejects(lstat(resolve(f.output, ".business-cutover-operations", f.id, ".controller")), { code: "ENOENT" });
});

test("Node20 active VERIFY requires a fresh compatibility proof and never falls back over profile or plan failures", async (t) => {
  const f = await fixture(t), r = await runtime(t, f, true);
  assert.equal(r.run([...args("DRAIN", f.id), "--timeout-ms=0"]).status, 0);
  const success = r.run(args("VERIFY", f.id)); assert.equal(success.status, 0, success.stderr);
  const value = JSON.parse(success.stdout);
  assert.equal(value.status, "VERIFIED"); assert.equal(value.metadataWritesMade, true);
  assert.equal(value.persistenceConfirmed, undefined); assert.equal(value.commitObserved, undefined);
  const server = resolve(r.root, "server.js"), reviewed = await readFile(server);
  await writeFile(server, "private incompatible runtime");
  const profile = r.run(args("VERIFY", f.id)); assert.equal(profile.status, 2, profile.stderr);
  assert.equal(JSON.parse(profile.stdout).status, "BLOCKED");
  assert.deepEqual(JSON.parse(profile.stdout).reasons, ["BUSINESS_CUTOVER_PROFILE_INVALID"]);
  assert.equal(JSON.parse(profile.stdout).metadataWritesMade, true);
  await writeFile(server, reviewed);
  const bound = await f.run(async (scope) => {
    const binding = await f.binding(scope); await bindBusinessCutoverMigration(scope, binding); return binding.planHash;
  }); assert.equal(bound.error, null);
  const boundProof = r.run(args("VERIFY", f.id)); assert.equal(boundProof.status, 0, boundProof.stderr);
  assert.equal(JSON.parse(boundProof.stdout).planHash, bound.value);
  // Same bytes with changed physical clocks invalidate the genuinely bound
  // plan. An active PLAN_MISMATCH must not turn into historical CLOSED data.
  const protectedFile = resolve(f.output, "ganomaster-business/index.html"), bytes = await readFile(protectedFile);
  await writeFile(protectedFile, "private package drift"); await writeFile(protectedFile, bytes);
  const plan = r.run(args("VERIFY", f.id)); assert.equal(plan.status, 2, plan.stderr);
  assert.equal(JSON.parse(plan.stdout).status, "BLOCKED");
  assert.deepEqual(JSON.parse(plan.stdout).reasons, ["BUSINESS_CUTOVER_PLAN_MISMATCH"]);
  assert.equal(JSON.parse(plan.stdout).metadataWritesMade, true);
  assert.equal(JSON.parse(plan.stdout).persistenceConfirmed, undefined);
});

test("Node20 BEGIN freshly rejects drift despite an available compiled descriptor before any claim", async (t) => {
  const f = await fixture(t), r = await runtime(t, f, true);
  const before = await readdir(f.output);
  await writeFile(resolve(r.root, "server.js"), "unreviewed-writer-change");
  const result = r.run(args("BEGIN", randomUUID()));
  assert.equal(result.status, 2, result.stderr);
  const value = JSON.parse(result.stdout);
  assert.deepEqual(value.reasons, ["BUSINESS_CUTOVER_PROFILE_INVALID"]);
  assert.equal(value.metadataWritesMade, false); assert.equal(value.packageWritesMade, false);
  assert.deepEqual(await readdir(f.output), before);
});

test("Node20 successor without staging cannot BEGIN a predecessor transition or change OPEN", async (t) => {
  const f = await fixture(t), r = await runtime(t, f, true, true), output = resolve(f.root, "open-output");
  await mkdir(output);
  assert.equal((await readBusinessCutoverStatus(output)).status, "OPEN");
  const result = r.run(args("BEGIN", randomUUID()), undefined, output);
  assert.equal(result.status, 2, result.stderr);
  const value = JSON.parse(result.stdout);
  assert.deepEqual(value.reasons, ["BUSINESS_CUTOVER_PROFILE_INVALID"]);
  assert.equal(value.metadataWritesMade, false); assert.equal(value.packageWritesMade, false);
  assert.deepEqual(await readdir(output), []); assert.equal((await readBusinessCutoverStatus(output)).status, "OPEN");
});

test("unavailable BEGIN and parser errors are redacted and create no claim", async (t) => {
  const f = await fixture(t), m = await api();
  const empty = f.staging; // Real existing directory, deliberately not an output with a closure.
  const previous = process.env.PRODUCT_PAGE_OUTPUT_DIR; process.env.PRODUCT_PAGE_OUTPUT_DIR = empty;
  t.after(() => { if (previous === undefined) delete process.env.PRODUCT_PAGE_OUTPUT_DIR; else process.env.PRODUCT_PAGE_OUTPUT_DIR = previous; });
  const before = await readdir(empty);
  const begin = await m.runBusinessConsentCutover(args("BEGIN", randomUUID()));
  assert.equal(begin.exitCode, 2); assert.equal(begin.output.status, "BLOCKED");
  assert.deepEqual(begin.output.reasons, ["BUSINESS_CUTOVER_ARTIFACTS_UNAVAILABLE"]);
  assert.equal(begin.output.metadataWritesMade, false); assert.equal(begin.output.packageWritesMade, false);
  assert.deepEqual(await readdir(empty), before);
  const invalid = await m.runBusinessConsentCutover([...args("BEGIN"), `--token=${f.root}`]);
  assert.equal(invalid.exitCode, 1); assert.equal(invalid.output.status, "ERROR");
  assert.equal(invalid.output.mode, null); assert.equal(JSON.stringify(invalid).includes(f.root), false);
  assert.equal(invalid.output.providerCallsMade, false); assert.equal(invalid.output.publicationMade, false);
});

test("DRAIN and APPLY finish through the real controller without reentrant deadlock", { timeout: 30000 }, async (t) => {
  const f = await fixture(t), m = await api();
  const previous = process.env.PRODUCT_PAGE_OUTPUT_DIR; process.env.PRODUCT_PAGE_OUTPUT_DIR = f.output;
  t.after(() => { if (previous === undefined) delete process.env.PRODUCT_PAGE_OUTPUT_DIR; else process.env.PRODUCT_PAGE_OUTPUT_DIR = previous; });
  const drained = await m.runBusinessConsentCutover([...args("DRAIN", f.id), "--timeout-ms=0"]);
  assert.equal(drained.exitCode, 0); assert.equal(drained.output.status, "DRAINED");
  const preview = await m.runBusinessConsentCutover(args("PREVIEW", f.id));
  assert.equal(preview.exitCode, 0); assert.match(preview.output.planHash, /^[a-f0-9]{64}$/);
  const applyArgs = [...args("APPLY", f.id), "--confirm=MIGRATE_REVIEWED_BUSINESS_CONSENT_MASTER"];
  const mismatch = await m.runBusinessConsentCutover([...applyArgs, `--expected-plan-hash=${"0".repeat(64)}`]);
  assert.equal(mismatch.exitCode, 2); assert.deepEqual(mismatch.output.reasons, ["BUSINESS_CUTOVER_PLAN_MISMATCH"]);
  assert.equal(mismatch.output.packageWritesMade, false);
  const applied = await m.runBusinessConsentCutover([...applyArgs, `--expected-plan-hash=${preview.output.planHash}`]);
  assert.equal(applied.exitCode, 0); assert.equal(applied.output.status, "APPLIED"); assert.equal(applied.output.packageWritesMade, true);
  assert.equal((await readBusinessCutoverStatus(f.output)).migrationStarted, true);
  assert.equal(JSON.stringify(applied).includes(f.root), false);
  assert.equal(applied.output.providerCallsMade, false); assert.equal(applied.output.publicationMade, false);
});
