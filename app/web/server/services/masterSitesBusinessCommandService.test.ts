import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { test, type TestContext } from 'node:test';
import { createMasterSitesBusinessCommandService } from './masterSitesBusinessCommandService.ts';
import { createMasterSitesBusinessPreviewService } from './masterSitesBusinessPreviewService.ts';
import { createMasterSitesBusinessOperationStore, MasterSitesBusinessOperationStoreError, type MasterSitesBusinessOperationPatch } from './masterSitesBusinessOperationStore.ts';
import { createPublicationJobService } from './publicationJobService.ts';
import { createPublicationJobWorker } from './publicationJobWorkerService.ts';
import { createSubdomainProvisioningService } from './subdomainProvisioningService.ts';
import { productPageGenerationService } from './productPageGenerationService.ts';
import { withoutBusinessPublicationSiteOwnership } from './businessPublicationSiteCoordinator.ts';

const id = '11111111-1111-4111-8111-111111111111';
const timestamp = '2026-10-20T12:00:00.000Z';
const operator = { subject: 'test-verified-operator', identityType: 'HUMAN' as const, email: 'operator@example.test', payload: {} };
const sha = (value: string) => createHash('sha256').update(value).digest('hex');

async function fixture(t: TestContext, ready = true) {
  const root = await mkdtemp(resolve(tmpdir(), 'ph-010-command-'));
  const environment = { ...process.env };
  t.after(async () => { process.env = environment; await rm(root, { recursive: true, force: true }); });
  Object.assign(process.env, {
    PRODUCT_PAGE_OUTPUT_DIR: root, PRODUCT_PAGE_SOURCE_DIR: resolve(root, '.sources'),
    PRODUCT_PAGE_ACTIVATION_DIR: resolve(root, '.activation'), PRODUCT_PAGE_PAYMENT_DIR: resolve(root, '.payments'),
    PRODUCT_PAGE_COMMERCIAL_GRANT_DIR: resolve(root, '.grants'), PRODUCT_PAGE_PUBLICATION_JOURNAL_DIR: resolve(root, '.journals'),
    PRODUCT_PAGE_TEMPLATE_DIR: resolve('../../plantillas-de-pagina/producto'), PARTNERHUB_PROVISIONING_IPV4: '192.0.2.10'
  });
  const sourceDirectory = process.env.PRODUCT_PAGE_SOURCE_DIR!;
  const targets = resolve(sourceDirectory, '.publishing-targets');
  await mkdir(targets, { recursive: true });
  await mkdir(process.env.PRODUCT_PAGE_ACTIVATION_DIR!, { recursive: true });
  await cp(resolve('../../plantillas-de-pagina/business'), resolve(root, 'ganomaster-business'), { recursive: true });
  await mkdir(resolve(root, 'ganomaster-business/tipografia'), { recursive: true });
  const lead = {
    id, siteId: 'example-partner', status: 'PAID', recordState: 'ACTIVE',
    fullName: 'Example Partner', brandName: 'Example Business', whatsapp: '573101234567',
    onboardingData: { domain: 'partner.example.test', whatsapp: '573101234567' },
    offerSnapshot: { offerCode: 'BUSINESS_ONLY', ecosystemTypes: ['BUSINESS'], ecosystemType: 'BUSINESS', amountCop: 180000,
      currency: 'COP', billingType: 'ONE_TIME', catalogVersion: '2026-08-12.v1', selectedAt: timestamp }
  };
  const target = {
    version: 2, ownerKey: id, siteId: 'example-partner-business', ecosystemType: 'BUSINESS', rootEcosystemType: 'BUSINESS',
    baseDomain: 'partner.example.test', publicHost: 'negocio.partner.example.test',
    remoteRoot: '/domains/partner.example.test/public_html/negocio', provisioningState: 'READY',
    publicationState: 'PENDING', hostingerState: 'READY', dnsState: 'RESOLVED', sslState: 'READY',
    createdAt: timestamp, updatedAt: timestamp
  };
  const leadPath = resolve(process.env.PRODUCT_PAGE_ACTIVATION_DIR!, 'leads.json');
  const targetPath = resolve(targets, `${target.siteId}.json`);
  const sourcePath = resolve(sourceDirectory, `${target.siteId}.json`);
  const productPath = resolve(sourceDirectory, 'unselected-product.json');
  const rootPath = resolve(root, 'unselected-apex/index.html');
  await writeFile(leadPath, JSON.stringify([lead]));
  await writeFile(productPath, JSON.stringify({ ecosystemType: 'PRODUCT', site: { id: 'unselected-product', domain: 'producto.unselected.example.test' } }));
  await mkdir(resolve(root, 'unselected-apex'), { recursive: true });
  await writeFile(rootPath, '<p>Unselected apex stays intact</p>');
  if (ready) await writeFile(targetPath, JSON.stringify(target));
  const jobs = createPublicationJobService({ sourceDirectory, outputDirectory: root, jobDirectory: resolve(root, '.jobs') });
  const preview = createMasterSitesBusinessPreviewService({ listJobs: () => jobs.list() });
  const operations = createMasterSitesBusinessOperationStore({ directory: resolve(root, '.master-sites-business-operations') });
  const effects = { hosting: 0, dns: 0, wakes: 0 };
  const provisioner = createSubdomainProvisioningService({
    storageDirectory: targets,
    hostingerClient: { async ensure(domain, label) {
      assert.equal(domain, 'partner.example.test'); assert.equal(label, 'negocio'); effects.hosting++;
      return { state: 'CREATED', subdomain: { username: 'u12345', parent_domain: domain, subdomain: label, domain: 'negocio.partner.example.test', root_directory: target.remoteRoot } };
    } },
    dnsClient: { async ensureARecord(domain, host, ip) {
      assert.equal(domain, 'partner.example.test'); assert.equal(host, target.publicHost); assert.equal(ip, '192.0.2.10'); effects.dns++;
      return { state: 'CREATED', routingMode: 'DIRECT_A', record: { id: 'test-dns', type: 'A', name: host, content: ip, ttl: 300 } };
    } },
    readinessProbe: { dnsResolves: async () => true, httpsReady: async () => true }
  });
  const dependencies = {
    outputDirectory: root, sourceDirectory, jobs, preview, operations,
    provision: provisioner.provision, wake: async () => { effects.wakes++; }
  };
  const service = createMasterSitesBusinessCommandService(dependencies);
  async function command(action: 'prepare' | 'publish' = 'publish') {
    return {
      requestId: randomUUID(), activationLeadId: id, templateId: 'ganomaster-business' as const,
      expectedRevision: (await preview.getPartner(id)).reviewRevision,
      confirmation: action === 'prepare' ? 'PREPARE_SELECTED_BUSINESS_TARGET' as const : 'PUBLISH_SELECTED_BUSINESS_TEMPLATE' as const
    };
  }
  return { root, sourceDirectory, lead, target, leadPath, targetPath, sourcePath, productPath, rootPath, preview, operations, jobs, effects,
    dependencies, service, command,
    publishCommand: async () => ({ ...await command(), confirmation: 'PUBLISH_SELECTED_BUSINESS_TEMPLATE' as const, updateExisting: false }),
    prepareCommand: async () => ({ ...await command('prepare'), confirmation: 'PREPARE_SELECTED_BUSINESS_TARGET' as const })
  };
}

