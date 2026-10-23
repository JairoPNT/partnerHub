import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { cp, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import type { TestContext } from 'node:test';
import { createMasterSitesBusinessCommandService } from '@/server/services/masterSitesBusinessCommandService';
import { createMasterSitesBusinessPreviewService, masterSitesBusinessPreviewService } from '@/server/services/masterSitesBusinessPreviewService';
import { createMasterSitesBusinessOperationStore } from '@/server/services/masterSitesBusinessOperationStore';
import { createPublicationJobService } from '@/server/services/publicationJobService';
import { createPublicationJobWorker } from '@/server/services/publicationJobWorkerService';
import { createSubdomainProvisioningService } from '@/server/services/subdomainProvisioningService';
import { prepareBusinessMeasurementFixture } from '@/server/services/businessMeasurement.test-fixtures';

export const businessFixtureId = '11111111-1111-4111-8111-111111111111';
const timestamp = '2026-10-20T12:00:00.000Z';
export const businessFixtureOperator = { subject: 'test-verified-operator', identityType: 'HUMAN' as const, email: 'operator@example.test', payload: {} };
export const businessFixtureSha = (value: string) => createHash('sha256').update(value).digest('hex');

export async function createMasterSitesBusinessCommandFixture(t: TestContext, ready = true) {
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
  await prepareBusinessMeasurementFixture(t, resolve(root, 'ganomaster-business'));
  const lead = {
    id: businessFixtureId, siteId: 'example-partner', status: 'PAID', recordState: 'ACTIVE',
    fullName: 'Example Partner', brandName: 'Example Business', whatsapp: '573101234567',
    onboardingData: { domain: 'partner.example.test', whatsapp: '573101234567' },
    offerSnapshot: { offerCode: 'BUSINESS_ONLY', ecosystemTypes: ['BUSINESS'], ecosystemType: 'BUSINESS', amountCop: 180000,
      currency: 'COP', billingType: 'ONE_TIME', catalogVersion: '2026-08-12.v1', selectedAt: timestamp }
  };
  const target = {
    version: 2, ownerKey: businessFixtureId, siteId: 'example-partner-business', ecosystemType: 'BUSINESS', rootEcosystemType: 'BUSINESS',
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
  t.mock.method(masterSitesBusinessPreviewService, 'getMeasurementAuthoritySnapshot', preview.getMeasurementAuthoritySnapshot);
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
      requestId: randomUUID(), activationLeadId: businessFixtureId, templateId: 'ganomaster-business' as const,
      expectedRevision: (await preview.getPartner(businessFixtureId)).reviewRevision,
      confirmation: action === 'prepare' ? 'PREPARE_SELECTED_BUSINESS_TARGET' as const : 'PUBLISH_SELECTED_BUSINESS_TEMPLATE' as const
    };
  }
  return { root, sourceDirectory, lead, target, leadPath, targetPath, sourcePath, productPath, rootPath, preview, operations, jobs, effects,
    dependencies, service, command,
    publishCommand: async () => ({ ...await command(), confirmation: 'PUBLISH_SELECTED_BUSINESS_TEMPLATE' as const, updateExisting: false }),
    prepareCommand: async () => ({ ...await command('prepare'), confirmation: 'PREPARE_SELECTED_BUSINESS_TARGET' as const })
  };
}

export function createBusinessFixtureWorker(f: Awaited<ReturnType<typeof createMasterSitesBusinessCommandFixture>>) {
  return createPublicationJobWorker({ jobs: f.jobs, execution: { async execute(job, advance) {
    await advance('PLANNING_PUBLICATION');
    await advance('PUBLISHING');
    const finalTarget = JSON.stringify({ ...f.target, publicationState: 'READY', updatedAt: new Date().toISOString() });
    await writeFile(f.targetPath, finalTarget);
    await writeFile(resolve(f.root, f.target.siteId, 'app.js'), '// worker regenerated package');
    const evidence = { packageHash: businessFixtureSha('verified-package'), capabilityHash: businessFixtureSha('capability'), planHash: businessFixtureSha('plan') };
    const journal = JSON.stringify({
      mode: 'APPLY_GUARDED_ECOSYSTEM_PUBLICATION', publicationJobId: job.id,
      sourceHash: job.intent.sourceHash, initialTargetHash: job.intent.targetHash, finalTargetHash: businessFixtureSha(finalTarget),
      publicHost: job.intent.publicHost, remoteRoot: f.target.remoteRoot, ...evidence,
      appliedAt: new Date().toISOString(), verification: { passed: true }
    });
    const directory = resolve(process.env.PRODUCT_PAGE_PUBLICATION_JOURNAL_DIR!, job.intent.siteId);
    await mkdir(directory, { recursive: true });
    await writeFile(resolve(directory, 'test-journal.json'), journal);
    await advance('VERIFYING');
    return { ...evidence, journalHash: businessFixtureSha(journal) };
  } } });
}
