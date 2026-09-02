import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { access, link, mkdir, open, readFile, readdir, rename, rm } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";

import { z } from "zod";

import { getPartnerPublicHost } from "@/server/services/partnerHostnameContract";
import { MASTER_SITE_IDS } from "@/server/services/ecosystemTemplateResolver";

const HASH = /^[0-9a-f]{64}$/;
const SAFE_ERROR_CODE = /^[A-Z0-9_:-]{1,160}$/;
const siteIdSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const ecosystemTypeSchema = z.enum(["PRODUCT", "BUSINESS", "PERSONAL_BRAND"]);
const statusSchema = z.enum(["QUEUED", "RUNNING", "SUCCEEDED", "FAILED", "CANCELLED"]);
const phaseSchema = z.enum([
  "QUEUED",
  "PREPARING_PACKAGE",
  "VALIDATING_CAPABILITY",
  "PLANNING_PUBLICATION",
  "PUBLISHING",
  "VERIFYING",
  "COMPLETE"
]);

const targetSchema = z.object({
  version: z.literal(2),
  ownerKey: z.string().uuid(),
  siteId: siteIdSchema,
  ecosystemType: ecosystemTypeSchema,
  rootEcosystemType: ecosystemTypeSchema,
  baseDomain: z.string().min(1),
  publicHost: z.string().min(1),
  remoteRoot: z.string().min(2).startsWith("/"),
  provisioningState: z.literal("READY"),
  publicationState: z.enum(["PENDING", "READY"])
}).passthrough();

const sourceSchema = z.object({
  ecosystemType: ecosystemTypeSchema,
  site: z.object({ id: siteIdSchema, domain: z.string().min(1) }).passthrough()
}).passthrough();

const intentSchema = z.object({
  schemaVersion: z.literal(1),
  operation: z.literal("PUBLISH_PARTNER_ECOSYSTEM"),
  ownerKey: z.string().uuid(),
  ownerSiteId: siteIdSchema,
  siteId: siteIdSchema,
  ecosystemType: ecosystemTypeSchema,
  baseDomain: z.string().min(1),
  publicHost: z.string().min(1),
  sourceHash: z.string().regex(HASH),
  targetHash: z.string().regex(HASH),
  masterPackageHash: z.string().regex(HASH)
});

const evidenceSchema = z.object({
  phase: phaseSchema,
  recordedAt: z.string().datetime(),
  packageHash: z.string().regex(HASH).optional(),
  capabilityHash: z.string().regex(HASH).optional(),
  planHash: z.string().regex(HASH).optional(),
  journalHash: z.string().regex(HASH).optional()
}).strict();

const leaseSchema = z.object({
  tokenHash: z.string().regex(HASH),
  workerHash: z.string().regex(HASH),
  acquiredAt: z.string().datetime(),
  expiresAt: z.string().datetime()
});

export const publicationJobSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().regex(HASH),
  intentHash: z.string().regex(HASH),
  intent: intentSchema,
  status: statusSchema,
  phase: phaseSchema,
  revision: z.number().int().positive(),
  attemptCount: z.number().int().nonnegative(),
  requestedBySubjectHash: z.string().regex(HASH),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lease: leaseSchema.optional(),
  evidence: z.array(evidenceSchema),
  lastErrorCode: z.string().regex(SAFE_ERROR_CODE).optional(),
  completedAt: z.string().datetime().optional(),
  cancelledAt: z.string().datetime().optional()
}).strict().superRefine((job, context) => {
  if (job.status === "RUNNING" && !job.lease) context.addIssue({ code: "custom", path: ["lease"], message: "RUNNING job requires a lease" });
  if (job.status !== "RUNNING" && job.lease) context.addIssue({ code: "custom", path: ["lease"], message: "Only RUNNING jobs may retain a lease" });
  if (job.status === "SUCCEEDED" && (job.phase !== "COMPLETE" || !job.completedAt)) context.addIssue({ code: "custom", path: ["completedAt"], message: "SUCCEEDED job requires terminal evidence" });
  if (job.status !== "SUCCEEDED" && job.completedAt) context.addIssue({ code: "custom", path: ["completedAt"], message: "Only SUCCEEDED jobs may be completed" });
  if (job.status === "CANCELLED" && !job.cancelledAt) context.addIssue({ code: "custom", path: ["cancelledAt"], message: "CANCELLED job requires a timestamp" });
  if (job.status !== "CANCELLED" && job.cancelledAt) context.addIssue({ code: "custom", path: ["cancelledAt"], message: "Only CANCELLED jobs may retain cancellation evidence" });
  if (job.status === "FAILED" && !job.lastErrorCode) context.addIssue({ code: "custom", path: ["lastErrorCode"], message: "FAILED job requires a safe error code" });
  if (job.status !== "FAILED" && job.lastErrorCode) context.addIssue({ code: "custom", path: ["lastErrorCode"], message: "Only FAILED jobs may retain an error code" });
});

