import "server-only";

import { randomUUID } from "node:crypto";
import { constants, type Stats } from "node:fs";
import fs from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { z } from "zod";

import { masterSitesBusinessCommandResultSchema } from "@/shared/master-sites-business-contract";

const uuid = z.string().uuid().regex(/^[0-9a-f-]{36}$/);
const hash = z.string().regex(/^[0-9a-f]{64}$/);
const siteId = z.string().max(128).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*-business$/);
const counter = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER - 1);
const timestamp = z.string().datetime().max(30);
const bindingSchema = z.object({
  requestId: uuid, actorHash: hash, action: z.enum(["PREPARE_TARGET", "PUBLISH"]),
  activationLeadId: uuid, siteId, templateId: z.literal("ganomaster-business"),
  expectedRevision: hash, updateExisting: z.boolean()
}).strict();
const phaseSchema = z.enum([
  "PREPARED", "PREPARING_TARGET", "TARGET_PREPARED", "GENERATING", "GENERATED",
  "ENQUEUEING", "ENQUEUED", "COMPLETE", "RETRY_REQUIRED"
]);
const pinsSchema = z.object({
  sourceHash: hash.optional(), targetHash: hash.optional(), masterPackageHash: hash.optional(),
  packageHash: hash.optional(), generationInputHash: hash.optional(), jobId: hash.optional(), reviewedRevision: hash.optional()
}).strict().refine((pins) => Object.values(pins).every((value) => value !== undefined));
// Narrow the shared wire DTO's intentionally broad nullable strings/bounds at the storage boundary.
const resultSchema = masterSitesBusinessCommandResultSchema.extend({
  operationId: uuid, activationLeadId: uuid, siteId,
  publicHost: z.string().max(253).regex(/^negocio\.(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/).nullable(),
  blockedReasons: masterSitesBusinessCommandResultSchema.shape.blockedReasons.max(32),
  job: masterSitesBusinessCommandResultSchema.shape.job.unwrap().extend({
    attemptCount: z.number().int().min(0).max(1_000_000)
  }).nullable()
}).strict();
const recordSchema = z.object({
  schemaVersion: z.literal(1), operationId: uuid, binding: bindingSchema,
  version: counter, phase: phaseSchema, createdAt: timestamp, updatedAt: timestamp,
  pins: pinsSchema, result: resultSchema.nullable()
}).strict().superRefine((operation, context) => {
  if (operation.operationId !== operation.binding.requestId || operation.createdAt > operation.updatedAt ||
      (operation.result && (operation.result.operationId !== operation.operationId ||
        operation.result.activationLeadId !== operation.binding.activationLeadId || operation.result.siteId !== operation.binding.siteId))) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "INVALID_IDENTITY" });
  }
});
const patchSchema = z.object({
  phase: phaseSchema.optional(), pins: pinsSchema.optional(), result: resultSchema.nullable().optional()
}).strict().refine((patch) => Object.values(patch).some((value) => value !== undefined));

export type MasterSitesBusinessOperationBinding = z.infer<typeof bindingSchema>;
export type MasterSitesBusinessOperationPhase = z.infer<typeof phaseSchema>;
export type MasterSitesBusinessOperationPins = z.infer<typeof pinsSchema>;
export type MasterSitesBusinessOperationPatch = z.infer<typeof patchSchema>;
export type MasterSitesBusinessOperation = z.infer<typeof recordSchema>;
export type MasterSitesBusinessOperationStoreErrorCode =
  | "MASTER_SITES_OPERATION_INVALID" | "MASTER_SITES_OPERATION_CONFLICT" | "MASTER_SITES_OPERATION_BUSY"
  | "MASTER_SITES_OPERATION_CORRUPT" | "MASTER_SITES_OPERATION_STORAGE_ERROR" | "MASTER_SITES_OPERATION_OWNERSHIP_LOST";

export class MasterSitesBusinessOperationStoreError extends Error {
  readonly code: MasterSitesBusinessOperationStoreErrorCode;
  readonly retryable: boolean;
  constructor(code: MasterSitesBusinessOperationStoreErrorCode) {
    super(code);
    this.name = "MasterSitesBusinessOperationStoreError";
    this.code = code;
    this.retryable = code === "MASTER_SITES_OPERATION_BUSY";
  }
}

export interface MasterSitesBusinessOperationStore {
  get(requestId: string): Promise<MasterSitesBusinessOperation | null>;
  /** Unknown input is strictly validated, including otherwise valid extra properties. */
  create(binding: unknown): Promise<{ operation: MasterSitesBusinessOperation; created: boolean }>;
  /** CAS; supplied pins merge with existing pins. Immutable/unknown properties are rejected. */
  checkpoint(requestId: string, expectedVersion: number, patch: unknown): Promise<MasterSitesBusinessOperation>;
}

