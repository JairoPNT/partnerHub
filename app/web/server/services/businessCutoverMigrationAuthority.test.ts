import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import { resolve } from "node:path";
import { syncBuiltinESMExports } from "node:module";
import test from "node:test";
import * as maintenance from "./businessCutoverMaintenanceService.ts";
import { resumeBusinessCutoverClosure } from "./businessCutoverClaimStore.ts";
import { executeBusinessMasterTransition, captureBusinessMasterTree } from "../../scripts/business-master-transition-lifecycle.mjs";
import { api, fixture } from "./businessConsentCutoverMigration.test-fixtures.ts";

test("scope_and_capture_data_never_grant_migration_authority", async (t) => {
  const f = await fixture(t), s = await api();
  for (const fake of [{}, { operationId: f.id }, JSON.parse("{}")]) {
    await assert.rejects(s.captureBusinessConsentCutover(fake as never), /BUSINESS_CUTOVER_CLOSED/);
    await assert.rejects(s.applyBusinessConsentCutover(fake as never, "a".repeat(64)), /BUSINESS_CUTOVER_CLOSED/);
    await assert.rejects(s.readBusinessConsentCutover(fake as never), /BUSINESS_CUTOVER_CLOSED/);
    assert.throws(() => s.describeBusinessConsentCutover(fake as never), /BUSINESS_CUTOVER_CLOSED/);
  }
  await f.run(async (scope) => {
    const capture = await s.captureBusinessConsentCutover(scope);
    assert.equal(JSON.stringify(capture), "{}");
    assert.deepEqual(Object.keys(s.describeBusinessConsentCutover(capture)).sort(), ["blockedReasons", "planHash"]);
    assert.throws(() => s.describeBusinessConsentCutover(JSON.parse(JSON.stringify(capture))), /BUSINESS_CUTOVER_CLOSED/);
  });
});

test("binding_hash_alone_does_not_approve_invented_profile", async (t) => {
  for (const id of ["caller-invented-v1", "business-consent-successor-v1"]) await t.test(id, async (st) => {
    const f = await fixture(st), s = await api();
    const material = Buffer.from('{"schemaVersion":2}');
    const result = await f.run(async (scope) => {
      await maintenance.bindBusinessCutoverMigration(scope, { releaseId: id, material, planHash: createHash("sha256").update(material).digest("hex") });
      return s.readBusinessConsentCutover(scope);
    });
    assert.match(String(result.error), /BUSINESS_CUTOVER_PROFILE_INVALID/);
  });
});

test("fake_or_expired_permit_never_writes", async (t) => {
  const f = await fixture(t), s = await api();
  const authority = await import("./businessCutoverMigrationAuthority.ts");
  for (const fake of [{}, Object.freeze(Object.create(null)), { outputDirectory: f.output }]) {
    await assert.rejects(authority.assertBusinessCutoverMigrationPermit(fake as never), /BUSINESS_CUTOVER_CLOSED/);
    const before = await captureBusinessMasterTree(f.output);
    await assert.rejects(executeBusinessMasterTransition({ cutoverPermit: fake } as never), /BUSINESS_CUTOVER_CLOSED/);
    await assert.rejects(executeBusinessMasterTransition(Object.assign(Object.create({ cutoverPermit: fake }), {
      options: {}, paths: { outputRoot: f.output, claimDirectory: resolve(f.output, ".master-package-claims/ganomaster-business") },
      preview: { planHash: "a".repeat(64) }
    })), /BUSINESS_CUTOVER_CLOSED/);
    assert.deepEqual(await captureBusinessMasterTree(f.output), before);
  }
  let expired!: maintenance.BusinessCutoverExclusiveScope;
  await f.run(async (scope) => { expired = scope; });
  await assert.rejects(s.captureBusinessConsentCutover(expired), /BUSINESS_CUTOVER_CLOSED/);
});

