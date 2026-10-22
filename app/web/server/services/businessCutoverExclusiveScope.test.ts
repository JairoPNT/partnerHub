import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import fs from "node:fs/promises";
import { mkdtemp, readFile, readdir, rm, writeFile, lstat, link } from "node:fs/promises";
import { syncBuiltinESMExports } from "node:module";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test, { type TestContext } from "node:test";
import { resumeBusinessCutoverClosure, inspectBusinessGlobalClosure } from "./businessCutoverClaimStore.ts";
import * as service from "./businessCutoverMaintenanceService.ts";
import type { BusinessCutoverControl, BusinessCutoverExclusiveScope } from "./businessCutoverMaintenanceService.ts";

function api() {
  for (const name of ["withBusinessCutoverExclusive", "assertBusinessCutoverExclusive", "bindBusinessCutoverMigration",
    "readBusinessCutoverMigrationBinding", "startBusinessCutoverMigration", "withBusinessCutoverScopedWork"] as const) {
    assert.equal(typeof (service as Record<string, unknown>)[name], "function", `missing export: ${name}`);
  }
  return service;
}
async function fixture(t: TestContext) {
  const output = await mkdtemp(resolve(tmpdir(), "business-cutover-scope-"));
  t.after(() => rm(output, { recursive: true, force: true }));
  const id = randomUUID(); await service.beginBusinessCutover(output, id);
  return { output, id, handle: await resumeBusinessCutoverClosure(output, id),
    operation: resolve(output, ".business-cutover-operations", id) };
}
const binding = () => {
  const material = Buffer.from('{"schemaVersion":2,"fixture":"approved"}');
  return { planHash: createHash("sha256").update(material).digest("hex"), releaseId: "business-consent-successor-v1", material };
};
function barrier() {
  let release!: () => void;
  const promise = new Promise<void>((done) => { release = done; });
  return { promise, release };
}

test("scope_cannot_be_forged_or_reused", async (t) => {
  const s = api(); const f = await fixture(t); let expired!: BusinessCutoverExclusiveScope; let expiredControl!: BusinessCutoverControl;
  await s.withBusinessCutoverController(f.handle, async (control) => {
    expiredControl = control;
    for (const fake of [f.handle, JSON.parse(JSON.stringify(control)), Object.create(control)]) {
      await assert.rejects(s.withBusinessCutoverExclusive(fake, async () => assert.fail("forged control accepted")), /BUSINESS_CUTOVER_CLOSED/);
    }
    await s.withBusinessCutoverExclusive(control, async (scope) => {
      expired = scope;
      assert.deepEqual(Object.keys(scope), []); assert.equal(JSON.stringify(scope), "{}");
      assert.equal((await s.assertBusinessCutoverExclusive(scope)).operationId, f.id);
      for (const fake of [control, f.handle, JSON.parse(JSON.stringify(scope)), Object.create(scope)]) {
        await assert.rejects(s.assertBusinessCutoverExclusive(fake), /BUSINESS_CUTOVER_CLOSED/);
      }
      const otherCopy = await import(`./businessCutoverMaintenanceService.ts?copy=${randomUUID()}`);
      await assert.rejects(otherCopy.assertBusinessCutoverExclusive(scope), /BUSINESS_CUTOVER_CLOSED/);
    });
    await assert.rejects(s.assertBusinessCutoverExclusive(expired), /BUSINESS_CUTOVER_CLOSED/);
  });
  await assert.rejects(s.assertBusinessCutoverExclusive(expired), /BUSINESS_CUTOVER_CLOSED/);
  await assert.rejects(s.withBusinessCutoverExclusive(expiredControl, async () => assert.fail("expired control accepted")), /BUSINESS_CUTOVER_CLOSED/);
});