export const publicationJobCreateInputSchema = z.object({ siteId: siteIdSchema }).strict();
export type PublicationJob = z.infer<typeof publicationJobSchema>;
export type PublicationJobPhase = z.infer<typeof phaseSchema>;
export type PublicationJobEvidence = z.infer<typeof evidenceSchema>;

type ServiceOptions = {
  sourceDirectory?: string;
  outputDirectory?: string;
  jobDirectory?: string;
  now?: () => Date;
  token?: () => string;
};

const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const exists = async (path: string) => access(path).then(() => true, () => false);

function inside(root: string, child: string) {
  const base = resolve(root);
  const target = resolve(base, child);
  if (!target.startsWith(`${base}${sep}`)) throw new Error("PUBLICATION_JOB_PATH_ESCAPE");
  return target;
}

function ownerSiteId(siteId: string, ecosystemType: z.infer<typeof ecosystemTypeSchema>) {
  if (ecosystemType === "PERSONAL_BRAND") return siteId;
  const suffix = ecosystemType === "PRODUCT" ? "-product" : "-business";
  if (!siteId.endsWith(suffix)) throw new Error("PUBLICATION_JOB_SITE_IDENTITY_INVALID");
  return siteId.slice(0, -suffix.length);
}

function safeJob(job: PublicationJob) {
  return {
    id: job.id,
    siteId: job.intent.siteId,
    ecosystemType: job.intent.ecosystemType,
    publicHost: job.intent.publicHost,
    status: job.status,
    phase: job.phase,
    revision: job.revision,
    attemptCount: job.attemptCount,
    evidence: job.evidence,
    lastErrorCode: job.lastErrorCode,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    completedAt: job.completedAt,
    cancelledAt: job.cancelledAt
  };
}

