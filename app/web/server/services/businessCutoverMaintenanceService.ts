import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";
import { constants, type BigIntStats } from "node:fs";
import { lstat, mkdir, open, readdir, rmdir, unlink } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import {
  acquireBusinessCutoverClosure, assertBusinessCutoverOwnership, getBusinessCutoverOperation,
  readBusinessCutoverClosure, type BusinessCutoverHandle, type BusinessCutoverOperation,
  assertBusinessCutoverRelocatedOwnership,
} from "@/server/services/businessCutoverClaimStore";
// Function-lazy cycle: no terminal bindings are read during module evaluation.
import { readBusinessCutoverObservedReleaseError, readBusinessCutoverFailedReleaseError } from "@/server/services/businessCutoverReleaseService";

export type BusinessCutoverStatus = {
  status: "OPEN" | "CLOSING" | "DRAINED" | "VERIFIED" | "BLOCKED";
  operationId: string | null; migrationStarted: boolean; blockedReasons: string[];
};
declare const businessCutoverControlBrand: unique symbol;
export type BusinessCutoverControl = { readonly [businessCutoverControlBrand]: true };
declare const businessCutoverExclusiveScopeBrand: unique symbol;
export type BusinessCutoverExclusiveScope = { readonly [businessCutoverExclusiveScopeBrand]: true };
export type MigrationBinding = Readonly<{ planHash: string; releaseId: string; material: Uint8Array }>;
type Pin = { path: string; stat: BigIntStats };
type Kind = "BEGIN" | "DRAINED" | "BLOCKED" | "MIGRATION_PLAN_BOUND" | "MIGRATION_STARTED";
type Event = { version: 1; operationId: string; recordDigest: string; sequence: number; previousHash: string;
  kind: Kind; reason: string | null; hash: string };
type Journal = { events: Event[]; status: BusinessCutoverStatus };
type Scope = { handle: BusinessCutoverHandle; metadata: BusinessCutoverOperation; lock: Pin;
  marker: Pin; bytes: Buffer; active: boolean; pending: Promise<unknown>;
  relocated: boolean; exclusive: Set<BusinessCutoverExclusiveScope> };
const controls = new WeakMap<BusinessCutoverControl, Scope>();
type Exclusive = { owner: Scope; active: boolean; pending: Set<Promise<unknown>>; terminal: boolean };
const exclusiveScopes = new WeakMap<BusinessCutoverExclusiveScope, Exclusive>();
const exclusiveContext = new AsyncLocalStorage<Scope>();
const materialLimit = 1024 * 1024;
const bindingFileLimit = 1400 * 1024;
const journalCapacity = 10000;
const noFollow = constants.O_NOFOLLOW ?? 0;
const closed = () => new Error("BUSINESS_CUTOVER_CLOSED");
const hash = (bytes: string | Buffer) => createHash("sha256").update(bytes).digest("hex");
const same = (a: BigIntStats, b: BigIntStats) => a.dev === b.dev && a.ino === b.ino && a.birthtimeNs === b.birthtimeNs;
const nameFor = (n: number) => `${String(n).padStart(8, "0")}.json`;
const blocked = (reason: string, operationId: string | null = null, migrationStarted = false): BusinessCutoverStatus =>
  ({ status: "BLOCKED", operationId, migrationStarted, blockedReasons: [reason] });