test("exclusive_callback_serializes_entire_action", async (t) => {
  const s = api(); const f = await fixture(t); const entered = barrier(); const leave = barrier(); const order: string[] = [];
  await s.withBusinessCutoverController(f.handle, async (control) => {
    const first = s.withBusinessCutoverExclusive(control, async (scope) => {
      order.push("first-enter"); entered.release(); await leave.promise;
      await s.assertBusinessCutoverExclusive(scope); order.push("first-leave");
    });
    await entered.promise;
    const second = s.withBusinessCutoverExclusive(control, async () => { order.push("second"); });
    const drained = s.drainBusinessCutover(control, 0);
    await new Promise<void>((done) => setImmediate(done)); assert.deepEqual(order, ["first-enter"]);
    leave.release(); await Promise.all([first, second, drained]);
    assert.deepEqual(order, ["first-enter", "first-leave", "second"]);
    await s.withBusinessCutoverExclusive(control, async () => {
      await assert.rejects(s.drainBusinessCutover(control, 0), /BUSINESS_CUTOVER_CLOSED/);
      await assert.rejects(s.markBusinessCutoverMigrationStarted(control), /BUSINESS_CUTOVER_CLOSED/);
      await assert.rejects(s.withBusinessCutoverExclusive(control, async () => {}), /BUSINESS_CUTOVER_CLOSED/);
    });
  });
});

test("binding_is_private_immutable_and_same_operation", async (t) => {
  const s = api(); const f = await fixture(t); const expected = binding(); const original = Buffer.from(expected.material);
  await s.withBusinessCutoverController(f.handle, (control) => s.withBusinessCutoverExclusive(control, async (scope) => {
    assert.equal(await s.readBusinessCutoverMigrationBinding(scope), null);
    const pending = s.bindBusinessCutoverMigration(scope, expected); expected.material.fill(0); await pending;
    const saved = await s.readBusinessCutoverMigrationBinding(scope); assert.ok(saved);
    assert.deepEqual(saved.material, original); saved.material.fill(1);
    assert.deepEqual((await s.readBusinessCutoverMigrationBinding(scope))!.material, original);
    await assert.rejects(s.bindBusinessCutoverMigration(scope, binding()), /BUSINESS_CUTOVER_CLOSED/);
  }));
  const path = resolve(f.operation, "migration-plan.json");
  const bytes = await readFile(path); const data = JSON.parse(bytes.toString());
  assert.equal(data.version, 1); assert.equal(data.operationId, f.id); assert.equal(data.material, original.toString("base64"));
  if (process.platform !== "win32") assert.equal((await lstat(path)).mode & 0o777, 0o600);
  await s.withBusinessCutoverController(await resumeBusinessCutoverClosure(f.output, f.id), (control) =>
    s.withBusinessCutoverExclusive(control, async (scope) => assert.deepEqual((await s.readBusinessCutoverMigrationBinding(scope))!.material, original)));
  data.operationId = randomUUID(); await writeFile(path, JSON.stringify(data));
  assert.equal((await s.readBusinessCutoverStatus(f.output)).status, "BLOCKED");
  assert.equal(await inspectBusinessGlobalClosure(f.output), "CLOSED");
});

test("started_requires_drained_matching_binding", async (t) => {
  const s = api(); const f = await fixture(t); const b = binding();
  await s.withBusinessCutoverController(f.handle, async (control) => {
    await s.withBusinessCutoverExclusive(control, async (scope) => {
      await assert.rejects(s.startBusinessCutoverMigration(scope, b.planHash), /BUSINESS_CUTOVER_CLOSED/);
      await s.bindBusinessCutoverMigration(scope, b);
      await assert.rejects(s.startBusinessCutoverMigration(scope, b.planHash), /BUSINESS_CUTOVER_CLOSED/);
    });
    await s.drainBusinessCutover(control, 0);
    await s.withBusinessCutoverExclusive(control, async (scope) => {
      await assert.rejects(s.startBusinessCutoverMigration(scope, "f".repeat(64)), /BUSINESS_CUTOVER_PLAN_MISMATCH/);
      await s.startBusinessCutoverMigration(scope, b.planHash);
      await assert.rejects(s.startBusinessCutoverMigration(scope, b.planHash), /BUSINESS_CUTOVER_CLOSED/);
    });
  });
  const names = (await readdir(resolve(f.operation, "events"))).sort();
  const events = await Promise.all(names.map(async (n) => JSON.parse(await readFile(resolve(f.operation, "events", n), "utf8"))));
  assert.deepEqual(events.map((e) => e.kind), ["BEGIN", "MIGRATION_PLAN_BOUND", "DRAINED", "MIGRATION_STARTED"]);
  assert.equal(events[1].reason, b.planHash); assert.equal((await s.readBusinessCutoverStatus(f.output)).migrationStarted, true);
});

