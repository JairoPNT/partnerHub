import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile, copyFile, link, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { syncBuiltinESMExports } from "node:module";
import { pathToFileURL } from "node:url";
import fs from "node:fs/promises";
import test from "node:test";
import * as maintenance from "./businessCutoverMaintenanceService.ts";
import { captureBusinessMasterTree } from "../../scripts/business-master-transition-lifecycle.mjs";
import { planBusinessConsentMasterMigration, applyBusinessConsentMasterMigration, readBusinessConsentMasterMigration, APPLY_MODE, APPLY_CONFIRMATION } from "../../scripts/business-consent-master-release.mjs";

import { fixture, api, repo, oldHash } from "./businessConsentCutoverMigration.test-fixtures.ts";

test("preview_hash_survives_controller_reacquisition", async (t) => {
  const f = await fixture(t), s = await api();
  const first = await f.run(async (scope) => s.describeBusinessConsentCutover(await s.captureBusinessConsentCutover(scope)));
  const second = await f.run(async (scope) => s.describeBusinessConsentCutover(await s.captureBusinessConsentCutover(scope)));
  assert.equal(first.error, null); assert.equal(second.error, null);
  assert.deepEqual(first.value!.blockedReasons, []); assert.equal(first.value!.planHash, second.value!.planHash);
});

test("protected_mutate_revert_invalidates_apply", async (t) => {
  const f = await fixture(t), s = await api();
  const preview = await f.run(async (scope) => s.describeBusinessConsentCutover(await s.captureBusinessConsentCutover(scope)));
  const file = resolve(f.output, "ganomaster-business/index.html"), bytes = await readFile(file);
  await writeFile(file, "changed"); await writeFile(file, bytes);
  const applied = await f.run((scope) => s.applyBusinessConsentCutover(scope, preview.value!.planHash));
  assert.match(String(applied.error), /BUSINESS_CUTOVER_PLAN_MISMATCH/);
  assert.equal((await maintenance.readBusinessCutoverStatus(f.output)).migrationStarted, false);
});

test("protected_hardlink_artifact_is_not_approved", async (t) => {
  const f = await fixture(t), s = await api();
  const file = resolve(f.staging, "index.html"), alias = resolve(f.root, "shared-artifact.html");
  await copyFile(file, alias); await unlink(file); await link(alias, file);
  const result = await f.run((scope) => s.captureBusinessConsentCutover(scope));
  assert.match(String(result.error), /BUSINESS_CUTOVER_ARTIFACTS_UNAVAILABLE/);
});

test("drift_while_binding_prevents_start_and_package_writes", async (t) => {
  const f = await fixture(t), s = await api();
  const preview = await f.run(async (scope) => s.describeBusinessConsentCutover(await s.captureBusinessConsentCutover(scope)));
  const originalOpen = fs.open; let changed = false;
  t.mock.method(fs, "open", async (...args: Parameters<typeof fs.open>) => {
    const handle = await originalOpen(...args);
    if (String(args[0]).endsWith("migration-plan.json") && typeof args[1] === "number" && (args[1] & 1) === 1) {
      const originalWrite = handle.writeFile.bind(handle);
      t.mock.method(handle, "writeFile", async (...writeArgs: Parameters<typeof handle.writeFile>) => {
        const result = await originalWrite(...writeArgs);
        const file = resolve(f.staging, "index.html"), bytes = await readFile(file);
        await writeFile(file, "changed"); await writeFile(file, bytes); changed = true; return result;
      });
    }
    return handle;
  });
  syncBuiltinESMExports();
  const result = await f.run((scope) => s.applyBusinessConsentCutover(scope, preview.value!.planHash));
  assert.equal(changed, true); assert.match(String(result.error), /BUSINESS_CUTOVER_PLAN_MISMATCH/);
  assert.equal((await maintenance.readBusinessCutoverStatus(f.output)).migrationStarted, false);
  assert.equal((await captureBusinessMasterTree(resolve(f.output, "ganomaster-business"))).hash, oldHash);
});

