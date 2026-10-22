import "server-only";
import { createHash } from "node:crypto";
import { constants, type BigIntStats } from "node:fs";
import { lstat, open, rename } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { assertBusinessCutoverExclusive, markBusinessCutoverClaimRelocated, withBusinessCutoverTerminalWork,
  type BusinessCutoverExclusiveScope } from "@/server/services/businessCutoverMaintenanceService";
import { inspectBusinessCutoverOperationOwnership, readBusinessCutoverClosure, getBusinessCutoverOperation,
  type BusinessCutoverOperation } from "@/server/services/businessCutoverClaimStore";
import { verifyBusinessConsentRelease, assertBusinessCutoverVerifiedRelease } from "@/server/services/businessCutoverReleaseVerification";

export type CutoverReleaseResult = Readonly<{ outcome: "CANCELLED" | "REOPENED" | "RELEASE_COMMIT_UNCONFIRMED";
  commitObserved: boolean; persistenceConfirmed: boolean }>;
type Kind = "CANCEL" | "REOPEN";
type Identity = { dev: string; ino: string; birthtimeNs: string };
type Intent = { version: 1; operationId: string; recordDigest: string; kind: Kind; planHash: string | null;
  releaseId: string; factsHash: string; claim: Identity };
const observations = new WeakMap<BusinessCutoverExclusiveScope, Error>();
const failedObservations = new WeakSet<BusinessCutoverExclusiveScope>();
const observedErrors = new WeakMap<object, CutoverReleaseResult>();
const uncertain: CutoverReleaseResult = Object.freeze({ outcome: "RELEASE_COMMIT_UNCONFIRMED", commitObserved: true, persistenceConfirmed: false });
const noFollow = constants.O_NOFOLLOW ?? 0;
const closed = () => new Error("BUSINESS_CUTOVER_CLOSED");
const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const encode = (value: unknown) => Buffer.from(JSON.stringify(value));
const identity = (stat: BigIntStats): Identity => ({ dev: String(stat.dev), ino: String(stat.ino), birthtimeNs: String(stat.birthtimeNs) });
const same = (a: Identity, b: Identity) => a.dev === b.dev && a.ino === b.ino && a.birthtimeNs === b.birthtimeNs;

/** Read-only observation, not authority. Called lazily by the controller only
 * for scopes it actually tracked. No caller can mint/set a recorded error. */
export function readBusinessCutoverObservedReleaseError(scope: BusinessCutoverExclusiveScope): Error | null {
  return observations.get(scope) ?? null;
}
/** Actual postcommit failure, distinct from a successful observed rename.
 * Only the terminal catch records it; generic callback values cannot mint it. */
