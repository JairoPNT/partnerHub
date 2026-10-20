import 'server-only';

import { createHash } from 'node:crypto';
import { lstat, readdir, readFile } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';
import type { CloudflareAccessIdentity } from '@/server/auth/cloudflareAccessAuth';
import {
  masterSitesBusinessCommandResultSchema, masterSitesBusinessPrepareTargetRequestSchema,
  masterSitesBusinessPublishRequestSchema, masterSitesSafeJobSchema,
  type MasterSitesBusinessPrepareTargetRequest, type MasterSitesBusinessPublishRequest,
  type MasterSitesBusinessCommandResult
} from '@/shared/master-sites-business-contract';
import { createMasterSitesBusinessPreviewService, type BusinessPartnerSnapshot } from '@/server/services/masterSitesBusinessPreviewService';
import { buildMasterSitesBusinessInput } from '@/server/services/masterSitesBusinessInput';
import {
  createMasterSitesBusinessOperationStore, MasterSitesBusinessOperationStoreError,
  type MasterSitesBusinessOperation, type MasterSitesBusinessOperationBinding,
  type MasterSitesBusinessOperationPatch, type MasterSitesBusinessOperationStore
} from '@/server/services/masterSitesBusinessOperationStore';
import { createPublicationJobService, type PublicationJob } from '@/server/services/publicationJobService';
import {
  productPageGenerationService, normalizeProductPageGenerationConfiguration,
  productPageGenerationInputSchema, type ProductPageGenerationInput
} from '@/server/services/productPageGenerationService';
import { withoutBusinessPublicationSiteOwnership } from '@/server/services/businessPublicationSiteCoordinator';
import { wakePublicationJobWorker } from '@/server/services/publicationJobWorkerService';
import { createSubdomainProvisioningService, type ProvisionSubdomainInput } from '@/server/services/subdomainProvisioningService';
import { createHostingerSubdomainClient, getHostingerSubdomainConfig } from '@/server/integrations/hostingerSubdomainClient';
import { createHostingerDnsClient } from '@/server/integrations/hostingerDnsClient';

type Jobs = ReturnType<typeof createPublicationJobService>;
type Preview = ReturnType<typeof createMasterSitesBusinessPreviewService>;
export type MasterSitesBusinessCommandDependencies = {
  outputDirectory?: string;
  sourceDirectory?: string;
  preview?: Preview;
  jobs?: Jobs;
  operations?: MasterSitesBusinessOperationStore;
  generate?: typeof productPageGenerationService.generate;
  provision?: ReturnType<typeof createSubdomainProvisioningService>['provision'];
  wake?: () => Promise<unknown>;
};

export class MasterSitesBusinessCommandError extends Error {
  readonly code: string;
  readonly status: number;
  readonly blockedReasons: string[];
  constructor(code: string, status = 409, blockedReasons: string[] = []) {
    super(code); this.name = 'MasterSitesBusinessCommandError';
    this.code = code; this.status = status; this.blockedReasons = blockedReasons;
  }
}

const sha = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value)
    .filter(([, item]) => item !== undefined).sort(([a], [b]) => a.localeCompare(b))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;
  return JSON.stringify(value);
}
const hash = (value: unknown) => sha(canonical(value));
const absent = hash(null);
function reject(code: string, reasons: string[] = []): never { throw new MasterSitesBusinessCommandError(code, 409, reasons); }

// Review continuity excludes only the source/target effects owned by this command.
// Do not hash mutable query timestamps, publication flags, or derived target entitlement.
function authority(snapshot: BusinessPartnerSnapshot) {
  const { lead, entitlement } = snapshot;
  return hash({
    ownerKey: snapshot.ownerKey, ownerSiteId: snapshot.ownerSiteId, siteId: snapshot.siteId,
    baseDomain: snapshot.baseDomain, publicHost: snapshot.publicHost,
    lead: { fullName: lead.fullName, brandName: lead.brandName, whatsapp: lead.whatsapp,
      status: lead.status, recordState: lead.recordState, onboardingData: lead.onboardingData },
    entitlement: entitlement && { activationLeadId: entitlement.activationLeadId, commercialState: entitlement.commercialState,
      includedEcosystems: [...entitlement.includedEcosystems].sort(),
      grants: [...(entitlement.complimentaryGrantEcosystems ?? [])].sort(),
      commercialSnapshots: entitlement.commercialSnapshots ?? [] },
    masterRevision: snapshot.master?.revision
  });
}

