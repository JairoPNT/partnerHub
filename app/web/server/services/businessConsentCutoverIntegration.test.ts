import assert from "node:assert/strict";
import { constants } from "node:fs";
import fs from "node:fs/promises";
import { syncBuiltinESMExports } from "node:module";
import { resolve } from "node:path";
import test from "node:test";
import { setup, command, node20Command, physicalSnapshot, oldHash, archiveHash, type Graph } from "@/server/services/businessConsentCutoverIntegration.test-fixtures";
import { captureBusinessMasterTree } from "../../scripts/business-master-transition-lifecycle.mjs";

const unconfirmed = { outcome: "RELEASE_COMMIT_UNCONFIRMED", commitObserved: true, persistenceConfirmed: false };
async function scoped<T>(m: Graph, output: string, id: string, action: (scope: Parameters<Graph["finishBusinessConsentCutover"]>[0]) => Promise<T>) {
  return m.withBusinessCutoverController(await m.resumeBusinessCutoverClosure(output, id), async (control) => {
    await m.drainBusinessCutover(control, 0); return m.withBusinessCutoverExclusive(control, action);
  });
}

test("fixed235 integration migrates across controller and Node20 process boundaries then freshly reopens", async (t) => {
  // Catches mismatched CLI graph/plan identity, premature release, lost lineage,
  // and a successor verifier that accidentally pins the predecessor overlay.
  const f = await setup(t);
  assert.equal((await captureBusinessMasterTree(resolve(f.output, "ganomaster-business"))).hash, oldHash);
  assert.equal((await captureBusinessMasterTree(f.archive)).hash, archiveHash);
  const protectedBefore = [await fs.readFile(f.history), await fs.readFile(f.refresh), await physicalSnapshot(f.archive)];
  for (const mode of ["BEGIN", "DRAIN"]) assert.equal(node20Command(f.a.file, f.output, command(mode, f.id)).exitCode, 0);
  const first = node20Command(f.a.file, f.output, command("PREVIEW", f.id));
  const second = node20Command(f.a.file, f.output, command("PREVIEW", f.id));
  assert.equal(first.output.status, "PREVIEWED"); assert.equal(first.output.planHash, second.output.planHash);
  const applied = node20Command(f.a.file, f.output, command("APPLY", f.id, [`--expected-plan-hash=${first.output.planHash}`]));
  assert.equal(applied.exitCode, 0); assert.equal(applied.output.status, "APPLIED"); assert.equal(applied.output.packageWritesMade, true);
  assert.equal(applied.output.providerCallsMade, false); assert.equal(applied.output.publicationMade, false);
  assert.equal((await f.m.readBusinessCutoverStatus(f.output)).migrationStarted, true);
  assert.equal(await f.m.inspectBusinessGlobalClosure(f.output), "CLOSED");
  const operation = resolve(f.output, ".business-cutover-operations", f.id);
  const record = JSON.parse(await fs.readFile(resolve(operation, "record.json"), "utf8")); assert.equal(record.version, 2);
  const events = await Promise.all((await fs.readdir(resolve(operation, "events"))).map(async (name) => JSON.parse(await fs.readFile(resolve(operation, "events", name), "utf8"))));
  assert.equal(events.filter((event) => event.kind === "MIGRATION_STARTED").length, 1);
  const audit = JSON.parse(await fs.readFile(resolve(f.output, ".master-package-audits/CDX-20261021-009/migration.json"), "utf8"));
  assert.equal(audit.planMaterial.schemaVersion, 2); assert.equal(audit.planMaterial.cutover.operationId, f.id);
  assert.equal((await captureBusinessMasterTree(resolve(f.output, ".master-package-archives/CDX-20261021-009/ganomaster-business"))).hash, oldHash);
  assert.deepEqual([await fs.readFile(f.history), await fs.readFile(f.refresh), await physicalSnapshot(f.archive)], protectedBefore);
  assert.equal(node20Command(f.a.file, f.output, command("CANCEL", f.id)).exitCode, 2);
  await fs.rm(f.a.staging, { recursive: true });
  const verified = node20Command(f.b.file, f.output, command("VERIFY", f.id));
  assert.equal(verified.exitCode, 0, JSON.stringify(verified)); assert.equal(verified.output.status, "VERIFIED"); assert.equal(verified.output.planHash, first.output.planHash);
  const reopened = node20Command(f.b.file, f.output, command("REOPEN", f.id));
  assert.equal(reopened.exitCode, 0); assert.equal(reopened.output.status, "REOPENED"); assert.equal(reopened.output.persistenceConfirmed, true);
  assert.deepEqual(await f.next.readBusinessConsentCutoverOutcome(f.output, f.id), { outcome: "RELEASED", persistenceConfirmed: false });
  assert.equal(await f.next.inspectBusinessGlobalClosure(f.output), "OPEN");
  await assert.rejects(fs.lstat(resolve(operation, ".controller")), { code: "ENOENT" });
});