const fail = (code: MasterSitesBusinessOperationStoreErrorCode): never => { throw new MasterSitesBusinessOperationStoreError(code); };
const isCode = (error: unknown, code: string) => (error as NodeJS.ErrnoException)?.code === code;
const sameFile = (a: Stats, b: Stats) => a.dev === b.dev && a.ino === b.ino;
const MAX_RECORD_BYTES = 16_384;

function validate<T>(schema: z.ZodType<T>, value: unknown, code: MasterSitesBusinessOperationStoreErrorCode): T {
  const result = schema.safeParse(value);
  if (!result.success) return fail(code);
  return result.data;
}

// All raw filesystem/JSON/Zod failures stop at this boundary; no cause/path/token is exposed.
async function bounded<T>(action: () => Promise<T>): Promise<T> {
  try { return await action(); }
  catch (error) {
    if (error instanceof MasterSitesBusinessOperationStoreError) throw error;
    return fail("MASTER_SITES_OPERATION_STORAGE_ERROR");
  }
}

/** Storage only: never performs provider/generation/enqueue work or proves effect recovery. */
export function createMasterSitesBusinessOperationStore(options: { directory?: string } = {}): MasterSitesBusinessOperationStore {
  const directory = resolve(options.directory ?? resolve(process.env.PRODUCT_PAGE_OUTPUT_DIR ?? "/data/generated-sites", ".master-sites-business-operations"));

  async function rootExists(create: boolean): Promise<boolean> {
    // Check every existing ancestor BEFORE mkdir: a symlinked parent must not direct writes elsewhere.
    const paths: string[] = [];
    for (let path = directory; ; path = dirname(path)) {
      paths.unshift(path);
      if (dirname(path) === path) break;
    }
    let missing = false;
    for (const path of paths) {
      try {
        const stat = await fs.lstat(path);
        if (stat.isSymbolicLink() || !stat.isDirectory()) return fail("MASTER_SITES_OPERATION_STORAGE_ERROR");
      } catch (error) {
        if (!isCode(error, "ENOENT")) throw error;
        missing = true;
      }
    }
    if (missing && !create) return false;
    if (missing) await fs.mkdir(directory, { recursive: true, mode: 0o700 });
    const stat = await fs.lstat(directory);
    if (!stat.isDirectory() || stat.isSymbolicLink()) return fail("MASTER_SITES_OPERATION_STORAGE_ERROR");
    return true;
  }

  async function readSafe(path: string, limit: number, code: MasterSitesBusinessOperationStoreErrorCode): Promise<{ text: string; stat: Stats } | null> {
    let before: Stats;
    try { before = await fs.lstat(path); }
    catch (error) { if (isCode(error, "ENOENT")) return null; throw error; }
    if (before.isSymbolicLink() || !before.isFile() || before.nlink !== 1 || before.size > limit) return fail(code);
    const file = await fs.open(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    try {
      const stat = await file.stat();
      if (!sameFile(before, stat) || !stat.isFile() || stat.nlink !== 1 || stat.size > limit) return fail(code);
      const bytes = Buffer.alloc(limit + 1);
      let length = 0;
      while (length < bytes.length) {
        const read = await file.read(bytes, length, bytes.length - length, length);
        if (read.bytesRead === 0) break;
        length += read.bytesRead;
      }
      if (length > limit) return fail(code);
      return { text: bytes.subarray(0, length).toString("utf8"), stat };
    } finally { await file.close(); }
  }

  async function load(requestId: string): Promise<MasterSitesBusinessOperation | null> {
    if (!await rootExists(false)) return null;
    const file = await readSafe(resolve(directory, `${requestId}.json`), MAX_RECORD_BYTES, "MASTER_SITES_OPERATION_CORRUPT");
    if (!file) return null;
    let value: unknown;
    try { value = JSON.parse(file.text); } catch { return fail("MASTER_SITES_OPERATION_CORRUPT"); }
    const operation = validate(recordSchema, value, "MASTER_SITES_OPERATION_CORRUPT");
    if (operation.operationId !== requestId) return fail("MASTER_SITES_OPERATION_CORRUPT");
    return operation;
  }

  async function withOwnership<T>(requestId: string, action: (assertOwned: () => Promise<void>) => Promise<T>): Promise<T> {
    await rootExists(true);
    const claim = resolve(directory, `${requestId}.lock`);
    try { await fs.mkdir(claim, { mode: 0o700 }); }
    catch (error) { if (isCode(error, "EEXIST")) return fail("MASTER_SITES_OPERATION_BUSY"); throw error; }
    // Atomic mkdir owns the claim. Incomplete initialization stays closed; no TTL/PID stealing.
    const claimStat = await fs.lstat(claim);
    const ownerPath = resolve(claim, "owner.json");
    const token = randomUUID();
    const marker = JSON.stringify({ schemaVersion: 1, token });
    const file = await fs.open(ownerPath, "wx", 0o600);
    let ownerStat: Stats;
    try { await file.writeFile(marker); await file.sync(); ownerStat = await file.stat(); }
    finally { await file.close(); }
    const assertOwned = async () => {
      try {
        const current = await fs.lstat(claim);
        const owner = await readSafe(ownerPath, 256, "MASTER_SITES_OPERATION_OWNERSHIP_LOST");
        if (!sameFile(claimStat, current) || current.isSymbolicLink() || !current.isDirectory() || !owner ||
            !sameFile(ownerStat, owner.stat) || owner.text !== marker) return fail("MASTER_SITES_OPERATION_OWNERSHIP_LOST");
      } catch { return fail("MASTER_SITES_OPERATION_OWNERSHIP_LOST"); }
    };
    try {
      await assertOwned();
      return await action(assertOwned);
    } finally {
      // If replaced/malformed, do not delete either marker or directory and do not report success.
      await assertOwned();
      await fs.unlink(ownerPath);
      await fs.rmdir(claim);
    }
  }

  async function persist(operation: MasterSitesBusinessOperation, assertOwned: () => Promise<void>) {
    const content = JSON.stringify(operation);
    if (Buffer.byteLength(content) > MAX_RECORD_BYTES) return fail("MASTER_SITES_OPERATION_INVALID");
    const path = resolve(directory, `${operation.operationId}.${randomUUID()}.tmp`);
    const file = await fs.open(path, "wx", 0o600);
    const stat = await file.stat();
    const removeOwnedTemporary = async () => {
      try {
        const current = await fs.lstat(path);
        if (!current.isSymbolicLink() && sameFile(stat, current)) await fs.unlink(path);
      } catch (error) { if (!isCode(error, "ENOENT")) throw error; }
    };
    try {
      try { await file.writeFile(content); await file.sync(); }
      finally { await file.close(); }
      await assertOwned();
      await fs.rename(path, resolve(directory, `${operation.operationId}.json`));
      // POSIX directory sync makes the rename durable; Windows cannot open directories for fsync.
      if (process.platform !== "win32") {
        const root = await fs.open(directory, constants.O_RDONLY | (constants.O_DIRECTORY ?? 0));
        try { await root.sync(); } finally { await root.close(); }
      }
    } finally { await removeOwnedTemporary(); }
  }

  return {
    get(requestId) {
      return bounded(async () => load(validate(uuid, requestId, "MASTER_SITES_OPERATION_INVALID")));
    },
    create(input) {
      return bounded(async () => {
        const binding = validate(bindingSchema, input, "MASTER_SITES_OPERATION_INVALID");
        return withOwnership(binding.requestId, async (assertOwned) => {
          const existing = await load(binding.requestId);
          if (existing) {
            if (JSON.stringify(existing.binding) !== JSON.stringify(binding)) return fail("MASTER_SITES_OPERATION_CONFLICT");
            return { operation: existing, created: false };
          }
          const now = new Date().toISOString();
          const operation: MasterSitesBusinessOperation = {
            schemaVersion: 1, operationId: binding.requestId, binding, version: 0,
            phase: "PREPARED", createdAt: now, updatedAt: now, pins: {}, result: null
          };
          await persist(operation, assertOwned);
          return { operation, created: true };
        });
      });
    },
    checkpoint(requestId, expectedVersion, input) {
      return bounded(async () => {
        validate(uuid, requestId, "MASTER_SITES_OPERATION_INVALID");
        validate(counter, expectedVersion, "MASTER_SITES_OPERATION_INVALID");
        const patch = validate(patchSchema, input, "MASTER_SITES_OPERATION_INVALID");
        return withOwnership(requestId, async (assertOwned) => {
          const existing = await load(requestId);
          if (!existing || existing.version !== expectedVersion) return fail("MASTER_SITES_OPERATION_CONFLICT");
          const operation = validate(recordSchema, {
            ...existing, ...patch, pins: { ...existing.pins, ...patch.pins }, version: existing.version + 1,
            updatedAt: new Date(Math.max(Date.now(), Date.parse(existing.updatedAt))).toISOString()
          }, "MASTER_SITES_OPERATION_INVALID");
          await persist(operation, assertOwned);
          return operation;
        });
      });
    }
  };
}