test("queued_scope_is_revoked_before_lock_cleanup", async (t) => {
  const s = api(); const f = await fixture(t); const entered = barrier(); const leave = barrier(); const settle = barrier();
  let escaped!: BusinessCutoverExclusiveScope; let queuedRan = false; let first!: Promise<unknown>; let queued!: Promise<unknown>;
  const controller = s.withBusinessCutoverController(f.handle, async (control) => {
    first = s.withBusinessCutoverExclusive(control, async (scope) => { escaped = scope; entered.release(); await leave.promise;
      await assert.rejects(s.bindBusinessCutoverMigration(scope, binding()), /BUSINESS_CUTOVER_CLOSED/); }).catch(() => "revoked");
    await entered.promise;
    queued = s.withBusinessCutoverExclusive(control, async () => { queuedRan = true; }).catch(() => "revoked");
    await settle.promise;
  });
  await entered.promise; settle.release(); await new Promise<void>((done) => setImmediate(done));
  assert.ok(await lstat(resolve(f.operation, ".controller")));
  await assert.rejects(s.assertBusinessCutoverExclusive(escaped), /BUSINESS_CUTOVER_CLOSED/);
  leave.release(); await Promise.all([controller, first, queued]);
  assert.equal(queuedRan, false); await assert.rejects(lstat(resolve(f.operation, ".controller")), { code: "ENOENT" });
  assert.equal(await inspectBusinessGlobalClosure(f.output), "CLOSED");
});

test("binding_rejects_invalid_limits_hash_links_and_unknown_fields", async (t) => {
  const s = api();
  for (const damage of ["hash", "size", "release", "extra", "hardlink", "record", "bytes"] as const) {
    const f = await fixture(t); const b = binding();
    let rejectedRead = false;
    await s.withBusinessCutoverController(f.handle, (control) => s.withBusinessCutoverExclusive(control, async (scope) => {
      if (damage === "hash") b.planHash = "f".repeat(64);
      if (damage === "size") b.material = Buffer.alloc(1024 * 1024 + 1);
      if (damage === "release") b.releaseId = "\nsecret-path";
      if (["hash", "size", "release"].includes(damage)) {
        await assert.rejects(s.bindBusinessCutoverMigration(scope, b)); rejectedRead = true; return;
      }
      await s.bindBusinessCutoverMigration(scope, b);
      const path = resolve(f.operation, "migration-plan.json");
      if (damage === "hardlink") await link(path, resolve(f.output, "foreign-binding"));
      else {
        const data = JSON.parse(await readFile(path, "utf8"));
        if (damage === "extra") data.extra = true;
        if (damage === "record") data.recordDigest = "f".repeat(64);
        if (damage === "bytes") data.material = Buffer.from("different").toString("base64");
        await writeFile(path, JSON.stringify(data));
      }
      await assert.rejects(s.readBusinessCutoverMigrationBinding(scope), /BUSINESS_CUTOVER_CLOSED/);
      rejectedRead = true;
    })).catch((error) => { assert.match(error.message, /BUSINESS_CUTOVER_CLOSED/); });
    assert.equal(rejectedRead, true, `invalid binding accepted: ${damage}`);
    assert.equal(await inspectBusinessGlobalClosure(f.output), "CLOSED");
  }
});

test("corrupt_binding_start_reports_only_fixed_authority_error", async (t) => {
  const s = api(); const f = await fixture(t); let startError = "";
  await s.withBusinessCutoverController(f.handle, async (control) => {
    await s.drainBusinessCutover(control, 0);
    await s.withBusinessCutoverExclusive(control, async (scope) => {
      await s.bindBusinessCutoverMigration(scope, binding());
      await writeFile(resolve(f.operation, "migration-plan.json"), "{ secret-private-path");
      startError = await s.startBusinessCutoverMigration(scope, binding().planHash).then(() => "accepted", (error) => error.message);
    });
  });
  assert.equal(startError, "BUSINESS_CUTOVER_CLOSED");
});