// Removing the under-lock fresh revision check would generate stale commercial/identity data.
test('revalidates_revision_entitlement_and_target_before_any_write', async (t) => {
  const f = await fixture(t);
  const command = await f.publishCommand();
  f.lead.onboardingData.whatsapp = f.lead.whatsapp = '573109876543';
  await writeFile(f.leadPath, JSON.stringify([f.lead]));
  await assert.rejects(f.service.publish(command, operator), { message: 'MASTER_SITES_REVIEW_CONFLICT' });
  assert.equal(await f.operations.get(command.requestId), null);
  assert.deepEqual(await f.jobs.list(), []);
  assert.equal(f.effects.hosting, 0);
  await assert.rejects(readFile(f.sourcePath), { code: 'ENOENT' });
});

test('prepares_only_selected_business_subdomain_and_does_not_reprovision_ready', async (t) => {
  const f = await fixture(t, false);
  const command = await f.prepareCommand();
  const result = await f.service.prepareTarget(command, operator);
  assert.equal(result.outcome, 'TARGET_READY');
  assert.equal(result.publicHost, 'negocio.partner.example.test');
  assert.equal(f.effects.hosting, 1); assert.equal(f.effects.dns, 1);
  const stored = JSON.parse(await readFile(f.targetPath, 'utf8'));
  stored.publicationState = 'READY';
  await writeFile(f.targetPath, JSON.stringify(stored));
  const bytes = await readFile(f.targetPath, 'utf8');
  assert.equal((await f.service.prepareTarget(await f.prepareCommand(), operator)).outcome, 'TARGET_READY');
  assert.equal(await readFile(f.targetPath, 'utf8'), bytes);
  assert.equal(f.effects.hosting, 1);
  assert.deepEqual(await f.jobs.list(), []);
  assert.deepEqual((await readdir(resolve(f.sourceDirectory, '.publishing-targets'))).sort(), ['example-partner-business.json']);
});