// Same cooperative private-volume boundary as the store/coordinator. No portable
// openat/dirfd protection against hostile same-UID/root actors; deployment ACLs
// are mandatory. Never infer takeover authority from PID, age or empty jobs.
function privateMode(stat: BigIntStats, mode: bigint) {
  if (process.platform !== "win32" && ((stat.mode & 0o777n) !== mode ||
    (typeof process.getuid === "function" && stat.uid !== BigInt(process.getuid())))) throw closed();
}
async function directory(path: string, privateDirectory = false): Promise<Pin> {
  const stat = await lstat(path, { bigint: true });
  if (!stat.isDirectory() || stat.isSymbolicLink() || stat.ino === 0n) throw closed();
  if (privateDirectory) privateMode(stat, 0o700n);
  if (process.platform !== "win32") {
    const fd = await open(path, constants.O_RDONLY | constants.O_DIRECTORY | noFollow);
    try { if (!same(await fd.stat({ bigint: true }), stat)) throw closed(); } finally { await fd.close(); }
  }
  if (!same(await lstat(path, { bigint: true }), stat)) throw closed();
  return { path, stat };
}
async function assertPins(pins: Pin[]) {
  for (const pin of pins) if (!same((await directory(pin.path)).stat, pin.stat)) throw closed();
}
async function syncDirectory(path: string) {
  if (process.platform === "win32") return;
  const fd = await open(path, constants.O_RDONLY | constants.O_DIRECTORY | noFollow);
  try { await fd.sync(); } finally { await fd.close(); }
}
function regular(stat: BigIntStats, maxSize = 4096) {
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1n || stat.ino === 0n || stat.size > BigInt(maxSize)) throw closed();
  privateMode(stat, 0o600n);
}
async function readFile(path: string, maxSize = 4096) {
  const before = await lstat(path, { bigint: true }); regular(before, maxSize);
  const fd = await open(path, constants.O_RDONLY | noFollow);
  try {
    const stat = await fd.stat({ bigint: true }); regular(stat, maxSize); if (!same(stat, before)) throw closed();
    const bytes = await fd.readFile(); const after = await fd.stat({ bigint: true }); regular(after, maxSize);
    const current = await lstat(path, { bigint: true }); regular(current, maxSize);
    if (!same(after, before) || !same(current, before) || after.mtimeNs !== stat.mtimeNs || after.ctimeNs !== stat.ctimeNs ||
      after.size !== BigInt(bytes.length) || bytes.length > maxSize) throw closed();
    return { bytes, pin: { path, stat: before } };
  } finally { await fd.close(); }
}
async function createFile(path: string, bytes: Buffer, maxSize = 4096, validate?: () => Promise<unknown>) {
  if (bytes.length > maxSize) throw closed();
  await validate?.();
  const fd = await open(path, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | noFollow, 0o600);
  try {
    const stat = await fd.stat({ bigint: true }); regular(stat, maxSize);
    await validate?.();
    await fd.writeFile(bytes); await fd.sync();
    if (!same(await fd.stat({ bigint: true }), stat) || !same(await lstat(path, { bigint: true }), stat)) throw closed();
    await syncDirectory(dirname(path));
    return { path, stat };
  } finally { await fd.close(); }
}
async function exists(path: string) {
  try { await lstat(path); return true; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return false; throw error; }
}

// Material is the producer's canonical byte sequence, encoded losslessly in the
// control record. Its semantic schema/profile is validated by the migration adapter.
function normalizeBinding(binding: MigrationBinding): MigrationBinding {
  if (!binding || Object.keys(binding).sort().join(",") !== "material,planHash,releaseId" ||
    !(binding.material instanceof Uint8Array)) throw closed();
  const material = Buffer.from(binding.material);
  if (material.length === 0 || material.length > materialLimit || typeof binding.planHash !== "string" ||
    !/^[0-9a-f]{64}$/.test(binding.planHash) || hash(material) !== binding.planHash ||
    typeof binding.releaseId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,95}$/.test(binding.releaseId)) throw closed();
  return Object.freeze({ planHash: binding.planHash, releaseId: binding.releaseId, material });
}
function bindingRecord(metadata: BusinessCutoverOperation, binding: MigrationBinding) {
  return { version: 1, operationId: metadata.operationId, recordDigest: metadata.recordDigest,
    planHash: binding.planHash, releaseId: binding.releaseId, material: Buffer.from(binding.material).toString("base64") };
}
async function readBinding(metadata: BusinessCutoverOperation): Promise<MigrationBinding | null> {
  const path = resolve(metadata.operationDirectory, "migration-plan.json");
  if (!await exists(path)) return null;
  const { bytes } = await readFile(path, bindingFileLimit);
  const data = JSON.parse(bytes.toString("utf8"));
  if (typeof data?.material !== "string") throw closed();
  const binding = normalizeBinding({ planHash: data.planHash, releaseId: data.releaseId, material: Buffer.from(data.material, "base64") });
  if (!bytes.equals(Buffer.from(JSON.stringify(bindingRecord(metadata, binding))))) throw closed();
  return binding;
}