test("bound_event_requires_exact_file_and_plan_hash", async (t) => {
  const s = api();
  for (const damage of ["hash", "absent-file", "legacy-version"] as const) {
    const f = await fixture(t);
    await s.withBusinessCutoverController(f.handle, (control) => s.withBusinessCutoverExclusive(control, async (scope) => {
      await s.bindBusinessCutoverMigration(scope, binding());
    }));
    const path = resolve(f.operation, "migration-plan.json");
    if (damage === "absent-file") await rm(path);
    if (damage === "legacy-version") {
      const data = JSON.parse(await readFile(path, "utf8")); data.version = 0; await writeFile(path, JSON.stringify(data));
    }
    if (damage === "hash") {
      const eventPath = resolve(f.operation, "events", "00000002.json"); const data = JSON.parse(await readFile(eventPath, "utf8"));
      data.reason = "f".repeat(64); delete data.hash;
      await writeFile(eventPath, JSON.stringify({ ...data, hash: createHash("sha256").update(JSON.stringify(data)).digest("hex") }));
    }
    assert.equal((await s.readBusinessCutoverStatus(f.output)).status, "BLOCKED");
    await assert.rejects(s.withBusinessCutoverController(await resumeBusinessCutoverClosure(f.output, f.id), async () => assert.fail("damaged journal accepted")));
    assert.equal(await inspectBusinessGlobalClosure(f.output), "CLOSED");
  }
});

test("binding_fsync_failure_never_records_bound_or_started_and_retains_evidence", async (t) => {
  const s = api(); const f = await fixture(t); const originalOpen = fs.open;
  await s.withBusinessCutoverController(f.handle, async (control) => {
    await s.drainBusinessCutover(control, 0);
    await s.withBusinessCutoverExclusive(control, async (scope) => {
      const mock = t.mock.method(fs, "open", async (...args: Parameters<typeof fs.open>) => {
        const fd = await originalOpen(...args);
        if (String(args[0]).endsWith("migration-plan.json")) fd.sync = async () => { throw new Error("injected fsync failure"); };
        return fd;
      });
      syncBuiltinESMExports();
      try { await assert.rejects(s.bindBusinessCutoverMigration(scope, binding()), /BUSINESS_CUTOVER_CLOSED/); }
      finally { mock.mock.restore(); syncBuiltinESMExports(); }
    });
  });
  assert.ok(await lstat(resolve(f.operation, "migration-plan.json")));
  const events = await Promise.all((await readdir(resolve(f.operation, "events"))).map(async (n) => JSON.parse(await readFile(resolve(f.operation, "events", n), "utf8"))));
  assert.deepEqual(events.map((e) => e.kind), ["BEGIN", "DRAINED"]);
  assert.equal((await s.readBusinessCutoverStatus(f.output)).status, "BLOCKED");
});

test("detached_binding_is_revoked_and_drained_before_next_exclusive_action", async (t) => {
  const s = api(); const f = await fixture(t); const opened = barrier(); const resume = barrier(); const originalOpen = fs.open;
  let detached!: Promise<string>; let nextEntered = false;
  await s.withBusinessCutoverController(f.handle, async (control) => {
    const mock = t.mock.method(fs, "open", async (...args: Parameters<typeof fs.open>) => {
      const fd = await originalOpen(...args);
      if (String(args[0]).endsWith("migration-plan.json") && typeof args[1] === "number" && (args[1] & constants.O_CREAT)) {
        opened.release(); await resume.promise;
      }
      return fd;
    });
    syncBuiltinESMExports();
    try {
      const first = s.withBusinessCutoverExclusive(control, async (scope) => {
        detached = s.bindBusinessCutoverMigration(scope, binding()).then(() => "fulfilled", () => "rejected");
        await opened.promise;
      });
      await opened.promise;
      const next = s.withBusinessCutoverExclusive(control, async () => { nextEntered = true; });
      await new Promise<void>((done) => setImmediate(done));
      assert.equal(nextEntered, false);
      resume.release(); await Promise.all([first, next]);
      assert.equal(await detached, "rejected");
    } finally { resume.release(); await detached; mock.mock.restore(); syncBuiltinESMExports(); }
  });
  assert.equal((await lstat(resolve(f.operation, "migration-plan.json"))).size, 0);
  assert.deepEqual(await readdir(resolve(f.operation, "events")), ["00000001.json"]);
});