export function readBusinessCutoverFailedReleaseError(scope: BusinessCutoverExclusiveScope): Error | null {
  return failedObservations.has(scope) ? observations.get(scope) ?? null : null;
}
/** Dispatcher must use identity, never error.message or caller-shaped fields. */
export function readBusinessCutoverReleaseError(error: unknown): CutoverReleaseResult | null {
  return typeof error === "object" && error !== null ? observedErrors.get(error) ?? null : null;
}
function privateMode(stat: BigIntStats, mode: bigint) {
  if (stat.ino === 0n || (process.platform !== "win32" && ((stat.mode & 0o777n) !== mode ||
    (typeof process.getuid === "function" && stat.uid !== BigInt(process.getuid()))))) throw closed();
}
async function directory(path: string) {
  const before = await lstat(path, { bigint: true });
  if (!before.isDirectory() || before.isSymbolicLink()) throw closed();
  privateMode(before, 0o700n);
  if (process.platform !== "win32") {
    const fd = await open(path, constants.O_RDONLY | constants.O_DIRECTORY | noFollow);
    try { if (!same(identity(before), identity(await fd.stat({ bigint: true })))) throw closed(); } finally { await fd.close(); }
  }
  if (!same(identity(before), identity(await lstat(path, { bigint: true })))) throw closed();
  return identity(before);
}
function regular(stat: BigIntStats) {
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1n || stat.size > 16384n) throw closed();
  privateMode(stat, 0o600n);
}
async function read(path: string) {
  const before = await lstat(path, { bigint: true }); regular(before);
  const fd = await open(path, constants.O_RDONLY | noFollow);
  try {
    const stat = await fd.stat({ bigint: true }); regular(stat);
    if (!same(identity(before), identity(stat))) throw closed();
    const bytes = await fd.readFile(), after = await fd.stat({ bigint: true }), current = await lstat(path, { bigint: true });
    regular(after); regular(current);
    if (!same(identity(stat), identity(after)) || !same(identity(stat), identity(current)) ||
      stat.mtimeNs !== after.mtimeNs || stat.ctimeNs !== after.ctimeNs || after.size !== BigInt(bytes.length)) throw closed();
    return { bytes, identity: identity(stat) };
  } finally { await fd.close(); }
}
async function absent(path: string) {
  try { await lstat(path); } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return true; throw error; }
  return false;
}
async function syncDirectory(path: string) {
  if (process.platform === "win32") return;
  const fd = await open(path, constants.O_RDONLY | constants.O_DIRECTORY | noFollow);
  try { await fd.sync(); } finally { await fd.close(); }
}
async function create(path: string, bytes: Buffer, validate: () => Promise<unknown>) {
  await validate();
  const fd = await open(path, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | noFollow, 0o600);
  try {
    const stat = await fd.stat({ bigint: true }); regular(stat);
    await validate(); await fd.writeFile(bytes); await fd.sync();
    const reread = await read(path);
    if (!same(identity(stat), reread.identity) || !bytes.equals(reread.bytes)) throw closed();
    await validate(); await syncDirectory(dirname(path));
    return reread;
  } finally { await fd.close(); }
}
function parseIntent(bytes: Buffer, metadata: BusinessCutoverOperation, claim: Identity): Intent {
  const data = JSON.parse(bytes.toString("utf8"));
  const intent: Intent = { version: 1, operationId: metadata.operationId, recordDigest: metadata.recordDigest,
    kind: data.kind, planHash: data.planHash, releaseId: data.releaseId, factsHash: data.factsHash, claim };
  if ((intent.kind !== "CANCEL" && intent.kind !== "REOPEN") ||
    intent.releaseId !== (intent.kind === "CANCEL" ? "business-consent-predecessor-v1" : "business-consent-successor-v1") ||
    (intent.planHash !== null && (typeof intent.planHash !== "string" || !/^[0-9a-f]{64}$/.test(intent.planHash))) ||
    (intent.kind === "REOPEN" && intent.planHash === null) || typeof intent.factsHash !== "string" ||
    !/^[0-9a-f]{64}$/.test(intent.factsHash) || !bytes.equals(encode(intent))) throw closed();
  return intent;
}
function receipt(intent: Intent, bytes: Buffer) {
  return { version: 1, operationId: intent.operationId, recordDigest: intent.recordDigest, intentDigest: hash(bytes),
    kind: intent.kind, factsHash: intent.factsHash, commitObserved: true, persistenceConfirmed: true };
}

