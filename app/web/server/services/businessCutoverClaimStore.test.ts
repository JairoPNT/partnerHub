import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { link, lstat, mkdir, mkdtemp, readFile, readdir, rename, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import type { TestContext } from "node:test";
import type { BusinessCutoverHandle } from "./businessCutoverClaimStore.ts";

// Missing implementation is an assertion about missing exports during RED, not an
// environment/module-loader failure. No production substitute or mock is used.
const store = await import("./businessCutoverClaimStore.ts").catch((error: NodeJS.ErrnoException) => {
  if (error.code === "ERR_MODULE_NOT_FOUND" && error.message.includes("businessCutoverClaimStore.ts")) return {};
  throw error;
});
function api() {
  for (const name of ["inspectBusinessGlobalClosure", "acquireBusinessCutoverClosure",
    "resumeBusinessCutoverClosure", "assertBusinessCutoverOwnership"] as const) {
    assert.equal(typeof (store as Record<string, unknown>)[name], "function", `missing export: ${name}`);
  }
  return store as typeof import("./businessCutoverClaimStore.ts");
}

async function fixture(t: TestContext) {
  const directory = await mkdtemp(resolve(tmpdir(), "business-cutover-store-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}
const claimPath = (output: string) => resolve(output, ".master-package-claims", "ganomaster-business");
const operationPath = (output: string, id: string) => resolve(output, ".business-cutover-operations", id);

test("status_is_read_only", async (t) => {
  const { inspectBusinessGlobalClosure } = api();
  const output = await fixture(t);
  const before = await readdir(output);
  assert.equal(await inspectBusinessGlobalClosure(output), "OPEN");
  assert.equal(await inspectBusinessGlobalClosure(resolve(output, "absent", "nested")), "OPEN");
  assert.deepEqual(await readdir(output), before);
  await assert.rejects(lstat(resolve(output, "absent")), { code: "ENOENT" });
});

test("existing_global_claim_is_never_replaced", async (t) => {
  const { acquireBusinessCutoverClosure, inspectBusinessGlobalClosure } = api();
  const output = await fixture(t);
  const claim = claimPath(output);
  await mkdir(claim, { recursive: true });
  const marker = resolve(claim, "owner.json");
  await writeFile(marker, "foreign owner from 2000, not a lease");
  const directoryIdentity = await lstat(claim, { bigint: true });
  const markerIdentity = await lstat(marker, { bigint: true });
  assert.equal(await inspectBusinessGlobalClosure(output), "CLOSED");
  await assert.rejects(acquireBusinessCutoverClosure(output, randomUUID()), /BUSINESS_CUTOVER_CLOSED/);
  assert.equal((await lstat(claim, { bigint: true })).ino, directoryIdentity.ino);
  assert.equal((await lstat(marker, { bigint: true })).ino, markerIdentity.ino);
  assert.equal(await readFile(marker, "utf8"), "foreign owner from 2000, not a lease");
});

test("same_bytes_replaced_inode_is_not_owned", async (t) => {
  const { acquireBusinessCutoverClosure, assertBusinessCutoverOwnership, resumeBusinessCutoverClosure } = api();
  const output = await fixture(t);
  const id = randomUUID();
  const handle = await acquireBusinessCutoverClosure(output, id);
  const marker = resolve(claimPath(output), "owner.json");
  const bytes = await readFile(marker);
  const before = await lstat(marker, { bigint: true });
  // Retain old inode so the filesystem cannot reuse it for the replacement.
  await rename(marker, resolve(output, "displaced-owner"));
  await writeFile(marker, bytes, { flag: "wx", mode: 0o600 });
  assert.notEqual((await lstat(marker, { bigint: true })).ino, before.ino);
  await assert.rejects(assertBusinessCutoverOwnership(handle), /BUSINESS_CUTOVER_CLOSED/);
  await assert.rejects(resumeBusinessCutoverClosure(output, id), /BUSINESS_CUTOVER_CLOSED/);
  assert.deepEqual(await readFile(marker), bytes);
});

test("symlink_hardlink_or_corrupt_marker_fails_closed", async (t) => {
  const { acquireBusinessCutoverClosure, assertBusinessCutoverOwnership, resumeBusinessCutoverClosure } = api();
  for (const damage of ["hardlink", "corrupt", "symlink"] as const) {
    const output = await fixture(t);
    const id = randomUUID();
    const handle = await acquireBusinessCutoverClosure(output, id);
    const claim = claimPath(output);
    const marker = resolve(claim, "owner.json");
    if (damage === "hardlink") await link(marker, resolve(output, "linked-owner"));
    if (damage === "corrupt") await writeFile(marker, "{}");
    if (damage === "symlink") {
      const displaced = resolve(output, "displaced-claim");
      await rename(claim, displaced);
      await symlink(displaced, claim, process.platform === "win32" ? "junction" : "dir");
    }
    await assert.rejects(assertBusinessCutoverOwnership(handle), /BUSINESS_CUTOVER_CLOSED/);
    await assert.rejects(resumeBusinessCutoverClosure(output, id), /BUSINESS_CUTOVER_CLOSED/);
    assert.ok(await lstat(claim)); // Never clean up foreign/ambiguous evidence.
  }
});

test("serialized_handle_cannot_restore_authority", async (t) => {
  const { acquireBusinessCutoverClosure, assertBusinessCutoverOwnership } = api();
  const output = await fixture(t);
  const handle = await acquireBusinessCutoverClosure(output, randomUUID());
  await assertBusinessCutoverOwnership(handle);
  const serialized = JSON.stringify(handle);
  assert.equal(serialized, "{}");
  for (const forged of [JSON.parse(serialized), { ...handle }, Object.create(handle), null, "{}"]) {
    await assert.rejects(assertBusinessCutoverOwnership(forged as BusinessCutoverHandle), /BUSINESS_CUTOVER_CLOSED/);
  }
});

test("credential_and_registry_substitution_or_tampering_loses_authority", async (t) => {
  const { acquireBusinessCutoverClosure, resumeBusinessCutoverClosure, assertBusinessCutoverOwnership } = api();
  for (const file of ["credential", "record.json"] as const) {
    for (const replacement of [false, true]) {
      const output = await fixture(t);
      const id = randomUUID();
      const handle = await acquireBusinessCutoverClosure(output, id);
      const path = resolve(operationPath(output, id), file);
      const bytes = await readFile(path);
      if (replacement) await rename(path, resolve(output, `displaced-${file}`));
      await writeFile(path, replacement ? bytes : Buffer.alloc(bytes.length, 0x61), { mode: 0o600 });
      await assert.rejects(assertBusinessCutoverOwnership(handle), /BUSINESS_CUTOVER_CLOSED/);
      await assert.rejects(resumeBusinessCutoverClosure(output, id), /BUSINESS_CUTOVER_CLOSED/);
    }
  }
});

test("replaced_claim_directory_or_ancestor_loses_authority_even_with_original_files", async (t) => {
  const { acquireBusinessCutoverClosure, assertBusinessCutoverOwnership, resumeBusinessCutoverClosure } = api();
  for (const target of ["claim", "namespace", "output", "operations", "operation"] as const) {
    const directory = await fixture(t);
    const output = resolve(directory, "output");
    await mkdir(output);
    const id = randomUUID();
    const handle = await acquireBusinessCutoverClosure(output, id);
    const path = target === "claim" ? claimPath(output) : target === "namespace" ? resolve(output, ".master-package-claims")
      : target === "operations" ? resolve(output, ".business-cutover-operations") : target === "operation" ? operationPath(output, id) : output;
    const displaced = resolve(directory, `displaced-${target}`);
    await rename(path, displaced);
    await mkdir(path);
    for (const name of await readdir(displaced)) await rename(resolve(displaced, name), resolve(path, name));
    await assert.rejects(assertBusinessCutoverOwnership(handle), /BUSINESS_CUTOVER_CLOSED/);
    await assert.rejects(resumeBusinessCutoverClosure(output, id), /BUSINESS_CUTOVER_CLOSED/);
  }
});

test("fresh_process_resumes_same_output_subtree_after_outer_ancestor_replacement", async (t) => {
  const s = api(); const root = await fixture(t); const outer = resolve(root, "container");
  const output = resolve(outer, "output"); await mkdir(output, { recursive: true });
  const id = randomUUID(); const handle = await s.acquireBusinessCutoverClosure(output, id);
  const outputBefore = await lstat(output, { bigint: true }); const outerBefore = await lstat(outer, { bigint: true });
  const record = resolve(operationPath(output, id), "record.json"); const bytes = await readFile(record);
  await rename(output, resolve(root, "parked-volume"));
  await rename(outer, resolve(root, "retained-container")); await mkdir(outer);
  await rename(resolve(root, "parked-volume"), output);
  assert.notEqual((await lstat(outer, { bigint: true })).ino, outerBefore.ino);
  assert.equal((await lstat(output, { bigint: true })).ino, outputBefore.ino);
  const child = await promisify(execFile)(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e",
    `const s=await import(${JSON.stringify(new URL("./businessCutoverClaimStore.ts", import.meta.url).href)});const h=await s.resumeBusinessCutoverClosure(process.argv[1],process.argv[2]);await s.assertBusinessCutoverOwnership(h);await s.assertBusinessCutoverOwnership(await s.readBusinessCutoverClosure(process.argv[1]));`, output, id]);
  assert.equal(child.stdout, "");
  await s.assertBusinessCutoverOwnership(handle);
  assert.deepEqual(await readFile(record), bytes);
  assert.equal(await s.inspectBusinessGlobalClosure(output), "CLOSED");
});

test("retained_volume_rejects_linked_outer_ancestor_and_changed_canonical_path", async (t) => {
  const s = api(); const root = await fixture(t); const outer = resolve(root, "container");
  const output = resolve(outer, "output"); await mkdir(output, { recursive: true });
  const id = randomUUID(); await s.acquireBusinessCutoverClosure(output, id);
  const displaced = resolve(root, "moved-container"); await rename(outer, displaced);
  await assert.rejects(s.resumeBusinessCutoverClosure(resolve(displaced, "output"), id), /BUSINESS_CUTOVER_CLOSED/);
  await symlink(displaced, outer, process.platform === "win32" ? "junction" : "dir");
  await assert.rejects(s.resumeBusinessCutoverClosure(output, id), /BUSINESS_CUTOVER_CLOSED/);
  await assert.rejects(s.inspectBusinessGlobalClosure(output), /BUSINESS_CUTOVER_CLOSED/);
});

test("legacy_outer_pin_record_is_rejected_without_rewriting_or_upgrading", async (t) => {
  const s = api(); const output = await fixture(t); const id = randomUUID(); await s.acquireBusinessCutoverClosure(output, id);
  const path = resolve(operationPath(output, id), "record.json");
  const record = JSON.parse(await readFile(path, "utf8")); const ancestors = [];
  for (let ancestor = dirname(output);; ancestor = dirname(ancestor)) {
    const stat = await lstat(ancestor, { bigint: true });
    ancestors.unshift({ path: ancestor, identity: { dev: String(stat.dev), ino: String(stat.ino), birthtimeNs: String(stat.birthtimeNs) } });
    if (dirname(ancestor) === ancestor) break;
  }
  record.version = 1; record.directories = [...ancestors, ...record.directories];
  const bytes = Buffer.from(JSON.stringify(record)); await writeFile(path, bytes);
  const markerPath = resolve(claimPath(output), "owner.json");
  const marker = Buffer.from(JSON.stringify({ version: 1, operationId: id, credentialDigest: record.credentialDigest,
    record: record.record, recordDigest: createHash("sha256").update(bytes).digest("hex") }));
  await writeFile(markerPath, marker);
  await assert.rejects(s.resumeBusinessCutoverClosure(output, id), /BUSINESS_CUTOVER_CLOSED/);
  await assert.rejects(s.readBusinessCutoverClosure(output), /BUSINESS_CUTOVER_CLOSED/);
  assert.deepEqual(await readFile(path), bytes); assert.deepEqual(await readFile(markerPath), marker);
  assert.equal(await s.inspectBusinessGlobalClosure(output), "CLOSED");
});

test("missing_descendant_of_symlink_is_not_open_and_status_does_not_write", async (t) => {
  const { inspectBusinessGlobalClosure, acquireBusinessCutoverClosure } = api();
  const directory = await fixture(t);
  const destination = resolve(directory, "destination");
  const alias = resolve(directory, "alias");
  await mkdir(destination);
  await symlink(destination, alias, process.platform === "win32" ? "junction" : "dir");
  const throughLink = resolve(alias, "missing", "output");
  await assert.rejects(inspectBusinessGlobalClosure(throughLink), /BUSINESS_CUTOVER_CLOSED/);
  await assert.rejects(acquireBusinessCutoverClosure(throughLink, randomUUID()), /BUSINESS_CUTOVER_CLOSED/);
  assert.deepEqual(await readdir(destination), []);
});

test("canonical_operation_id_and_existing_volume_are_required_without_writes", async (t) => {
  const { acquireBusinessCutoverClosure, resumeBusinessCutoverClosure } = api();
  const output = await fixture(t);
  for (const id of ["", "../escape", randomUUID().toUpperCase(), "not-a-uuid"]) {
    await assert.rejects(acquireBusinessCutoverClosure(output, id), /BUSINESS_CUTOVER_CLOSED/);
    await assert.rejects(resumeBusinessCutoverClosure(output, id), /BUSINESS_CUTOVER_CLOSED/);
  }
  await assert.rejects(acquireBusinessCutoverClosure(resolve(output, "absent"), randomUUID()), /BUSINESS_CUTOVER_CLOSED/);
  await assert.rejects(resumeBusinessCutoverClosure(output, randomUUID()), /BUSINESS_CUTOVER_CLOSED/);
  assert.deepEqual(await readdir(output), []);
});

test("private_credential_resumes_after_process_exit_without_serialized_authority", async (t) => {
  const { acquireBusinessCutoverClosure, assertBusinessCutoverOwnership, inspectBusinessGlobalClosure } = api();
  const output = await fixture(t);
  const id = randomUUID();
  const handle = await acquireBusinessCutoverClosure(output, id);
  const credential = resolve(operationPath(output, id), "credential");
  assert.equal((await readFile(credential)).length, 32);
  assert.deepEqual(Object.keys(handle), []);
  if (process.platform !== "win32") {
    assert.equal((await lstat(operationPath(output, id))).mode & 0o777, 0o700);
    assert.equal((await lstat(credential)).mode & 0o777, 0o600);
  }
  const moduleUrl = new URL("./businessCutoverClaimStore.ts", import.meta.url).href;
  const child = await promisify(execFile)(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e",
    `const s = await import(${JSON.stringify(moduleUrl)}); const h = await s.resumeBusinessCutoverClosure(process.argv[1], process.argv[2]); await s.assertBusinessCutoverOwnership(h);`, output, id]);
  assert.equal(child.stdout, "");
  // Existing package metadata emits this Node warning; it is not store output.
  const warning = [
    `(node:PID) [MODULE_TYPELESS_PACKAGE_JSON] Warning: Module type of ${moduleUrl} is not specified and it doesn't parse as CommonJS.`,
    "Reparsing as ES module because module syntax was detected. This incurs a performance overhead.",
    `To eliminate this warning, add "type": "module" to ${process.platform === "win32" ? "\\\\?\\" : ""}${resolve("package.json")}.`,
    "(Use `node --trace-warnings ...` to show where the warning was created)",
    ""
  ].join("\n");
  assert.ok(child.stderr === "" || child.stderr.replace(/^\(node:\d+\)/, "(node:PID)") === warning,
    "child stderr must contain only the documented Node package warning");
  assert.equal(await inspectBusinessGlobalClosure(output), "CLOSED");
  await assertBusinessCutoverOwnership(handle);
});

test("simultaneous_acquisition_has_one_owner_and_never_replaces_global_claim", async (t) => {
  const { acquireBusinessCutoverClosure, assertBusinessCutoverOwnership } = api();
  const output = await fixture(t);
  const results = await Promise.allSettled([acquireBusinessCutoverClosure(output, randomUUID()), acquireBusinessCutoverClosure(output, randomUUID())]);
  const winners = results.filter((result) => result.status === "fulfilled");
  assert.equal(winners.length, 1);
  assert.equal(results.filter((result) => result.status === "rejected").length, 1);
  await assertBusinessCutoverOwnership(winners[0].value);
});

test("controller_metadata_discovery_requires_private_physical_ownership", async (t) => {
  const s = api() as typeof import("./businessCutoverClaimStore.ts");
  assert.equal(typeof s.getBusinessCutoverOperation, "function", "missing metadata accessor");
  assert.equal(typeof s.readBusinessCutoverClosure, "function", "missing discovery accessor");
  const output = await fixture(t); const id = randomUUID();
  assert.equal(await s.readBusinessCutoverClosure(output), null);
  const handle = await s.acquireBusinessCutoverClosure(output, id);
  const metadata = await s.getBusinessCutoverOperation(handle);
  assert.equal(metadata.outputDirectory, output); assert.equal(metadata.operationId, id);
  assert.equal(metadata.operationDirectory, operationPath(output, id));
  assert.match(metadata.recordDigest, /^[0-9a-f]{64}$/);
  assert.ok(Object.isFrozen(metadata));
  await s.assertBusinessCutoverOwnership((await s.readBusinessCutoverClosure(output))!);
  await assert.rejects(s.getBusinessCutoverOperation(JSON.parse(JSON.stringify(handle))));
  const events = resolve(operationPath(output, id), "events");
  await rename(events, resolve(output, "old-events")); await mkdir(events, { mode: 0o700 });
  await assert.rejects(s.getBusinessCutoverOperation(handle)); await assert.rejects(s.readBusinessCutoverClosure(output));
});

test("partial_or_unsafe_controller_is_closed_and_discovery_never_hides_corruption", async (t) => {
  const s = api() as typeof import("./businessCutoverClaimStore.ts");
  assert.equal(typeof s.readBusinessCutoverClosure, "function", "missing discovery accessor");
  for (const damage of ["partial", "invalid", "hardlink", "unknown", "old-schema"] as const) {
    const output = await fixture(t); const id = randomUUID(); const h = await s.acquireBusinessCutoverClosure(output, id);
    const op = operationPath(output, id); const lock = resolve(op, ".controller");
    if (damage === "old-schema") await rename(resolve(op, "events"), resolve(output, "old-events"));
    else {
      await mkdir(lock, { mode: 0o700 });
      if (damage !== "partial") await writeFile(resolve(lock, "owner.json"), damage === "invalid" ? "{}" : JSON.stringify({ version: 1, operationId: id, token: "a".repeat(64) }), { mode: 0o600 });
      if (damage === "hardlink") await link(resolve(lock, "owner.json"), resolve(output, "linked"));
      if (damage === "unknown") await writeFile(resolve(lock, "unexpected"), "retain");
    }
    await assert.rejects(s.assertBusinessCutoverOwnership(h)); await assert.rejects(s.readBusinessCutoverClosure(output));
    assert.equal(await s.inspectBusinessGlobalClosure(output), "CLOSED");
  }
});
