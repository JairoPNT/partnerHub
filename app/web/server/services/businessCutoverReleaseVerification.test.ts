import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, rm, writeFile, rename, mkdir, symlink } from "node:fs/promises";
import fs from "node:fs/promises";
import { syncBuiltinESMExports } from "node:module";
import { resolve } from "node:path";
import test from "node:test";
import { fixture } from "./businessConsentCutoverMigration.test-fixtures.ts";
import * as maintenance from "./businessCutoverMaintenanceService.ts";
import { captureBusinessMasterTree } from "../../scripts/business-master-transition-lifecycle.mjs";
import type { BusinessCutoverExclusiveScope } from "./businessCutoverMaintenanceService.ts";
import { compiled, migrated } from "./businessCutoverReleaseVerification.test-fixtures.ts";
test("wrong_runtime_with_correct_master_rejects", async (t) => {
  const { f } = await migrated(t), old = await compiled(t);
  assert.match(String((await old.run(f, (scope) => old.m.verifyBusinessConsentRelease(scope, "REOPEN"))).error), /BUSINESS_CUTOVER_PROFILE_INVALID/);
});
test("correct_runtime_with_wrong_master_rejects", async (t) => {
  const { f, c } = await migrated(t);
  // START and schema2 audit are genuine and complete: rejection must now be
  // caused by the incompatible current master, not by a missing start marker.
  await writeFile(resolve(f.output, "ganomaster-business/config.js"), await readFile(resolve(f.output, ".master-package-archives/CDX-20261021-009/ganomaster-business/config.js")));
  assert.match(String((await c.run(f, (scope) => c.m.verifyBusinessConsentRelease(scope, "REOPEN"))).error), /BUSINESS_CUTOVER_ARTIFACTS_UNAVAILABLE/);
});
test("provider_flags_or_missing_bundle_reject", async (t) => {
  for (const file of ["plantillas-de-pagina/business/config.js", "runtime-assets/product-mutation-coordinator.mjs"]) {
    const f = await fixture(t), c = await compiled(t);
    if (file.endsWith("config.js")) await writeFile(resolve(c.root, file), "ga4: true, meta: true");
    else await rm(resolve(c.root, file));
    assert.match(String((await c.run(f, (scope) => c.m.verifyBusinessConsentRelease(scope, "CANCEL"))).error), file.endsWith("config.js") ? /BUSINESS_CUTOVER_PROFILE_INVALID/ : /BUSINESS_CUTOVER_ARTIFACTS_UNAVAILABLE/);
  }
});
test("cancel_rejects_after_started", async (t) => {
  const { f } = await migrated(t), c = await compiled(t);
  assert.match(String((await c.run(f, (scope) => c.m.verifyBusinessConsentRelease(scope, "CANCEL"))).error), /BUSINESS_CUTOVER_PROFILE_INVALID/);
});
test("bound_prestart_cancel_uses_genuine_fresh_capture_and_bound_plan_hash_readonly", async (t) => {
  const f = await fixture(t), c = await compiled(t);
  const bound = await f.run(async (scope) => {
    const binding = await f.binding(scope);
    await maintenance.bindBusinessCutoverMigration(scope, binding);
    return binding.planHash;
  }); assert.equal(bound.error, null);
  const result = await c.run(f, async (scope) => {
    const before = await captureBusinessMasterTree(f.output);
    const proof = await c.m.verifyBusinessConsentRelease(scope, "CANCEL");
    const facts = await c.m.assertBusinessCutoverVerifiedRelease(proof, scope);
    assert.equal(facts.kind, "CANCEL"); assert.equal(facts.releaseId, "business-consent-predecessor-v1");
    assert.equal(facts.planHash, bound.value);
    assert.deepEqual(await captureBusinessMasterTree(f.output), before);
    assert.equal((await c.m.readBusinessCutoverStatus(f.output)).migrationStarted, false);
  }); assert.equal(result.error, null);
});
test("bound_prestart_cancel_rejects_invalid_stale_started_and_partial_facts", async (t) => {
  for (const kind of ["invalid-binding", "stale", "started", "partial"] as const) await t.test(kind, async (st) => {
    const f = await fixture(st), c = await compiled(st);
    const bound = await f.run(async (scope) => {
      const binding = await f.binding(scope);
      if (kind === "invalid-binding") {
        const saved = JSON.parse(Buffer.from(binding.material).toString("utf8")); saved.providers.ga4 = true;
        const material = Buffer.from(JSON.stringify(saved));
        await maintenance.bindBusinessCutoverMigration(scope, { ...binding, material, planHash: createHash("sha256").update(material).digest("hex") });
      } else await maintenance.bindBusinessCutoverMigration(scope, binding);
      if (kind === "started") await maintenance.startBusinessCutoverMigration(scope, binding.planHash);
      if (kind === "stale") await writeFile(resolve(f.staging, "index.html"), "unreviewed");
      if (kind === "partial") {
        await mkdir(resolve(f.output, ".master-package-audits/CDX-20261021-009"));
        await writeFile(resolve(f.output, ".master-package-audits/CDX-20261021-009/migration.json"), "partial");
      }
    }); assert.equal(bound.error, null);
    const result = await c.run(f, async (scope) => {
      const before = await captureBusinessMasterTree(f.output);
      await assert.rejects(c.m.verifyBusinessConsentRelease(scope, "CANCEL"),
        kind === "invalid-binding" || kind === "started" ? /BUSINESS_CUTOVER_PROFILE_INVALID/ : /BUSINESS_CUTOVER_ARTIFACTS_UNAVAILABLE/);
      assert.deepEqual(await captureBusinessMasterTree(f.output), before);
    }); assert.equal(result.error, null);
  });
});
test("proof_expires_and_is_not_json", async (t) => {
  const f = await fixture(t), c = await compiled(t); let saved: unknown, originalScope: BusinessCutoverExclusiveScope;
  const result = await c.run(f, async (scope) => {
    originalScope = scope; const proof = await c.m.verifyBusinessConsentRelease(scope, "CANCEL"); saved = proof;
    assert.equal(JSON.stringify(saved), "{}");
    const facts = await c.m.assertBusinessCutoverVerifiedRelease(proof, scope);
    assert.equal(facts.kind, "CANCEL"); assert.equal(facts.releaseId, "business-consent-predecessor-v1"); assert.equal(facts.planHash, null);
    assert.match(facts.factsHash, /^[0-9a-f]{64}$/);
    await assert.rejects(c.m.assertBusinessCutoverVerifiedRelease(JSON.parse(JSON.stringify(saved)), scope), /BUSINESS_CUTOVER_CLOSED/);
  });
  assert.equal(result.error, null);
  await assert.rejects(c.m.assertBusinessCutoverVerifiedRelease(saved as never, originalScope!), /BUSINESS_CUTOVER_CLOSED/);
  assert.match(String((await c.run(f, (scope) => c.m.assertBusinessCutoverVerifiedRelease(saved as never, scope))).error), /BUSINESS_CUTOVER_CLOSED/);
});
test("journal_corrupted_inside_active_scope_cannot_issue_cancel_proof", async (t) => {
  const f = await fixture(t), c = await compiled(t);
  const result = await c.run(f, async (scope) => {
    const file = resolve(f.output, ".business-cutover-operations", f.id, "events/00000001.json");
    const event = JSON.parse(await readFile(file, "utf8"));
    await writeFile(file, JSON.stringify({ ...event, hash: "0".repeat(64) }));
    await assert.rejects(c.m.verifyBusinessConsentRelease(scope, "CANCEL"), /BUSINESS_CUTOVER_CLOSED/);
  }); assert.equal(result.error, null);
});
test("proof_rechecks_runtime_jobs_and_package_before_commit", async (t) => {
  for (const area of ["package", "runtime", "jobs"]) await t.test(area, async (st) => {
    const f = await fixture(st), c = await compiled(st);
    const result = await c.run(f, async (scope) => {
      const proof = await c.m.verifyBusinessConsentRelease(scope, "CANCEL");
      if (area === "package") await writeFile(resolve(f.output, "ganomaster-business/index.html"), "drift");
      if (area === "runtime") await writeFile(resolve(c.root, "runtime-assets/product-mutation-coordinator.mjs"), "drift");
      if (area === "jobs") {
        await mkdir(resolve(f.output, ".publication-jobs"));
        await writeFile(resolve(f.output, ".publication-jobs/unclassifiable.json"), "{}");
      }
      await assert.rejects(c.m.assertBusinessCutoverVerifiedRelease(proof, scope), area === "runtime" ? /BUSINESS_CUTOVER_PROFILE_INVALID/ : /BUSINESS_CUTOVER_ARTIFACTS_UNAVAILABLE/);
    }); assert.equal(result.error, null);
  });
});

