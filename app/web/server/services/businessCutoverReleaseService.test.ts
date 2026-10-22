import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { constants } from "node:fs";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import { syncBuiltinESMExports } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import test, { type TestContext } from "node:test";
import { build } from "esbuild";
import { fixture } from "./businessConsentCutoverMigration.test-fixtures.ts";
import { image, builder } from "../../scripts/build-business-cutover-writer-inventory.test-fixtures.mjs";

const web = resolve(import.meta.dirname, "../..");
type Graph = typeof import("./businessCutoverReleaseService.ts") & typeof import("./businessCutoverMaintenanceService.ts") &
  typeof import("./businessCutoverClaimStore.ts") & typeof import("./businessConsentCutoverMigration.ts") & typeof import("./businessCutoverReleaseVerification.ts");
async function setup(t: TestContext, successor = false) {
  const f = await fixture(t), root = await image(t, successor), b = await builder(root);
  const inventory = await b.buildBusinessCutoverWriterInventory(), bytes = Buffer.from(JSON.stringify(inventory));
  await fs.writeFile(resolve(root, "runtime-assets/business-cutover-writer-inventory.json"), bytes);
  const entry = resolve(web, "server/services/businessCutoverReleaseService.ts");
  assert.ok(await fs.lstat(entry).catch(() => null), "T4 terminal service is not implemented");
  const bundle = await build({ stdin: { contents: ["businessCutoverReleaseService", "businessCutoverMaintenanceService", "businessCutoverClaimStore", "businessConsentCutoverMigration", "businessCutoverReleaseVerification"]
    .map((name) => `export * from ${JSON.stringify(resolve(web, `server/services/${name}.ts`))};`).join("\n"), resolveDir: web, loader: "ts" },
    absWorkingDir: web, bundle: true, platform: "node", format: "esm", target: "node20", write: false,
    alias: { "server-only": resolve(web, "server/runtime/serverOnlyRuntimeShim.mjs") },
    define: { __BUSINESS_CUTOVER_RELEASE_DESCRIPTOR__: JSON.stringify({ version: 1, releaseId: inventory.releaseId,
      inventorySha256: createHash("sha256").update(bytes).digest("hex") }) },
    plugins: [{ name: "private-image-root", setup(b) {
      b.onLoad({ filter: /build-business-cutover-writer-inventory\.mjs$/ }, async (args) =>
        ({ contents: (await fs.readFile(args.path, "utf8")).replaceAll('"/app"', JSON.stringify(root)), loader: "js" }));
      b.onLoad({ filter: /businessCutoverReleaseProfile\.ts$/ }, async (args) =>
        ({ contents: (await fs.readFile(args.path, "utf8")).replaceAll('"/app/runtime-assets/business-cutover-writer-inventory.json"', JSON.stringify(resolve(root, "runtime-assets/business-cutover-writer-inventory.json"))), loader: "ts" }));
      b.onLoad({ filter: /businessCutoverMigrationAuthority\.ts$/ }, async (args) =>
        ({ contents: (await fs.readFile(args.path, "utf8")).replaceAll('"/app/runtime-assets/business-consent-successor"', JSON.stringify(f.staging)), loader: "ts" }));
      b.onLoad({ filter: /business-consent-master-release\.mjs$/ }, async (args) =>
        ({ contents: (await fs.readFile(args.path, "utf8")).replaceAll('"/app/runtime-assets/business-consent-successor"', JSON.stringify(f.staging)), loader: "js" }));
    } }] });
  const file = resolve(f.root, "terminal-bundle.mjs"); await fs.writeFile(file, bundle.outputFiles[0].contents);
  const m = await import(pathToFileURL(file).href) as Graph;
  const run = async <T>(action: (scope: Parameters<Graph["finishBusinessConsentCutover"]>[0]) => Promise<T>) =>
    m.withBusinessCutoverController(await m.resumeBusinessCutoverClosure(f.output, f.id), async (control) => {
      await m.drainBusinessCutover(control, 0);
      return m.withBusinessCutoverExclusive(control, action);
    });
  const operation = resolve(f.output, ".business-cutover-operations", f.id);
  const global = resolve(f.output, ".master-package-claims/ganomaster-business");
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); });
  return { f, m, run, operation, global, file, root };
}
const unconfirmed = { outcome: "RELEASE_COMMIT_UNCONFIRMED", commitObserved: true, persistenceConfirmed: false };