test('manual_generation_enqueues_one_job_retains_actor_and_response_loss_replays', async (t) => {
  const f = await fixture(t);
  const productBytes = await readFile(f.productPath, 'utf8');
  const apexBytes = await readFile(f.rootPath, 'utf8');
  const command = await f.publishCommand();
  const result = await f.service.publish(command, operator);
  assert.equal(result.outcome, 'ENQUEUED');
  assert.equal(result.job?.status, 'QUEUED');
  const source = await readFile(f.sourcePath, 'utf8');
  const configuration = JSON.parse(source);
  assert.equal(configuration.ecosystemType, 'BUSINESS');
  assert.equal(configuration.site.domain, f.target.publicHost);
  assert.equal(configuration.distributor.purchaseUrl, undefined);
  assert.match(configuration.cta.primaryUrl, /^https:\/\/wa.me\/573101234567/);
  const jobs = await f.jobs.list();
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].requestedBySubjectHash, sha(operator.subject));
  assert.equal((await f.operations.get(command.requestId))?.binding.actorHash, sha(operator.subject));
  assert.equal((await f.service.publish(command, operator)).job?.id, result.job?.id);
  assert.equal(await readFile(f.sourcePath, 'utf8'), source);
  assert.equal((await f.jobs.list()).length, 1);
  await assert.rejects(f.service.publish(command, { ...operator, subject: 'different-operator' }), { message: 'MASTER_SITES_OPERATION_CONFLICT' });
  const active = await f.service.publish(await f.publishCommand(), operator);
  assert.equal(active.outcome, 'ALREADY_SCHEDULED');
  assert.equal(await readFile(f.sourcePath, 'utf8'), source);
  assert.equal(await readFile(f.productPath, 'utf8'), productBytes);
  assert.equal(await readFile(f.rootPath, 'utf8'), apexBytes);
  for (const alteration of [
    { activationLeadId: randomUUID() }, { updateExisting: true }, { expectedRevision: 'c'.repeat(64) }
  ]) await assert.rejects(f.service.publish({ ...command, ...alteration }, operator), { message: 'MASTER_SITES_OPERATION_CONFLICT' });
  await assert.rejects(f.service.prepareTarget({ ...await f.prepareCommand(), requestId: command.requestId }, operator),
    { message: 'MASTER_SITES_OPERATION_CONFLICT' });
});

test('crash_after_generation_before_enqueue_recovers_only_checkpointed_source', async (t) => {
  const f = await fixture(t);
  let fail = true;
  const service = createMasterSitesBusinessCommandService({ ...f.dependencies,
    jobs: { ...f.jobs, async enqueueReviewed(...args: Parameters<typeof f.jobs.enqueueReviewed>) {
      if (fail) { fail = false; throw new Error('simulated enqueue unavailable'); }
      return f.jobs.enqueueReviewed(...args);
    } }
  });
  const command = await f.publishCommand();
  await assert.rejects(service.publish(command, operator));
  assert.equal((await f.operations.get(command.requestId))?.phase, 'ENQUEUEING');
  const source = await readFile(f.sourcePath, 'utf8');
  const manifest = await readFile(resolve(f.root, f.target.siteId, 'manifest.json'), 'utf8');
  assert.equal((await service.publish(command, operator)).outcome, 'ENQUEUED');
  assert.equal(await readFile(f.sourcePath, 'utf8'), source);
  assert.equal(await readFile(resolve(f.root, f.target.siteId, 'manifest.json'), 'utf8'), manifest);
  assert.equal((await f.jobs.list()).length, 1);
});