test("detached_verification_io_drains_before_next_scope_and_cannot_mint_proof", async (t) => {
  const f = await fixture(t), c = await compiled(t), originalOpen = fs.open;
  let signalEntered!: () => void, release!: () => void, nextEntered = false, paused = false;
  const entered = new Promise<void>((done) => { signalEntered = done; });
  const released = new Promise<void>((done) => { release = done; });
  t.mock.method(fs, "open", async (...args: Parameters<typeof fs.open>) => {
    if (String(args[0]) === resolve(c.root, "runtime-assets/business-cutover-writer-inventory.json") && !paused) {
      paused = true; signalEntered(); await released;
    }
    return originalOpen(...args);
  }); syncBuiltinESMExports();
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); });
  const handle = await c.m.resumeBusinessCutoverClosure(f.output, f.id);
  let detached!: Promise<unknown>;
  await c.m.withBusinessCutoverController(handle, async (control) => {
    await c.m.drainBusinessCutover(control, 0);
    const first = c.m.withBusinessCutoverExclusive(control, async (scope) => {
      detached = c.m.verifyBusinessConsentRelease(scope, "CANCEL").catch((error: unknown) => error);
      await entered;
    });
    await entered;
    const next = c.m.withBusinessCutoverExclusive(control, async () => { nextEntered = true; });
    await new Promise((done) => setImmediate(done));
    assert.equal(nextEntered, false); release(); await first; await next;
    assert.equal(nextEntered, true); assert.match(String(await detached), /BUSINESS_CUTOVER_CLOSED/);
  });
});
test("reopen_checks_current_ancestors_not_old_overlay", async (t) => {
  const { f, c } = await migrated(t);
  await rm(f.staging, { recursive: true }); await mkdir(f.staging);
  const result = await c.run(f, async (scope) => {
    const proof = await c.m.verifyBusinessConsentRelease(scope, "REOPEN");
    const facts = await c.m.assertBusinessCutoverVerifiedRelease(proof, scope);
    assert.equal(facts.releaseId, "business-consent-successor-v1"); assert.equal(facts.kind, "REOPEN"); assert.equal(typeof facts.planHash, "string"); assert.match(facts.planHash!, /^[0-9a-f]{64}$/);
  }); assert.equal(result.error, null);
  const target = resolve(f.output, ".master-package-archives/CDX-20261019-003");
  await rename(target, target + ".moved");
  await symlink(target + ".moved", target, process.platform === "win32" ? "junction" : "dir");
  assert.match(String((await c.run(f, (scope) => c.m.verifyBusinessConsentRelease(scope, "REOPEN"))).error), /BUSINESS_CUTOVER_ARTIFACTS_UNAVAILABLE/);
});