test("cancel before START uses fresh proof and rejects caller-shaped authority without package writes", async (t) => {
  // Catches approving a forged proof, or allowing preview to mutate packages.
  const f = await setup(t), before = await physicalSnapshot(resolve(f.output, "ganomaster-business"));
  await f.m.beginBusinessCutover(f.output, f.id);
  await scoped(f.m, f.output, f.id, async (scope) => {
    await assert.rejects(f.m.assertBusinessCutoverVerifiedRelease({} as never, scope), /BUSINESS_CUTOVER_CLOSED/);
    const proof = await f.m.verifyBusinessConsentRelease(scope, "CANCEL");
    assert.equal((await f.m.assertBusinessCutoverVerifiedRelease(proof, scope)).planHash, null);
  });
  const cancelled = node20Command(f.a.file, f.output, command("CANCEL", f.id));
  assert.equal(cancelled.exitCode, 0); assert.equal(cancelled.output.status, "CANCELLED");
  assert.deepEqual(await physicalSnapshot(resolve(f.output, "ganomaster-business")), before);
});

test("orphan controller and same-byte physical claim replacement cannot resume or release", async (t) => {
  for (const fault of ["orphan", "replacement"]) await t.test(fault, async (st) => {
    const f = await setup(st); await f.m.beginBusinessCutover(f.output, f.id);
    const claim = resolve(f.output, ".master-package-claims/ganomaster-business");
    if (fault === "orphan") {
      const controller = resolve(f.output, ".business-cutover-operations", f.id, ".controller");
      await fs.mkdir(controller, { mode: 0o700 }); await fs.writeFile(resolve(controller, "owner.json"), JSON.stringify({ version: 1, operationId: f.id, token: "a".repeat(64) }), { mode: 0o600 });
    } else {
      const marker = await fs.readFile(resolve(claim, "owner.json"));
      await fs.rename(claim, resolve(f.root, "original-claim")); await fs.mkdir(claim, { mode: 0o700 });
      await fs.writeFile(resolve(claim, "owner.json"), marker, { mode: 0o600 });
    }
    const before = await physicalSnapshot(f.output), result = node20Command(f.a.file, f.output, command("CANCEL", f.id));
    assert.equal(result.exitCode, 2); assert.equal(result.output.status, "BLOCKED");
    assert.deepEqual(await physicalSnapshot(f.output), before); assert.equal(await f.m.inspectBusinessGlobalClosure(f.output), "CLOSED");
  });
});