test("scoped_work_rejects_fake_expired_and_physically_unowned_scopes_before_action", async (t) => {
  const s = api(); const f = await fixture(t); let expired!: BusinessCutoverExclusiveScope; let calls = 0;
  const action = async () => { calls++; };
  await s.withBusinessCutoverController(f.handle, async (control) => {
    await s.withBusinessCutoverExclusive(control, async (scope) => {
      expired = scope;
      for (const fake of [control, f.handle, JSON.parse(JSON.stringify(scope)), Object.create(scope)]) {
        await assert.rejects(s.withBusinessCutoverScopedWork(fake, action), /BUSINESS_CUTOVER_CLOSED/);
      }
      const otherCopy = await import(`./businessCutoverMaintenanceService.ts?copy=${randomUUID()}`);
      await assert.rejects(otherCopy.withBusinessCutoverScopedWork(scope, action), /BUSINESS_CUTOVER_CLOSED/);
      const marker = resolve(f.operation, ".controller", "owner.json"); const bytes = await readFile(marker);
      await writeFile(marker, "{}");
      const failure = await s.withBusinessCutoverScopedWork(scope, action).then(() => "accepted", (error) => error.message);
      await writeFile(marker, bytes);
      assert.equal(failure, "BUSINESS_CUTOVER_CLOSED");
    });
    await assert.rejects(s.withBusinessCutoverScopedWork(expired, action), /BUSINESS_CUTOVER_CLOSED/);
  });
  await assert.rejects(s.withBusinessCutoverScopedWork(expired, action), /BUSINESS_CUTOVER_CLOSED/);
  assert.equal(calls, 0);
});

test("scoped_work_detached_external_io_retains_queue_then_revokes_following_write", async (t) => {
  const s = api(); const f = await fixture(t); const entered = barrier(); const resume = barrier(); const completed = barrier();
  const source = resolve(f.output, "external-source"); const target = resolve(f.output, "must-not-write");
  await writeFile(source, "real external input");
  const fd = await fs.open(source, "r"); const originalRead = fd.readFile.bind(fd);
  const mock = t.mock.method(fd, "readFile", async () => { entered.release(); await resume.promise; return originalRead(); });
  let detached!: Promise<string>; let nextEntered = false; const order: string[] = [];
  try {
    await s.withBusinessCutoverController(f.handle, async (control) => {
      const first = s.withBusinessCutoverExclusive(control, async (scope) => {
        detached = s.withBusinessCutoverScopedWork(scope, async () => {
          try {
            const bytes = await fd.readFile(); assert.equal(bytes.toString(), "real external input");
            order.push("io-settled");
            await s.assertBusinessCutoverExclusive(scope);
            await writeFile(target, bytes);
            return "unexpected-write";
          } finally { order.push("helper-settled"); completed.release(); }
        }).then(() => "fulfilled", (error) => error.message);
        await entered.promise;
      });
      await entered.promise;
      const next = s.withBusinessCutoverExclusive(control, async () => { nextEntered = true; order.push("next"); });
      try {
        await new Promise<void>((done) => setImmediate(done));
        assert.equal(nextEntered, false); assert.ok(await lstat(resolve(f.operation, ".controller")));
      } finally { resume.release(); }
      await Promise.all([first, next, completed.promise]);
      assert.equal(await detached, "BUSINESS_CUTOVER_CLOSED");
    });
  } finally { resume.release(); await detached; mock.mock.restore(); await fd.close(); }
  assert.deepEqual(order, ["io-settled", "helper-settled", "next"]);
  await assert.rejects(lstat(target), { code: "ENOENT" });
  await assert.rejects(lstat(resolve(f.operation, ".controller")), { code: "ENOENT" });
  assert.equal(await inspectBusinessGlobalClosure(f.output), "CLOSED");
});