test("cancel_commits_whole_claim_and_diagnoses_without_mutation", async (t) => {
  const s = await setup(t), before = await fs.lstat(s.global, { bigint: true });
  assert.deepEqual(await s.m.readBusinessConsentCutoverOutcome(s.f.output, s.f.id), { outcome: "CLOSED", persistenceConfirmed: false });
  assert.deepEqual(await s.run((scope) => s.m.finishBusinessConsentCutover(scope, "CANCEL")),
    { outcome: "CANCELLED", commitObserved: true, persistenceConfirmed: true });
  assert.equal((await fs.lstat(resolve(s.operation, "released-claim"), { bigint: true })).ino, before.ino);
  await assert.rejects(fs.lstat(s.global), { code: "ENOENT" });
  await assert.rejects(fs.lstat(resolve(s.operation, ".controller")), { code: "ENOENT" });
  assert.deepEqual(await s.m.readBusinessConsentCutoverOutcome(s.f.output, s.f.id), { outcome: "RELEASED", persistenceConfirmed: false });
});

test("failure_before_commit_keeps_global", async (t) => {
  const s = await setup(t), original = fs.rename;
  t.mock.method(fs, "rename", async (...args: Parameters<typeof fs.rename>) => {
    if (String(args[0]) === s.global) throw new Error("private rename fault");
    return original(...args);
  }); syncBuiltinESMExports();
  await assert.rejects(s.run((scope) => s.m.finishBusinessConsentCutover(scope, "CANCEL")), /BUSINESS_CUTOVER_CLOSED/);
  assert.equal(await s.m.inspectBusinessGlobalClosure(s.f.output), "CLOSED");
  assert.deepEqual(await s.m.readBusinessConsentCutoverOutcome(s.f.output, s.f.id), { outcome: "CLOSED", persistenceConfirmed: false });
});

test("postrename_receipt_sync_failure_is_unconfirmed", async (t) => {
  const s = await setup(t), original = fs.open;
  t.mock.method(fs, "open", async (...args: Parameters<typeof fs.open>) => {
    const fd = await original(...args);
    if (String(args[0]) === resolve(s.operation, "release-receipt.json") && typeof args[1] === "number" && (args[1] & constants.O_CREAT))
      t.mock.method(fd, "sync", async () => { throw new Error("private sync fault"); });
    return fd;
  }); syncBuiltinESMExports();
  assert.deepEqual(await s.run((scope) => s.m.finishBusinessConsentCutover(scope, "CANCEL")), unconfirmed);
  assert.equal(await s.m.inspectBusinessGlobalClosure(s.f.output), "OPEN");
  assert.equal(JSON.parse(await fs.readFile(resolve(s.operation, "release-receipt.json"), "utf8")).persistenceConfirmed, true);
  assert.deepEqual(await s.m.readBusinessConsentCutoverOutcome(s.f.output, s.f.id), { outcome: "RELEASED", persistenceConfirmed: false });
});

test("new_begin_during_old_finish_is_untouched_and_replay_cannot_release_it", async (t) => {
  const s = await setup(t), original = fs.rename, nextId = randomUUID(); let newMarker!: Buffer;
  t.mock.method(fs, "rename", async (...args: Parameters<typeof fs.rename>) => {
    await original(...args);
    if (String(args[0]) === s.global) {
      await s.m.beginBusinessCutover(s.f.output, nextId);
      newMarker = await fs.readFile(resolve(s.global, "owner.json"));
    }
  }); syncBuiltinESMExports();
  assert.equal((await s.run((scope) => s.m.finishBusinessConsentCutover(scope, "CANCEL"))).outcome, "CANCELLED");
  assert.deepEqual(await fs.readFile(resolve(s.global, "owner.json")), newMarker);
  assert.deepEqual(await s.m.readBusinessConsentCutoverOutcome(s.f.output, s.f.id), { outcome: "RELEASED", persistenceConfirmed: false });
  await assert.rejects(s.run((scope) => s.m.finishBusinessConsentCutover(scope, "CANCEL")), /BUSINESS_CUTOVER_CLOSED/);
  assert.equal((await s.m.readBusinessCutoverStatus(s.f.output)).operationId, nextId);
});