test("terminal failure boundaries retain closure before rename and expose uncertainty after it", async (t) => {
  // Catches generic CLOSED normalization after commit, missed fsync failures,
  // or a cleanup path reinserting/removing a physical claim it no longer owns.
  for (const fault of ["intent-sync", "rename", "rebind", "claim-parent-sync", "operation-sync", "receipt-open", "receipt-sync", "cleanup"]) await t.test(fault, async (st) => {
    if (process.platform === "win32" && ["claim-parent-sync", "operation-sync"].includes(fault)) { st.skip("Windows intentionally does not fsync directories; required native Linux case is separate"); return; }
    const f = await setup(st); await f.m.beginBusinessCutover(f.output, f.id);
    const operation = resolve(f.output, ".business-cutover-operations", f.id), claim = resolve(f.output, ".master-package-claims/ganomaster-business");
    const originalOpen = fs.open, originalRename = fs.rename, originalLstat = fs.lstat, originalRmdir = fs.rmdir;
    let renamed = false, injected = false;
    st.mock.method(fs, "rename", async (...args: Parameters<typeof fs.rename>) => {
      if (String(args[0]) === claim) {
        if (fault === "rename") { injected = true; throw new Error("private precommit rename fault"); }
        await originalRename(...args); renamed = true; return;
      }
      return originalRename(...args);
    });
    st.mock.method(fs, "lstat", async (...args: Parameters<typeof fs.lstat>) => {
      if (!injected && renamed && fault === "rebind" && String(args[0]) === resolve(operation, "released-claim")) { injected = true; throw new Error("private postcommit rebind fault"); }
      return originalLstat(...args);
    });
    st.mock.method(fs, "open", async (...args: Parameters<typeof fs.open>) => {
      const path = String(args[0]);
      if (!injected && renamed && fault === "receipt-open" && path === resolve(operation, "release-receipt.json")) { injected = true; throw new Error("private receipt open fault"); }
      const fd = await originalOpen(...args);
      const target = fault === "intent-sync" ? resolve(operation, "release-intent.json") : fault === "receipt-sync" ? resolve(operation, "release-receipt.json") :
        fault === "claim-parent-sync" ? resolve(f.output, ".master-package-claims") : fault === "operation-sync" ? operation : "";
      if (!injected && path === target && (fault === "intent-sync" || fault === "receipt-sync" ? typeof args[1] === "number" && !!(args[1] & constants.O_CREAT) : renamed))
        st.mock.method(fd, "sync", async () => { injected = true; throw new Error("private fsync fault"); });
      return fd;
    });
    st.mock.method(fs, "rmdir", async (...args: Parameters<typeof fs.rmdir>) => {
      if (!injected && renamed && fault === "cleanup" && String(args[0]) === resolve(operation, ".controller")) { injected = true; throw new Error("private cleanup fault"); }
      return originalRmdir(...args);
    }); syncBuiltinESMExports();
    st.after(() => { st.mock.restoreAll(); syncBuiltinESMExports(); });
    const previousOutput = process.env.PRODUCT_PAGE_OUTPUT_DIR;
    process.env.PRODUCT_PAGE_OUTPUT_DIR = f.output;
    st.after(() => { if (previousOutput === undefined) delete process.env.PRODUCT_PAGE_OUTPUT_DIR; else process.env.PRODUCT_PAGE_OUTPUT_DIR = previousOutput; });
    const result = await f.m.runBusinessConsentCutover(command("CANCEL", f.id));
    // CLI resolves its output from existing configuration, not test callbacks.
    assert.equal(injected, true, fault);
    if (renamed) {
      assert.equal(result.exitCode, 3); assert.equal(result.output.status, unconfirmed.outcome);
      assert.equal(result.output.commitObserved, true); assert.equal(result.output.persistenceConfirmed, false);
      await assert.rejects(originalLstat(claim), { code: "ENOENT" });
    } else { assert.equal(result.exitCode, 1); assert.equal(result.output.status, "ERROR"); assert.deepEqual(result.output.reasons, ["BUSINESS_CUTOVER_COMMAND_FAILED"]); assert.ok(await originalLstat(claim)); }
    st.mock.restoreAll(); syncBuiltinESMExports();
    assert.deepEqual(await f.m.readBusinessConsentCutoverOutcome(f.output, f.id),
      { outcome: fault === "cleanup" ? "UNKNOWN" : renamed ? "RELEASED" : "CLOSED", persistenceConfirmed: false });
  });
});