test("migration_retains_closure_on_success", async (t) => {
  const f = await fixture(t), s = await api();
  const protectedBefore = { history: await readFile(f.history), refresh: await readFile(f.refresh), archive: await captureBusinessMasterTree(f.archive) };
  const preview = await f.run(async (scope) => s.describeBusinessConsentCutover(await s.captureBusinessConsentCutover(scope)));
  const applied = await f.run((scope) => s.applyBusinessConsentCutover(scope, preview.value!.planHash));
  assert.equal(applied.error, null); assert.equal(applied.value!.outcome, "APPLIED");
  const state = await maintenance.readBusinessCutoverStatus(f.output);
  assert.equal(state.status, "DRAINED"); assert.equal(state.migrationStarted, true);
  assert.deepEqual(await readFile(f.history), protectedBefore.history); assert.deepEqual(await readFile(f.refresh), protectedBefore.refresh);
  assert.deepEqual(await captureBusinessMasterTree(f.archive), protectedBefore.archive);
  assert.equal((await captureBusinessMasterTree(resolve(f.output, ".master-package-archives/CDX-20261021-009/ganomaster-business"))).hash, oldHash);
  const audit = JSON.parse(await readFile(resolve(f.output, ".master-package-audits/CDX-20261021-009/migration.json"), "utf8"));
  assert.equal(audit.planMaterial.schemaVersion, 2); assert.equal(audit.planMaterial.cutover.operationId, f.id);
  const legacyRead = await readBusinessConsentMasterMigration({ outputRoot: f.output, templateDirectory: f.staging }) as { outcome: string };
  assert.equal(legacyRead.outcome, "BLOCKED");
  const readback = await f.run((scope) => s.readBusinessConsentCutover(scope));
  assert.equal(readback.error, null); assert.equal(readback.value!.journalHash, applied.value!.journalHash);
  const replay = await f.run((scope) => s.applyBusinessConsentCutover(scope, preview.value!.planHash));
  assert.ok(replay.error); assert.equal((await maintenance.readBusinessCutoverStatus(f.output)).migrationStarted, true);
});

test("migration_retains_closure_on_success_and_each_error", async (t) => {
  // Missing an authority assertion/replacing the retained-claim cleanup branch
  // would either write before START or remove the closure in one of these paths.
  const faults = [
    { name: "stage-mkdir", method: "mkdir", matches: (p: string) => p.endsWith(".staging") },
    { name: "stage-file", method: "writeFile", matches: (p: string) => p.includes(".staging") && p.endsWith("index.html") },
    { name: "reservation", method: "writeFile", matches: (p: string) => p.endsWith("ganomaster-business.reservation.json") },
    { name: "archive-copy", method: "writeFile", matches: (p: string) => p.includes("CDX-20261021-009") && p.endsWith("index.html") },
    { name: "first-rename", method: "rename", matches: (p: string) => p.endsWith("ganomaster-business") },
    { name: "second-rename", method: "rename", matches: (p: string) => p.endsWith("package") },
    { name: "journal-link", method: "link", matches: (p: string) => p.endsWith(".tmp") },
    { name: "cleanup-backup", method: "rm", matches: (p: string) => p.endsWith(".previous") },
  ] as const;
  for (const fault of faults) await t.test(fault.name, async (st) => {
    const f = await fixture(st), s = await api();
    const before = await captureBusinessMasterTree(resolve(f.output, ".master-package-claims/ganomaster-business"));
    const protectedBefore = [await readFile(f.history), await readFile(f.refresh), await captureBusinessMasterTree(f.archive)];
    const preview = await f.run(async (scope) => s.describeBusinessConsentCutover(await s.captureBusinessConsentCutover(scope)));
    const original = fs[fault.method]; let injected = false;
    st.mock.method(fs, fault.method, async (...args: unknown[]) => {
      if (!injected && fault.matches(String(args[0]))) {
        injected = true;
        const events = resolve(f.output, ".business-cutover-operations", f.id, "events");
        const records = await Promise.all((await readdir(events)).map((name) => readFile(resolve(events, name), "utf8")));
        assert.ok(records.some((value) => JSON.parse(value).kind === "MIGRATION_STARTED"), "package writes must follow durable start");
        throw new Error("INJECTED_" + fault.name);
      }
      return Reflect.apply(original, fs, args);
    });
    syncBuiltinESMExports();
    const applied = await f.run((scope) => s.applyBusinessConsentCutover(scope, preview.value!.planHash));
    assert.equal(injected, true); assert.match(String(applied.error), /BUSINESS_CUTOVER_ARTIFACTS_UNAVAILABLE/);
    assert.deepEqual(await captureBusinessMasterTree(resolve(f.output, ".master-package-claims/ganomaster-business")), before);
    assert.deepEqual([await readFile(f.history), await readFile(f.refresh), await captureBusinessMasterTree(f.archive)], protectedBefore);
    assert.equal((await maintenance.readBusinessCutoverStatus(f.output)).migrationStarted, true);
    const replay = await f.run((scope) => s.applyBusinessConsentCutover(scope, preview.value!.planHash));
    assert.match(String(replay.error), /BUSINESS_CUTOVER_PLAN_MISMATCH/);
  });
});