test('generation_without_durable_result_checkpoint_is_uncertain_and_never_repeated', async (t) => {
  const f = await fixture(t);
  let generated = 0;
  const service = createMasterSitesBusinessCommandService({ ...f.dependencies,
    async generate(...args: Parameters<typeof productPageGenerationService.generate>) {
      generated++;
      await productPageGenerationService.generate(...args);
      throw new Error('process disappeared after generation');
    }
  });
  const command = await f.publishCommand();
  await assert.rejects(service.publish(command, operator));
  assert.equal((await f.operations.get(command.requestId))?.phase, 'GENERATING');
  assert.equal((await service.publish(command, operator)).outcome, 'RETRY_REQUIRED');
  assert.equal(generated, 1);
  assert.deepEqual(await f.jobs.list(), []);
});

test('site_coordinator_rejects_second_request_while_generation_is_running', async (t) => {
  const f = await fixture(t);
  let enter!: () => void; let release!: () => void;
  const entered = new Promise<void>((done) => { enter = done; });
  const released = new Promise<void>((done) => { release = done; });
  const service = createMasterSitesBusinessCommandService({ ...f.dependencies,
    async generate(...args: Parameters<typeof productPageGenerationService.generate>) {
      enter(); await released; return productPageGenerationService.generate(...args);
    }
  });
  const command = await f.publishCommand();
  const running = service.publish(command, operator);
  // Ensure a missing implementation does not hang this RED case.
  await Promise.race([entered, running]);
  try {
    await assert.rejects(withoutBusinessPublicationSiteOwnership(() => f.service.publish(command, operator)), { message: 'BUSINESS_SITE_BUSY' });
  } finally { release(); }
  assert.equal((await running).outcome, 'ENQUEUED');
});

test('changed_domain_master_entitlement_or_foreign_target_never_creates_an_operation', async (t) => {
  for (const variant of ['domain', 'master', 'entitlement', 'foreign-target']) await t.test(variant, async (t) => {
    const f = await fixture(t);
    const command = await f.publishCommand();
    if (variant === 'domain') f.lead.onboardingData.domain = 'moved.example.test';
    if (variant === 'entitlement') f.lead.status = 'CANCELLED';
    if (variant === 'domain' || variant === 'entitlement') await writeFile(f.leadPath, JSON.stringify([f.lead]));
    if (variant === 'master') await writeFile(resolve(f.root, 'ganomaster-business/app.js'), '// different reviewed master');
    if (variant === 'foreign-target') await writeFile(f.targetPath, JSON.stringify({ ...f.target, ownerKey: randomUUID() }));
    await assert.rejects(f.service.publish(command, operator), { message: 'MASTER_SITES_REVIEW_CONFLICT' });
    assert.equal(await f.operations.get(command.requestId), null);
    assert.deepEqual(await f.jobs.list(), []);
    await assert.rejects(readFile(f.sourcePath), { code: 'ENOENT' });
  });
});

// Ignoring live package pins after a lost enqueue response would accept foreign output.
test('resumption_rejects_source_target_master_and_package_drift_even_after_enqueue_commit', async (t) => {
  for (const variant of ['source', 'target', 'master', 'package']) await t.test(variant, async (t) => {
    const f = await fixture(t);
    const service = createMasterSitesBusinessCommandService({ ...f.dependencies,
      jobs: { ...f.jobs, async enqueueReviewed(...args: Parameters<typeof f.jobs.enqueueReviewed>) {
        await f.jobs.enqueueReviewed(...args); throw new Error('lost enqueue response');
      } }
    });
    const command = await f.publishCommand();
    await assert.rejects(service.publish(command, operator));
    assert.equal((await f.operations.get(command.requestId))?.phase, 'ENQUEUEING');
    const path = variant === 'source' ? f.sourcePath : variant === 'target' ? f.targetPath
      : resolve(f.root, variant === 'master' ? 'ganomaster-business' : f.target.siteId, 'app.js');
    await writeFile(path, `${await readFile(path, 'utf8')}\n `);
    const manifest = await readFile(resolve(f.root, f.target.siteId, 'manifest.json'), 'utf8');
    assert.equal((await service.publish(command, operator)).outcome, 'RETRY_REQUIRED');
    assert.equal((await f.jobs.list()).length, 1);
    assert.equal(await readFile(resolve(f.root, f.target.siteId, 'manifest.json'), 'utf8'), manifest);
  });
});

