import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { constants, type BigIntStats } from "node:fs";
import { lstat, mkdir, open, readdir, rmdir, unlink } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import {
  acquireBusinessCutoverClosure, assertBusinessCutoverOwnership, getBusinessCutoverOperation,
  readBusinessCutoverClosure, type BusinessCutoverHandle, type BusinessCutoverOperation,
} from "@/server/services/businessCutoverClaimStore";

export type BusinessCutoverStatus = {
  status: "OPEN" | "CLOSING" | "DRAINED" | "VERIFIED" | "BLOCKED";
  operationId: string | null; migrationStarted: boolean; blockedReasons: string[];
};
declare const businessCutoverControlBrand: unique symbol;
export type BusinessCutoverControl = { readonly [businessCutoverControlBrand]: true };
type Pin = { path: string; stat: BigIntStats };
type Kind = "BEGIN" | "DRAINED" | "BLOCKED" | "MIGRATION_STARTED";
type Event = { version: 1; operationId: string; recordDigest: string; sequence: number; previousHash: string;
  kind: Kind; reason: string | null; hash: string };
type Journal = { events: Event[]; status: BusinessCutoverStatus };
type Scope = { handle: BusinessCutoverHandle; metadata: BusinessCutoverOperation; lock: Pin;
  marker: Pin; bytes: Buffer; active: boolean; pending: Promise<unknown> };
const controls = new WeakMap<BusinessCutoverControl, Scope>();
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
function regular(stat: BigIntStats) {
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1n || stat.ino === 0n || stat.size > 4096n) throw closed();
  privateMode(stat, 0o600n);
}
async function readFile(path: string) {
  const before = await lstat(path, { bigint: true }); regular(before);
  const fd = await open(path, constants.O_RDONLY | noFollow);
  try {
    const stat = await fd.stat({ bigint: true }); regular(stat); if (!same(stat, before)) throw closed();
    const bytes = await fd.readFile(); const after = await fd.stat({ bigint: true }); regular(after);
    const current = await lstat(path, { bigint: true }); regular(current);
    if (!same(after, before) || !same(current, before) || after.mtimeNs !== stat.mtimeNs || after.ctimeNs !== stat.ctimeNs ||
      after.size !== BigInt(bytes.length) || bytes.length > 4096) throw closed();
    return { bytes, pin: { path, stat: before } };
  } finally { await fd.close(); }
}
async function createFile(path: string, bytes: Buffer) {
  const fd = await open(path, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | noFollow, 0o600);
  try {
    const stat = await fd.stat({ bigint: true }); regular(stat);
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

async function readJournal(handle: BusinessCutoverHandle, metadata: BusinessCutoverOperation, allowEmpty = false): Promise<Journal> {
  await assertBusinessCutoverOwnership(handle);
  const root = await directory(resolve(metadata.operationDirectory, "events"), true);
  const names = (await readdir(root.path)).sort();
  if ((!allowEmpty && names.length === 0) || names.length > 10000) throw closed();
  const status: BusinessCutoverStatus = { status: "CLOSING", operationId: metadata.operationId, migrationStarted: false, blockedReasons: [] };
  const events: Event[] = []; let previousHash = metadata.recordDigest;
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
    } else if (data.kind === "MIGRATION_STARTED") {
      if (status.status !== "DRAINED" || status.migrationStarted || data.reason !== null) throw closed();
      status.migrationStarted = true;
    } else throw closed();
    previousHash = data.hash; events.push(data);
  }
  if (JSON.stringify((await readdir(root.path)).sort()) !== JSON.stringify(names)) throw closed();
  await assertPins([root]); await assertBusinessCutoverOwnership(handle);
  return { events, status };
}

async function assertScope(scope: Scope) {
  if (!scope.active) throw closed();
  await assertBusinessCutoverOwnership(scope.handle);
  await assertPins([scope.lock]);
  const marker = await readFile(scope.marker.path);
  if (!same(marker.pin.stat, scope.marker.stat) || !marker.bytes.equals(scope.bytes) ||
    JSON.stringify(await readdir(scope.lock.path)) !== '["owner.json"]' || !scope.active) throw closed();
}
async function append(scope: Scope, kind: Kind, reason: string | null = null, allowEmpty = false) {
  await assertScope(scope);
  const journal = await readJournal(scope.handle, scope.metadata, allowEmpty);
  const body = { version: 1, operationId: scope.metadata.operationId, recordDigest: scope.metadata.recordDigest,
    sequence: journal.events.length + 1, previousHash: journal.events.at(-1)?.hash ?? scope.metadata.recordDigest, kind, reason };
  await assertScope(scope);
  await createFile(resolve(scope.metadata.operationDirectory, "events", nameFor(body.sequence)), Buffer.from(JSON.stringify({ ...body, hash: hash(JSON.stringify(body)) })));
  await assertScope(scope);
  return readJournal(scope.handle, scope.metadata);
}
function serialized<T>(control: BusinessCutoverControl, action: (scope: Scope) => Promise<T>): Promise<T> {
  const scope = controls.get(control);
  if (!scope?.active) return Promise.reject(closed());
  const result = scope.pending.then(async () => { await assertScope(scope); return action(scope); });
  scope.pending = result.catch(() => {});
  return result.catch(() => { throw closed(); });
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
    const scope: Scope = { handle, metadata, lock, marker, bytes, active: true, pending: Promise.resolve() };
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
    await assertBusinessCutoverOwnership(handle); await assertPins([lock]);
    const current = await readFile(marker.path);
    if (!same(current.pin.stat, marker.stat) || !current.bytes.equals(bytes) || JSON.stringify(await readdir(path)) !== '["owner.json"]') throw closed();
    await unlink(marker.path); await rmdir(path); await syncDirectory(metadata.operationDirectory);
    if (failed) throw closed();
    return result;
  } catch { throw closed(); }
}

export function withBusinessCutoverController<T>(handle: BusinessCutoverHandle, action: (control: BusinessCutoverControl) => Promise<T>): Promise<T> {
  return runController(handle, action, false);
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