test("scoped_work_sync_throw_rejection_and_domain_results_do_not_poison_pending", async (t) => {
  const s = api(); const f = await fixture(t); const domainError = new Error("BUSINESS_CUTOVER_ARTIFACTS_UNAVAILABLE");
  await s.withBusinessCutoverController(f.handle, async (control) => {
    await s.withBusinessCutoverExclusive(control, async (scope) => {
      await assert.rejects(s.withBusinessCutoverScopedWork(scope, () => { throw domainError; }), (error) => error === domainError);
      await assert.rejects(s.withBusinessCutoverScopedWork(scope, () => Promise.reject(domainError)), (error) => error === domainError);
      const result = Object.freeze({ outcome: "RELEASE_COMMIT_UNCONFIRMED", commitObserved: true });
      assert.equal(await s.withBusinessCutoverScopedWork(scope, async () => result), result);
    });
    await s.withBusinessCutoverExclusive(control, async (scope) => {
      assert.equal(await s.withBusinessCutoverScopedWork(scope, async () => 42), 42);
    });
  });
  await assert.rejects(lstat(resolve(f.operation, ".controller")), { code: "ENOENT" });
  assert.equal(await inspectBusinessGlobalClosure(f.output), "CLOSED");
});

test("scoped_work_controller_settlement_retains_admin_lock_until_external_io_settles", async (t) => {
  const s = api(); const f = await fixture(t); const entered = barrier(); const resume = barrier(); const source = resolve(f.output, "io-source");
  await writeFile(source, "pending read");
  let detached!: Promise<string>; let exclusive!: Promise<unknown>; let finished = false;
  const controller = s.withBusinessCutoverController(f.handle, async (control) => {
    exclusive = s.withBusinessCutoverExclusive(control, async (scope) => {
      detached = s.withBusinessCutoverScopedWork(scope, async () => {
        const fd = await fs.open(source, "r");
        try { entered.release(); await resume.promise; await fd.readFile(); await s.assertBusinessCutoverExclusive(scope); }
        finally { await fd.close(); }
      }).then(() => "fulfilled", (error) => error.message);
      await entered.promise;
    }).catch(() => "revoked");
    await entered.promise;
  }).then(() => { finished = true; });
  try {
    await entered.promise; await new Promise<void>((done) => setImmediate(done));
    assert.equal(finished, false); assert.ok(await lstat(resolve(f.operation, ".controller")));
    await assert.rejects(s.withBusinessCutoverController(await resumeBusinessCutoverClosure(f.output, f.id), async () => assert.fail("concurrent controller")));
  } finally { resume.release(); await Promise.all([controller, exclusive, detached]); }
  assert.equal(await detached, "BUSINESS_CUTOVER_CLOSED");
  assert.equal(finished, true);
  await assert.rejects(lstat(resolve(f.operation, ".controller")), { code: "ENOENT" });
});

test("scoped_work_revocation_between_validation_and_action_never_invokes_consumer", async (t) => {
  const s = api(); const f = await fixture(t); const finish = barrier(); const originalRead = fs.readdir;
  let armed = false; let matches = 0; let outerActionCalls = 0; let detached!: Promise<string>;
  const mock = t.mock.method(fs, "readdir", async (...args: Parameters<typeof fs.readdir>) => {
    const result = await originalRead(...args);
    if (armed && String(args[0]) === resolve(f.operation, ".controller") && ++matches === 2) {
      // The store checks this directory first; assertScope's final check is
      // second. Settle the callback during validation's final continuation.
      armed = false; queueMicrotask(finish.release);
    }
    return result;
  });
  syncBuiltinESMExports();
  try {
    await s.withBusinessCutoverController(f.handle, async (control) => {
      await s.withBusinessCutoverExclusive(control, async (scope) => {
        armed = true;
        detached = s.withBusinessCutoverScopedWork(scope, async () => { outerActionCalls++; })
          .then(() => "fulfilled", (error) => error.message);
        await finish.promise;
      });
      await detached;
    });
  } finally { finish.release(); mock.mock.restore(); syncBuiltinESMExports(); }
  assert.equal(matches, 2);
  assert.equal(outerActionCalls, 0);
  assert.equal(await detached, "BUSINESS_CUTOVER_CLOSED");
  await assert.rejects(lstat(resolve(f.operation, ".controller")), { code: "ENOENT" });
  assert.equal(await inspectBusinessGlobalClosure(f.output), "CLOSED");
});