async function readJournal(handle: BusinessCutoverHandle, metadata: BusinessCutoverOperation, allowEmpty = false, allowUnboundBinding = false): Promise<Journal> {
  await assertBusinessCutoverOwnership(handle);
  const root = await directory(resolve(metadata.operationDirectory, "events"), true);
  const names = (await readdir(root.path)).sort();
  if ((!allowEmpty && names.length === 0) || names.length > journalCapacity) throw closed();
  const status: BusinessCutoverStatus = { status: "CLOSING", operationId: metadata.operationId, migrationStarted: false, blockedReasons: [] };
  const binding = await readBinding(metadata);
  const events: Event[] = []; let previousHash = metadata.recordDigest; let bound = false;
  for (let i = 0; i < names.length; i++) {
    if (names[i] !== nameFor(i + 1)) throw closed();
    const { bytes } = await readFile(resolve(root.path, names[i]));
    const data: Event = JSON.parse(bytes.toString("utf8"));
    const body = { version: 1, operationId: metadata.operationId, recordDigest: metadata.recordDigest,
      sequence: i + 1, previousHash, kind: data.kind, reason: data.reason };
    if (data.hash !== hash(JSON.stringify(body)) || !bytes.equals(Buffer.from(JSON.stringify({ ...body, hash: data.hash })))) throw closed();
    if (i === 0 ? data.kind !== "BEGIN" : data.kind === "BEGIN") throw closed();
    if (data.kind === "BEGIN" || data.kind === "DRAINED") {
      if (data.reason !== null) throw closed();
      status.status = data.kind === "BEGIN" ? "CLOSING" : "DRAINED"; status.blockedReasons = [];
    } else if (data.kind === "BLOCKED") {
      if (!["BUSINESS_SITE_CLAIMS_ACTIVE", "BUSINESS_SITE_CLAIMS_UNSAFE"].includes(data.reason!)) throw closed();
      status.status = "BLOCKED"; status.blockedReasons = [data.reason!];
    } else if (data.kind === "MIGRATION_PLAN_BOUND") {
      if (bound || status.migrationStarted || !binding || data.reason !== binding.planHash) throw closed();
      bound = true;
    } else if (data.kind === "MIGRATION_STARTED") {
      if (status.status !== "DRAINED" || status.migrationStarted || data.reason !== null) throw closed();
      if (binding && !bound) throw closed();
      status.migrationStarted = true;
    } else throw closed();
    previousHash = data.hash; events.push(data);
  }
  if ((binding && !bound && !allowUnboundBinding) || JSON.stringify((await readdir(root.path)).sort()) !== JSON.stringify(names)) throw closed();
  await assertPins([root]); await assertBusinessCutoverOwnership(handle);
  return { events, status };
}

