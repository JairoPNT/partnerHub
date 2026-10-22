import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { constants } from "node:fs";
import type { BigIntStats } from "node:fs";
import { lstat, mkdir, open, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export const BUSINESS_CUTOVER_PROTOCOL_VERSION = "business-cutover-v1";

declare const businessCutoverHandleBrand: unique symbol;
export type BusinessCutoverHandle = { readonly [businessCutoverHandleBrand]: true };
export type BusinessCutoverOperation = Readonly<{
  outputDirectory: string; operationId: string; operationDirectory: string; recordDigest: string;
}>;

type Identity = { dev: string; ino: string; birthtimeNs: string };
type DirectoryPin = { path: string; identity: Identity };
type RecordData = {
  version: 1;
  operationId: string;
  credentialDigest: string;
  directories: DirectoryPin[];
  credential: Identity;
  marker: Identity;
  record: Identity;
};
type Ownership = { output: string; operationId: string; recordBytes: Buffer; credential: Buffer };
const handles = new WeakMap<BusinessCutoverHandle, Ownership>();
const noFollow = constants.O_NOFOLLOW ?? 0;
const closed = () => new Error("BUSINESS_CUTOVER_CLOSED");
const digest = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

/*
 * This is a cooperative volume protocol, not a sandbox against root or hostile
 * same-UID processes. Node has no portable openat/dirfd traversal API: lstat,
 * O_NOFOLLOW where supported, descriptor identity and before/after ancestor
 * checks detect substitution, but cannot eliminate every privileged pathname
 * race. Windows directory identity uses lstat (directory opens are unsupported
 * there); POSIX also checks an O_DIRECTORY descriptor. Private modes/UID checks
 * are enforced on POSIX; Windows deployment must supply private volume ACLs.
 * No lease, PID, timestamp, automatic cleanup or release is provided here.
 */

function paths(output: string, operationId: string) {
  const globalRoot = resolve(output, ".master-package-claims");
  const claim = resolve(globalRoot, "ganomaster-business");
  const operations = resolve(output, ".business-cutover-operations");
  const operation = resolve(operations, operationId);
  return { globalRoot, claim, operations, operation,
    credential: resolve(operation, "credential"), record: resolve(operation, "record.json"),
    marker: resolve(claim, "owner.json"), events: resolve(operation, "events"), controller: resolve(operation, ".controller") };
}

function validateOperationId(operationId: string) {
  if (typeof operationId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(operationId)) throw closed();
}

function identity(stat: BigIntStats): Identity {
  if (stat.ino === 0n) throw closed(); // No usable physical identity: never assume ownership.
  return { dev: String(stat.dev), ino: String(stat.ino), birthtimeNs: String(stat.birthtimeNs) };
}

function sameIdentity(actual: Identity, expected: Identity) {
  return actual.dev === expected?.dev && actual.ino === expected?.ino && actual.birthtimeNs === expected?.birthtimeNs;
}

function assertIdentity(stat: BigIntStats, expected: Identity) {
  if (!sameIdentity(identity(stat), expected)) throw closed();
}

function assertPrivate(stat: BigIntStats, mode: bigint) {
  if (process.platform !== "win32" &&
    ((stat.mode & 0o777n) !== mode || (typeof process.getuid === "function" && stat.uid !== BigInt(process.getuid())))) throw closed();
}

async function directory(path: string, privateDirectory = false): Promise<DirectoryPin> {
  const before = await lstat(path, { bigint: true });
  if (!before.isDirectory() || before.isSymbolicLink()) throw closed();
  if (privateDirectory) assertPrivate(before, 0o700n);
  const expected = identity(before);
  if (process.platform !== "win32") {
    const descriptor = await open(path, constants.O_RDONLY | constants.O_DIRECTORY | noFollow);
    try {
      const current = await descriptor.stat({ bigint: true });
      if (!current.isDirectory()) throw closed();
      assertIdentity(current, expected);
    } finally { await descriptor.close(); }
  }
  assertIdentity(await lstat(path, { bigint: true }), expected);
  return { path, identity: expected };
}

function chain(path: string): string[] {
  const parent = dirname(path);
  return parent === path ? [path] : [...chain(parent), path];
}

async function scanDirectories(path: string, allowMissing = false) {
  const directories: DirectoryPin[] = [];
  for (const ancestor of chain(path)) {
    try { directories.push(await directory(ancestor)); }
    catch (error) {
      if (allowMissing && (error as NodeJS.ErrnoException).code === "ENOENT") return { directories, missing: ancestor };
      throw error;
    }
  }
  return { directories, missing: undefined };
}

async function assertDirectories(pins: DirectoryPin[]) {
  for (const pin of pins) {
    const current = await directory(pin.path);
    if (!sameIdentity(current.identity, pin.identity)) throw closed();
  }
}

async function syncDirectory(path: string) {
  if (process.platform === "win32") return;
  const descriptor = await open(path, constants.O_RDONLY | constants.O_DIRECTORY | noFollow);
  try { await descriptor.sync(); } finally { await descriptor.close(); }
}

async function createDirectory(path: string, ancestors: DirectoryPin[], exclusive: boolean) {
  await assertDirectories(ancestors);
  try { await mkdir(path, { mode: 0o700 }); }
  catch (error) { if (exclusive || (error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
  const pin = await directory(path, true);
  await assertDirectories(ancestors);
  await syncDirectory(dirname(path));
  return pin;
}

function assertFile(stat: BigIntStats) {
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1n) throw closed();
  assertPrivate(stat, 0o600n);
}

async function createFile(path: string, ancestors: DirectoryPin[]) {
  await assertDirectories(ancestors);
  const descriptor = await open(path, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | noFollow, 0o600);
  try {
    const stat = await descriptor.stat({ bigint: true });
    assertFile(stat);
    assertIdentity(await lstat(path, { bigint: true }), identity(stat));
    await assertDirectories(ancestors);
    return identity(stat);
  } finally { await descriptor.close(); }
}

async function writeCreatedFile(path: string, expected: Identity, bytes: Buffer, ancestors: DirectoryPin[]) {
  await assertDirectories(ancestors);
  const before = await lstat(path, { bigint: true });
  assertFile(before); assertIdentity(before, expected);
  const descriptor = await open(path, constants.O_WRONLY | noFollow);
  try {
    const stat = await descriptor.stat({ bigint: true });
    assertFile(stat); assertIdentity(stat, expected);
    if (stat.size !== 0n) throw closed();
    await descriptor.writeFile(bytes);
    await descriptor.sync();
    assertIdentity(await descriptor.stat({ bigint: true }), expected);
    assertIdentity(await lstat(path, { bigint: true }), expected);
    await assertDirectories(ancestors);
  } finally { await descriptor.close(); }
  await syncDirectory(dirname(path));
}

async function readPrivateFile(path: string, maxSize: number, expected?: Identity) {
  const before = await lstat(path, { bigint: true });
  assertFile(before);
  if (before.size > BigInt(maxSize)) throw closed();
  const pin = identity(before);
  if (expected && !sameIdentity(pin, expected)) throw closed();
  const descriptor = await open(path, constants.O_RDONLY | noFollow);
  try {
    const stat = await descriptor.stat({ bigint: true });
    assertFile(stat); assertIdentity(stat, pin);
    if (stat.size > BigInt(maxSize)) throw closed();
    const bytes = await descriptor.readFile();
    const after = await descriptor.stat({ bigint: true });
    assertFile(after); assertIdentity(after, pin);
    const current = await lstat(path, { bigint: true });
    assertFile(current); assertIdentity(current, pin);
    if (bytes.length > maxSize || after.size !== BigInt(bytes.length) || after.mtimeNs !== stat.mtimeNs || after.ctimeNs !== stat.ctimeNs) throw closed();
    return { bytes, identity: pin };
  } finally { await descriptor.close(); }
}

function markerBytes(record: RecordData, bytes: Buffer) {
  return Buffer.from(JSON.stringify({ version: 1, operationId: record.operationId,
    credentialDigest: record.credentialDigest, record: record.record, recordDigest: digest(bytes) }));
}

async function readOwnership(output: string, operationId: string, previous?: Ownership): Promise<Ownership> {
  const p = paths(output, operationId);
  const rootPins = (await scanDirectories(output)).directories;
  const directories = [...rootPins, await directory(p.globalRoot, true), await directory(p.claim, true),
    await directory(p.operations, true), await directory(p.operation, true), await directory(p.events, true)];
  const saved = await readPrivateFile(p.record, 64 * 1024);
  const record: RecordData = JSON.parse(saved.bytes.toString("utf8"));
  // Never traverse paths from untrusted JSON. Pin order and paths are fixed here.
  if (record?.version !== 1 || record.operationId !== operationId || !/^[0-9a-f]{64}$/.test(record.credentialDigest) ||
    !Array.isArray(record.directories) || record.directories.length !== directories.length) throw closed();
  for (let i = 0; i < directories.length; i++) {
    if (record.directories[i]?.path !== directories[i].path || !sameIdentity(directories[i].identity, record.directories[i].identity)) throw closed();
  }
  if (!sameIdentity(saved.identity, record.record)) throw closed();
  const credential = await readPrivateFile(p.credential, 32, record.credential);
  const marker = await readPrivateFile(p.marker, 64 * 1024, record.marker);
  if (credential.bytes.length !== 32 || digest(credential.bytes) !== record.credentialDigest ||
    !marker.bytes.equals(markerBytes(record, saved.bytes))) throw closed();
  if (previous && (!saved.bytes.equals(previous.recordBytes) || !timingSafeEqual(credential.bytes, previous.credential))) throw closed();
  const contents = (await readdir(p.operation)).sort();
  if (JSON.stringify((await readdir(p.claim)).sort()) !== '["owner.json"]' ||
    !['["credential","events","record.json"]', '[".controller","credential","events","record.json"]'].includes(JSON.stringify(contents))) throw closed();
  if (contents.includes(".controller")) {
    const controller = await directory(p.controller, true);
    if (JSON.stringify(await readdir(p.controller)) !== '["owner.json"]') throw closed();
    const owner = JSON.parse((await readPrivateFile(resolve(p.controller, "owner.json"), 4096)).bytes.toString("utf8"));
    if (owner?.version !== 1 || owner.operationId !== operationId || typeof owner.token !== "string" || !/^[0-9a-f]{64}$/.test(owner.token)) throw closed();
    await assertDirectories([controller]);
  }
  await assertDirectories(directories);
  return { output, operationId, recordBytes: saved.bytes, credential: credential.bytes };
}

function register(ownership: Ownership): BusinessCutoverHandle {
  const handle = Object.freeze(Object.create(null)) as BusinessCutoverHandle;
  handles.set(handle, ownership);
  return handle;
}

/** Read-only: only proven absence is OPEN. Unsafe traversal rejects closed. */
export async function inspectBusinessGlobalClosure(outputDirectory: string): Promise<"OPEN" | "CLOSED"> {
  try {
    const p = paths(resolve(outputDirectory), "");
    const { directories, missing } = await scanDirectories(p.claim, true);
    await assertDirectories(directories);
    if (!missing) return "CLOSED";
    try { await lstat(missing); return "CLOSED"; }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
    await assertDirectories(directories);
    return "OPEN";
  } catch { throw closed(); }
}

/** Creates the existing global claim exclusively; failures deliberately retain evidence. */
export async function acquireBusinessCutoverClosure(outputDirectory: string, operationId: string): Promise<BusinessCutoverHandle> {
  try {
    validateOperationId(operationId);
    const output = resolve(outputDirectory);
    const rootPins = (await scanDirectories(output)).directories; // Output volume must already exist.
    if (await inspectBusinessGlobalClosure(output) !== "OPEN") throw closed();
    const p = paths(output, operationId);
    const globalRoot = await createDirectory(p.globalRoot, rootPins, false);
    const operations = await createDirectory(p.operations, rootPins, false);
    const operation = await createDirectory(p.operation, [...rootPins, operations], true);
    const privatePins = [...rootPins, operations, operation];
    const events = await createDirectory(p.events, privatePins, true);
    const credentialIdentity = await createFile(p.credential, privatePins);
    const credential = randomBytes(32);
    await writeCreatedFile(p.credential, credentialIdentity, credential, privatePins);
    const recordIdentity = await createFile(p.record, privatePins);
    // Atomic mkdir is the one shared barrier; no alternative lock or takeover.
    const claim = await createDirectory(p.claim, [...rootPins, globalRoot], true);
    const claimPins = [...rootPins, globalRoot, claim];
    const markerIdentity = await createFile(p.marker, claimPins);
    const directories = [...rootPins, globalRoot, claim, operations, operation, events];
    const record: RecordData = { version: 1, operationId, credentialDigest: digest(credential), directories,
      credential: credentialIdentity, marker: markerIdentity, record: recordIdentity };
    const bytes = Buffer.from(JSON.stringify(record));
    // Mutual physical pins allow a different process to reject even same-byte
    // replacement of either file. The marker also binds every registry byte.
    await writeCreatedFile(p.record, recordIdentity, bytes, directories);
    await writeCreatedFile(p.marker, markerIdentity, markerBytes(record, bytes), directories);
    return register(await readOwnership(output, operationId, { output, operationId, recordBytes: bytes, credential }));
  } catch { throw closed(); }
}

/** Reads the credential only from its fixed private volume path, never from a caller. */
export async function resumeBusinessCutoverClosure(outputDirectory: string, operationId: string): Promise<BusinessCutoverHandle> {
  try {
    validateOperationId(operationId);
    return register(await readOwnership(resolve(outputDirectory), operationId));
  } catch { throw closed(); }
}

export async function assertBusinessCutoverOwnership(handle: BusinessCutoverHandle): Promise<void> {
  try {
    const owned = handles.get(handle);
    if (!owned) throw closed();
    await readOwnership(owned.output, owned.operationId, owned);
  } catch { throw closed(); }
}

/** Non-secret metadata; only a live registered handle can obtain it. JSON is never authority. */
export async function getBusinessCutoverOperation(handle: BusinessCutoverHandle): Promise<BusinessCutoverOperation> {
  try {
    const owned = handles.get(handle);
    if (!owned) throw closed();
    await readOwnership(owned.output, owned.operationId, owned);
    return Object.freeze({ outputDirectory: owned.output, operationId: owned.operationId,
      operationDirectory: paths(owned.output, owned.operationId).operation, recordDigest: digest(owned.recordBytes) });
  } catch { throw closed(); }
}

/** Fixed-path discovery for read-only STATUS, with the full private ownership validation. */
export async function readBusinessCutoverClosure(outputDirectory: string): Promise<BusinessCutoverHandle | null> {
  try {
    const output = resolve(outputDirectory);
    if (await inspectBusinessGlobalClosure(output) === "OPEN") return null;
    const pins = (await scanDirectories(paths(output, "").claim)).directories;
    const marker = await readPrivateFile(paths(output, "").marker, 64 * 1024);
    const operationId = JSON.parse(marker.bytes.toString("utf8"))?.operationId;
    validateOperationId(operationId);
    const owned = await readOwnership(output, operationId);
    await assertDirectories(pins);
    return register(owned);
  } catch { throw closed(); }
}
