import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { access, mkdir, open, readFile, readdir } from "node:fs/promises";
import { posix, relative, resolve, sep } from "node:path";

import { MASTER_SITE_IDS, type EcosystemType } from "@/server/services/ecosystemTemplateResolver";
import {
  publicationJobService,
  type PublicationJob,
  type PublicationJobEvidence,
  type PublicationJobPhase
} from "@/server/services/publicationJobService";
import { productPageGenerationService } from "@/server/services/productPageGenerationService";
import {
  APPLY_CONFIRMATION,
  APPLY_MODE,
  createSftpAdapter,
  planGuardedPublication,
  runGuardedPublication,
  verifyPublicPackage
} from "../../scripts/guarded-ecosystem-publication.mjs";
import {
  PROBE_CONFIRMATION,
  PROBE_MODE,
  planSftpCapabilityProbe,
  runSftpCapabilityProbe
} from "../../scripts/sftp-directory-rename-capability-probe.mjs";

const HASH = /^[0-9a-f]{64}$/;
const SAFE_ERROR = /^[A-Z0-9_:-]{1,160}$/;
const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const exists = (path: string) => access(path).then(() => true, () => false);

type JobStore = Pick<typeof publicationJobService, "claimNext" | "advance" | "complete" | "fail" | "toSafeJob">;
type Advance = (
  phase: PublicationJobPhase,
  evidence?: Omit<PublicationJobEvidence, "phase" | "recordedAt">
) => Promise<PublicationJob>;

export type PublicationExecution = {
  execute(job: PublicationJob, advance: Advance): Promise<Omit<PublicationJobEvidence, "phase" | "recordedAt">>;
};

function inside(root: string, child: string) {
  const base = resolve(root);
  const target = resolve(base, child);
  if (!target.startsWith(`${base}${sep}`)) throw new Error("PUBLICATION_WORKER_PATH_ESCAPE");
  return target;
}

async function required(path: string) {
  const bytes = await readFile(path);
  return { bytes, hash: sha256(bytes) };
}

async function inventory(directory: string) {
  const files: Array<{ path: string; localPath: string; hash: string }> = [];
  async function visit(current: string) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const path = resolve(current, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile()) files.push({
        path: relative(directory, path).split(sep).join("/"),
        localPath: path,
        hash: sha256(await readFile(path))
      });
    }
  }
  await visit(directory);
  files.sort((left, right) => left.path.localeCompare(right.path));
  return { files, hash: sha256(JSON.stringify(files.map(({ path, hash }) => ({ path, hash })))) };
}

async function writeExclusive(path: string, value: unknown) {
  const handle = await open(path, "wx", 0o600);
  try {
    await handle.writeFile(json(value));
    await handle.sync();
  } finally {
    await handle.close();
  }
}

function safeErrorCode(error: unknown) {
  const raw = error instanceof Error ? error.message : "UNKNOWN";
  const first = raw.split(":", 1)[0].toUpperCase().replace(/[^A-Z0-9_]/g, "_").replace(/_+/g, "_").slice(0, 120);
  const code = `PUBLICATION_WORKER_${first || "FAILED"}`;
  return SAFE_ERROR.test(code) ? code : "PUBLICATION_WORKER_FAILED";
}

function siblingSiteIds(job: PublicationJob) {
  const ids = [job.intent.ownerSiteId, `${job.intent.ownerSiteId}-product`, `${job.intent.ownerSiteId}-business`];
  return [...new Set(ids)].filter((siteId) => siteId !== job.intent.siteId);
}

function probeManifest(job: PublicationJob, target: Record<string, unknown>, targetHash: string) {
  const remoteRoot = posix.normalize(String(target.remoteRoot)).replace(/\/+$/, "");
  const parentDirectory = posix.dirname(remoteRoot);
  if (!remoteRoot.startsWith("/") || remoteRoot === "/" || parentDirectory === "/") throw new Error("TARGET_REMOTE_ROOT_INVALID");
  const probeToken = randomUUID();
  const path = (kind: string) => posix.join(parentDirectory, `.partnerhub-capability-${kind}-${probeToken}`);
  return {
    confirmation: "PREVIEW_SFTP_DIRECTORY_RENAME_CAPABILITY",
    allowlist: [{
      ownerKey: job.intent.ownerKey,
      siteId: job.intent.siteId,
      ecosystemType: job.intent.ecosystemType,
      baseDomain: job.intent.baseDomain,
      publicHost: job.intent.publicHost,
      expectedTargetHash: targetHash,
      remoteRoot,
      parentDirectory,
      probeToken,
      paths: { claim: path("claim"), stage: path("stage"), destination: path("destination"), backup: path("backup") },
      canaryHex: randomBytes(32).toString("hex"),
      ttlSeconds: 3600
    }]
  };
}