test("genuine_permit_is_adapter_bound_and_expires_after_apply", async (t) => {
  const f = await fixture(t), s = await api();
  const authority = await import("./businessCutoverMigrationAuthority.ts");
  let adapter: Parameters<typeof executeBusinessMasterTransition>[0] | undefined;
  const originalFreeze = Object.freeze;
  t.mock.method(Object, "freeze", (value: object) => {
    if (value && Object.hasOwn(value, "cutoverPermit")) adapter = value;
    return originalFreeze(value);
  });
  const originalMkdir = fs.mkdir; let checked = false;
  t.mock.method(fs, "mkdir", async (...args: Parameters<typeof fs.mkdir>) => {
    if (String(args[0]).endsWith(".staging")) {
      assert.ok(adapter); checked = true;
      const permit = adapter.cutoverPermit as Parameters<typeof authority.assertBusinessCutoverMigrationPermit>[0];
      await authority.assertBusinessCutoverMigrationPermit(permit);
      await assert.rejects(executeBusinessMasterTransition({ ...adapter }), /BUSINESS_CUTOVER_CLOSED/);
      const otherCopy = await import(`./businessCutoverMigrationAuthority.ts?copy=${randomUUID()}`);
      await assert.rejects(otherCopy.assertBusinessCutoverMigrationPermit(permit), /BUSINESS_CUTOVER_CLOSED/);
    }
    return originalMkdir(...args);
  });
  syncBuiltinESMExports();
  const preview = await f.run(async (scope) => s.describeBusinessConsentCutover(await s.captureBusinessConsentCutover(scope)));
  const result = await f.run((scope) => s.applyBusinessConsentCutover(scope, preview.value!.planHash));
  assert.equal(result.error, null); assert.equal(checked, true); assert.ok(adapter);
  const before = await captureBusinessMasterTree(f.output);
  await assert.rejects(authority.assertBusinessCutoverMigrationPermit(adapter.cutoverPermit as never), /BUSINESS_CUTOVER_CLOSED/);
  await assert.rejects(executeBusinessMasterTransition(adapter), /BUSINESS_CUTOVER_CLOSED/);
  assert.deepEqual(await captureBusinessMasterTree(f.output), before);
});

test("detached_apply_io_drains_before_next_exclusive_scope", async (t) => {
  const f = await fixture(t), s = await api();
  const preview = await f.run(async (scope) => s.describeBusinessConsentCutover(await s.captureBusinessConsentCutover(scope)));
  let enter!: () => void, release!: () => void;
  const entered = new Promise<void>((done) => { enter = done; });
  const leave = new Promise<void>((done) => { release = done; });
  const originalWrite = fs.writeFile;
  let blocked = false, ioSettled = false, nextEntered = false;
  t.mock.method(fs, "writeFile", async (...args: Parameters<typeof fs.writeFile>) => {
    if (!blocked && String(args[0]).includes(".staging") && String(args[0]).endsWith("index.html")) {
      blocked = true; enter(); await leave;
      const result = await originalWrite(...args); ioSettled = true; return result;
    }
    return originalWrite(...args);
  });
  syncBuiltinESMExports();
  let detached!: Promise<unknown>;
  await maintenance.withBusinessCutoverController(await resumeBusinessCutoverClosure(f.output, f.id), async (control) => {
    await maintenance.drainBusinessCutover(control, 0);
    const first = maintenance.withBusinessCutoverExclusive(control, async (scope) => {
      detached = s.applyBusinessConsentCutover(scope, preview.value!.planHash).catch((error) => error);
      await entered;
    });
    await entered;
    const next = maintenance.withBusinessCutoverExclusive(control, async () => { nextEntered = true; assert.equal(ioSettled, true); });
    await new Promise<void>((done) => setImmediate(done)); assert.equal(nextEntered, false);
    release(); await Promise.all([first, next]);
  });
  assert.equal(nextEntered, true); assert.match(String(await detached), /BUSINESS_CUTOVER_CLOSED/);
  assert.equal((await maintenance.readBusinessCutoverStatus(f.output)).migrationStarted, true);
});