async function assertScope(scope: Scope) {
  if (!scope.active) throw closed();
  await assertOwner(scope);
  await assertPins([scope.lock]);
  const marker = await readFile(scope.marker.path);
  if (!same(marker.pin.stat, scope.marker.stat) || !marker.bytes.equals(scope.bytes) ||
    JSON.stringify(await readdir(scope.lock.path)) !== '["owner.json"]' || !scope.active) throw closed();
}
function assertOwner(scope: Scope) {
  return scope.relocated ? assertBusinessCutoverRelocatedOwnership(scope.handle) : assertBusinessCutoverOwnership(scope.handle);
}
function controllerFailure(scope: Scope | undefined) {
  for (const exclusive of scope?.exclusive ?? []) {
    const observed = readBusinessCutoverObservedReleaseError(exclusive);
    if (observed) return observed;
  }
  return closed();
}
function terminalFailure(scope: Scope) {
  for (const exclusive of scope.exclusive) {
    const failed = readBusinessCutoverFailedReleaseError(exclusive);
    if (failed) return failed;
  }
  return null;
}
async function append(scope: Scope, kind: Kind, reason: string | null = null, allowEmpty = false, validate?: () => Promise<unknown>) {
  await assertScope(scope);
  const journal = await readJournal(scope.handle, scope.metadata, allowEmpty, kind === "MIGRATION_PLAN_BOUND");
  if (journal.events.length >= journalCapacity) throw closed();
  const body = { version: 1, operationId: scope.metadata.operationId, recordDigest: scope.metadata.recordDigest,
    sequence: journal.events.length + 1, previousHash: journal.events.at(-1)?.hash ?? scope.metadata.recordDigest, kind, reason };
  await assertScope(scope);
  await createFile(resolve(scope.metadata.operationDirectory, "events", nameFor(body.sequence)), Buffer.from(JSON.stringify({ ...body, hash: hash(JSON.stringify(body)) })), 4096, validate);
  await assertScope(scope);
  return readJournal(scope.handle, scope.metadata);
}
function serialized<T>(control: BusinessCutoverControl, action: (scope: Scope) => Promise<T>): Promise<T> {
  const scope = controls.get(control);
  // Reentrant control calls cannot queue behind their own exclusive callback.
  // Other callers retain the010 queue contract; scoped helpers never enqueue.
  if (!scope?.active || exclusiveContext.getStore() === scope) return Promise.reject(closed());
  const result = scope.pending.then(async () => { if (scope.relocated) throw closed(); await assertScope(scope); return action(scope); });
  scope.pending = result.catch(() => {});
  return result.catch(() => { throw controllerFailure(scope); });
}

async function scanSiteClaims(scope: Pick<Scope, "handle" | "metadata">): Promise<string | null> {
  await assertBusinessCutoverOwnership(scope.handle);
  const rootPath = resolve(scope.metadata.outputDirectory, ".business-publication-site-claims");
  try {
    if (!await exists(rootPath)) { await assertBusinessCutoverOwnership(scope.handle); return null; }
    const root = await directory(rootPath, true); const names = (await readdir(rootPath)).sort();
    for (const name of names) {
      if (!/^[0-9a-f]{64}$/.test(name)) return "BUSINESS_SITE_CLAIMS_UNSAFE";
      const claim = await directory(resolve(rootPath, name), true);
      if (JSON.stringify(await readdir(claim.path)) !== '["owner.json"]') return "BUSINESS_SITE_CLAIMS_UNSAFE";
      const owner = JSON.parse((await readFile(resolve(claim.path, "owner.json"))).bytes.toString("utf8"));
      if (typeof owner.siteId !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*-business$/.test(owner.siteId) || hash(owner.siteId) !== name ||
        typeof owner.token !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(owner.token) ||
        !Number.isSafeInteger(owner.pid) || owner.pid <= 0 || typeof owner.acquiredAt !== "string" || !Number.isFinite(Date.parse(owner.acquiredAt))) return "BUSINESS_SITE_CLAIMS_UNSAFE";
      await assertPins([claim]);
    }
    if (JSON.stringify((await readdir(rootPath)).sort()) !== JSON.stringify(names)) return "BUSINESS_SITE_CLAIMS_ACTIVE";
    await assertPins([root]); await assertBusinessCutoverOwnership(scope.handle);
    return names.length ? "BUSINESS_SITE_CLAIMS_ACTIVE" : null;
  } catch { return "BUSINESS_SITE_CLAIMS_UNSAFE"; }
}