function publicationManifest(
  job: PublicationJob,
  pins: {
    sourceHash: string;
    targetHash: string;
    packageHash: string;
    capabilityHash: string;
    remoteHash: string | null;
    protectedLocalArtifacts: Array<{ siteId: string; expectedHash: string }>;
  }
) {
  return {
    confirmation: "PREVIEW_GUARDED_ECOSYSTEM_PUBLICATION",
    allowlist: [{
      ownerKey: job.intent.ownerKey,
      publicationJobId: job.id,
      ownerSiteId: job.intent.ownerSiteId,
      siteId: job.intent.siteId,
      ecosystemType: job.intent.ecosystemType,
      baseDomain: job.intent.baseDomain,
      publicHost: job.intent.publicHost,
      expectedSourceHash: pins.sourceHash,
      expectedTargetHash: pins.targetHash,
      expectedPackageHash: pins.packageHash,
      expectedCapabilityHash: pins.capabilityHash,
      expectedRemotePackageHash: pins.remoteHash,
      protectedLocalArtifacts: pins.protectedLocalArtifacts
    }]
  };
}

export function createPublicationExecution(options: {
  sourceDirectory?: string;
  outputDirectory?: string;
  workDirectory?: string;
  journalDirectory?: string;
  environment?: NodeJS.ProcessEnv;
  generate?: typeof productPageGenerationService.regenerateFromSavedSource;
  adapterFactory?: typeof createSftpAdapter;
  verifyPublic?: typeof verifyPublicPackage;
  now?: () => Date;
} = {}): PublicationExecution {
  const environment = options.environment ?? process.env;
  const sourceDirectory = resolve(options.sourceDirectory ?? environment.PRODUCT_PAGE_SOURCE_DIR ?? "/data/generated-sites/.sources");
  const outputDirectory = resolve(options.outputDirectory ?? environment.PRODUCT_PAGE_OUTPUT_DIR ?? "/data/generated-sites");
  const workDirectory = resolve(options.workDirectory ?? environment.PRODUCT_PAGE_PUBLICATION_WORK_DIR ?? "/data/generated-sites/.publication-work");
  const journalDirectory = resolve(options.journalDirectory ?? environment.PRODUCT_PAGE_PUBLICATION_JOURNAL_DIR ?? "/data/generated-sites/.publication-journals");
  const generate = options.generate ?? productPageGenerationService.regenerateFromSavedSource.bind(productPageGenerationService);
  const adapterFactory = options.adapterFactory ?? createSftpAdapter;
  const verifyPublic = options.verifyPublic ?? verifyPublicPackage;
  const now = options.now ?? (() => new Date());

  return {
    async execute(job, advance) {
      const sourcePath = inside(sourceDirectory, `${job.intent.siteId}.json`);
      const targetPath = inside(inside(sourceDirectory, ".publishing-targets"), `${job.intent.siteId}.json`);
      const [sourceBefore, targetBefore] = await Promise.all([required(sourcePath), required(targetPath)]);
      if (sourceBefore.hash !== job.intent.sourceHash) throw new Error("SOURCE_HASH_DRIFT");
      const masterDirectory = inside(outputDirectory, MASTER_SITE_IDS[job.intent.ecosystemType as EcosystemType]);
      if ((await inventory(masterDirectory)).hash !== job.intent.masterPackageHash) throw new Error("MASTER_PACKAGE_HASH_DRIFT");

      let source: Record<string, unknown>; let target: Record<string, unknown>;
      try { source = JSON.parse(sourceBefore.bytes.toString("utf8")); target = JSON.parse(targetBefore.bytes.toString("utf8")); }
      catch { throw new Error("TARGET_JSON_INVALID"); }
      const journalSiteDirectory = inside(journalDirectory, job.intent.siteId);
      if (await exists(journalSiteDirectory)) {
        const candidates = [];
        for (const name of await readdir(journalSiteDirectory)) {
          if (!name.endsWith(".json")) continue;
          const path = inside(journalSiteDirectory, name); let value: Record<string, unknown>;
          try { value = JSON.parse(await readFile(path, "utf8")); } catch { continue; }
          if (value.publicationJobId === job.id) candidates.push({ path, value, file: await required(path) });
        }
        if (candidates.length > 1) throw new Error("PUBLICATION_RECOVERY_JOURNAL_AMBIGUOUS");
        if (candidates.length === 1) {
          const committed = candidates[0]; const value = committed.value;
          if (value.mode !== APPLY_MODE || value.sourceHash !== job.intent.sourceHash || value.initialTargetHash !== job.intent.targetHash ||
              value.finalTargetHash !== targetBefore.hash || value.publicHost !== job.intent.publicHost || value.remoteRoot !== target.remoteRoot ||
              value.targetPath !== targetPath || !HASH.test(String(value.packageHash ?? "")) || !HASH.test(String(value.capabilityHash ?? "")) ||
              !HASH.test(String(value.planHash ?? "")) || target.publicationState !== "READY") throw new Error("PUBLICATION_RECOVERY_JOURNAL_INVALID");
          const adapter = await adapterFactory(environment);
          try {
            const remote = await adapter.inventory(String(target.remoteRoot));
            if (!remote.exists || remote.hash !== value.packageHash) throw new Error("PUBLICATION_RECOVERY_REMOTE_DRIFT");
            const verification = await verifyPublic({ ...job.intent }, source);
            if (!verification.passed) throw new Error("PUBLICATION_RECOVERY_PUBLIC_VERIFICATION_FAILED");
          } finally { await adapter.close(); }
          const evidence = { packageHash: String(value.packageHash), capabilityHash: String(value.capabilityHash), planHash: String(value.planHash), journalHash: committed.file.hash };
          await advance("VALIDATING_CAPABILITY", { packageHash: evidence.packageHash });
          await advance("PLANNING_PUBLICATION", { packageHash: evidence.packageHash, capabilityHash: evidence.capabilityHash });
          await advance("PUBLISHING", { packageHash: evidence.packageHash, capabilityHash: evidence.capabilityHash, planHash: evidence.planHash });
          await advance("VERIFYING", evidence);
          return evidence;
        }
      }
      if (targetBefore.hash !== job.intent.targetHash) throw new Error("TARGET_HASH_DRIFT");
      if (!["PENDING", "READY"].includes(String(target.publicationState))) throw new Error("TARGET_PUBLICATION_STATE_INVALID");

      await generate(job.intent.siteId, {
        templateSource: "master",
        masterSiteId: MASTER_SITE_IDS[job.intent.ecosystemType as EcosystemType]
      });

      const [sourceAfter, targetAfter] = await Promise.all([required(sourcePath), required(targetPath)]);
      if (sourceAfter.hash !== job.intent.sourceHash) throw new Error("SOURCE_HASH_DRIFT_AFTER_GENERATION");
      if (targetAfter.hash !== job.intent.targetHash) throw new Error("TARGET_HASH_DRIFT_AFTER_GENERATION");
      if ((await inventory(masterDirectory)).hash !== job.intent.masterPackageHash) throw new Error("MASTER_PACKAGE_HASH_DRIFT_AFTER_GENERATION");
      const packageDirectory = inside(outputDirectory, job.intent.siteId);
      const packageState = await inventory(packageDirectory);
      if (!packageState.files.length) throw new Error("GENERATED_PACKAGE_EMPTY");
      await advance("VALIDATING_CAPABILITY", { packageHash: packageState.hash });

      const protectedLocalArtifacts = [];
      for (const siteId of siblingSiteIds(job)) {
        const path = inside(sourceDirectory, `${siteId}.json`);
        if (await exists(path)) protectedLocalArtifacts.push({ siteId, expectedHash: (await required(path)).hash });
      }

      const attemptDirectory = inside(workDirectory, `${job.id}-${job.attemptCount}`);
      await mkdir(workDirectory, { recursive: true, mode: 0o700 });
      await mkdir(attemptDirectory, { recursive: false, mode: 0o700 });
      const probeManifestPath = inside(attemptDirectory, "sftp-probe-manifest.json");
      const publicationManifestPath = inside(attemptDirectory, "manifest.json");
      await writeExclusive(probeManifestPath, probeManifest(job, target, targetAfter.hash));

      const adapter = await adapterFactory(environment);
      try {
        const remote = await adapter.inventory(String(target.remoteRoot));
        const probePreview = await planSftpCapabilityProbe({ manifestPath: probeManifestPath, sourceDirectory, environment });
        if (probePreview.blocked) throw new Error(`SFTP_PROBE_BLOCKED:${probePreview.blockedReasons.join("|")}`);
        const capability = await runSftpCapabilityProbe({
          manifestPath: probeManifestPath,
          sourceDirectory,
          outputDirectory: attemptDirectory,
          environment,
          adapter,
          mode: PROBE_MODE,
          confirmation: PROBE_CONFIRMATION,
          expectedPlanHash: probePreview.planHash,
          now: now()
        });
        if (!HASH.test(capability.capabilityHash ?? "")) throw new Error("SFTP_CAPABILITY_HASH_INVALID");
        await advance("PLANNING_PUBLICATION", { packageHash: packageState.hash, capabilityHash: capability.capabilityHash });

        await writeExclusive(publicationManifestPath, publicationManifest(job, {
          sourceHash: sourceAfter.hash,
          targetHash: targetAfter.hash,
          packageHash: packageState.hash,
          capabilityHash: capability.capabilityHash,
          remoteHash: remote.exists && remote.files.length ? remote.hash : null,
          protectedLocalArtifacts
        }));
        const preview = await planGuardedPublication({ manifestPath: publicationManifestPath, sourceDirectory, outputDirectory, journalDirectory, environment, now: now() });
        if (preview.blocked) throw new Error(`PUBLICATION_PREVIEW_BLOCKED:${preview.blockedReasons.join("|")}`);
        if (!HASH.test(preview.planHash ?? "")) throw new Error("PUBLICATION_PLAN_HASH_INVALID");
        await advance("PUBLISHING", { packageHash: packageState.hash, capabilityHash: capability.capabilityHash, planHash: preview.planHash });

        const applied = await runGuardedPublication({
          manifestPath: publicationManifestPath,
          sourceDirectory,
          outputDirectory,
          journalDirectory,
          environment,
          adapter,
          mode: APPLY_MODE,
          confirmation: APPLY_CONFIRMATION,
          expectedPlanHash: preview.planHash,
          verifyPublic,
          now: now()
        });
        if (!(["APPLIED", "ALREADY_APPLIED"] as const).includes(applied.outcome)) throw new Error("PUBLICATION_NOT_APPLIED");
        const journalPath = resolve(String(applied.journalPath ?? preview.journalPath));
        if (!journalPath.startsWith(`${journalDirectory}${sep}`)) throw new Error("PUBLICATION_JOURNAL_PATH_ESCAPE");
        const journal = await required(journalPath);
        await advance("VERIFYING", { packageHash: packageState.hash, capabilityHash: capability.capabilityHash, planHash: preview.planHash, journalHash: journal.hash });
        return { packageHash: packageState.hash, capabilityHash: capability.capabilityHash, planHash: preview.planHash, journalHash: journal.hash };
      } finally {
        await adapter.close();
      }
    }
  };
}