export function createPublicationJobService(options: ServiceOptions = {}) {
  const sourceDirectory = resolve(options.sourceDirectory ?? process.env.PRODUCT_PAGE_SOURCE_DIR ?? "/data/generated-sites/.sources");
  const outputDirectory = resolve(options.outputDirectory ?? process.env.PRODUCT_PAGE_OUTPUT_DIR ?? "/data/generated-sites");
  const jobDirectory = resolve(options.jobDirectory ?? process.env.PRODUCT_PAGE_PUBLICATION_JOB_DIR ?? "/data/generated-sites/.publication-jobs");
  const claimsDirectory = inside(jobDirectory, ".claims");
  const locksDirectory = inside(jobDirectory, ".locks");
  const now = options.now ?? (() => new Date());
  const token = options.token ?? randomUUID;
  const jobPath = (id: string) => inside(jobDirectory, `${z.string().regex(HASH).parse(id)}.json`);
  const claimPath = (id: string) => inside(claimsDirectory, `${z.string().regex(HASH).parse(id)}.json`);
  const lockPath = (id: string) => inside(locksDirectory, `${z.string().regex(HASH).parse(id)}.json`);

  async function atomicCreate(path: string, value: unknown) {
    await mkdir(dirname(path), { recursive: true, mode: 0o700 });
    const temporary = `${path}.tmp-${token()}`;
    const handle = await open(temporary, "wx", 0o600);
    try {
      await handle.writeFile(json(value));
      await handle.sync();
    } finally {
      await handle.close();
    }
    try {
      await link(temporary, path);
    } finally {
      await rm(temporary, { force: true });
    }
  }

  async function atomicReplace(path: string, value: unknown) {
    const temporary = `${path}.tmp-${token()}`;
    const handle = await open(temporary, "wx", 0o600);
    try {
      await handle.writeFile(json(value));
      await handle.sync();
    } finally {
      await handle.close();
    }
    await rename(temporary, path);
  }

  async function withJobLock<T>(id: string, action: () => Promise<T>) {
    await mkdir(locksDirectory, { recursive: true, mode: 0o700 });
    const path = lockPath(id); const rawToken = token(); const tokenHash = sha256(rawToken);
    const createLock = () => atomicCreate(path, { tokenHash, expiresAt: new Date(now().getTime() + 30_000).toISOString() });
    try {
      await createLock();
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      let current: { tokenHash?: unknown; expiresAt?: unknown };
      try { current = JSON.parse(await readFile(path, "utf8")); } catch { throw new Error("PUBLICATION_JOB_LOCK_CORRUPT"); }
      if (typeof current.tokenHash !== "string" || !HASH.test(current.tokenHash) || typeof current.expiresAt !== "string" || !Number.isFinite(Date.parse(current.expiresAt))) {
        throw new Error("PUBLICATION_JOB_LOCK_CORRUPT");
      }
      if (Date.parse(current.expiresAt) > now().getTime()) throw new Error("PUBLICATION_JOB_BUSY");
      const stale = `${path}.stale-${token()}`;
      try { await rename(path, stale); } catch { throw new Error("PUBLICATION_JOB_BUSY"); }
      await rm(stale, { force: true });
      try { await createLock(); } catch (retryError) { if ((retryError as NodeJS.ErrnoException).code === "EEXIST") throw new Error("PUBLICATION_JOB_BUSY"); throw retryError; }
    }
    try {
      return await action();
    } finally {
      try {
        const current = JSON.parse(await readFile(path, "utf8"));
        if (current?.tokenHash === tokenHash) await rm(path, { force: true });
      } catch {
        // A missing or replaced lock is never removed by a former owner.
      }
    }
  }

  async function readJob(id: string) {
    try {
      return publicationJobSchema.parse(JSON.parse(await readFile(jobPath(id), "utf8")));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      if (error instanceof z.ZodError || error instanceof SyntaxError) throw new Error("PUBLICATION_JOB_CORRUPT");
      throw error;
    }
  }

  async function packageHash(directory: string) {
    const files: Array<{ path: string; hash: string }> = [];
    async function visit(current: string) {
      for (const entry of await readdir(current, { withFileTypes: true })) {
        const path = resolve(current, entry.name);
        if (entry.isDirectory()) await visit(path);
        else if (entry.isFile()) files.push({ path: relative(directory, path).split(sep).join("/"), hash: sha256(await readFile(path)) });
      }
    }
    try { await visit(directory); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") throw new Error("PUBLICATION_JOB_MASTER_PACKAGE_MISSING"); throw error; }
    if (!files.length) throw new Error("PUBLICATION_JOB_MASTER_PACKAGE_MISSING");
    files.sort((left, right) => left.path.localeCompare(right.path));
    return sha256(JSON.stringify(files));
  }

  async function resolveIntent(siteId: string) {
    const safeSiteId = siteIdSchema.parse(siteId);
    const sourcePath = inside(sourceDirectory, `${safeSiteId}.json`);
    const targetPath = inside(inside(sourceDirectory, ".publishing-targets"), `${safeSiteId}.json`);
    let sourceBytes: Buffer; let targetBytes: Buffer;
    try {
      [sourceBytes, targetBytes] = await Promise.all([readFile(sourcePath), readFile(targetPath)]);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") throw new Error("PUBLICATION_JOB_SOURCE_OR_TARGET_MISSING");
      throw error;
    }
    let source: z.infer<typeof sourceSchema>; let target: z.infer<typeof targetSchema>;
    try {
      source = sourceSchema.parse(JSON.parse(sourceBytes.toString("utf8")));
      target = targetSchema.parse(JSON.parse(targetBytes.toString("utf8")));
    } catch {
      throw new Error("PUBLICATION_JOB_SOURCE_OR_TARGET_INVALID");
    }
    const ownerSite = ownerSiteId(target.siteId, target.ecosystemType);
    if (target.siteId !== safeSiteId || source.site.id !== safeSiteId || source.ecosystemType !== target.ecosystemType ||
        source.site.domain !== target.publicHost || target.publicHost !== getPartnerPublicHost(target.baseDomain, target.ecosystemType) ||
        (target.ecosystemType !== "PERSONAL_BRAND" && !ownerSite)) throw new Error("PUBLICATION_JOB_SOURCE_TARGET_IDENTITY_MISMATCH");
    return intentSchema.parse({
      schemaVersion: 1,
      operation: "PUBLISH_PARTNER_ECOSYSTEM",
      ownerKey: target.ownerKey,
      ownerSiteId: ownerSite,
      siteId: target.siteId,
      ecosystemType: target.ecosystemType,
      baseDomain: target.baseDomain,
      publicHost: target.publicHost,
      sourceHash: sha256(sourceBytes),
      targetHash: sha256(targetBytes),
      masterPackageHash: await packageHash(inside(outputDirectory, MASTER_SITE_IDS[target.ecosystemType]))
    });
  }

  async function enqueue(input: z.input<typeof publicationJobCreateInputSchema>, requestedBySubject: string) {
    const { siteId } = publicationJobCreateInputSchema.parse(input);
    if (!requestedBySubject.trim()) throw new Error("PUBLICATION_JOB_REQUESTOR_MISSING");
    const intent = await resolveIntent(siteId);
    const intentHash = sha256(JSON.stringify(intent));
    const timestamp = now().toISOString();
    const job = publicationJobSchema.parse({
      schemaVersion: 1,
      id: intentHash,
      intentHash,
      intent,
      status: "QUEUED",
      phase: "QUEUED",
      revision: 1,
      attemptCount: 0,
      requestedBySubjectHash: sha256(requestedBySubject),
      createdAt: timestamp,
      updatedAt: timestamp,
      evidence: []
    });
    try {
      await atomicCreate(jobPath(job.id), job);
      return { job, created: true };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      const existing = await readJob(job.id);
      if (!existing || existing.intentHash !== intentHash || JSON.stringify(existing.intent) !== JSON.stringify(intent)) throw new Error("PUBLICATION_JOB_IDEMPOTENCY_CONFLICT");
      return { job: existing, created: false };
    }
  }

  async function list(filters: { siteId?: string; status?: z.infer<typeof statusSchema> } = {}) {
    if (!(await exists(jobDirectory))) return [];
    const names = (await readdir(jobDirectory, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && HASH.test(entry.name.replace(/\.json$/, "")) && entry.name.endsWith(".json"))
      .map((entry) => entry.name.slice(0, -5));
    const jobs = await Promise.all(names.map(async (id) => {
      const job = await readJob(id);
      if (!job) throw new Error("PUBLICATION_JOB_DISAPPEARED");
      return job;
    }));
    return jobs.filter((job) => (!filters.siteId || job.intent.siteId === filters.siteId) && (!filters.status || job.status === filters.status))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  async function acquireClaim(job: PublicationJob, workerId: string, leaseSeconds: number) {
    if (!workerId.trim()) throw new Error("PUBLICATION_JOB_WORKER_MISSING");
    if (!Number.isInteger(leaseSeconds) || leaseSeconds < 30 || leaseSeconds > 3600) throw new Error("PUBLICATION_JOB_LEASE_INVALID");
    await mkdir(claimsDirectory, { recursive: true, mode: 0o700 });
    const rawToken = token();
    const acquiredAt = now();
    const claim = leaseSchema.parse({ tokenHash: sha256(rawToken), workerHash: sha256(workerId), acquiredAt: acquiredAt.toISOString(), expiresAt: new Date(acquiredAt.getTime() + leaseSeconds * 1000).toISOString() });
    const path = claimPath(job.id);
    try {
      await atomicCreate(path, claim);
      return { rawToken, claim };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      let current: z.infer<typeof leaseSchema>;
      try { current = leaseSchema.parse(JSON.parse(await readFile(path, "utf8"))); }
      catch { throw new Error("PUBLICATION_JOB_LEASE_CORRUPT"); }
      if (Date.parse(current.expiresAt) > now().getTime()) return null;
      const stale = `${path}.stale-${token()}`;
      try { await rename(path, stale); } catch { return null; }
      await rm(stale, { force: true });
      try { await atomicCreate(path, claim); return { rawToken, claim }; }
      catch (retryError) { if ((retryError as NodeJS.ErrnoException).code === "EEXIST") return null; throw retryError; }
    }
  }

  async function claimNext(workerId: string, leaseSeconds = 300) {
    const jobs = (await list()).filter((job) => job.status === "QUEUED" ||
      (job.status === "RUNNING" && job.lease && Date.parse(job.lease.expiresAt) <= now().getTime()));
    for (const candidate of jobs) {
      try {
        const result = await withJobLock(candidate.id, async () => {
          const current = await readJob(candidate.id);
          const recoverable = current?.status === "RUNNING" && current.lease && Date.parse(current.lease.expiresAt) <= now().getTime();
          if (!current || (current.status !== "QUEUED" && !recoverable)) return null;
          const acquired = await acquireClaim(current, workerId, leaseSeconds);
          if (!acquired) return null;
          const timestamp = now().toISOString();
          const claimed = publicationJobSchema.parse({ ...current, status: "RUNNING", phase: "PREPARING_PACKAGE", revision: current.revision + 1,
            attemptCount: current.attemptCount + 1, updatedAt: timestamp, lease: acquired.claim, lastErrorCode: undefined });
          await atomicReplace(jobPath(candidate.id), claimed);
          return { job: claimed, leaseToken: acquired.rawToken };
        });
        if (result) return result;
      } catch (error) {
        if (!(error instanceof Error) || error.message !== "PUBLICATION_JOB_BUSY") throw error;
      }
    }
    return null;
  }

  async function assertLease(id: string, rawToken: string) {
    const job = await readJob(id);
    if (!job) throw new Error("PUBLICATION_JOB_NOT_FOUND");
    if (job.status !== "RUNNING" || !job.lease || job.lease.tokenHash !== sha256(rawToken)) throw new Error("PUBLICATION_JOB_LEASE_OWNERSHIP_LOST");
    const claim = leaseSchema.parse(JSON.parse(await readFile(claimPath(id), "utf8")));
    if (claim.tokenHash !== job.lease.tokenHash || Date.parse(claim.expiresAt) <= now().getTime()) throw new Error("PUBLICATION_JOB_LEASE_OWNERSHIP_LOST");
    return job;
  }

  async function advance(id: string, rawToken: string, phase: PublicationJobPhase, evidence: Omit<PublicationJobEvidence, "phase" | "recordedAt"> = {}) {
    return withJobLock(id, async () => {
      const job = await assertLease(id, rawToken);
      const allowed: Partial<Record<PublicationJobPhase, PublicationJobPhase[]>> = {
        PREPARING_PACKAGE: ["VALIDATING_CAPABILITY", "PLANNING_PUBLICATION"],
        VALIDATING_CAPABILITY: ["PLANNING_PUBLICATION"],
        PLANNING_PUBLICATION: ["PUBLISHING"],
        PUBLISHING: ["VERIFYING"]
      };
      if (!allowed[job.phase]?.includes(phase)) throw new Error("PUBLICATION_JOB_PHASE_TRANSITION_INVALID");
      const timestamp = now().toISOString();
      const nextEvidence = evidenceSchema.parse({ ...evidence, phase, recordedAt: timestamp });
      const updated = publicationJobSchema.parse({ ...job, phase, revision: job.revision + 1, updatedAt: timestamp, evidence: [...job.evidence, nextEvidence] });
      await atomicReplace(jobPath(id), updated);
      return updated;
    });
  }

  async function complete(id: string, rawToken: string, evidence: Omit<PublicationJobEvidence, "phase" | "recordedAt"> = {}) {
    return withJobLock(id, async () => {
      const job = await assertLease(id, rawToken);
      if (job.phase !== "VERIFYING") throw new Error("PUBLICATION_JOB_PHASE_TRANSITION_INVALID");
      const timestamp = now().toISOString();
      const finalEvidence = evidenceSchema.parse({ ...evidence, phase: "COMPLETE", recordedAt: timestamp });
      const completed = publicationJobSchema.parse({ ...job, status: "SUCCEEDED", phase: "COMPLETE", revision: job.revision + 1, updatedAt: timestamp,
        completedAt: timestamp, lease: undefined, evidence: [...job.evidence, finalEvidence] });
      await atomicReplace(jobPath(id), completed);
      await rm(claimPath(id), { force: true });
      return completed;
    });
  }

  async function fail(id: string, rawToken: string, errorCode: string) {
    if (!SAFE_ERROR_CODE.test(errorCode)) throw new Error("PUBLICATION_JOB_ERROR_CODE_INVALID");
    return withJobLock(id, async () => {
      const job = await assertLease(id, rawToken); const timestamp = now().toISOString();
      const failed = publicationJobSchema.parse({ ...job, status: "FAILED", revision: job.revision + 1, updatedAt: timestamp, lastErrorCode: errorCode, lease: undefined });
      await atomicReplace(jobPath(id), failed); await rm(claimPath(id), { force: true }); return failed;
    });
  }

  async function retry(id: string) {
    return withJobLock(id, async () => {
      const job = await readJob(id); if (!job) throw new Error("PUBLICATION_JOB_NOT_FOUND");
      if (job.status !== "FAILED" && job.status !== "CANCELLED") throw new Error("PUBLICATION_JOB_RETRY_INVALID");
      const acquired = await acquireClaim(job, `retry:${id}`, 30); if (!acquired) throw new Error("PUBLICATION_JOB_ACTIVE");
      const timestamp = now().toISOString();
      const queued = publicationJobSchema.parse({ ...job, status: "QUEUED", phase: "QUEUED", revision: job.revision + 1, updatedAt: timestamp,
        lastErrorCode: undefined, cancelledAt: undefined, lease: undefined });
      await atomicReplace(jobPath(id), queued); await rm(claimPath(id), { force: true }); return queued;
    });
  }

  async function cancel(id: string) {
    return withJobLock(id, async () => {
      const job = await readJob(id); if (!job) throw new Error("PUBLICATION_JOB_NOT_FOUND");
      if (job.status !== "QUEUED" && job.status !== "FAILED") throw new Error("PUBLICATION_JOB_CANCEL_INVALID");
      const acquired = await acquireClaim(job, `cancel:${id}`, 30); if (!acquired) throw new Error("PUBLICATION_JOB_ACTIVE");
      const timestamp = now().toISOString();
      const cancelled = publicationJobSchema.parse({ ...job, status: "CANCELLED", revision: job.revision + 1, updatedAt: timestamp,
        cancelledAt: timestamp, lastErrorCode: undefined, lease: undefined });
      await atomicReplace(jobPath(id), cancelled); await rm(claimPath(id), { force: true }); return cancelled;
    });
  }

  return { enqueue, get: readJob, list, claimNext, advance, complete, fail, retry, cancel, toSafeJob: safeJob };
}

export const publicationJobService = createPublicationJobService();
