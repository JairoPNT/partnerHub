import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { link, lstat, mkdir, mkdtemp, readFile, readdir, rename, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
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
  for (const target of ["claim", "namespace", "output"] as const) {
    const directory = await fixture(t);
    const output = resolve(directory, "output");
    await mkdir(output);
    const id = randomUUID();
    const handle = await acquireBusinessCutoverClosure(output, id);
    const path = target === "claim" ? claimPath(output) : target === "namespace" ? resolve(output, ".master-package-claims") : output;
    const displaced = resolve(directory, `displaced-${target}`);
    await rename(path, displaced);
    await mkdir(path);
    for (const name of await readdir(displaced)) await rename(resolve(displaced, name), resolve(path, name));
    await assert.rejects(assertBusinessCutoverOwnership(handle), /BUSINESS_CUTOVER_CLOSED/);
    await assert.rejects(resumeBusinessCutoverClosure(output, id), /BUSINESS_CUTOVER_CLOSED/);
  }
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