test("observation_survives_first_rebind_io_and_controller_cleanup_failures", async (t) => {
  for (const failure of ["rebind", "cleanup", "rebind-with-new-BEGIN"]) await t.test(failure, async (st) => {
    const s = await setup(st), originalRename = fs.rename, originalLstat = fs.lstat, originalUnlink = fs.unlink;
    let renamed = false; const nextId = randomUUID();
    st.mock.method(fs, "rename", async (...args: Parameters<typeof fs.rename>) => {
      await originalRename(...args);
      if (String(args[0]) === s.global) {
        if (failure === "rebind-with-new-BEGIN") await s.m.beginBusinessCutover(s.f.output, nextId);
        renamed = true;
      }
    });
    st.mock.method(fs, "lstat", async (...args: Parameters<typeof fs.lstat>) => {
      if (failure.startsWith("rebind") && renamed) throw new Error("private first postrename IO fault");
      return originalLstat(...args);
    });
    st.mock.method(fs, "unlink", async (...args: Parameters<typeof fs.unlink>) => {
      if (failure === "cleanup" && renamed && String(args[0]) === resolve(s.operation, ".controller/owner.json")) throw new Error("private cleanup fault");
      return originalUnlink(...args);
    }); syncBuiltinESMExports();
    await assert.rejects(s.run((scope) => s.m.finishBusinessConsentCutover(scope, "CANCEL")), (error) => {
      assert.deepEqual(s.m.readBusinessCutoverReleaseError(error), unconfirmed); return true;
    });
    assert.ok(await originalLstat(resolve(s.operation, "released-claim")));
    if (failure === "rebind-with-new-BEGIN") assert.equal(JSON.parse(await fs.readFile(resolve(s.global, "owner.json"), "utf8")).operationId, nextId);
  });
});

test("foreign_empty_or_nonempty_destination_is_never_replaced", async (t) => {
  for (const filled of [false, true]) await t.test(String(filled), async (st) => {
    const s = await setup(st), original = fs.open, destination = resolve(s.operation, "released-claim"); let foreignInode!: bigint;
    // Occupy the target only AFTER the first absence check/intention write,
    // before the final fresh proof/check. No product fault flags.
    st.mock.method(fs, "open", async (...args: Parameters<typeof fs.open>) => {
      const fd = await original(...args);
      if (String(args[0]) === resolve(s.operation, "release-intent.json") && typeof args[1] === "number" && (args[1] & constants.O_CREAT)) {
        const sync = fd.sync.bind(fd);
        st.mock.method(fd, "sync", async () => {
          await sync(); await fs.mkdir(destination, { mode: 0o700 });
          if (filled) await fs.writeFile(resolve(destination, "foreign"), "untouched");
          foreignInode = (await fs.lstat(destination, { bigint: true })).ino;
        });
      }
      return fd;
    }); syncBuiltinESMExports();
    await assert.rejects(s.run((scope) => s.m.finishBusinessConsentCutover(scope, "CANCEL")), /BUSINESS_CUTOVER_CLOSED/);
    assert.equal((await fs.lstat(destination, { bigint: true })).ino, foreignInode);
    if (filled) assert.equal(await fs.readFile(resolve(destination, "foreign"), "utf8"), "untouched");
    assert.equal(await s.m.inspectBusinessGlobalClosure(s.f.output), "CLOSED");
  });
});

test("caller_lookalike_error_does_not_report_a_commit", async (t) => {
  const s = await setup(t);
  const fake = Object.assign(new Error("RELEASE_COMMIT_UNCONFIRMED"), unconfirmed);
  assert.equal(s.m.readBusinessCutoverReleaseError(fake), null);
  await assert.rejects(s.run(async () => { throw fake; }), /BUSINESS_CUTOVER_CLOSED/);
  assert.equal(await s.m.inspectBusinessGlobalClosure(s.f.output), "CLOSED");
});

test("detached_finish_revoked_during_last_destination_check_never_renames", async (t) => {
  const s = await setup(t), original = fs.lstat; let checks = 0, settle!: () => void;
  const settled = new Promise<void>((done) => { settle = done; }); let pending!: Promise<unknown>;
  t.mock.method(fs, "lstat", async (...args: Parameters<typeof fs.lstat>) => {
    if (String(args[0]) === resolve(s.operation, "released-claim") && ++checks === 2) settle();
    return original(...args);
  }); syncBuiltinESMExports();
  await s.run(async (scope) => {
    pending = s.m.finishBusinessConsentCutover(scope, "CANCEL").catch((error: unknown) => error);
    await settled;
  });
  assert.match(String(await pending), /BUSINESS_CUTOVER_CLOSED/);
  assert.equal(await s.m.inspectBusinessGlobalClosure(s.f.output), "CLOSED");
});

