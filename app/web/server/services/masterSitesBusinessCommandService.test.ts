import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { createMasterSitesBusinessCommandService } from './masterSitesBusinessCommandService.ts';
import { MasterSitesBusinessOperationStoreError, type MasterSitesBusinessOperationPatch } from './masterSitesBusinessOperationStore.ts';
import { createPublicationJobWorker } from './publicationJobWorkerService.ts';
import { productPageGenerationService } from './productPageGenerationService.ts';
import { withoutBusinessPublicationSiteOwnership } from './businessPublicationSiteCoordinator.ts';
import { businessFixtureId, businessFixtureOperator, businessFixtureSha, createBusinessFixtureWorker, createMasterSitesBusinessCommandFixture } from './masterSitesBusinessCommand.test-fixtures.ts';

const id = businessFixtureId;
const operator = businessFixtureOperator;
const sha = businessFixtureSha;
const fixture = createMasterSitesBusinessCommandFixture;
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
  for (const previousFailure of [false, true]) await t.test(previousFailure ? 'explicit retry' : 'initial publication', async (t) => {
  const f = await fixture(t);
  if (previousFailure) await terminalPublication(f);
  const command = await f.publishCommand();
  await f.service.publish(command, operator);
  // Real worker, leases and job transitions; only external publication/verification is modeled.
  const worker = createBusinessFixtureWorker(f);
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

test('durable_enqueued_or_complete_operation_never_recreates_a_missing_job', async (t) => {
  for (const phase of ['ENQUEUED', 'COMPLETE', 'COMPLETE_NO_RESULT']) await t.test(phase, async (t) => {
    const f = await fixture(t);
    const service = createMasterSitesBusinessCommandService({ ...f.dependencies, operations: {
      ...f.operations, async checkpoint(requestId: string, version: number, patch: MasterSitesBusinessOperationPatch) {
        if (patch.phase === 'COMPLETE' && phase === 'ENQUEUED')
          throw new MasterSitesBusinessOperationStoreError('MASTER_SITES_OPERATION_STORAGE_ERROR');
        return f.operations.checkpoint(requestId, version,
          patch.phase === 'COMPLETE' && phase === 'COMPLETE_NO_RESULT' ? { ...patch, result: null } : patch);
      }
    } });
    const command = await f.publishCommand();
    if (phase === 'ENQUEUED') await assert.rejects(service.publish(command, operator));
    else await service.publish(command, operator);
    const operation = await f.operations.get(command.requestId);
    assert.equal(operation?.phase, phase === 'ENQUEUED' ? 'ENQUEUED' : 'COMPLETE');
    const job = (await f.jobs.list())[0];
    // Preserve removed fixture evidence rather than deleting a job as a recovery action.
    const retained = resolve(f.root, 'retained-job.json');
    await rename(resolve(f.root, '.jobs', `${job.id}.json`), retained);
    const source = await readFile(f.sourcePath, 'utf8');
    const manifest = await readFile(resolve(f.root, f.target.siteId, 'manifest.json'), 'utf8');
    assert.equal((await f.service.publish(command, operator)).outcome, 'RETRY_REQUIRED');
    assert.deepEqual(await f.jobs.list(), []);
    assert.equal(JSON.parse(await readFile(retained, 'utf8')).id, job.id);
    assert.equal(await readFile(f.sourcePath, 'utf8'), source);
    assert.equal(await readFile(resolve(f.root, f.target.siteId, 'manifest.json'), 'utf8'), manifest);
  });
});

async function terminalPublication(f: Awaited<ReturnType<typeof fixture>>, status: 'FAILED' | 'CANCELLED' = 'FAILED') {
  const original = await f.publishCommand();
  const published = await f.service.publish(original, operator);
  if (status === 'CANCELLED') await f.jobs.cancel(published.job!.id);
  else {
    const claim = await f.jobs.claimNext('test-transient-worker');
    assert.ok(claim);
    await f.jobs.fail(claim.job.id, claim.leaseToken, 'TEST_TRANSIENT_FAILURE');
  }
  return { original, job: (await f.jobs.list())[0] };
}

test('new_review_explicitly_retries_matching_terminal_job_without_regeneration', async (t) => {
  for (const status of ['FAILED', 'CANCELLED'] as const) for (const updateExisting of [false, true])
    await t.test(`${status} updateExisting=${updateExisting}`, async (t) => {
      const f = await fixture(t);
      const { original, job } = await terminalPublication(f, status);
      const manifestPath = resolve(f.root, f.target.siteId, 'manifest.json');
      const manifest = await readFile(manifestPath, 'utf8');
      const source = await readFile(f.sourcePath, 'utf8');
      const target = await readFile(f.targetPath, 'utf8');
      assert.equal((await f.service.publish(original, operator)).outcome, 'RETRY_REQUIRED');
      const command = { ...await f.publishCommand(), updateExisting };
      const retryOperator = { ...operator, subject: 'second-verified-operator' };
      const result = await f.service.publish(command, retryOperator);
      assert.equal(result.outcome, 'ENQUEUED');
      assert.equal(result.job?.id, job.id);
      assert.equal(result.job?.status, 'QUEUED');
      const retried = (await f.jobs.list())[0];
      assert.equal(retried.revision, job.revision + 1);
      assert.equal(retried.requestedBySubjectHash, sha(operator.subject), 'original job audit is immutable');
      assert.equal((await f.operations.get(command.requestId))?.binding.actorHash, sha(retryOperator.subject));
      assert.equal(await readFile(manifestPath, 'utf8'), manifest);
      assert.equal(await readFile(f.sourcePath, 'utf8'), source);
      assert.equal(await readFile(f.targetPath, 'utf8'), target);
      assert.equal((await f.service.publish(command, retryOperator)).outcome, 'ALREADY_SCHEDULED');
      assert.equal((await f.service.publish(original, operator)).outcome, 'RETRY_REQUIRED');
      assert.equal((await f.jobs.list())[0].revision, retried.revision);
      assert.equal((await f.jobs.list()).length, 1);
    });
});

test('retry_effect_ambiguity_never_retries_again_or_recreates_missing_job', async (t) => {
  for (const fault of ['before-retry', 'lost-response', 'post-effect-checkpoint', 'missing-after-effect', 'terminal-after-effect']) await t.test(fault, async (t) => {
    const f = await fixture(t);
    const { job } = await terminalPublication(f);
    let retries = 0;
    const command = await f.publishCommand();
    const service = createMasterSitesBusinessCommandService({ ...f.dependencies,
      jobs: { ...f.jobs, async retry(jobId: string) {
        retries++;
        if (fault === 'before-retry') throw new Error('retry unavailable before effect');
        const retried = await f.jobs.retry(jobId);
        if (fault === 'lost-response') throw new Error('retry response lost');
        if (fault === 'missing-after-effect') {
          await rename(resolve(f.root, '.jobs', `${jobId}.json`), resolve(f.root, 'retained-retried-job.json'));
          throw new Error('retry evidence disappeared');
        }
        if (fault === 'terminal-after-effect') {
          await f.jobs.cancel(jobId);
          throw new Error('response lost and another authorized operation cancelled job');
        }
        return retried;
      } },
      operations: { ...f.operations, async checkpoint(requestId: string, version: number, patch: MasterSitesBusinessOperationPatch) {
        if (patch.phase === 'ENQUEUED') throw new MasterSitesBusinessOperationStoreError('MASTER_SITES_OPERATION_STORAGE_ERROR');
        return f.operations.checkpoint(requestId, version, patch);
      } }
    });
    const manifest = await readFile(resolve(f.root, f.target.siteId, 'manifest.json'), 'utf8');
    await assert.rejects(service.publish(command, operator));
    assert.equal(retries, 1);
    const pending = await f.operations.get(command.requestId);
    assert.equal(pending?.phase, 'ENQUEUEING');
    assert.equal(pending?.pins.jobId, job.id);
    const replay = await service.publish(command, operator);
    assert.equal(replay.outcome, ['lost-response', 'post-effect-checkpoint'].includes(fault) ? 'ALREADY_SCHEDULED' : 'RETRY_REQUIRED');
    assert.equal(retries, 1);
    assert.equal((await f.jobs.list()).length, fault === 'missing-after-effect' ? 0 : 1);
    assert.equal(await readFile(resolve(f.root, f.target.siteId, 'manifest.json'), 'utf8'), manifest);
  });
});

test('retry_review_and_effect_pins_reject_stale_authority_or_package', async (t) => {
  for (const changed of ['authority', 'package', 'source', 'target', 'master']) await t.test(changed, async (t) => {
    const f = await fixture(t);
    const { job } = await terminalPublication(f);
    let retries = 0;
    const service = createMasterSitesBusinessCommandService({ ...f.dependencies,
      jobs: { ...f.jobs, async retry(jobId: string) { retries++; return f.jobs.retry(jobId); } },
      operations: { ...f.operations, async checkpoint(requestId: string, version: number, patch: MasterSitesBusinessOperationPatch) {
        const saved = await f.operations.checkpoint(requestId, version, patch);
        if (patch.phase === 'ENQUEUEING') {
          if (changed === 'authority') {
            f.lead.whatsapp = f.lead.onboardingData.whatsapp = '573109876543';
            await writeFile(f.leadPath, JSON.stringify([f.lead]));
          } else {
            const path = changed === 'source' ? f.sourcePath : changed === 'target' ? f.targetPath
              : resolve(f.root, changed === 'master' ? 'ganomaster-business' : f.target.siteId, 'app.js');
            await writeFile(path, `${await readFile(path, 'utf8')}\n `);
          }
        }
        return saved;
      } }
    });
    const command = await f.publishCommand();
    assert.equal((await service.publish(command, operator)).outcome, 'RETRY_REQUIRED');
    assert.equal(retries, 0);
    assert.equal((await f.jobs.get(job.id))?.revision, job.revision);
  });
});

test('retry_lost_response_replay_rejects_stale_pins_without_another_effect', async (t) => {
  for (const changed of ['authority', 'package', 'source', 'target', 'master']) await t.test(changed, async (t) => {
    const f = await fixture(t);
    const { job } = await terminalPublication(f);
    let retries = 0;
    const command = await f.publishCommand();
    const service = createMasterSitesBusinessCommandService({ ...f.dependencies,
      jobs: { ...f.jobs, async retry(jobId: string) {
        retries++;
        await f.jobs.retry(jobId);
        throw new Error('retry response lost');
      } }
    });
    await assert.rejects(service.publish(command, operator), /retry response lost/);
    const revision = (await f.jobs.get(job.id))!.revision;
    if (changed === 'authority') {
      f.lead.whatsapp = f.lead.onboardingData.whatsapp = '573109876543';
      await writeFile(f.leadPath, JSON.stringify([f.lead]));
    } else {
      const path = changed === 'source' ? f.sourcePath : changed === 'target' ? f.targetPath
        : resolve(f.root, changed === 'master' ? 'ganomaster-business' : f.target.siteId, 'app.js');
      await writeFile(path, `${await readFile(path, 'utf8')}\n `);
    }
    assert.equal((await service.publish(command, operator)).outcome, 'RETRY_REQUIRED');
    assert.equal(retries, 1);
    assert.equal((await f.jobs.get(job.id))!.revision, revision);
    assert.equal((await f.jobs.list()).length, 1);
  });
});