async function runController<T>(handle: BusinessCutoverHandle, action: (control: BusinessCutoverControl) => Promise<T>, initializing: boolean): Promise<T> {
  let scope: Scope | undefined;
  try {
    const metadata = await getBusinessCutoverOperation(handle);
    // Validate journal before creating a lock. Incomplete initial BEGIN is not resumable.
    await readJournal(handle, metadata, initializing);
    const path = resolve(metadata.operationDirectory, ".controller");
    await mkdir(path, { mode: 0o700 }); // exclusive; never steal an existing directory
    await syncDirectory(metadata.operationDirectory);
    const lock = await directory(path, true);
    const bytes = Buffer.from(JSON.stringify({ version: 1, operationId: metadata.operationId, token: randomBytes(32).toString("hex") }));
    const marker = await createFile(resolve(path, "owner.json"), bytes);
    scope = { handle, metadata, lock, marker, bytes, active: true, pending: Promise.resolve(), relocated: false, exclusive: new Set() };
    const control = Object.freeze(Object.create(null)) as BusinessCutoverControl; controls.set(control, scope);
    let result!: T; let failed = false;
    try {
      await assertScope(scope);
      if (initializing) await append(scope, "BEGIN", null, true);
      result = await action(control);
    } catch { failed = true; }
    // Revoke immediately when callback settles. Drain unawaited queued operations
    // before releasing exclusion; expired/detached work cannot start another write.
    scope.active = false;
    await scope.pending;
    // Owned administrative lock only. Global closure is NEVER released here.
    await assertOwner(scope); await assertPins([lock]);
    const current = await readFile(marker.path);
    if (!same(current.pin.stat, marker.stat) || !current.bytes.equals(bytes) || JSON.stringify(await readdir(path)) !== '["owner.json"]') throw closed();
    await unlink(marker.path); await rmdir(path); await syncDirectory(metadata.operationDirectory);
    if (failed) throw controllerFailure(scope);
    const terminal = terminalFailure(scope);
    if (terminal) throw terminal;
    return result;
  } catch { throw controllerFailure(scope); }
}

export function withBusinessCutoverController<T>(handle: BusinessCutoverHandle, action: (control: BusinessCutoverControl) => Promise<T>): Promise<T> {
  return runController(handle, action, false);
}

export function withBusinessCutoverExclusive<T>(control: BusinessCutoverControl,
  action: (scope: BusinessCutoverExclusiveScope) => Promise<T>): Promise<T> {
  return serialized(control, async (owner) => {
    const scope = Object.freeze(Object.create(null)) as BusinessCutoverExclusiveScope;
    owner.exclusive.add(scope);
    const state: Exclusive = { owner, active: true, pending: new Set(), terminal: false }; exclusiveScopes.set(scope, state);
    let result: T;
    try {
      result = await exclusiveContext.run(owner, async () => {
        await assertBusinessCutoverExclusive(scope);
        let result: T;
        try { result = await action(scope); } finally { state.active = false; }
        await assertScope(owner);
        return result;
      });
    } finally {
      // A detached helper is revoked immediately, but keeps the queue occupied
      // until its in-flight I/O settles. It cannot write under the next scope.
      state.active = false;
      await Promise.allSettled([...state.pending]);
    }
    const failed = readBusinessCutoverFailedReleaseError(scope);
    if (failed) throw failed;
    return result;
  });
}

async function exclusiveOwner(scope: BusinessCutoverExclusiveScope): Promise<Scope> {
  const state = exclusiveScopes.get(scope);
  if (!state?.active || state.owner.relocated) throw closed();
  await assertScope(state.owner);
  if (!state.active) throw closed();
  return state.owner;
}

/** Physical rebind only. The release service alone records observed commit;
 * this validator cannot create a terminal result or move a claim. */
export function markBusinessCutoverClaimRelocated(scope: BusinessCutoverExclusiveScope): Promise<void> {
  return scopedWork(scope, async () => {
    const state = exclusiveScopes.get(scope);
    if (!state?.active || !state.owner.active) throw closed();
    await assertBusinessCutoverRelocatedOwnership(state.owner.handle);
    if (!state.active || !state.owner.active) throw closed();
    state.owner.relocated = true;
    await assertScope(state.owner);
  });
}