test("cancel_vs_start_is_serial", async (t) => {
  const s = await setup(t), original = fs.rename; let enter!: () => void, release!: () => void, nextRan = false;
  const entered = new Promise<void>((done) => { enter = done; }), released = new Promise<void>((done) => { release = done; });
  t.mock.method(fs, "rename", async (...args: Parameters<typeof fs.rename>) => {
    if (String(args[0]) === s.global) { enter(); await released; }
    return original(...args);
  }); syncBuiltinESMExports();
  await s.m.withBusinessCutoverController(await s.m.resumeBusinessCutoverClosure(s.f.output, s.f.id), async (control) => {
    await s.m.drainBusinessCutover(control, 0);
    const first = s.m.withBusinessCutoverExclusive(control, (scope) => s.m.finishBusinessConsentCutover(scope, "CANCEL"));
    await entered;
    const second = s.m.withBusinessCutoverExclusive(control, async (scope) => {
      nextRan = true; await s.m.startBusinessCutoverMigration(scope, "a".repeat(64));
    }).catch((error) => error);
    await new Promise((done) => setImmediate(done)); assert.equal(nextRan, false); release();
    assert.equal((await first).outcome, "CANCELLED");
    assert.deepEqual(s.m.readBusinessCutoverReleaseError(await second), unconfirmed);
    assert.equal(nextRan, false);
  });
});

test("verify_vs_release_are_serial_through_complete_verification_io", async (t) => {
  const s = await setup(t), original = fs.open; let armed = true, enter!: () => void, release!: () => void, finishEntered = false;
  const entered = new Promise<void>((done) => { enter = done; }), released = new Promise<void>((done) => { release = done; });
  t.mock.method(fs, "open", async (...args: Parameters<typeof fs.open>) => {
    if (armed && String(args[0]) === resolve(s.root, "runtime-assets/business-cutover-writer-inventory.json")) {
      armed = false; enter(); await released;
    }
    return original(...args);
  }); syncBuiltinESMExports();
  await s.m.withBusinessCutoverController(await s.m.resumeBusinessCutoverClosure(s.f.output, s.f.id), async (control) => {
    await s.m.drainBusinessCutover(control, 0);
    const first = s.m.withBusinessCutoverExclusive(control, (scope) => s.m.verifyBusinessConsentRelease(scope, "CANCEL"));
    await entered;
    const second = s.m.withBusinessCutoverExclusive(control, async (scope) => {
      finishEntered = true; return s.m.finishBusinessConsentCutover(scope, "CANCEL");
    });
    await new Promise((done) => setImmediate(done)); assert.equal(finishEntered, false); release();
    await first; assert.equal((await second).outcome, "CANCELLED"); assert.equal(finishEntered, true);
  });
});

test("bound_prestart_cancel_and_completed_successor_reopen", async (t) => {
  for (const successor of [false, true]) await t.test(String(successor), async (st) => {
    const s = await setup(st, successor);
    if (successor) {
      const preview = await s.run(async (scope) => s.m.describeBusinessConsentCutover(await s.m.captureBusinessConsentCutover(scope)));
      await s.run((scope) => s.m.applyBusinessConsentCutover(scope, preview.planHash));
    } else {
      const binding = await s.f.run(s.f.binding); assert.equal(binding.error, null);
      await s.run((scope) => s.m.bindBusinessCutoverMigration(scope, binding.value!));
    }
    const result = await s.run((scope) => s.m.finishBusinessConsentCutover(scope, successor ? "REOPEN" : "CANCEL"));
    assert.equal(result.outcome, successor ? "REOPENED" : "CANCELLED");
    assert.match(JSON.parse(await fs.readFile(resolve(s.operation, "release-intent.json"), "utf8")).planHash, /^[0-9a-f]{64}$/);
  });
});

test("facts_changed_after_intent_are_rechecked_before_commit", async (t) => {
  const s = await setup(t), original = fs.open; let changed = false;
  t.mock.method(fs, "open", async (...args: Parameters<typeof fs.open>) => {
    const fd = await original(...args);
    if (String(args[0]) === resolve(s.operation, "release-intent.json") && typeof args[1] === "number" && (args[1] & constants.O_CREAT)) {
      const sync = fd.sync.bind(fd);
      t.mock.method(fd, "sync", async () => { await sync(); changed = true; await fs.writeFile(resolve(s.f.output, "ganomaster-business/index.html"), "drift"); });
    }
    return fd;
  }); syncBuiltinESMExports();
  await assert.rejects(s.run((scope) => s.m.finishBusinessConsentCutover(scope, "CANCEL")), /BUSINESS_CUTOVER_CLOSED/);
  assert.equal(changed, true); assert.equal(await s.m.inspectBusinessGlobalClosure(s.f.output), "CLOSED");
});