test('durable_renamed_checkpoint_error_is_reread_not_assumed_rolled_back', async (t) => {
  const f = await fixture(t);
  const service = createMasterSitesBusinessCommandService({ ...f.dependencies, operations: {
    ...f.operations,
    async create(binding: unknown) {
      await f.operations.create(binding);
      throw new MasterSitesBusinessOperationStoreError('MASTER_SITES_OPERATION_STORAGE_ERROR');
    },
    async checkpoint(requestId: string, version: number, patch: MasterSitesBusinessOperationPatch) {
      await f.operations.checkpoint(requestId, version, patch);
      throw new MasterSitesBusinessOperationStoreError('MASTER_SITES_OPERATION_STORAGE_ERROR');
    }
  } });
  const command = await f.publishCommand();
  assert.equal((await service.publish(command, operator)).outcome, 'ENQUEUED');
  assert.equal((await f.operations.get(command.requestId))?.phase, 'COMPLETE');
  assert.equal((await f.jobs.list()).length, 1);
});

test('checkpoint_failure_before_generation_prevents_effect_and_after_generation_does_not_repeat_it', async (t) => {
  for (const phase of ['GENERATING', 'GENERATED']) await t.test(phase, async (t) => {
    const f = await fixture(t);
    let fail = true;
    const service = createMasterSitesBusinessCommandService({ ...f.dependencies, operations: {
      ...f.operations, async checkpoint(requestId: string, version: number, patch: MasterSitesBusinessOperationPatch) {
        if (fail && patch.phase === phase) { fail = false; throw new MasterSitesBusinessOperationStoreError('MASTER_SITES_OPERATION_STORAGE_ERROR'); }
        return f.operations.checkpoint(requestId, version, patch);
      }
    } });
    const command = await f.publishCommand();
    await assert.rejects(service.publish(command, operator));
    if (phase === 'GENERATING') {
      await assert.rejects(readFile(f.sourcePath), { code: 'ENOENT' });
      assert.equal((await service.publish(command, operator)).outcome, 'ENQUEUED');
    } else {
      assert.equal((await service.publish(command, operator)).outcome, 'RETRY_REQUIRED');
      assert.deepEqual(await f.jobs.list(), []);
    }
  });
});

test('lost_enqueue_response_recovers_exact_job_without_new_generation', async (t) => {
  const f = await fixture(t);
  const service = createMasterSitesBusinessCommandService({ ...f.dependencies,
    jobs: { ...f.jobs, async enqueueReviewed(...args: Parameters<typeof f.jobs.enqueueReviewed>) {
      await f.jobs.enqueueReviewed(...args); throw new Error('lost enqueue response');
    } }
  });
  const command = await f.publishCommand();
  await assert.rejects(service.publish(command, operator));
  const source = await readFile(f.sourcePath, 'utf8');
  assert.equal((await service.publish(command, operator)).outcome, 'ALREADY_SCHEDULED');
  assert.equal((await f.jobs.list()).length, 1);
  assert.equal(await readFile(f.sourcePath, 'utf8'), source);
});

