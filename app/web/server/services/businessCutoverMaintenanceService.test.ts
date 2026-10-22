import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { link, lstat, mkdir, mkdtemp, readFile, readdir, rename, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import test, { type TestContext } from "node:test";
import { inspectBusinessGlobalClosure, resumeBusinessCutoverClosure } from "./businessCutoverClaimStore.ts";
import { createBusinessPublicationSiteCoordinator } from "./businessPublicationSiteCoordinator.ts";
import type { BusinessCutoverControl } from "./businessCutoverMaintenanceService.ts";

const service = await import("./businessCutoverMaintenanceService.ts").catch((error: NodeJS.ErrnoException) => {
  if (error.code === "ERR_MODULE_NOT_FOUND" && error.message.includes("businessCutoverMaintenanceService.ts")) return {};
  throw error;
});
function api() {
  for (const name of ["readBusinessCutoverStatus", "beginBusinessCutover", "drainBusinessCutover", "withBusinessCutoverController", "markBusinessCutoverMigrationStarted"] as const) {
    assert.equal(typeof (service as Record<string, unknown>)[name], "function", `missing export: ${name}`);
  }
  return service as typeof import("./businessCutoverMaintenanceService.ts");
}
async function fixture(t: TestContext) {
  const output = await mkdtemp(resolve(tmpdir(), "business-cutover-controller-"));
  t.after(() => rm(output, { recursive: true, force: true }));
  return output;
}
const operation = (output: string, id: string) => resolve(output, ".business-cutover-operations", id);
function barrier() {
  let release!: () => void;
  const promise = new Promise<void>((done) => { release = done; });
  return { promise, release };
}

test("status_is_readonly_and_begin_retains_closure_without_controller_lock", async (t) => {
  const s = api(); const output = await fixture(t); const id = randomUUID();
  assert.deepEqual(await s.readBusinessCutoverStatus(output), { status: "OPEN", operationId: null, migrationStarted: false, blockedReasons: [] });
  assert.deepEqual(await readdir(output), []);
  assert.equal((await s.beginBusinessCutover(output, id)).status, "CLOSING");
  assert.equal(await inspectBusinessGlobalClosure(output), "CLOSED");
  await assert.rejects(lstat(resolve(operation(output, id), ".controller")), { code: "ENOENT" });
  assert.equal((await s.readBusinessCutoverStatus(output)).operationId, id);
  await assert.rejects(s.beginBusinessCutover(output, id));
  assert.equal((await s.readBusinessCutoverStatus(output)).status, "CLOSING");
});

test("drain_sees_live_claim_even_with_empty_job_queue", async (t) => {
  const s = api(); const output = await fixture(t); const id = randomUUID();
  const entered = barrier(); const leave = barrier();
  const writer = createBusinessPublicationSiteCoordinator({ outputDirectory: output })("live-business", async () => { entered.release(); await leave.promise; });
  await entered.promise;
  try {
    await s.beginBusinessCutover(output, id);
    const h = await resumeBusinessCutoverClosure(output, id);
    const blocked = await s.withBusinessCutoverController(h, (c) => s.drainBusinessCutover(c, 0));
    assert.equal(blocked.status, "BLOCKED");
    assert.ok(blocked.blockedReasons.includes("BUSINESS_SITE_CLAIMS_ACTIVE"));
  } finally { leave.release(); await writer; }
  const h = await resumeBusinessCutoverClosure(output, id);
  assert.equal((await s.withBusinessCutoverController(h, (c) => s.drainBusinessCutover(c, 0))).status, "DRAINED");
});

test("drain_timeout_keeps_closed_and_rejects_unknown_corrupt_or_linked_claims", async (t) => {
  const s = api();
  for (const damage of ["unknown", "corrupt", "hardlink", "junction"] as const) {
    const output = await fixture(t); const id = randomUUID(); await s.beginBusinessCutover(output, id);
    const root = resolve(output, ".business-publication-site-claims"); await mkdir(root, { mode: 0o700 });
    const claim = resolve(root, "a".repeat(64)); await mkdir(claim, { mode: 0o700 });
    const marker = resolve(claim, "owner.json"); await writeFile(marker, "{}", { mode: 0o600 });
    if (damage === "unknown") await writeFile(resolve(root, "unexpected"), "retain");
    if (damage === "hardlink") await link(marker, resolve(output, "linked"));
    if (damage === "junction") { await rename(root, resolve(output, "old-root")); await symlink(resolve(output, "old-root"), root, process.platform === "win32" ? "junction" : "dir"); }
    const h = await resumeBusinessCutoverClosure(output, id);
    assert.equal((await s.withBusinessCutoverController(h, (c) => s.drainBusinessCutover(c, 0))).status, "BLOCKED");
    assert.equal(await inspectBusinessGlobalClosure(output), "CLOSED"); assert.ok(await lstat(claim));
    assert.equal((await s.readBusinessCutoverStatus(output)).status, "BLOCKED");
  }
});

test("two_controllers_with_same_operation_are_exclusive", async (t) => {
  const s = api(); const output = await fixture(t); const id = randomUUID(); await s.beginBusinessCutover(output, id);
  const h1 = await resumeBusinessCutoverClosure(output, id); const h2 = await resumeBusinessCutoverClosure(output, id);
  const entered = barrier(); const leave = barrier(); let secondEntered = false;
  const first = s.withBusinessCutoverController(h1, async () => { entered.release(); await leave.promise; });
  await entered.promise;
  try {
    await assert.rejects(s.withBusinessCutoverController(h2, async () => { secondEntered = true; }));
    assert.equal(secondEntered, false);
    assert.ok((await s.readBusinessCutoverStatus(output)).blockedReasons.includes("BUSINESS_CONTROLLER_PRESENT"));
  } finally { leave.release(); await first; }
  await s.withBusinessCutoverController(h2, async () => { secondEntered = true; }); assert.equal(secondEntered, true);
});

test("migration_started_marker_is_irreversible_and_serialized", async (t) => {
  const s = api(); const output = await fixture(t); const id = randomUUID(); await s.beginBusinessCutover(output, id);
  const h = await resumeBusinessCutoverClosure(output, id);
  await s.withBusinessCutoverController(h, async (c) => {
    await assert.rejects(s.markBusinessCutoverMigrationStarted(c)); // Must drain first.
    await s.drainBusinessCutover(c, 0);
    await Promise.all([s.markBusinessCutoverMigrationStarted(c), s.markBusinessCutoverMigrationStarted(c)]);
  });
  assert.equal((await s.readBusinessCutoverStatus(output)).migrationStarted, true);
  const events = resolve(operation(output, id), "events"); const names = (await readdir(events)).sort();
  const bytes = await Promise.all(names.map((n) => readFile(resolve(events, n))));
  await s.withBusinessCutoverController(await resumeBusinessCutoverClosure(output, id), (c) => s.markBusinessCutoverMigrationStarted(c));
  assert.deepEqual(await readdir(events), names);
  assert.deepEqual(await Promise.all(names.map((n) => readFile(resolve(events, n)))), bytes);
});

test("expired_control_cannot_mark_started_or_drain_and_handle_is_not_control", async (t) => {
  const s = api(); const output = await fixture(t); const id = randomUUID(); await s.beginBusinessCutover(output, id);
  const h = await resumeBusinessCutoverClosure(output, id); let expired!: BusinessCutoverControl;
  await s.withBusinessCutoverController(h, async (c) => { expired = c; assert.equal(JSON.stringify(c), "{}"); assert.deepEqual(Object.keys(c), []); await s.drainBusinessCutover(c, 0); });
  for (const forged of [expired, h, JSON.parse(JSON.stringify(expired)), Object.create(expired)]) {
    await assert.rejects(s.markBusinessCutoverMigrationStarted(forged)); await assert.rejects(s.drainBusinessCutover(forged, 0));
  }
  assert.equal((await s.readBusinessCutoverStatus(output)).migrationStarted, false);
});

test("torn_event_or_changed_parent_blocks_status", async (t) => {
  const s = api();
  for (const damage of ["torn", "parent", "chain", "unknown", "hardlink"] as const) {
    const output = await fixture(t); const id = randomUUID(); await s.beginBusinessCutover(output, id);
    const events = resolve(operation(output, id), "events"); const first = resolve(events, (await readdir(events))[0]);
    if (damage === "torn") await writeFile(first, "{", { mode: 0o600 });
    if (damage === "chain") { const data = JSON.parse(await readFile(first, "utf8")); data.previousHash = "f".repeat(64); await writeFile(first, JSON.stringify(data)); }
    if (damage === "unknown") await writeFile(resolve(events, "state.json"), "{}");
    if (damage === "hardlink") await link(first, resolve(output, "linked-event"));
    if (damage === "parent") { await rename(events, resolve(output, "displaced-events")); await mkdir(events, { mode: 0o700 }); for (const name of await readdir(resolve(output, "displaced-events"))) await rename(resolve(output, "displaced-events", name), resolve(events, name)); }
    assert.equal((await s.readBusinessCutoverStatus(output)).status, "BLOCKED");
    await assert.rejects(s.withBusinessCutoverController(await resumeBusinessCutoverClosure(output, id).catch(() => ({} as never)), async () => {}));
    assert.equal(await inspectBusinessGlobalClosure(output), "CLOSED");
  }
});

test("controller_lock_substitution_is_never_removed_on_callback_exit", async (t) => {
  const s = api(); const output = await fixture(t); const id = randomUUID(); await s.beginBusinessCutover(output, id);
  const lock = resolve(operation(output, id), ".controller");
  await assert.rejects(s.withBusinessCutoverController(await resumeBusinessCutoverClosure(output, id), async () => {
    await rename(lock, resolve(output, "old-controller")); await mkdir(lock, { mode: 0o700 });
    await writeFile(resolve(lock, "owner.json"), "{}", { mode: 0o600 });
  }));
  assert.equal(await readFile(resolve(lock, "owner.json"), "utf8"), "{}");
  assert.equal((await s.readBusinessCutoverStatus(output)).status, "BLOCKED");
});

test("crash_and_restart_keep_global_and_controller_closed", async (t) => {
  const s = api(); const output = await fixture(t); const id = randomUUID(); await s.beginBusinessCutover(output, id);
  const child = spawn(process.execPath, ["--conditions=react-server", "--experimental-strip-types", "--experimental-loader", "./scripts/node-test-alias-loader.mjs", "--input-type=module", "-e",
    `const s=await import(${JSON.stringify(new URL("./businessCutoverMaintenanceService.ts", import.meta.url).href)}); const st=await import(${JSON.stringify(new URL("./businessCutoverClaimStore.ts", import.meta.url).href)}); await s.withBusinessCutoverController(await st.resumeBusinessCutoverClosure(process.argv[1],process.argv[2]),async c=>{await s.drainBusinessCutover(c,0);await s.markBusinessCutoverMigrationStarted(c);process.send('locked');await new Promise(()=>{});});`, output, id], { stdio: ["ignore", "pipe", "pipe", "ipc"] });
  assert.ok(child.stdout && child.stderr);
  let stdout = ""; let stderr = ""; child.stdout.on("data", (b) => { stdout += b; }); child.stderr.on("data", (b) => { stderr += b; });
  t.after(() => { if (child.exitCode === null) child.kill(); });
  await Promise.race([once(child, "message"), once(child, "exit").then(() => { throw new Error(`child exited before lock: ${stderr}`); })]);
  const exited = once(child, "exit"); child.kill("SIGKILL"); await exited;
  assert.equal(stdout, ""); assert.ok(!stderr.includes(output));
  const status = await s.readBusinessCutoverStatus(output); assert.equal(status.status, "BLOCKED"); assert.equal(status.migrationStarted, true);
  assert.ok(status.blockedReasons.includes("BUSINESS_CONTROLLER_PRESENT"));
  await assert.rejects(s.withBusinessCutoverController(await resumeBusinessCutoverClosure(output, id), async () => {}));
  assert.equal(await inspectBusinessGlobalClosure(output), "CLOSED");
  assert.ok(await lstat(resolve(operation(output, id), ".controller")));
});

test("invalid_timeout_and_no_release_or_cancel_capability", async (t) => {
  const s = api(); const output = await fixture(t); const id = randomUUID(); await s.beginBusinessCutover(output, id);
  await s.withBusinessCutoverController(await resumeBusinessCutoverClosure(output, id), async (c) => {
    for (const timeout of [-1, 0.5, 30001, NaN, Infinity]) await assert.rejects(s.drainBusinessCutover(c, timeout));
    assert.equal("release" in c, false); assert.equal("cancel" in c, false);
  });
  assert.equal(Object.keys(s).some((name) => /release|cancel/i.test(name)), false);
  assert.equal(await inspectBusinessGlobalClosure(output), "CLOSED");
});

test("polling_uses_bounded_local_clock_and_finishes_when_real_claim_drains", async (t) => {
  const s = api(); const output = await fixture(t); const id = randomUUID();
  const entered = barrier(); const leave = barrier();
  const writer = createBusinessPublicationSiteCoordinator({ outputDirectory: output })("poll-business", async () => { entered.release(); await leave.promise; });
  await entered.promise; await s.beginBusinessCutover(output, id);
  const h = await resumeBusinessCutoverClosure(output, id);
  let now = 1000; const delays: number[] = [];
  t.mock.method(performance, "now", () => now);
  t.mock.method(globalThis, "setTimeout", (done: () => void, delay: number) => {
    delays.push(delay); now += delay; leave.release(); void writer.then(done);
  });
  try {
    assert.equal((await s.withBusinessCutoverController(h, (c) => s.drainBusinessCutover(c, 51))).status, "DRAINED");
    assert.deepEqual(delays, [50]);
  } finally { leave.release(); await writer; }
});

test("polling_timeout_uses_deadline_and_never_removes_live_claim", async (t) => {
  const s = api(); const output = await fixture(t); const id = randomUUID();
  const entered = barrier(); const leave = barrier();
  const writer = createBusinessPublicationSiteCoordinator({ outputDirectory: output })("timeout-business", async () => { entered.release(); await leave.promise; });
  await entered.promise; await s.beginBusinessCutover(output, id);
  const h = await resumeBusinessCutoverClosure(output, id); let now = 1000; const delays: number[] = [];
  t.mock.method(performance, "now", () => now);
  t.mock.method(globalThis, "setTimeout", (done: () => void, delay: number) => { delays.push(delay); now += delay; done(); });
  try {
    assert.equal((await s.withBusinessCutoverController(h, (c) => s.drainBusinessCutover(c, 51))).status, "BLOCKED");
    assert.deepEqual(delays, [50, 1]);
    assert.equal((await readdir(resolve(output, ".business-publication-site-claims"))).length, 1);
  } finally { leave.release(); await writer; }
  assert.equal(await inspectBusinessGlobalClosure(output), "CLOSED");
});

test("a_live_child_controller_excludes_parent_and_releases_only_admin_lock_on_error", async (t) => {
  const s = api(); const output = await fixture(t); const id = randomUUID(); await s.beginBusinessCutover(output, id);
  const child = spawn(process.execPath, ["--conditions=react-server", "--experimental-strip-types", "--experimental-loader", "./scripts/node-test-alias-loader.mjs", "--input-type=module", "-e",
    `const s=await import(${JSON.stringify(new URL("./businessCutoverMaintenanceService.ts", import.meta.url).href)}); const st=await import(${JSON.stringify(new URL("./businessCutoverClaimStore.ts", import.meta.url).href)}); try {await s.withBusinessCutoverController(await st.resumeBusinessCutoverClosure(process.argv[1],process.argv[2]),async c=>{process.send('locked');await new Promise(done=>process.once('message',done));await s.drainBusinessCutover(c,0);throw new Error('controlled failure');});} catch(e) {if(e.message!=='BUSINESS_CUTOVER_CLOSED')throw e;} process.disconnect();`, output, id], { stdio: ["ignore", "pipe", "pipe", "ipc"] });
  assert.ok(child.stdout && child.stderr);
  let stdout = ""; let stderr = ""; child.stdout.on("data", (b) => { stdout += b; }); child.stderr.on("data", (b) => { stderr += b; });
  t.after(() => { if (child.exitCode === null) child.kill(); });
  await Promise.race([once(child, "message"), once(child, "exit").then(() => { throw new Error(`child exited before lock: ${stderr}`); })]);
  let ran = false;
  await assert.rejects(s.withBusinessCutoverController(await resumeBusinessCutoverClosure(output, id), async () => { ran = true; }));
  assert.equal(ran, false);
  const exit = once(child, "exit"); child.send("finish"); assert.equal((await exit)[0], 0);
  assert.equal(stdout, ""); assert.ok(!stderr.includes(output));
  assert.equal((await s.readBusinessCutoverStatus(output)).status, "DRAINED");
  await s.withBusinessCutoverController(await resumeBusinessCutoverClosure(output, id), async () => { ran = true; });
  assert.equal(ran, true); assert.equal(await inspectBusinessGlobalClosure(output), "CLOSED");
});