export function finishBusinessConsentCutover(scope: BusinessCutoverExclusiveScope, kind: Kind): Promise<CutoverReleaseResult> {
  return withBusinessCutoverTerminalWork(scope, async () => {
    const metadata = await assertBusinessCutoverExclusive(scope);
    const source = resolve(metadata.outputDirectory, ".master-package-claims/ganomaster-business");
    const destination = resolve(metadata.operationDirectory, "released-claim");
    const intentPath = resolve(metadata.operationDirectory, "release-intent.json");
    const proof = await verifyBusinessConsentRelease(scope, kind);
    const facts = await assertBusinessCutoverVerifiedRelease(proof, scope);
    const claim = await directory(source), parent = await directory(metadata.operationDirectory);
    if (claim.dev !== parent.dev || !await absent(destination)) throw closed();
    const intent: Intent = { version: 1, operationId: metadata.operationId, recordDigest: metadata.recordDigest,
      kind: facts.kind, planHash: facts.planHash, releaseId: facts.releaseId, factsHash: facts.factsHash, claim };
    const bytes = encode(intent);
    const saved = await create(intentPath, bytes, () => assertBusinessCutoverExclusive(scope));
    await assertBusinessCutoverVerifiedRelease(proof, scope); // fresh facts after durable intent
    const current = await read(intentPath);
    if (!same(saved.identity, current.identity) || !current.bytes.equals(bytes)) throw closed();
    parseIntent(current.bytes, metadata, claim);
    await assertBusinessCutoverExclusive(scope);
    if (!same(claim, await directory(source)) || !same(parent, await directory(metadata.operationDirectory)) || !await absent(destination)) throw closed();
    await assertBusinessCutoverExclusive(scope); // scope can expire during the destination/identity I/O
    // Cooperative private-directory perimeter, not portable RENAME_NOREPLACE.
    // Never replace an observed destination, copy across devices, or unlink pieces.
    await rename(source, destination);
    // Synchronous, private observation MUST precede every fallible postcommit IO.
    const error = Object.freeze(new Error("RELEASE_COMMIT_UNCONFIRMED"));
    observations.set(scope, error); observedErrors.set(error, uncertain);
    try {
      await markBusinessCutoverClaimRelocated(scope);
      await syncDirectory(dirname(source)); await syncDirectory(metadata.operationDirectory);
      await create(resolve(metadata.operationDirectory, "release-receipt.json"), encode(receipt(intent, bytes)),
        () => markBusinessCutoverClaimRelocated(scope));
      await markBusinessCutoverClaimRelocated(scope);
      return Object.freeze({ outcome: kind === "CANCEL" ? "CANCELLED" : "REOPENED", commitObserved: true, persistenceConfirmed: true });
    } catch { failedObservations.add(scope); return uncertain; }
  });
}

/** Read-only historical diagnosis. A newer global owner is inspected, never
 * resumed/mutated/removed. Invalid, partial or conflicting evidence is UNKNOWN. */
export async function readBusinessConsentCutoverOutcome(outputDirectory: string, operationId: string): Promise<Readonly<{
  outcome: "CLOSED" | "RELEASED" | "UNKNOWN"; persistenceConfirmed: boolean }>> {
  try {
    // Validate ID and current ancestors through the store before constructing any
    // caller-derived operation path. Neither branch returns a mutable capability.
    let metadata: BusinessCutoverOperation, released = false;
    try { metadata = await inspectBusinessCutoverOperationOwnership(outputDirectory, operationId, "ACTIVE"); }
    catch { metadata = await inspectBusinessCutoverOperationOwnership(outputDirectory, operationId, "RELOCATED"); released = true; }
    const operation = metadata.operationDirectory, target = resolve(operation, "released-claim");
    const claimPath = released ? target : resolve(metadata.outputDirectory, ".master-package-claims/ganomaster-business");
    const claim = await directory(claimPath), intentPath = resolve(operation, "release-intent.json"), receiptPath = resolve(operation, "release-receipt.json");
    let intent: Intent | undefined, saved: Awaited<ReturnType<typeof read>> | undefined;
    if (!await absent(intentPath)) { saved = await read(intentPath); intent = parseIntent(saved.bytes, metadata, claim); }
    if (released && !intent) throw closed();
    if (!await absent(receiptPath)) {
      if (!released || !intent || !saved) throw closed();
      if (!(await read(receiptPath)).bytes.equals(encode(receipt(intent, saved.bytes)))) throw closed();
    }
    if (released) {
      const global = await readBusinessCutoverClosure(outputDirectory);
      if (global && (await getBusinessCutoverOperation(global)).operationId === operationId) throw closed();
    } else if (!await absent(target)) throw closed();
    await inspectBusinessCutoverOperationOwnership(outputDirectory, operationId, released ? "RELOCATED" : "ACTIVE");
    if (!same(claim, await directory(claimPath))) throw closed();
    if (saved) {
      const final = await read(intentPath);
      if (!same(saved.identity, final.identity) || !saved.bytes.equals(final.bytes)) throw closed();
    }
    // A complete receipt can be visible even when its final fsync failed.
    // Disk-only evidence never self-certifies that acknowledgement. Only the
    // live successful finish result confirms all of its persistence steps.
    return Object.freeze({ outcome: released ? "RELEASED" : "CLOSED", persistenceConfirmed: false });
  } catch { return Object.freeze({ outcome: "UNKNOWN", persistenceConfirmed: false }); }
}