export async function assertBusinessCutoverExclusive(scope: BusinessCutoverExclusiveScope): Promise<BusinessCutoverOperation> {
  try { return (await exclusiveOwner(scope)).metadata; } catch { throw closed(); }
}

function scopedWork<T>(scope: BusinessCutoverExclusiveScope, action: () => Promise<T>): Promise<T> {
  const state = exclusiveScopes.get(scope);
  if (!state?.active || !state.owner.active) return Promise.reject(closed());
  const result = action(); state.pending.add(result);
  void result.then(() => state.pending.delete(result), () => state.pending.delete(result));
  return result;
}

/** Track an entire cross-module helper, including its in-flight external I/O.
 * This grants no authority: consumers must still reassert the same live scope
 * before each subsequent protected step. Consumer results/errors remain intact.
 */
export function withBusinessCutoverScopedWork<T>(scope: BusinessCutoverExclusiveScope, action: () => Promise<T>): Promise<T> {
  return scopedWork(scope, async () => {
    await assertBusinessCutoverExclusive(scope);
    const state = exclusiveScopes.get(scope);
    if (!state?.active || !state.owner.active) throw closed();
    return action();
  });
}

/** Negative exclusion, not release authority. Reserve before any await so an
 * existing APPLY/helper and terminal work cannot overlap. Genuine nested reads
 * still work, but bind/START cannot mutate until all terminal I/O settles. */
export function withBusinessCutoverTerminalWork<T>(scope: BusinessCutoverExclusiveScope, action: () => Promise<T>): Promise<T> {
  const state = exclusiveScopes.get(scope);
  if (!state?.active || !state.owner.active || state.terminal || state.pending.size) return Promise.reject(closed());
  state.terminal = true;
  const work = scopedWork(scope, async () => {
    try {
      await assertBusinessCutoverExclusive(scope);
      if (!state.active || !state.owner.active) throw closed();
      return await action();
    } finally {
      // Keep reservation through detached nested I/O too; never wait on self.
      for (;;) {
        const nested = [...state.pending].filter((pending) => pending !== work);
        if (!nested.length) break;
        await Promise.allSettled(nested);
      }
      state.terminal = false;
    }
  });
  return work;
}

export function bindBusinessCutoverMigration(scope: BusinessCutoverExclusiveScope, binding: MigrationBinding): Promise<void> {
  if (exclusiveScopes.get(scope)?.terminal) return Promise.reject(closed());
  return scopedWork(scope, () => bindMigration(scope, binding));
}
async function bindMigration(scope: BusinessCutoverExclusiveScope, binding: MigrationBinding): Promise<void> {
  try {
    // Copy before the first await: later caller mutation cannot change the binding.
    const saved = normalizeBinding(binding);
    const owner = await exclusiveOwner(scope);
    const journal = await readJournal(owner.handle, owner.metadata);
    if (journal.status.migrationStarted || await readBinding(owner.metadata)) throw closed();
    await exclusiveOwner(scope);
    await createFile(resolve(owner.metadata.operationDirectory, "migration-plan.json"),
      Buffer.from(JSON.stringify(bindingRecord(owner.metadata, saved))), bindingFileLimit, () => exclusiveOwner(scope));
    await exclusiveOwner(scope);
    await append(owner, "MIGRATION_PLAN_BOUND", saved.planHash, false, () => exclusiveOwner(scope));
    await exclusiveOwner(scope);
  } catch { throw closed(); }
}

export function readBusinessCutoverMigrationBinding(scope: BusinessCutoverExclusiveScope): Promise<MigrationBinding | null> {
  return scopedWork(scope, () => readMigrationBinding(scope));
}
async function readMigrationBinding(scope: BusinessCutoverExclusiveScope): Promise<MigrationBinding | null> {
  try {
    const owner = await exclusiveOwner(scope);
    await readJournal(owner.handle, owner.metadata);
    const result = await readBinding(owner.metadata);
    await exclusiveOwner(scope);
    return result;
  } catch { throw closed(); }
}

