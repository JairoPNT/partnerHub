import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { test } from 'node:test';
import {
  createMasterSitesBusinessPreviewService,
  type MasterSitesBusinessLead
} from './masterSitesBusinessPreviewService.ts';
import { buildMasterSitesBusinessInput } from './masterSitesBusinessInput.ts';
import { masterSitesBusinessReadResponseSchema } from '../../shared/master-sites-business-contract.ts';
import { manualPaymentLedgerService } from './manualPaymentLedgerService.ts';

const id = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const hash = (value: string) =>
  createHash('sha256').update(value).digest('hex');
const timestamp = '2026-10-20T12:00:00.000Z';
function fixture() {
  const lead = {
    id,
    siteId: 'ana',
    status: 'PAID' as MasterSitesBusinessLead['status'],
    recordState: 'ACTIVE' as MasterSitesBusinessLead['recordState'],
    fullName: 'Ana Perez',
    brandName: 'Ana Negocios',
    whatsapp: '+57 310 123 4567',
    onboardingData: {
      domain: 'ana.pro',
      whatsapp: '573101234567',
      analyticsMeasurementId: undefined as string | undefined
    }
  };
  const target = {
    version: 2,
    ownerKey: id,
    siteId: 'ana-business',
    ecosystemType: 'BUSINESS',
    rootEcosystemType: 'BUSINESS',
    baseDomain: 'ana.pro',
    publicHost: 'negocio.ana.pro',
    remoteRoot: '/domains/ana.pro/public_html/negocio',
    provisioningState: 'READY',
    publicationState: 'PENDING',
    dnsState: 'RESOLVED',
    sslState: 'READY'
  };
  const master = {
    revision: hash('master'),
    packageHash: hash('master-package'),
    previewUrl: '/api/internal/product-pages/preview/ganomaster-business',
    content: {
      hero: {},
      vsl: {
        provider: 'custom',
        embedUrl:
          'https://media.partnerhub.club/comunes/business/v1/vsl/business-vsl-pilot-v1.mp4'
      }
    }
  };
  const entitlement = {
    activationLeadId: id,
    commercialState: 'KNOWN',
    includedEcosystems: ['BUSINESS'],
    complimentaryGrantEcosystems: [] as string[],
    commercialSnapshots: [] as unknown[],
    existingTargets: [] as unknown[]
  };
  const state = {
    leads: [lead],
    targets: [] as { siteId: string; value: unknown; hash: string }[],
    sources: [] as { siteId: string; value: unknown; hash: string }[],
    jobs: [] as unknown[],
    journals: [] as { hash: string; value: unknown }[],
    master,
    entitlement
  };
  const deps = {
    listLeads: async () => state.leads,
    getEntitlement: async () => state.entitlement,
    readTargets: async () => state.targets,
    readSources: async () => state.sources,
    readMaster: async () => state.master,
    listJobs: async () => state.jobs,
    readJournals: async () => state.journals
  };
  return {
    state,
    lead,
    target,
    deps,
    service: createMasterSitesBusinessPreviewService(deps)
  };
}
test('includes_business_only_partner_without_any_saved_source', async () => {
  const { service } = fixture();
  const overview = await service.get();
  assert.equal(
    masterSitesBusinessReadResponseSchema.safeParse(overview).success,
    true
  );
  assert.equal(overview.partners.length, 1);
  assert.equal(overview.partners[0].status, 'TARGET_REQUIRED');
  assert.equal(overview.partners[0].siteId, 'ana-business');
  assert.equal(overview.partners[0].canPrepareTarget, true);
  assert.equal(overview.partners[0].canPublish, false);
  assert.equal(
    buildMasterSitesBusinessInput(await service.getPartner(id)).distributor
      .purchaseUrl,
    undefined
  );
  assert.equal(JSON.stringify(overview).includes('573101234567'), false);
  assert.equal(JSON.stringify(overview).includes('onboardingData'), false);
});
test('reserved_master_partner_identity_cannot_build_or_publish_business_input', async () => {
  for (const reservedOwnerSiteId of [
    'ganomaster',
    'ganomaster-business',
    'ganomaster-personal-brand'
  ]) {
    const { service, lead, state, target } = fixture();
    lead.siteId = reservedOwnerSiteId;
    for (const withTarget of [false, true]) {
      state.targets = withTarget
        ? [
            {
              siteId: `${reservedOwnerSiteId}-business`,
              hash: hash('reserved-target'),
              value: { ...target, siteId: `${reservedOwnerSiteId}-business` }
            }
          ]
        : [];
      const snapshot = await service.getPartner(id);
      assert.equal(
        snapshot.partner.status,
        'BLOCKED',
        `${reservedOwnerSiteId}, target=${withTarget}`
      );
      assert.ok(
        snapshot.partner.blockedReasons.includes(
          'PARTNER_MASTER_IDENTITY_RESERVED'
        )
      );
      assert.equal(snapshot.partner.canPrepareTarget, false);
      assert.equal(snapshot.partner.canPublish, false);
      assert.equal(snapshot.input, null);
      assert.throws(() => buildMasterSitesBusinessInput(snapshot), {
        message: 'MASTER_SITES_BUSINESS_INPUT_BLOCKED'
      });
      const overview = await service.get();
      assert.equal(
        overview.template.available,
        true,
        'partner collision must not disable the readonly template'
      );
      assert.equal(overview.partners[0].status, 'BLOCKED');
    }
  }
  const { service, lead } = fixture();
  lead.siteId = 'ganomaster-client';
  assert.equal(
    (await service.getPartner(id)).partner.status,
    'TARGET_REQUIRED',
    'nonreserved prefix remains legitimate'
  );
});
test('revoked_grant_or_archived_partner_is_blocked', async () => {
  const { state, service, lead } = fixture();
  state.entitlement.includedEcosystems = [];
  let snapshot = await service.getPartner(id);
  assert.equal(snapshot.partner.status, 'BLOCKED');
  assert.throws(() => buildMasterSitesBusinessInput(snapshot));
  state.entitlement.includedEcosystems = ['BUSINESS'];
  lead.recordState = 'ARCHIVED';
  snapshot = await service.getPartner(id);
  assert.equal(snapshot.partner.status, 'BLOCKED');
  assert.throws(() => buildMasterSitesBusinessInput(snapshot));
});
test('unpaid_offer_is_blocked_but_current_complimentary_business_can_prepare', async () => {
  const { state, service, lead } = fixture();
  lead.status = 'NEW';
  assert.equal((await service.getPartner(id)).partner.status, 'BLOCKED');
  state.entitlement.complimentaryGrantEcosystems = ['BUSINESS'];
  assert.equal(
    (await service.getPartner(id)).partner.status,
    'TARGET_REQUIRED'
  );
  lead.status = 'CANCELLED';
  assert.equal((await service.getPartner(id)).partner.status, 'BLOCKED');
});
test('new_partner_with_confirmed_manual_business_payment_is_eligible', async () => {
  const { state, service, lead } = fixture();
  lead.status = 'NEW';
  state.entitlement.commercialSnapshots = [
    {
      version: 1,
      offerCode: 'BUSINESS_ONLY',
      ecosystemTypes: ['BUSINESS'],
      pricingMode: 'MANUAL_NEGOTIATED',
      amountCop: 200000,
      currency: 'COP',
      selectedAt: timestamp
    }
  ];
  assert.equal(
    (await service.getPartner(id)).partner.status,
    'TARGET_REQUIRED'
  );
  state.entitlement.commercialSnapshots = [];
  assert.equal((await service.getPartner(id)).partner.status, 'BLOCKED');
});
test('ambiguous_owner_domain_or_inventory_is_blocked', async () => {
  for (const variant of [
    'duplicate-lead',
    'shared-domain',
    'wrong-owner',
    'duplicate-target',
    'corrupt-target',
    'malformed-json',
    'wrong-source',
    'duplicate-source'
  ]) {
    const { state, service, lead, target } = fixture();
    state.targets = [
      { siteId: target.siteId, value: target, hash: hash('target') }
    ];
    if (variant === 'duplicate-lead') state.leads.push({ ...lead });
    if (variant === 'shared-domain')
      state.leads.push({ ...lead, id: other, siteId: 'other' });
    if (variant === 'wrong-owner') target.ownerKey = other;
    if (variant === 'duplicate-target')
      state.targets.push({
        siteId: 'alias',
        value: { ...target },
        hash: hash('alias')
      });
    if (variant === 'corrupt-target')
      state.targets.push({
        siteId: 'broken',
        value: { ownerKey: id },
        hash: hash('broken')
      });
    if (variant === 'malformed-json')
      state.targets.push({
        siteId: 'broken',
        value: null,
        hash: hash('broken')
      });
    if (variant === 'wrong-source')
      state.sources = [
        {
          siteId: 'ana-business',
          value: {
            ecosystemType: 'PRODUCT',
            site: { id: 'ana-business', domain: target.publicHost }
          },
          hash: hash('source')
        }
      ];
    if (variant === 'duplicate-source')
      state.sources = ['ana-business', 'alias'].map((siteId) => ({
        siteId,
        value: {
          ecosystemType: 'BUSINESS',
          site: { id: 'ana-business', domain: target.publicHost }
        },
        hash: hash(siteId)
      }));
    const snapshot = await service.getPartner(id);
    assert.equal(snapshot.partner.status, 'BLOCKED', variant);
    assert.throws(() => buildMasterSitesBusinessInput(snapshot), variant);
  }
});
test('changed_master_domain_whatsapp_or_entitlement_changes_review_revision', async () => {
  const { state, service, lead } = fixture();
  const before = (await service.getPartner(id)).reviewRevision;
  assert.match(before, /^[a-f0-9]{64}$/);
  assert.equal((await service.getPartner(id)).reviewRevision, before);
  state.master.revision = hash('new-master');
  const masterChanged = (await service.getPartner(id)).reviewRevision;
  assert.notEqual(masterChanged, before);
  lead.onboardingData.domain = 'new-ana.pro';
  const domainChanged = (await service.getPartner(id)).reviewRevision;
  assert.notEqual(domainChanged, masterChanged);
  lead.whatsapp = lead.onboardingData.whatsapp = '573109999999';
  const whatsappChanged = (await service.getPartner(id)).reviewRevision;
  assert.notEqual(whatsappChanged, domainChanged);
  state.entitlement.complimentaryGrantEcosystems = ['BUSINESS'];
  assert.notEqual(
    (await service.getPartner(id)).reviewRevision,
    whatsappChanged
  );
});
test('ready_target_is_not_current_without_matching_verified_journal', async () => {
  const { state, service, target } = fixture();
  target.publicationState = 'READY';
  state.targets = [
    { siteId: target.siteId, value: target, hash: hash('final-target') }
  ];
  assert.equal((await service.getPartner(id)).partner.status, 'READY');
});
test('matching_success_and_journal_preserve_current_after_final_target_hash_changes', async () => {
  const { state, service, target } = fixture();
  target.publicationState = 'READY';
  state.targets = [
    { siteId: target.siteId, value: target, hash: hash('final-target') }
  ];
  state.leads[0].onboardingData.analyticsMeasurementId = 'G-ANA123';
  const input = buildMasterSitesBusinessInput(await service.getPartner(id));
  // Production sources may store GA4 only in analytics, not duplicate it in integrations.
  delete input.integrations?.analytics;
  state.sources = [
    { siteId: target.siteId, value: input, hash: hash('source') }
  ];
  const jobId = hash('job');
  const journalHash = hash('journal');
  const intent = {
    schemaVersion: 1,
    operation: 'PUBLISH_PARTNER_ECOSYSTEM',
    ownerKey: id,
    ownerSiteId: 'ana',
    siteId: target.siteId,
    ecosystemType: 'BUSINESS',
    baseDomain: 'ana.pro',
    publicHost: target.publicHost,
    sourceHash: hash('source'),
    targetHash: hash('initial-target'),
    masterPackageHash: state.master.packageHash
  };
  const job = {
    schemaVersion: 1,
    id: jobId,
    intentHash: jobId,
    intent,
    status: 'SUCCEEDED',
    phase: 'COMPLETE',
    revision: 4,
    attemptCount: 1,
    requestedBySubjectHash: hash('operator'),
    createdAt: timestamp,
    updatedAt: timestamp,
    completedAt: timestamp,
    evidence: [
      {
        phase: 'COMPLETE',
        recordedAt: timestamp,
        journalHash,
        packageHash: hash('package'),
        capabilityHash: hash('capability'),
        planHash: hash('plan')
      }
    ]
  };
  state.jobs = [job];
  state.journals = [
    {
      hash: journalHash,
      value: {
        mode: 'APPLY_GUARDED_ECOSYSTEM_PUBLICATION',
        publicationJobId: jobId,
        sourceHash: hash('source'),
        initialTargetHash: hash('initial-target'),
        finalTargetHash: hash('final-target'),
        publicHost: target.publicHost,
        remoteRoot: target.remoteRoot,
        packageHash: hash('package'),
        capabilityHash: hash('capability'),
        planHash: hash('plan'),
        appliedAt: timestamp,
        verification: { passed: true }
      }
    }
  ];
  let snapshot = await service.getPartner(id);
  assert.equal(snapshot.partner.status, 'CURRENT');
  assert.equal(snapshot.partner.canPublish, true); // command still requires updateExisting
  assert.equal(
    JSON.stringify(snapshot.partner).includes('requestedBySubjectHash'),
    false
  );
  state.journals.push({ ...state.journals[0] });
  assert.equal(
    (await service.getPartner(id)).partner.status,
    'BLOCKED',
    'ambiguous committed evidence cannot unlock reconciliation'
  );
  state.journals.pop();
  state.master.packageHash = hash('changed-package');
  assert.equal((await service.getPartner(id)).partner.status, 'READY');
  state.master.packageHash = intent.masterPackageHash;
  state.leads[0].whatsapp = state.leads[0].onboardingData.whatsapp =
    '573109999999';
  assert.equal((await service.getPartner(id)).partner.status, 'READY');
  state.leads[0].whatsapp = state.leads[0].onboardingData.whatsapp =
    '573101234567';
  state.journals[0] = {
    hash: journalHash,
    value: {
      ...(state.journals[0].value as object),
      verification: { passed: false }
    }
  };
  snapshot = await service.getPartner(id);
  assert.notEqual(snapshot.partner.status, 'CURRENT');
});
test('pending_target_with_no_remote_root_is_visible_and_can_be_resumed', async () => {
  const { state, service, target } = fixture();
  state.targets = [
    {
      siteId: target.siteId,
      hash: hash('pending'),
      value: {
        ...target,
        remoteRoot: null,
        provisioningState: 'PENDING',
        dnsState: 'PENDING',
        sslState: 'PENDING'
      }
    }
  ];
  const snapshot = await service.getPartner(id);
  assert.equal(snapshot.partner.status, 'TARGET_PENDING');
  assert.equal(snapshot.partner.canPrepareTarget, true);
  assert.equal(snapshot.partner.canPublish, false);
});
test('remote_root_collision_or_unsafe_root_blocks_even_for_the_same_owner', async () => {
  for (const root of ['/', '/safe/../other', '/shared', '/nested']) {
    const { state, service, target } = fixture();
    state.targets = [
      {
        siteId: target.siteId,
        hash: hash('target'),
        value: { ...target, remoteRoot: root }
      }
    ];
    if (root === '/shared')
      state.targets.push({
        siteId: 'ana-product',
        hash: hash('product'),
        value: {
          ...target,
          siteId: 'ana-product',
          ecosystemType: 'PRODUCT',
          publicHost: 'producto.ana.pro',
          remoteRoot: root
        }
      });
    if (root === '/nested')
      state.targets.push({
        siteId: 'ana-product',
        hash: hash('product'),
        value: {
          ...target,
          siteId: 'ana-product',
          ecosystemType: 'PRODUCT',
          publicHost: 'producto.ana.pro',
          remoteRoot: `${root}/producto`
        }
      });
    assert.equal(
      (await service.getPartner(id)).partner.status,
      'BLOCKED',
      root
    );
  }
});
test('prior_hosting_conflict_is_blocked_rather_than_offered_for_automatic_resume', async () => {
  const { state, service, target } = fixture();
  state.targets = [
    {
      siteId: target.siteId,
      hash: hash('conflict'),
      value: {
        ...target,
        provisioningState: 'FAILED',
        lastErrorCode: 'HOSTINGER_SUBDOMAIN_CONFLICT'
      }
    }
  ];
  const snapshot = await service.getPartner(id);
  assert.equal(snapshot.partner.status, 'BLOCKED');
  assert.equal(snapshot.partner.canPrepareTarget, false);
});
test('active_job_blocks_publish_even_when_its_source_is_stale', async () => {
  const { state, service, target } = fixture();
  state.targets = [
    { siteId: target.siteId, value: target, hash: hash('target') }
  ];
  const jobId = hash('job');
  state.jobs = [
    {
      schemaVersion: 1,
      id: jobId,
      intentHash: jobId,
      intent: {
        schemaVersion: 1,
        operation: 'PUBLISH_PARTNER_ECOSYSTEM',
        ownerKey: id,
        ownerSiteId: 'ana',
        siteId: target.siteId,
        ecosystemType: 'BUSINESS',
        baseDomain: 'ana.pro',
        publicHost: target.publicHost,
        sourceHash: hash('old-source'),
        targetHash: hash('target'),
        masterPackageHash: state.master.packageHash
      },
      status: 'QUEUED',
      phase: 'QUEUED',
      revision: 1,
      attemptCount: 0,
      requestedBySubjectHash: hash('operator'),
      createdAt: timestamp,
      updatedAt: timestamp,
      evidence: []
    }
  ];
  const snapshot = await service.getPartner(id);
  assert.equal(snapshot.partner.status, 'QUEUED');
  assert.equal(snapshot.partner.canPublish, false);
  assert.equal(snapshot.partner.canPrepareTarget, false);
  assert.throws(() => buildMasterSitesBusinessInput(snapshot));
});
test('unknown_partner_throws_safe_not_found_and_read_failure_fails_closed', async () => {
  const { deps, service } = fixture();
  await assert.rejects(service.getPartner(other), {
    message: 'MASTER_SITES_PARTNER_NOT_FOUND'
  });
  deps.readTargets = async () => {
    throw new Error('private /data/path credential');
  };
  const result = await createMasterSitesBusinessPreviewService(deps).get();
  assert.equal(result.partners[0].status, 'BLOCKED');
  assert.equal(JSON.stringify(result).includes('private'), false);
});
test('real_local_readers_use_confirmed_ledger_and_canonical_v2_and_never_hide_corrupt_inventory', async (t) => {
  const root = await mkdtemp(resolve(tmpdir(), 'ph-master-sites-preview-'));
  const oldEnv = { ...process.env };
  t.after(async () => {
    process.env = oldEnv;
    await rm(root, { recursive: true, force: true });
  });
  process.env.PRODUCT_PAGE_SOURCE_DIR = resolve(root, 'sources');
  process.env.PRODUCT_PAGE_OUTPUT_DIR = resolve(root, 'output');
  process.env.PRODUCT_PAGE_ACTIVATION_DIR = resolve(root, 'activation');
  process.env.PRODUCT_PAGE_PAYMENT_DIR = resolve(root, 'payments');
  process.env.PRODUCT_PAGE_COMMERCIAL_GRANT_DIR = resolve(root, 'grants');
  process.env.PRODUCT_PAGE_PUBLICATION_JOURNAL_DIR = resolve(root, 'journals');
  process.env.PRODUCT_PAGE_TEMPLATE_DIR = resolve(
    '../../plantillas-de-pagina/producto'
  );
  const { lead } = fixture();
  lead.status = 'NEW';
  const offerSnapshot = {
    offerCode: 'BUSINESS_ONLY',
    ecosystemTypes: ['BUSINESS'],
    ecosystemType: 'BUSINESS',
    amountCop: 180000,
    currency: 'COP',
    billingType: 'ONE_TIME',
    catalogVersion: '2026-08-12.v1',
    selectedAt: timestamp
  };
  await mkdir(process.env.PRODUCT_PAGE_ACTIVATION_DIR, { recursive: true });
  await writeFile(
    resolve(process.env.PRODUCT_PAGE_ACTIVATION_DIR, 'leads.json'),
    JSON.stringify([{ ...lead, offerSnapshot }])
  );
  await cp(
    resolve('../../plantillas-de-pagina/business'),
    resolve(process.env.PRODUCT_PAGE_OUTPUT_DIR, 'ganomaster-business'),
    { recursive: true }
  );
  const service = createMasterSitesBusinessPreviewService({
    listJobs: async () => []
  });
  assert.equal(
    (await service.getPartner(id)).partner.status,
    'BLOCKED',
    'unpaid offer is not eligibility'
  );
  await manualPaymentLedgerService.create({
    activationLeadId: id,
    category: 'ACTIVATION',
    amountCop: 180000,
    method: 'CASH',
    paidAt: timestamp,
    offerCode: 'BUSINESS_ONLY',
    ecosystemTypes: ['BUSINESS'],
    pricingMode: 'CATALOG'
  });
  const snapshot = await service.getPartner(id);
  assert.equal(snapshot.partner.status, 'TARGET_REQUIRED');
  assert.equal(
    buildMasterSitesBusinessInput(snapshot).vsl?.embedUrl,
    'https://media.partnerhub.club/comunes/business/v2/vsl/business-vsl-pilot-v2.mp4'
  );
  assert.equal(
    (await service.getPartner(id)).reviewRevision,
    snapshot.reviewRevision
  );
  const masterConfig = resolve(
    process.env.PRODUCT_PAGE_OUTPUT_DIR,
    'ganomaster-business',
    'config.js'
  );
  await writeFile(
    masterConfig,
    `${await readFile(masterConfig, 'utf8')}\n// reviewed local update\n`
  );
  assert.notEqual(
    (await service.getPartner(id)).reviewRevision,
    snapshot.reviewRevision
  );
  await mkdir(
    resolve(process.env.PRODUCT_PAGE_SOURCE_DIR, '.publishing-targets'),
    { recursive: true }
  );
  await writeFile(
    resolve(
      process.env.PRODUCT_PAGE_SOURCE_DIR,
      '.publishing-targets',
      'broken.json'
    ),
    '{broken'
  );
  const blocked = await service.getPartner(id);
  assert.equal(blocked.partner.status, 'BLOCKED');
  assert.ok(
    blocked.partner.blockedReasons.includes('TARGET_INVENTORY_UNAVAILABLE')
  );
});