test('completed_worker_target_progression_replays_current_and_current_noop_preserves_package', async (t) => {
  const f = await fixture(t);
  const command = await f.publishCommand();
  await f.service.publish(command, operator);
  // Real worker, leases and job transitions; only external publication/verification is modeled.
  const worker = createPublicationJobWorker({ jobs: f.jobs, execution: { async execute(job, advance) {
    await advance('PLANNING_PUBLICATION');
    await advance('PUBLISHING');
    const finalTarget = JSON.stringify({ ...f.target, publicationState: 'READY', updatedAt: new Date().toISOString() });
    await writeFile(f.targetPath, finalTarget);
    // Worker regeneration legitimately changes the local package timestamp/bytes.
    await writeFile(resolve(f.root, f.target.siteId, 'app.js'), '// worker regenerated package');
    const evidence = { packageHash: sha('verified-package'), capabilityHash: sha('capability'), planHash: sha('plan') };
    const journal = JSON.stringify({
      mode: 'APPLY_GUARDED_ECOSYSTEM_PUBLICATION', publicationJobId: job.id,
      sourceHash: job.intent.sourceHash, initialTargetHash: job.intent.targetHash, finalTargetHash: sha(finalTarget),
      publicHost: job.intent.publicHost, remoteRoot: f.target.remoteRoot, ...evidence,
      appliedAt: new Date().toISOString(), verification: { passed: true }
    });
    const directory = resolve(process.env.PRODUCT_PAGE_PUBLICATION_JOURNAL_DIR!, job.intent.siteId);
    await mkdir(directory, { recursive: true });
    await writeFile(resolve(directory, 'test-journal.json'), journal);
    await advance('VERIFYING');
    return { ...evidence, journalHash: sha(journal) };
  } } });
  assert.equal((await worker.runNext()).outcome, 'SUCCEEDED');
  assert.equal((await f.preview.getPartner(id)).partner.status, 'CURRENT');
  const replay = await f.service.publish(command, operator);
  assert.equal(replay.outcome, 'ALREADY_CURRENT');
  assert.equal(replay.job?.status, 'SUCCEEDED');
  const bytes = await readFile(f.sourcePath, 'utf8');
  assert.equal((await f.service.publish(await f.publishCommand(), operator)).outcome, 'ALREADY_CURRENT');
  assert.equal(await readFile(f.sourcePath, 'utf8'), bytes);
  assert.equal(await readFile(resolve(f.root, f.target.siteId, 'app.js'), 'utf8'), '// worker regenerated package');
  assert.equal((await f.jobs.list()).length, 1);
  const explicit = { ...await f.publishCommand(), updateExisting: true };
  assert.equal((await f.service.publish(explicit, operator)).outcome, 'ENQUEUED');
  assert.equal((await f.jobs.list()).length, 2);
});

test('failed_worker_requires_explicit_review_instead_of_replaying_enqueued_success', async (t) => {
  const f = await fixture(t);
  const command = await f.publishCommand();
  await f.service.publish(command, operator);
  const worker = createPublicationJobWorker({ jobs: f.jobs, execution: { async execute() { throw new Error('TEST_PUBLICATION_FAILED'); } } });
  assert.equal((await worker.runNext()).outcome, 'FAILED');
  assert.equal((await f.service.publish(command, operator)).outcome, 'RETRY_REQUIRED');
  assert.equal((await f.jobs.list())[0].status, 'FAILED');
});

// Fresh authority must be checked at the actual effect boundary, not only before durable IO.
test('late_authority_edit_after_intent_checkpoint_blocks_each_effect', async (t) => {
  for (const phase of ['PREPARING_TARGET', 'GENERATING', 'ENQUEUEING']) await t.test(phase, async (t) => {
    const f = await fixture(t, phase !== 'PREPARING_TARGET');
    const service = createMasterSitesBusinessCommandService({ ...f.dependencies, operations: {
      ...f.operations, async checkpoint(requestId: string, version: number, patch: MasterSitesBusinessOperationPatch) {
        const saved = await f.operations.checkpoint(requestId, version, patch);
        if (patch.phase === phase) {
          f.lead.whatsapp = f.lead.onboardingData.whatsapp = '573109876543';
          await writeFile(f.leadPath, JSON.stringify([f.lead]));
        }
        return saved;
      }
    } });
    const result = phase === 'PREPARING_TARGET'
      ? await service.prepareTarget(await f.prepareCommand(), operator)
      : await service.publish(await f.publishCommand(), operator);
    assert.equal(result.outcome, 'RETRY_REQUIRED');
    assert.equal(f.effects.hosting, 0);
    assert.deepEqual(await f.jobs.list(), []);
    if (phase !== 'ENQUEUEING') await assert.rejects(readFile(f.sourcePath), { code: 'ENOENT' });
  });
});

test('bound_storage_root_cannot_mutate_different_generator_root', async (t) => {
  const f = await fixture(t);
  const command = await f.publishCommand();
  process.env.PRODUCT_PAGE_OUTPUT_DIR = resolve(f.root, 'different');
  await assert.rejects(f.service.publish(command, operator), { message: 'MASTER_SITES_STORAGE_CONFIGURATION_INVALID' });
  await assert.rejects(readFile(f.sourcePath), { code: 'ENOENT' });
  assert.equal(await f.operations.get(command.requestId), null);
});