function inputHash(input: ProductPageGenerationInput, snapshot: BusinessPartnerSnapshot) {
  const normalized = normalizeProductPageGenerationConfiguration(input);
  // Generator inheritance plus its input schema: metadata not accepted by the input
  // schema is covered by master revision/package pins, not invented input fields.
  return hash(normalizeProductPageGenerationConfiguration(productPageGenerationInputSchema.parse({
    ...normalized, hero: { ...snapshot.master?.content.hero, ...normalized.hero },
    vsl: { ...snapshot.master?.content.vsl, ...normalized.vsl }
  })));
}

function safeJob(job: PublicationJob | null) {
  return job ? masterSitesSafeJobSchema.parse({
    id: job.id, status: job.status, phase: job.phase, attemptCount: job.attemptCount,
    updatedAt: job.updatedAt, ...(job.completedAt ? { completedAt: job.completedAt } : {}),
    ...(job.lastErrorCode ? { lastErrorCode: job.lastErrorCode } : {})
  }) : null;
}

async function packageHash(directory: string) {
  const files: { path: string; hash: string }[] = [];
  async function visit(current: string) {
    const stat = await lstat(current);
    if (!stat.isDirectory() || stat.isSymbolicLink()) reject('MASTER_SITES_PACKAGE_INVALID');
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const path = resolve(current, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile()) {
        const stat = await lstat(path);
        if (stat.nlink !== 1 || stat.isSymbolicLink()) reject('MASTER_SITES_PACKAGE_INVALID');
        files.push({ path: relative(directory, path).split(sep).join('/'), hash: sha(await readFile(path)) });
      } else reject('MASTER_SITES_PACKAGE_INVALID');
    }
  }
  await visit(directory);
  for (const file of ['index.html', 'config.js', 'styles.css', 'app.js', 'manifest.json'])
    if (!files.some((entry) => entry.path === file)) reject('MASTER_SITES_PACKAGE_INVALID');
  files.sort((a, b) => a.path.localeCompare(b.path));
  return sha(JSON.stringify(files));
}

function configured(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new MasterSitesBusinessCommandError('MASTER_SITES_PROVISIONING_NOT_CONFIGURED', 409);
  return value;
}

// Lazy: no credentials read and no provider clients created until an authorized,
// freshly reviewed prepare command actually requires provisioning.
async function provision(input: ProvisionSubdomainInput) {
  return createSubdomainProvisioningService({
    hostingerClient: createHostingerSubdomainClient(getHostingerSubdomainConfig()),
    dnsClient: createHostingerDnsClient({ apiToken: configured('HOSTINGER_API_TOKEN'), baseUrl: process.env.HOSTINGER_API_BASE_URL })
  }).provision(input);
}