export function startBusinessCutoverMigration(scope: BusinessCutoverExclusiveScope, planHash: string): Promise<void> {
  if (exclusiveScopes.get(scope)?.terminal) return Promise.reject(closed());
  return scopedWork(scope, () => startMigration(scope, planHash));
}
async function startMigration(scope: BusinessCutoverExclusiveScope, planHash: string): Promise<void> {
  try {
    const owner = await exclusiveOwner(scope);
    const journal = await readJournal(owner.handle, owner.metadata);
    const binding = await readBinding(owner.metadata);
    if (!binding || journal.status.status !== "DRAINED" || journal.status.migrationStarted || await scanSiteClaims(owner)) throw closed();
    if (typeof planHash !== "string" || planHash !== binding.planHash) throw new Error("BUSINESS_CUTOVER_PLAN_MISMATCH");
    await exclusiveOwner(scope);
    await append(owner, "MIGRATION_STARTED", null, false, () => exclusiveOwner(scope));
    await exclusiveOwner(scope);
  } catch (error) {
    if (error instanceof Error && error.message === "BUSINESS_CUTOVER_PLAN_MISMATCH") throw error;
    throw closed();
  }
}

export async function beginBusinessCutover(outputDirectory: string, operationId: string): Promise<BusinessCutoverStatus> {
  const handle = await acquireBusinessCutoverClosure(outputDirectory, operationId);
  return runController(handle, async () => (await readJournal(handle, await getBusinessCutoverOperation(handle))).status, true);
}

export function drainBusinessCutover(control: BusinessCutoverControl, timeoutMs: number): Promise<BusinessCutoverStatus> {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 0 || timeoutMs > 30000) return Promise.reject(closed());
  return serialized(control, async (scope) => {
    const deadline = performance.now() + timeoutMs;
    let reason: string | null;
    do {
      await assertScope(scope); reason = await scanSiteClaims(scope);
      if (!reason) {
        const journal = await readJournal(scope.handle, scope.metadata);
        return journal.status.status === "DRAINED" ? journal.status : (await append(scope, "DRAINED")).status;
      }
      if (reason === "BUSINESS_SITE_CLAIMS_UNSAFE" || performance.now() >= deadline) break;
      await new Promise<void>((done) => setTimeout(done, Math.min(50, Math.max(0, deadline - performance.now()))));
    } while (performance.now() <= deadline);
    return (await append(scope, "BLOCKED", reason)).status;
  });
}

export function markBusinessCutoverMigrationStarted(control: BusinessCutoverControl): Promise<void> {
  return serialized(control, async (scope) => {
    const journal = await readJournal(scope.handle, scope.metadata);
    if (journal.status.migrationStarted) return;
    if (journal.status.status !== "DRAINED" || await scanSiteClaims(scope)) throw closed();
    await append(scope, "MIGRATION_STARTED");
  });
}

export async function readBusinessCutoverStatus(outputDirectory: string): Promise<BusinessCutoverStatus> {
  let metadata: BusinessCutoverOperation | undefined; let migrationStarted = false;
  try {
    const handle = await readBusinessCutoverClosure(outputDirectory);
    if (!handle) return { status: "OPEN", operationId: null, migrationStarted: false, blockedReasons: [] };
    metadata = await getBusinessCutoverOperation(handle);
    const journal = await readJournal(handle, metadata); migrationStarted = journal.status.migrationStarted;
    if (await exists(resolve(metadata.operationDirectory, ".controller"))) return blocked("BUSINESS_CONTROLLER_PRESENT", metadata.operationId, migrationStarted);
    const reason = await scanSiteClaims({ handle, metadata });
    return reason ? blocked(reason, metadata.operationId, migrationStarted) : journal.status;
  } catch { return blocked("BUSINESS_CUTOVER_STATE_UNSAFE", metadata?.operationId ?? null, migrationStarted); }
}