export function createPublicationJobWorker(options: {
  jobs?: JobStore;
  execution?: PublicationExecution;
  workerId?: string;
  leaseSeconds?: number;
} = {}) {
  const jobs = options.jobs ?? publicationJobService;
  const execution = options.execution ?? createPublicationExecution();
  const workerId = options.workerId ?? `partnerhub-publication-${process.pid}-${randomUUID()}`;
  const leaseSeconds = options.leaseSeconds ?? 1800;

  return {
    async runNext() {
      const claimed = await jobs.claimNext(workerId, leaseSeconds);
      if (!claimed) return { outcome: "IDLE" as const };
      const { job, leaseToken } = claimed;
      try {
        const evidence = await execution.execute(job, (phase, item = {}) => jobs.advance(job.id, leaseToken, phase, item));
        const completed = await jobs.complete(job.id, leaseToken, evidence);
        return { outcome: "SUCCEEDED" as const, job: jobs.toSafeJob(completed) };
      } catch (error) {
        const failed = await jobs.fail(job.id, leaseToken, safeErrorCode(error));
        return { outcome: "FAILED" as const, job: jobs.toSafeJob(failed) };
      }
    }
  };
}

const worker = createPublicationJobWorker();
let activeRun: Promise<unknown> | null = null;
let loopStarted = false;

export function wakePublicationJobWorker() {
  if (!activeRun) activeRun = worker.runNext()
    .catch(() => ({ outcome: "WORKER_LOOP_ERROR" as const }))
    .finally(() => { activeRun = null; });
  return activeRun;
}

export function startPublicationJobWorkerLoop(intervalMs = 2_000) {
  if (loopStarted || process.env.PUBLICATION_JOB_WORKER_DISABLED === "true") return;
  loopStarted = true;
  void wakePublicationJobWorker();
  const timer = setInterval(() => { void wakePublicationJobWorker(); }, intervalMs);
  timer.unref();
}