test("diagnostic_missing_receipt_or_replaced_claim_never_certifies_persistence", async (t) => {
  const s = await setup(t);
  await s.run((scope) => s.m.finishBusinessConsentCutover(scope, "CANCEL"));
  await fs.unlink(resolve(s.operation, "release-receipt.json"));
  assert.deepEqual(await s.m.readBusinessConsentCutoverOutcome(s.f.output, s.f.id), { outcome: "RELEASED", persistenceConfirmed: false });
  const target = resolve(s.operation, "released-claim"), bytes = await fs.readFile(resolve(target, "owner.json"));
  await fs.rename(target, resolve(s.f.root, "old-claim")); await fs.mkdir(target, { mode: 0o700 });
  await fs.writeFile(resolve(target, "owner.json"), bytes, { mode: 0o600 });
  assert.deepEqual(await s.m.readBusinessConsentCutoverOutcome(s.f.output, s.f.id), { outcome: "UNKNOWN", persistenceConfirmed: false });
});

test("actual_node20_same_graph_bundle_imports_and_finishes", async (t) => {
  const s = await setup(t), node20 = process.env.BUSINESS_CUTOVER_TEST_NODE20;
  assert.ok(node20, "Set BUSINESS_CUTOVER_TEST_NODE20 to actual Node major20 executable");
  const version = spawnSync(node20, ["--version"], { encoding: "utf8" });
  assert.equal(version.status, 0); assert.match(version.stdout, /^v20\./);
  const source = `import * as m from ${JSON.stringify(pathToFileURL(s.file).href)};
    const handle = await m.resumeBusinessCutoverClosure(${JSON.stringify(s.f.output)}, ${JSON.stringify(s.f.id)});
    const result = await m.withBusinessCutoverController(handle, async (control) => {
      await m.drainBusinessCutover(control, 0);
      return m.withBusinessCutoverExclusive(control, scope => m.finishBusinessConsentCutover(scope, 'CANCEL'));
    }); console.log(JSON.stringify(result));`;
  const result = spawnSync(node20, ["--input-type=module", "-e", source], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), { outcome: "CANCELLED", commitObserved: true, persistenceConfirmed: true });
});

test("precommit_intent_sync_failure_and_started_cancel_retain_closure", async (t) => {
  for (const failure of ["intent-sync", "started"]) await t.test(failure, async (st) => {
    const s = await setup(st), original = fs.open;
    if (failure === "started") {
      const binding = await s.f.run(s.f.binding); assert.equal(binding.error, null);
      await s.run(async (scope) => {
        await s.m.bindBusinessCutoverMigration(scope, binding.value!);
        await s.m.startBusinessCutoverMigration(scope, binding.value!.planHash);
      });
    } else {
      st.mock.method(fs, "open", async (...args: Parameters<typeof fs.open>) => {
        const fd = await original(...args);
        if (String(args[0]) === resolve(s.operation, "release-intent.json") && typeof args[1] === "number" && (args[1] & constants.O_CREAT))
          st.mock.method(fd, "sync", async () => { throw new Error("private precommit sync fault"); });
        return fd;
      }); syncBuiltinESMExports();
    }
    await assert.rejects(s.run((scope) => s.m.finishBusinessConsentCutover(scope, "CANCEL")), /BUSINESS_CUTOVER_CLOSED/);
    assert.equal(await s.m.inspectBusinessGlobalClosure(s.f.output), "CLOSED");
    await assert.rejects(fs.lstat(resolve(s.operation, "released-claim")), { code: "ENOENT" });
  });
});

test("diagnostic_rejects_symlink_hardlink_malformed_intent_and_foreign_operation", async (t) => {
  for (const corruption of ["symlink", "hardlink", "intent", "operation"]) await t.test(corruption, async (st) => {
    const s = await setup(st);
    await s.run((scope) => s.m.finishBusinessConsentCutover(scope, "CANCEL"));
    const target = resolve(s.operation, "released-claim"), marker = resolve(target, "owner.json");
    if (corruption === "symlink") { await fs.rename(target, resolve(s.f.root, "moved")); await fs.symlink(resolve(s.f.root, "moved"), target, process.platform === "win32" ? "junction" : "dir"); }
    if (corruption === "hardlink") await fs.link(marker, resolve(s.f.root, "linked-marker"));
    if (corruption === "intent") await fs.writeFile(resolve(s.operation, "release-intent.json"), "{}");
    const before = await fs.readdir(s.operation);
    assert.deepEqual(await s.m.readBusinessConsentCutoverOutcome(s.f.output, corruption === "operation" ? "../escape" : s.f.id),
      { outcome: "UNKNOWN", persistenceConfirmed: false });
    assert.deepEqual(await fs.readdir(s.operation), before);
  });
});