test("readback_after_deploy_does_not_require_prior_staging_overlay", async (t) => {
  const f = await fixture(t), s = await api();
  const preview = await f.run(async (scope) => s.describeBusinessConsentCutover(await s.captureBusinessConsentCutover(scope)));
  assert.equal((await f.run((scope) => s.applyBusinessConsentCutover(scope, preview.value!.planHash))).error, null);
  await rm(f.staging, { recursive: true });
  assert.equal((await f.run((scope) => s.readBusinessConsentCutover(scope))).error, null);
  await writeFile(resolve(f.output, "ganomaster-business/config.js"), "unreviewed");
  assert.match(String((await f.run((scope) => s.readBusinessConsentCutover(scope))).error), /BUSINESS_CUTOVER_ARTIFACTS_UNAVAILABLE/);
});

test("readback_requires_durable_migration_started_even_with_complete_package", async (t) => {
  const f = await fixture(t), s = await api();
  const preview = await f.run(async (scope) => s.describeBusinessConsentCutover(await s.captureBusinessConsentCutover(scope)));
  assert.equal((await f.run((scope) => s.applyBusinessConsentCutover(scope, preview.value!.planHash))).error, null);
  const events = resolve(f.output, ".business-cutover-operations", f.id, "events");
  for (const name of await readdir(events)) {
    const file = resolve(events, name);
    if (JSON.parse(await readFile(file, "utf8")).kind === "MIGRATION_STARTED") await unlink(file);
  }
  const result = await f.run((scope) => s.readBusinessConsentCutover(scope));
  assert.match(String(result.error), /BUSINESS_CUTOVER_ARTIFACTS_UNAVAILABLE/);
});

test("protected_mutate_revert_during_staging_stops_before_next_write", async (t) => {
  const f = await fixture(t), s = await api();
  const preview = await f.run(async (scope) => s.describeBusinessConsentCutover(await s.captureBusinessConsentCutover(scope)));
  const original = fs.writeFile; let changed = false, wroteAfterDrift = false;
  t.mock.method(fs, "writeFile", async (...args: Parameters<typeof fs.writeFile>) => {
    if (String(args[0]).includes(".staging") && String(args[0]).endsWith("owner.json")) {
      const result = await original(...args);
      const file = resolve(f.staging, "index.html"), bytes = await readFile(file);
      await original(file, "changed"); await original(file, bytes); changed = true;
      return result;
    }
    if (changed && String(args[0]).includes(".staging")) wroteAfterDrift = true;
    return original(...args);
  });
  syncBuiltinESMExports();
  const result = await f.run((scope) => s.applyBusinessConsentCutover(scope, preview.value!.planHash));
  assert.equal(changed, true); assert.ok(result.error); assert.equal(wroteAfterDrift, false);
  assert.equal((await maintenance.readBusinessCutoverStatus(f.output)).migrationStarted, true);
});

test("installed_mutate_revert_after_journal_link_stops_next_cleanup_write", async (t) => {
  const f = await fixture(t), s = await api();
  const preview = await f.run(async (scope) => s.describeBusinessConsentCutover(await s.captureBusinessConsentCutover(scope)));
  const originalLink = fs.link, originalRm = fs.rm; let changed = false, cleanedAfterDrift = false;
  t.mock.method(fs, "link", async (...args: Parameters<typeof fs.link>) => {
    const result = await originalLink(...args);
    if (String(args[1]).endsWith("migration.json")) {
      const file = resolve(f.output, "ganomaster-business/index.html"), bytes = await readFile(file);
      await writeFile(file, "changed"); await writeFile(file, bytes); changed = true;
    }
    return result;
  });
  t.mock.method(fs, "rm", async (...args: Parameters<typeof fs.rm>) => {
    if (changed) cleanedAfterDrift = true;
    return originalRm(...args);
  });
  syncBuiltinESMExports();
  const result = await f.run((scope) => s.applyBusinessConsentCutover(scope, preview.value!.planHash));
  assert.equal(changed, true); assert.ok(result.error); assert.equal(cleanedAfterDrift, false);
  assert.equal((await maintenance.readBusinessCutoverStatus(f.output)).migrationStarted, true);
});