export function createMasterSitesBusinessCommandService(dependencies: MasterSitesBusinessCommandDependencies = {}) {
  const outputDirectory = resolve(dependencies.outputDirectory ?? process.env.PRODUCT_PAGE_OUTPUT_DIR ?? '/data/generated-sites');
  const sourceDirectory = resolve(dependencies.sourceDirectory ?? process.env.PRODUCT_PAGE_SOURCE_DIR ?? '/data/generated-sites/.sources');
  const jobs = dependencies.jobs ?? createPublicationJobService({ outputDirectory, sourceDirectory });
  const preview = dependencies.preview ?? createMasterSitesBusinessPreviewService({ listJobs: () => jobs.list() });
  const operations = dependencies.operations ?? createMasterSitesBusinessOperationStore({ directory: resolve(outputDirectory, '.master-sites-business-operations') });
  const generate = dependencies.generate ?? productPageGenerationService.generate.bind(productPageGenerationService);
  const wake = dependencies.wake ?? wakePublicationJobWorker;

  function assertRoots() {
    if (outputDirectory !== resolve(process.env.PRODUCT_PAGE_OUTPUT_DIR ?? '/data/generated-sites') ||
        sourceDirectory !== resolve(process.env.PRODUCT_PAGE_SOURCE_DIR ?? '/data/generated-sites/.sources'))
      reject('MASTER_SITES_STORAGE_CONFIGURATION_INVALID');
  }
  function assertBinding(operation: MasterSitesBusinessOperation, binding: MasterSitesBusinessOperationBinding) {
    if (canonical(operation.binding) !== canonical(binding)) reject('MASTER_SITES_OPERATION_CONFLICT');
  }
  async function checkpoint(operation: MasterSitesBusinessOperation, patch: MasterSitesBusinessOperationPatch) {
    try { return await operations.checkpoint(operation.operationId, operation.version, patch); }
    catch (error) {
      // A rename may have committed before directory sync failed. Accept only the
      // exact next record; never infer rollback or repeat an effect from an exception.
      if (!(error instanceof MasterSitesBusinessOperationStoreError) || error.code !== 'MASTER_SITES_OPERATION_STORAGE_ERROR') throw error;
      const persisted = await operations.get(operation.operationId);
      if (!persisted || persisted.version !== operation.version + 1 ||
          canonical(persisted.binding) !== canonical(operation.binding) ||
          persisted.phase !== (patch.phase ?? operation.phase) ||
          canonical(persisted.pins) !== canonical({ ...operation.pins, ...patch.pins }) ||
          canonical(persisted.result) !== canonical(patch.result === undefined ? operation.result : patch.result)) throw error;
      return persisted;
    }
  }
  function result(operation: MasterSitesBusinessOperation, snapshot: BusinessPartnerSnapshot,
    outcome: MasterSitesBusinessCommandResult['outcome'], job: PublicationJob | null = null, reasons: string[] = []) {
    const response = masterSitesBusinessCommandResultSchema.parse({
      operationId: operation.operationId, activationLeadId: operation.binding.activationLeadId,
      siteId: operation.binding.siteId, publicHost: snapshot.publicHost, outcome, job: safeJob(job), blockedReasons: reasons
    });
    return { ...response, siteId: operation.binding.siteId };
  }
  async function retry(operation: MasterSitesBusinessOperation, snapshot: BusinessPartnerSnapshot) {
    const response = result(operation, snapshot, 'RETRY_REQUIRED', null, ['MASTER_SITES_REVIEW_REQUIRED']);
    await checkpoint(operation, { phase: 'RETRY_REQUIRED', result: response });
    return response;
  }
  function eligible(snapshot: BusinessPartnerSnapshot) {
    if (!snapshot.siteId || !snapshot.ownerSiteId || !snapshot.baseDomain || !snapshot.publicHost || !snapshot.master ||
        snapshot.partner.status === 'BLOCKED') reject('MASTER_SITES_BUSINESS_BLOCKED', snapshot.partner.blockedReasons);
  }
  function basePins(snapshot: BusinessPartnerSnapshot) {
    return { sourceHash: snapshot.sourceHash ?? absent, targetHash: snapshot.targetHash ?? absent,
      masterPackageHash: snapshot.master!.packageHash, reviewedRevision: authority(snapshot) };
  }
  async function finish(operation: MasterSitesBusinessOperation, response: MasterSitesBusinessCommandResult & { siteId: string }) {
    await checkpoint(operation, { phase: 'COMPLETE', result: response });
    return response;
  }
  function matchingJob(job: PublicationJob, operation: MasterSitesBusinessOperation, snapshot: BusinessPartnerSnapshot, initialTarget = true) {
    return job.id === operation.pins.jobId && job.intent.ownerKey === snapshot.ownerKey &&
      job.intent.ownerSiteId === snapshot.ownerSiteId && job.intent.siteId === snapshot.siteId &&
      job.intent.baseDomain === snapshot.baseDomain && job.intent.publicHost === snapshot.publicHost &&
      job.intent.ecosystemType === 'BUSINESS' && job.intent.sourceHash === operation.pins.sourceHash &&
      (!initialTarget || job.intent.targetHash === operation.pins.targetHash) && job.intent.masterPackageHash === operation.pins.masterPackageHash;
  }

  async function execute(command: MasterSitesBusinessPrepareTargetRequest | MasterSitesBusinessPublishRequest,
    operator: CloudflareAccessIdentity, action: 'PREPARE_TARGET' | 'PUBLISH') {
    assertRoots();
    if (operator.identityType !== 'HUMAN' || !operator.subject.trim())
      throw new MasterSitesBusinessCommandError('MASTER_SITES_FORBIDDEN', 403);
    const actorHash = sha(operator.subject);
    const updateExisting = 'updateExisting' in command ? command.updateExisting : false;
    const previous = await operations.get(command.requestId);
    // Reject request-ID reuse before reading another partner, even if the new ID is absent.
    if (previous && (previous.binding.actorHash !== actorHash || previous.binding.action !== action ||
        previous.binding.activationLeadId !== command.activationLeadId || previous.binding.expectedRevision !== command.expectedRevision ||
        previous.binding.templateId !== command.templateId || previous.binding.updateExisting !== updateExisting))
      reject('MASTER_SITES_OPERATION_CONFLICT');
    const initial = await preview.getPartner(command.activationLeadId);
    const siteId = previous?.binding.siteId ?? initial.siteId;
    if (!siteId) reject('MASTER_SITES_BUSINESS_BLOCKED', initial.partner.blockedReasons);
    let response: MasterSitesBusinessCommandResult = await jobs.withBusinessPublicationSite(siteId, async () => {
      assertRoots();
      let snapshot = await preview.getPartner(command.activationLeadId);
      if (snapshot.siteId !== siteId) reject('MASTER_SITES_REVIEW_CONFLICT');
      const binding: MasterSitesBusinessOperationBinding = {
        requestId: command.requestId, actorHash, action, activationLeadId: command.activationLeadId,
        siteId, templateId: command.templateId, expectedRevision: command.expectedRevision, updateExisting
      };
      let operation = await operations.get(command.requestId);
      if (operation) assertBinding(operation, binding);
      if (!operation || operation.phase === 'PREPARED') {
        if (snapshot.reviewRevision !== command.expectedRevision) reject('MASTER_SITES_REVIEW_CONFLICT');
        eligible(snapshot);
        if (!operation) {
          try { operation = (await operations.create(binding)).operation; }
          catch (error) {
            if (!(error instanceof MasterSitesBusinessOperationStoreError) || error.code !== 'MASTER_SITES_OPERATION_STORAGE_ERROR') throw error;
            operation = await operations.get(command.requestId);
            if (!operation) throw error;
            assertBinding(operation, binding);
            if (operation.phase !== 'PREPARED' || operation.version !== 0) throw error;
          }
        }
        operation = await checkpoint(operation, { pins: basePins(snapshot) });
        if (snapshot.partner.currentJob && ['QUEUED', 'RUNNING'].includes(snapshot.partner.status)) {
          const active = snapshot.jobs.find((job) => job.id === snapshot.partner.currentJob!.id)!;
          operation = await checkpoint(operation, { pins: { jobId: active.id } });
          return finish(operation, result(operation, snapshot, 'ALREADY_SCHEDULED', active));
        }
        if (action === 'PREPARE_TARGET') {
          // Never call the provisioner on READY: it resets publicationState to PENDING.
          if (snapshot.target?.provisioningState === 'READY' && snapshot.target.dnsState === 'RESOLVED' && snapshot.target.sslState === 'READY')
            return finish(operation, result(operation, snapshot, 'TARGET_READY'));
          if (!snapshot.partner.canPrepareTarget) reject('MASTER_SITES_BUSINESS_BLOCKED');
          const input: ProvisionSubdomainInput = {
            ownerKey: snapshot.ownerKey, siteId, ecosystemType: 'BUSINESS',
            rootEcosystemType: snapshot.target?.rootEcosystemType ?? 'BUSINESS',
            baseDomain: snapshot.baseDomain!, ipv4: configured('PARTNERHUB_PROVISIONING_IPV4'), confirmation: 'PROVISION_SUBDOMAIN'
          };
          operation = await checkpoint(operation, { phase: 'PREPARING_TARGET' });
          const fresh = await preview.getPartner(command.activationLeadId);
          if (fresh.reviewRevision !== snapshot.reviewRevision || fresh.partner.status === 'BLOCKED') return retry(operation, fresh);
          assertRoots();
          await (dependencies.provision ?? provision)(input);
          snapshot = await preview.getPartner(command.activationLeadId);
          if (snapshot.partner.status === 'BLOCKED' || authority(snapshot) !== operation.pins.reviewedRevision ||
              (snapshot.sourceHash ?? absent) !== operation.pins.sourceHash || !snapshot.target) return retry(operation, snapshot);
          operation = await checkpoint(operation, { phase: 'TARGET_PREPARED', pins: { targetHash: snapshot.targetHash! } });
          return finish(operation, result(operation, snapshot,
            snapshot.partner.status === 'TARGET_PENDING' ? 'TARGET_PENDING' : 'TARGET_READY'));
        }
        if (snapshot.partner.status === 'CURRENT' && !updateExisting) {
          const current = snapshot.jobs.find((job) => job.id === snapshot.partner.currentJob?.id)!;
          operation = await checkpoint(operation, { pins: { jobId: current.id } });
          return finish(operation, result(operation, snapshot, 'ALREADY_CURRENT', current));
        }
        if (!snapshot.partner.canPublish) reject('MASTER_SITES_BUSINESS_BLOCKED');
        const input = buildMasterSitesBusinessInput(snapshot);
        operation = await checkpoint(operation, { phase: 'GENERATING', pins: { generationInputHash: inputHash(input, snapshot) } });
        const fresh = await preview.getPartner(command.activationLeadId);
        if (fresh.reviewRevision !== snapshot.reviewRevision || !fresh.partner.canPublish) return retry(operation, fresh);
        assertRoots();
        await generate(input, { templateSource: 'master', masterSiteId: 'ganomaster-business' });
        snapshot = await preview.getPartner(command.activationLeadId);
        if (snapshot.partner.status === 'BLOCKED' || authority(snapshot) !== operation.pins.reviewedRevision ||
            snapshot.targetHash !== operation.pins.targetHash || !snapshot.source || !snapshot.input ||
            inputHash(snapshot.source, snapshot) !== operation.pins.generationInputHash ||
            inputHash(snapshot.input, snapshot) !== operation.pins.generationInputHash) return retry(operation, snapshot);
        operation = await checkpoint(operation, { phase: 'GENERATED', pins: {
          sourceHash: snapshot.sourceHash!, packageHash: await packageHash(resolve(outputDirectory, siteId))
        } });
      } else {
        // Neither a phase marker nor a matching-looking source proves completion
        // of an interrupted generator/provisioner. Require a new explicit review.
        if (['GENERATING', 'PREPARING_TARGET', 'RETRY_REQUIRED'].includes(operation.phase)) return retry(operation, snapshot);
        if (snapshot.partner.status === 'BLOCKED' || authority(snapshot) !== operation.pins.reviewedRevision ||
            snapshot.master?.packageHash !== operation.pins.masterPackageHash ||
            (snapshot.sourceHash ?? absent) !== operation.pins.sourceHash) return retry(operation, snapshot);
        const pinnedJob = snapshot.jobs.find((job) => job.id === operation!.pins.jobId) ?? null;
        const ownedCompletion = pinnedJob && matchingJob(pinnedJob, operation, snapshot, false) &&
          snapshot.partner.status === 'CURRENT' && snapshot.partner.currentJob?.id === pinnedJob.id;
        if ((snapshot.targetHash ?? absent) !== operation.pins.targetHash && !ownedCompletion) return retry(operation, snapshot);
        if (pinnedJob && (['FAILED', 'CANCELLED'].includes(pinnedJob.status) ||
            (pinnedJob.status === 'SUCCEEDED' && !ownedCompletion))) return retry(operation, snapshot);
        if (operation.pins.packageHash && !ownedCompletion) {
          let matches = false;
          try { matches = await packageHash(resolve(outputDirectory, siteId)) === operation.pins.packageHash; } catch { /* Missing/unsafe output is not recoverable evidence. */ }
          if (!matches) return retry(operation, snapshot);
        }
        if (operation.result) {
          if (operation.pins.jobId && !pinnedJob) return retry(operation, snapshot);
          return { ...operation.result, job: safeJob(pinnedJob),
            ...(ownedCompletion ? { outcome: 'ALREADY_CURRENT' as const }
              : pinnedJob && ['QUEUED', 'RUNNING'].includes(pinnedJob.status) ? { outcome: 'ALREADY_SCHEDULED' as const } : {}) };
        }
        if (operation.phase === 'TARGET_PREPARED')
          return finish(operation, result(operation, snapshot, snapshot.partner.status === 'TARGET_PENDING' ? 'TARGET_PENDING' : 'TARGET_READY'));
        if (pinnedJob) {
          if (!ownedCompletion && !matchingJob(pinnedJob, operation, snapshot)) return retry(operation, snapshot);
          if (['FAILED', 'CANCELLED'].includes(pinnedJob.status)) return retry(operation, snapshot);
          if (pinnedJob.status === 'SUCCEEDED' && !ownedCompletion) return retry(operation, snapshot);
          return finish(operation, result(operation, snapshot, ownedCompletion ? 'ALREADY_CURRENT' : 'ALREADY_SCHEDULED', pinnedJob));
        }
        if (!snapshot.partner.canPublish || !snapshot.input ||
            inputHash(snapshot.input, snapshot) !== operation.pins.generationInputHash ||
            await packageHash(resolve(outputDirectory, siteId)) !== operation.pins.packageHash) return retry(operation, snapshot);
      }
      // The source/package were checkpointed. Pin the exact intent BEFORE the
      // enqueue; a lost enqueue response can be recovered without regenerating.
      const reviewed = await jobs.previewIntent({ siteId });
      if (reviewed.intent.ownerKey !== snapshot.ownerKey || reviewed.intent.sourceHash !== operation.pins.sourceHash ||
          reviewed.intent.targetHash !== operation.pins.targetHash || reviewed.intent.masterPackageHash !== operation.pins.masterPackageHash)
        return retry(operation, snapshot);
      operation = await checkpoint(operation, { phase: 'ENQUEUEING', pins: { jobId: reviewed.intentHash } });
      const fresh = await preview.getPartner(command.activationLeadId);
      if (!fresh.partner.canPublish || authority(fresh) !== operation.pins.reviewedRevision ||
          fresh.sourceHash !== operation.pins.sourceHash || fresh.targetHash !== operation.pins.targetHash ||
          fresh.master?.packageHash !== operation.pins.masterPackageHash ||
          !fresh.input || inputHash(fresh.input, fresh) !== operation.pins.generationInputHash ||
          await packageHash(resolve(outputDirectory, siteId)) !== operation.pins.packageHash) return retry(operation, fresh);
      assertRoots();
      const enqueued = await jobs.enqueueReviewed({ siteId }, operator.subject, reviewed.intentHash);
      if (!matchingJob(enqueued.job, operation, snapshot) || ['FAILED', 'CANCELLED', 'SUCCEEDED'].includes(enqueued.job.status))
        return retry(operation, snapshot);
      operation = await checkpoint(operation, { phase: 'ENQUEUED' });
      return finish(operation, result(operation, snapshot, enqueued.created ? 'ENQUEUED' : 'ALREADY_SCHEDULED', enqueued.job));
    });
    response = masterSitesBusinessCommandResultSchema.parse(response);
    if (response.job && ['QUEUED', 'RUNNING'].includes(response.job.status)) {
      // Wake only after releasing the manual site ownership; failure does not
      // erase the durable job. The existing worker loop may pick it up later.
      void withoutBusinessPublicationSiteOwnership(() => wake()).catch(() => undefined);
    }
    return response;
  }
  return {
    prepareTarget(command: MasterSitesBusinessPrepareTargetRequest, operator: CloudflareAccessIdentity) {
      return execute(masterSitesBusinessPrepareTargetRequestSchema.parse(command), operator, 'PREPARE_TARGET');
    },
    publish(command: MasterSitesBusinessPublishRequest, operator: CloudflareAccessIdentity) {
      return execute(masterSitesBusinessPublishRequestSchema.parse(command), operator, 'PUBLISH');
    }
  };
}