test("public009_apply_still_rejects", async (t) => {
  const f = await fixture(t);
  const options = { outputRoot: f.output, templateDirectory: f.staging };
  const preview = await planBusinessConsentMasterMigration(options);
  await assert.rejects(applyBusinessConsentMasterMigration({ ...options, mode: APPLY_MODE, confirmation: APPLY_CONFIRMATION, expectedPlanHash: preview.planHash }), /WRITER_EXCLUSION_UNPROVEN/);
});

for (const setup of ["missing", "non20", "unavailable"] as const) {
  test(`required_node20_runtime_rejects_${setup}_configuration`, () => {
    const environment = { ...process.env };
    delete environment.NODE_TEST_CONTEXT; // run a real isolated test runner, not its parent's child mode
    if (setup === "missing") delete environment.BUSINESS_CUTOVER_TEST_NODE20;
    else if (setup === "non20") {
      assert.notEqual(process.versions.node.split(".")[0], "20", "Run this TypeScript test harness on Node24 as prescribed");
      environment.BUSINESS_CUTOVER_TEST_NODE20 = process.execPath;
    } else environment.BUSINESS_CUTOVER_TEST_NODE20 = resolve(tmpdir(), "cdx011-missing-runtime", "node-does-not-exist");
    const probe = spawnSync(process.execPath, ["--conditions=react-server", "--experimental-strip-types",
      "--experimental-loader", "./scripts/node-test-alias-loader.mjs", "--test",
      "--test-name-pattern=^legacy_node20_path_does_not_import_ts$", import.meta.filename],
    { encoding: "utf8", env: environment });
    assert.match(probe.stdout + probe.stderr, /legacy_node20_path_does_not_import_ts/);
    assert.equal(probe.status, 1, `Required gate must fail setup for ${setup} configuration, not skip/fallback`);
    assert.match(probe.stdout + probe.stderr, /Set BUSINESS_CUTOVER_TEST_NODE20/);
    assert.match(probe.stdout + probe.stderr, /Node\.js (?:major )?20/);
  });
}

test("legacy_node20_path_does_not_import_ts", async (t) => {
  const setup = "Set BUSINESS_CUTOVER_TEST_NODE20 to an available Node.js major 20 executable before running this required compatibility gate";
  const node20 = process.env.BUSINESS_CUTOVER_TEST_NODE20;
  assert.ok(typeof node20 === "string", setup);
  assert.ok(node20.trim(), setup);
  const version = spawnSync(node20, ["--version"], { encoding: "utf8", timeout: 10000 });
  assert.equal(version.error, undefined, setup);
  assert.equal(version.status, 0, setup);
  assert.match(version.stdout.trim(), /^v20\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/, setup);
  const directory = await mkdtemp(resolve(tmpdir(), "cdx011-node20-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  for (const file of ["business-consent-master-package-migration.mjs", "business-consent-master-release.mjs", "business-master-transition-lifecycle.mjs"])
    await copyFile(resolve(repo, "app/web/scripts", file), resolve(directory, file));
  const result = spawnSync(node20, [resolve(directory, "business-consent-master-package-migration.mjs")], { encoding: "utf8", env: { ...process.env, PRODUCT_PAGE_OUTPUT_DIR: resolve(directory, "absent") } });
  assert.equal(result.status, 2, result.stderr); assert.equal(JSON.parse(result.stdout).mode, "PREVIEW");
  assert.doesNotMatch(result.stderr, /ERR_UNKNOWN_FILE_EXTENSION|\.ts/);
  const legacyOutput = resolve(directory, "output"), claimDirectory = resolve(legacyOutput, ".master-package-claims/ganomaster-business");
  await mkdir(claimDirectory, { recursive: true });
  const source = `import {executeBusinessMasterTransition} from ${JSON.stringify(pathToFileURL(resolve(directory, "business-master-transition-lifecycle.mjs")).href)};
    try { await executeBusinessMasterTransition(${JSON.stringify({ options: {}, paths: { outputRoot: legacyOutput, claimDirectory }, preview: { planHash: "a".repeat(64) } })}); }
    catch (error) { console.log(error.message); }`;
  const direct = spawnSync(node20, ["--input-type=module", "-e", source], { encoding: "utf8" });
  assert.equal(direct.status, 0, direct.stderr);
  assert.equal(direct.stdout.trim(), "BUSINESS_MASTER_PACKAGE_REFRESH_CLAIM_PRESENT");
  assert.equal(direct.stderr, "");
});
