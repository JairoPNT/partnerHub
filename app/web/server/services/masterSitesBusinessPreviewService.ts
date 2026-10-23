import 'server-only';

import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { posix, relative, resolve, sep } from 'node:path';
import { z } from 'zod';
import {
  masterSitesBusinessReadResponseSchema,
  masterSitesSafeJobSchema,
  type MasterSitesBusinessPartner,
  type MasterSitesBusinessReadResponse,
  type MasterSitesBusinessTemplate
} from '@/shared/master-sites-business-contract';
import { activationLeadService } from '@/server/services/activationLeadService';
import { complimentaryEcosystemGrantService } from '@/server/services/complimentaryEcosystemGrantService';
import { manualPaymentLedgerService } from '@/server/services/manualPaymentLedgerService';
import { buildPartnerEcosystemEntitlement } from '@/server/services/partnerEcosystemEntitlementCore';
import {
  publicationJobSchema,
  publicationJobService,
  type PublicationJob
} from '@/server/services/publicationJobService';
import {
  productPageGenerationInputSchema,
  normalizeProductPageGenerationConfiguration,
  type ProductPageGenerationInput
} from '@/server/services/productPageGenerationService';
import { loadBusinessMasterContent } from '@/server/services/businessMasterContent';
import { resolveCanonicalTemplateDirectory } from '@/server/services/ecosystemTemplateResolver';
import { isMasterSiteId } from '@/server/services/ecosystemService';
import { assembleMasterSitesBusinessInput } from '@/server/services/masterSitesBusinessInput';
import { resolvePartnerWhatsappIdentity } from '@/shared/partner-whatsapp-identity.mjs';
import {
  extractProductHero,
  resolveBusinessVslThumbnail
} from '@/shared/business-vsl-poster-contract.mjs';

const hashSchema = z.string().regex(/^[a-f0-9]{64}$/);
const siteIdSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const hostnameSchema = z
  .string()
  .regex(
    /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/
  );
const ecosystemSchema = z.enum(['PRODUCT', 'BUSINESS', 'PERSONAL_BRAND']);
const approvedVslSchema = z
  .object({
    provider: z.literal('custom'),
    embedUrl: z
      .string()
      .regex(
        /^https:\/\/media\.partnerhub\.club\/comunes\/business\/v\d+\/vsl\/[a-z0-9-]+\.mp4$/
      )
  })
  .passthrough();
const targetSchema = z
  .object({
    version: z.literal(2),
    ownerKey: z.string().uuid(),
    siteId: siteIdSchema,
    ecosystemType: ecosystemSchema,
    rootEcosystemType: ecosystemSchema,
    baseDomain: hostnameSchema,
    publicHost: hostnameSchema,
    remoteRoot: z
      .string()
      .min(2)
      .startsWith('/')
      .refine(
        (value) =>
          posix.normalize(value) === value &&
          !value.endsWith('/') &&
          !value.includes('\\') &&
          [...value].every((character) => character.charCodeAt(0) >= 32)
      )
      .nullable(),
    provisioningState: z.enum([
      'PENDING',
      'HOSTING_CREATED',
      'DNS_PENDING',
      'SSL_PENDING',
      'READY',
      'FAILED'
    ]),
    publicationState: z.enum(['PENDING', 'READY']),
    hostingerState: z.enum(['PENDING', 'READY']).optional(),
    dnsState: z.enum(['PENDING', 'CREATED', 'RESOLVED']),
    sslState: z.enum(['PENDING', 'READY'])
  })
  .passthrough();
const sourceIdentitySchema = z
  .object({
    ecosystemType: ecosystemSchema.optional(),
    site: z.object({ id: siteIdSchema, domain: hostnameSchema.optional() })
  })
  .passthrough()
  .refine(
    (value) =>
      value.ecosystemType !== undefined ||
      // Only a genuinely omitted historical Product discriminator may default.
      // Business/Brand slugs and hosts (including their masters) are not Product.
      (!Object.prototype.hasOwnProperty.call(value, 'ecosystemType') &&
        !/-(?:business|personal-brand)$/.test(value.site.id) &&
        !/^(?:negocio|business|brand)\./.test(value.site.domain ?? ''))
  )
  .transform((value) => ({
    ...value,
    ecosystemType: value.ecosystemType ?? 'PRODUCT'
  }));
const manualSnapshotSchema = z
  .object({
    version: z.literal(1),
    offerCode: z.string().nullable(),
    ecosystemTypes: z.array(ecosystemSchema).min(1),
    pricingMode: z.enum(['CATALOG', 'MANUAL_NEGOTIATED']),
    amountCop: z.number().int().positive(),
    currency: z.literal('COP'),
    selectedAt: z.string().datetime({ offset: true })
  })
  .strict();
const entitlementSchema = z
  .object({
    activationLeadId: z.string().uuid(),
    commercialState: z.enum(['KNOWN', 'UNKNOWN']),
    includedEcosystems: z.array(ecosystemSchema),
    complimentaryGrantEcosystems: z.array(ecosystemSchema).optional(),
    commercialSnapshots: z.array(z.unknown()).optional(),
    existingTargets: z.array(z.unknown())
  })
  .passthrough();

export type MasterSitesBusinessLead = Pick<
  NonNullable<Awaited<ReturnType<typeof activationLeadService.getById>>>,
  | 'id'
  | 'siteId'
  | 'status'
  | 'fullName'
  | 'brandName'
  | 'whatsapp'
  | 'onboardingData'
  | 'recordState'
>;
export type MasterSitesBusinessInventoryEntry = {
  siteId: string;
  hash: string;
  value: unknown;
};
export type MasterSitesBusinessJournalEntry = { hash: string; value: unknown };
export type MasterSitesBusinessMaster = {
  revision: string;
  packageHash: string;
  previewUrl: string | null;
  content: {
    vsl: NonNullable<ProductPageGenerationInput['vsl']>;
    hero?: ProductPageGenerationInput['hero'];
    theme?: ProductPageGenerationInput['theme'];
  };
};
export type MasterSitesBusinessDependencies = {
  listLeads(): Promise<MasterSitesBusinessLead[]>;
  getEntitlement(query: { activationLeadId: string }): Promise<unknown>;
  readTargets(): Promise<MasterSitesBusinessInventoryEntry[]>;
  readSources(): Promise<MasterSitesBusinessInventoryEntry[]>;
  readMaster(): Promise<MasterSitesBusinessMaster>;
  listJobs(): Promise<unknown[]>;
  readJournals(siteId: string): Promise<MasterSitesBusinessJournalEntry[]>;
};
export type BusinessPartnerSnapshot = {
  // Internal, server-only. Routes MUST project `partner`, never serialize this object.
  activationLeadId: string;
  ownerKey: string;
  ownerSiteId: string | null;
  siteId: string | null;
  baseDomain: string | null;
  publicHost: string | null;
  reviewRevision: string;
  partner: MasterSitesBusinessPartner;
  template: MasterSitesBusinessTemplate;
  lead: MasterSitesBusinessLead;
  entitlement: z.infer<typeof entitlementSchema> | null;
  master: MasterSitesBusinessMaster | null;
  source: ProductPageGenerationInput | null;
  sourceHash: string | null;
  target: z.infer<typeof targetSchema> | null;
  targetHash: string | null;
  input: ProductPageGenerationInput | null;
  jobs: PublicationJob[];
};

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object')
    return `{${Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(',')}}`;
  return JSON.stringify(value);
}
const sha256 = (value: string | Buffer) =>
  createHash('sha256').update(value).digest('hex');
const materialHash = (value: unknown) => sha256(canonical(value));
const sourceRoot = () =>
  resolve(
    process.env.PRODUCT_PAGE_SOURCE_DIR ?? '/data/generated-sites/.sources'
  );

async function readInventory(
  directory: string
): Promise<MasterSitesBusinessInventoryEntry[]> {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
  return Promise.all(
    entries
      .filter((entry) => entry.name.endsWith('.json'))
      .map(async (entry) => {
        if (
          !entry.isFile() ||
          !siteIdSchema.safeParse(entry.name.slice(0, -5)).success
        )
          throw new Error('MASTER_SITES_INVENTORY_INVALID');
        const bytes = await readFile(resolve(directory, entry.name));
        // Never filter corrupt JSON: without its identity we cannot rule out a collision.
        return {
          siteId: entry.name.slice(0, -5),
          hash: sha256(bytes),
          value: JSON.parse(bytes.toString('utf8')) as unknown
        };
      })
  );
}

async function packageHash(directory: string) {
  const files: { path: string; hash: string }[] = [];
  async function visit(current: string) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const path = resolve(current, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile())
        files.push({
          path: relative(directory, path).split(sep).join('/'),
          hash: sha256(await readFile(path))
        });
      else throw new Error('MASTER_SITES_MASTER_INVALID');
    }
  }
  await visit(directory);
  for (const required of ['index.html', 'config.js', 'styles.css', 'app.js'])
    if (!files.some((file) => file.path === required))
      throw new Error('MASTER_SITES_MASTER_INVALID');
  files.sort((a, b) => a.path.localeCompare(b.path));
  return sha256(JSON.stringify(files)); // same algorithm as publicationJobService
}

const defaultDependencies: MasterSitesBusinessDependencies = {
  listLeads: () => activationLeadService.list({ includeArchived: true }),
  async getEntitlement({ activationLeadId }) {
    const [lead, payments, grants, entries] = await Promise.all([
      activationLeadService.getById(activationLeadId),
      manualPaymentLedgerService.list({
        activationLeadId,
        status: 'CONFIRMED'
      }),
      complimentaryEcosystemGrantService.listActiveEcosystems(activationLeadId),
      readInventory(resolve(sourceRoot(), '.publishing-targets'))
    ]);
    if (!lead) return null;
    // Current provenance: an unconfirmed offer is not a purchase. Confirmed manual
    // ledger payments remain valid even when lead.status is NEW.
    return buildPartnerEcosystemEntitlement(
      {
        ...lead,
        offerSnapshot: ['PAID', 'CONVERTED'].includes(lead.status)
          ? lead.offerSnapshot
          : undefined,
        additionalCommercialSnapshots: payments.payments.flatMap((payment) =>
          payment.commercialSnapshot ? [payment.commercialSnapshot] : []
        ),
        complimentaryGrantEcosystems: grants
      },
      entries.map((entry) => targetSchema.parse(entry.value))
    );
  },
  readTargets: () =>
    readInventory(resolve(sourceRoot(), '.publishing-targets')),
  readSources: () => readInventory(sourceRoot()),
  async readMaster() {
    const directory = resolveCanonicalTemplateDirectory(
      process.env.PRODUCT_PAGE_TEMPLATE_DIR ??
        '/app/plantillas-de-pagina/producto',
      'BUSINESS'
    );
    const [content, canonicalHash, masterHash] = await Promise.all([
      loadBusinessMasterContent(directory),
      packageHash(directory),
      packageHash(
        resolve(
          process.env.PRODUCT_PAGE_OUTPUT_DIR ?? '/data/generated-sites',
          'ganomaster-business'
        )
      )
    ]);
    approvedVslSchema.parse(content.vsl);
    return {
      content,
      packageHash: masterHash,
      revision: materialHash({ canonicalHash, masterHash }),
      previewUrl: '/api/internal/product-pages/preview/ganomaster-business'
    };
  },
  listJobs: () => publicationJobService.list(),
  async readJournals(siteId) {
    const directory = resolve(
      process.env.PRODUCT_PAGE_PUBLICATION_JOURNAL_DIR ??
        '/data/generated-sites/.publication-journals',
      siteIdSchema.parse(siteId)
    );
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
    return Promise.all(
      entries
        .filter((entry) => entry.name.endsWith('.json'))
        .map(async (entry) => {
          if (!entry.isFile()) throw new Error('MASTER_SITES_JOURNAL_INVALID');
          const bytes = await readFile(resolve(directory, entry.name));
          return {
            hash: sha256(bytes),
            value: JSON.parse(bytes.toString('utf8')) as unknown
          };
        })
    );
  }
};

type ReadContext = {
  leads: MasterSitesBusinessLead[];
  targets: MasterSitesBusinessInventoryEntry[];
  sources: MasterSitesBusinessInventoryEntry[];
  jobs: PublicationJob[];
  master: MasterSitesBusinessMaster | null;
  reasons: string[];
};

function sameSourceAuthority(
  source: ProductPageGenerationInput,
  input: ProductPageGenerationInput,
  master: MasterSitesBusinessMaster
) {
  const effective = (configuration: ProductPageGenerationInput) => {
    const normalized =
      normalizeProductPageGenerationConfiguration(configuration);
    return {
      ...normalized,
      hero: { ...master.content.hero, ...normalized.hero },
      vsl: {
        ...master.content.vsl,
        ...normalized.vsl,
        thumbnailUrl:
          normalized.vsl?.thumbnailUrl ?? resolveBusinessVslThumbnail({})
      },
      theme: normalized.theme ??
        master.content.theme ?? {
          fontPreset: 'executive',
          palettePreset: 'cobalt-cyan'
        },
      // GA4 aliases/redundant copies are one effective setting. Empty optional
      // integration containers do not change rendered tracking behavior.
      analytics: normalized.analytics ?? null,
      integrations: {
        pixelId: normalized.integrations?.meta?.pixelId ?? null,
        conversionId: normalized.integrations?.googleAds?.conversionId ?? null
      }
    };
  };
  try {
    return canonical(effective(source)) === canonical(effective(input));
  } catch {
    return false;
  }
}

function derivedBusinessPoster(
  lead: MasterSitesBusinessLead,
  target: z.infer<typeof targetSchema> | null,
  targets: z.infer<typeof targetSchema>[],
  sources: MasterSitesBusinessInventoryEntry[]
) {
  const fallback = resolveBusinessVslThumbnail({});
  if (!target) return fallback;
  const products = targets.filter(
    (entry) => entry.ownerKey === lead.id && entry.ecosystemType === 'PRODUCT'
  );
  if (products.length > 1) return fallback;
  if (products.length === 1) {
    const matches = sources.filter(
      (entry) => entry.siteId === products[0].siteId
    );
    return matches.length === 1
      ? resolveBusinessVslThumbnail(
          extractProductHero(
            matches[0].value as Parameters<typeof extractProductHero>[0]
          )
        )
      : fallback;
  }
  // Mirror the existing resolver's authoritative legacy fallback; never guess a
  // Product slug or inherit another partner's hero. Product remains optional.
  if (
    targets.some(
      (entry) => entry.siteId === lead.siteId && entry.ownerKey !== lead.id
    )
  )
    return fallback;
  const matches = sources.filter((entry) => entry.siteId === lead.siteId);
  if (matches.length !== 1) return fallback;
  const parsed = sourceIdentitySchema.safeParse(matches[0].value);
  if (
    !parsed.success ||
    parsed.data.ecosystemType !== 'PRODUCT' ||
    ![target.baseDomain, `producto.${target.baseDomain}`].includes(
      parsed.data.site.domain ?? ''
    )
  )
    return fallback;
  return resolveBusinessVslThumbnail(
    extractProductHero(
      matches[0].value as Parameters<typeof extractProductHero>[0]
    )
  );
}

function isCurrent(
  job: PublicationJob,
  snapshot: BusinessPartnerSnapshot,
  journals: MasterSitesBusinessJournalEntry[]
) {
  const { target, input, source, master } = snapshot;
  if (
    !target ||
    !input ||
    !source ||
    !master ||
    target.publicationState !== 'READY' ||
    job.status !== 'SUCCEEDED' ||
    !sameSourceAuthority(source, input, master)
  )
    return false;
  const intent = job.intent;
  if (
    intent.ownerKey !== snapshot.ownerKey ||
    intent.ownerSiteId !== snapshot.ownerSiteId ||
    intent.siteId !== snapshot.siteId ||
    intent.ecosystemType !== 'BUSINESS' ||
    intent.baseDomain !== snapshot.baseDomain ||
    intent.publicHost !== snapshot.publicHost ||
    intent.sourceHash !== snapshot.sourceHash ||
    intent.masterPackageHash !== master.packageHash
  )
    return false;
  const matches = journals.filter(
    (entry) =>
      (entry.value as Record<string, unknown> | null)?.publicationJobId ===
      job.id
  );
  if (matches.length !== 1) return false;
  const { hash, value } = matches[0];
  const journal = value as Record<string, unknown>;
  const evidence = job.evidence.find(
    (entry) => entry.phase === 'COMPLETE' && entry.journalHash === hash
  );
  return Boolean(
    evidence &&
    hashSchema.safeParse(hash).success &&
    journal.mode === 'APPLY_GUARDED_ECOSYSTEM_PUBLICATION' &&
    journal.sourceHash === intent.sourceHash &&
    journal.initialTargetHash === intent.targetHash &&
    journal.finalTargetHash === snapshot.targetHash &&
    journal.publicHost === snapshot.publicHost &&
    journal.remoteRoot === target.remoteRoot &&
    journal.packageHash === evidence.packageHash &&
    journal.capabilityHash === evidence.capabilityHash &&
    journal.planHash === evidence.planHash &&
    hashSchema.safeParse(journal.packageHash).success &&
    hashSchema.safeParse(journal.capabilityHash).success &&
    hashSchema.safeParse(journal.planHash).success &&
    typeof journal.appliedAt === 'string' &&
    Number.isFinite(Date.parse(journal.appliedAt)) &&
    (journal.verification as { passed?: unknown } | null)?.passed === true
  );
}

export function createMasterSitesBusinessPreviewService(
  overrides: Partial<MasterSitesBusinessDependencies> = {}
) {
  const dependencies = { ...defaultDependencies, ...overrides };
  async function readContext(): Promise<ReadContext> {
    const leads = await dependencies.listLeads();
    const reasons: string[] = [];
    async function safe<T>(
      action: () => Promise<T>,
      fallback: T,
      reason: string
    ): Promise<T> {
      try {
        return await action();
      } catch {
        reasons.push(reason);
        return fallback;
      }
    }
    const [targets, sources, rawJobs, master] = await Promise.all([
      safe(
        () => dependencies.readTargets(),
        [],
        'TARGET_INVENTORY_UNAVAILABLE'
      ),
      safe(
        () => dependencies.readSources(),
        [],
        'SOURCE_INVENTORY_UNAVAILABLE'
      ),
      safe(() => dependencies.listJobs(), [], 'JOB_INVENTORY_UNAVAILABLE'),
      safe<MasterSitesBusinessMaster | null>(
        () => dependencies.readMaster(),
        null,
        'MASTER_UNAVAILABLE'
      )
    ]);
    const jobs: PublicationJob[] = [];
    for (const job of rawJobs) {
      const parsed = publicationJobSchema.safeParse(job);
      if (!parsed.success) reasons.push('JOB_INVENTORY_INVALID');
      else jobs.push(parsed.data);
    }
    for (const entry of targets) {
      const parsed = targetSchema.safeParse(entry.value);
      if (
        !parsed.success ||
        parsed.data.siteId !== entry.siteId ||
        !hashSchema.safeParse(entry.hash).success
      )
        reasons.push('TARGET_INVENTORY_INVALID');
    }
    for (const entry of sources) {
      const parsed = sourceIdentitySchema.safeParse(entry.value);
      if (
        !parsed.success ||
        parsed.data.site.id !== entry.siteId ||
        !hashSchema.safeParse(entry.hash).success
      )
        reasons.push('SOURCE_INVENTORY_INVALID');
    }
    if (
      master &&
      (!hashSchema.safeParse(master.revision).success ||
        !hashSchema.safeParse(master.packageHash).success ||
        !approvedVslSchema.safeParse(master.content.vsl).success)
    )
      reasons.push('MASTER_INVALID');
    return {
      leads,
      targets,
      sources,
      jobs,
      master,
      reasons: [...new Set(reasons)]
    };
  }

  function templateFor(context: ReadContext): MasterSitesBusinessTemplate {
    const reasons = context.reasons.filter((reason) =>
      reason.startsWith('MASTER_')
    );
    return {
      id: 'ganomaster-business',
      ecosystemType: 'BUSINESS',
      available: !!context.master && reasons.length === 0,
      revision: context.master?.revision ?? null,
      previewUrl:
        reasons.length === 0 ? (context.master?.previewUrl ?? null) : null,
      blockedReasons: reasons
    };
  }

  async function snapshotFor(
    lead: MasterSitesBusinessLead,
    context: ReadContext
  ): Promise<BusinessPartnerSnapshot> {
    const reasons = [...context.reasons];
    const reject = (reason: string) => reasons.push(reason);
    const ownerSiteId = siteIdSchema.safeParse(lead.siteId).success
      ? lead.siteId!
      : null;
    const siteId = ownerSiteId ? `${ownerSiteId}-business` : null;
    // Partner delivery must never enter the generator's reserved-master path.
    // Check without relying on any existing source/target inventory records.
    if (
      (ownerSiteId && isMasterSiteId(ownerSiteId)) ||
      (siteId && isMasterSiteId(siteId))
    )
      reject('PARTNER_MASTER_IDENTITY_RESERVED');
    const domain = lead.onboardingData?.domain;
    const baseDomain = hostnameSchema.safeParse(domain).success
      ? domain!
      : null;
    const publicHost = baseDomain ? `negocio.${baseDomain}` : null;
    if (!ownerSiteId || !baseDomain) reject('PARTNER_IDENTITY_INCOMPLETE');
    if (
      (lead.recordState ?? 'ACTIVE') !== 'ACTIVE' ||
      lead.status === 'CANCELLED'
    )
      reject('PARTNER_NOT_ACTIVE');
    if (
      context.leads.filter(
        (item) =>
          item.id === lead.id ||
          (ownerSiteId && item.siteId === ownerSiteId) ||
          (baseDomain && item.onboardingData?.domain === baseDomain)
      ).length !== 1
    )
      reject('PARTNER_IDENTITY_AMBIGUOUS');
    const whatsapp = resolvePartnerWhatsappIdentity({
      leadWhatsapp: lead.whatsapp,
      onboardingWhatsapp: lead.onboardingData?.whatsapp
    });
    if (whatsapp.conflict) reject('PARTNER_WHATSAPP_CONFLICT');
    else if (!/^\d{10,15}$/.test(whatsapp.value ?? ''))
      reject('PARTNER_WHATSAPP_INVALID');
    let entitlement: BusinessPartnerSnapshot['entitlement'] = null;
    try {
      const parsed = entitlementSchema.safeParse(
        await dependencies.getEntitlement({ activationLeadId: lead.id })
      );
      if (parsed.success) entitlement = parsed.data;
    } catch {
      reject('ENTITLEMENT_UNAVAILABLE');
    }
    if (
      !entitlement ||
      entitlement.activationLeadId !== lead.id ||
      entitlement.commercialState !== 'KNOWN' ||
      !entitlement.includedEcosystems.includes('BUSINESS')
    )
      reject('BUSINESS_NOT_ENTITLED');
    const manualBusiness = entitlement?.commercialSnapshots?.some((value) => {
      const parsed = manualSnapshotSchema.safeParse(value);
      return parsed.success && parsed.data.ecosystemTypes.includes('BUSINESS');
    });
    if (
      !['PAID', 'CONVERTED'].includes(lead.status) &&
      !entitlement?.complimentaryGrantEcosystems?.includes('BUSINESS') &&
      !manualBusiness
    )
      reject('BUSINESS_PAYMENT_NOT_CONFIRMED');

    const targets = context.targets.flatMap((entry) => {
      const parsed = targetSchema.safeParse(entry.value);
      return parsed.success ? [{ ...entry, target: parsed.data }] : [];
    });
    const relevant = targets.filter(
      ({ target }) =>
        target.siteId === siteId ||
        target.publicHost === publicHost ||
        (target.ownerKey === lead.id && target.ecosystemType === 'BUSINESS')
    );
    let selected = relevant.length === 1 ? relevant[0] : null;
    if (relevant.length > 1) reject('TARGET_IDENTITY_AMBIGUOUS');
    if (
      selected &&
      (selected.target.ownerKey !== lead.id ||
        selected.target.siteId !== siteId ||
        selected.target.ecosystemType !== 'BUSINESS' ||
        selected.target.baseDomain !== baseDomain ||
        selected.target.publicHost !== publicHost)
    ) {
      reject('TARGET_OWNERSHIP_MISMATCH');
      selected = null;
    }
    if (
      targets.some(
        ({ target }) =>
          target.baseDomain === baseDomain && target.ownerKey !== lead.id
      )
    )
      reject('DOMAIN_OWNERSHIP_CONFLICT');
    const target = selected?.target ?? null;
    if (
      typeof target?.lastErrorCode === 'string' &&
      /CONFLICT|MIGRATION/.test(target.lastErrorCode)
    )
      reject('TARGET_RECONCILIATION_REQUIRED');
    if (target?.provisioningState === 'READY' && !target.remoteRoot)
      reject('TARGET_REMOTE_ROOT_MISSING');
    const root = target?.remoteRoot;
    if (
      root &&
      targets.some(
        (entry) =>
          entry !== selected &&
          entry.target.remoteRoot &&
          (entry.target.remoteRoot === root ||
            entry.target.remoteRoot.startsWith(`${root}/`) ||
            root.startsWith(`${entry.target.remoteRoot}/`))
      )
    )
      reject('TARGET_REMOTE_ROOT_CONFLICT');
    const sourceEntries = context.sources.filter((entry) => {
      const parsed = sourceIdentitySchema.safeParse(entry.value);
      return (
        entry.siteId === siteId ||
        (parsed.success &&
          (parsed.data.site.id === siteId ||
            parsed.data.site.domain === publicHost))
      );
    });
    let source: ProductPageGenerationInput | null = null;
    if (sourceEntries.length > 1) reject('SOURCE_IDENTITY_AMBIGUOUS');
    else if (sourceEntries.length === 1) {
      const parsed = productPageGenerationInputSchema.safeParse(
        sourceEntries[0].value
      );
      if (
        !parsed.success ||
        parsed.data.ecosystemType !== 'BUSINESS' ||
        parsed.data.site.id !== siteId ||
        parsed.data.site.domain !== publicHost
      )
        reject('SOURCE_IDENTITY_INVALID');
      else source = parsed.data;
    }
    let input: ProductPageGenerationInput | null = null;
    if (
      context.master &&
      siteId &&
      publicHost &&
      whatsapp.value &&
      !reasons.length
    ) {
      try {
        input = assembleMasterSitesBusinessInput({
          lead,
          siteId,
          publicHost,
          whatsapp: whatsapp.value,
          master: context.master,
          source
        });
        input.vsl = {
          ...input.vsl,
          thumbnailUrl: derivedBusinessPoster(
            lead,
            target,
            targets.map((entry) => entry.target),
            context.sources
          )
        };
      } catch {
        reject('BUSINESS_INPUT_INVALID');
      }
    }
    const siteJobs = context.jobs.filter(
      (job) =>
        job.intent.siteId === siteId || job.intent.publicHost === publicHost
    );
    if (
      siteJobs.some(
        (job) =>
          job.intent.ownerKey !== lead.id ||
          job.intent.siteId !== siteId ||
          job.intent.ecosystemType !== 'BUSINESS' ||
          job.intent.publicHost !== publicHost ||
          job.intent.baseDomain !== baseDomain ||
          job.intent.ownerSiteId !== ownerSiteId
      )
    )
      reject('JOB_OWNERSHIP_MISMATCH');
    const active = siteJobs.filter(
      (job) => job.status === 'QUEUED' || job.status === 'RUNNING'
    );
    if (active.length > 1) reject('JOB_IDENTITY_AMBIGUOUS');
    const template = templateFor(context);
    const reviewRevision = materialHash({
      version: 1,
      master: context.master
        ? {
            revision: context.master.revision,
            packageHash: context.master.packageHash
          }
        : null,
      partner: {
        id: lead.id,
        ownerSiteId,
        baseDomain,
        recordState: lead.recordState ?? 'ACTIVE',
        status: lead.status,
        whatsapp,
        fullName: lead.fullName,
        brandName: lead.brandName
      },
      entitlement: entitlement
        ? {
            activationLeadId: entitlement.activationLeadId,
            commercialState: entitlement.commercialState,
            includedEcosystems: [...entitlement.includedEcosystems].sort(),
            grants: [
              ...(entitlement.complimentaryGrantEcosystems ?? [])
            ].sort(),
            commercialSnapshots: entitlement.commercialSnapshots ?? []
          }
        : null,
      input,
      sources: sourceEntries
        .map(({ siteId, hash }) => ({ siteId, hash }))
        .sort((a, b) => a.siteId.localeCompare(b.siteId)),
      targets: relevant
        .map(({ siteId, hash }) => ({ siteId, hash }))
        .sort((a, b) => a.siteId.localeCompare(b.siteId)),
      reasons: [...new Set(reasons)].sort()
    });
    const snapshot: BusinessPartnerSnapshot = {
      activationLeadId: lead.id,
      ownerKey: lead.id,
      ownerSiteId,
      siteId,
      baseDomain,
      publicHost,
      reviewRevision,
      lead,
      entitlement,
      master: context.master,
      source,
      sourceHash: sourceEntries.length === 1 ? sourceEntries[0].hash : null,
      target,
      targetHash: selected?.hash ?? null,
      input,
      jobs: siteJobs,
      template,
      partner: {
        activationLeadId: lead.id,
        displayName: lead.fullName,
        siteId,
        publicHost,
        status: 'BLOCKED',
        blockedReasons: [],
        reviewRevision,
        canPrepareTarget: false,
        canPublish: false,
        currentJob: null
      }
    };
    let job: PublicationJob | null = active[0] ?? null;
    if (!reasons.length && !active.length && source && target) {
      let journals: MasterSitesBusinessJournalEntry[] = [];
      try {
        journals = await dependencies.readJournals(siteId!);
      } catch {
        reject('JOURNAL_INVENTORY_UNAVAILABLE');
      }
      const journalJobs = journals
        .map(
          (entry) =>
            (entry.value as Record<string, unknown> | null)?.publicationJobId
        )
        .filter((id): id is string => typeof id === 'string');
      if (new Set(journalJobs).size !== journalJobs.length)
        reject('PUBLICATION_EVIDENCE_AMBIGUOUS');
      const current = siteJobs.filter((candidate) =>
        isCurrent(candidate, snapshot, journals)
      );
      if (current.length > 1) reject('PUBLICATION_EVIDENCE_AMBIGUOUS');
      job =
        current[0] ??
        siteJobs
          .filter(
            (candidate) =>
              candidate.intent.sourceHash === snapshot.sourceHash &&
              candidate.intent.masterPackageHash ===
                context.master?.packageHash &&
              candidate.intent.targetHash === snapshot.targetHash
          )
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ??
        null;
      if (current.length === 1) snapshot.partner.status = 'CURRENT';
    }
    if (reasons.length) snapshot.partner.status = 'BLOCKED';
    else if (active.length)
      snapshot.partner.status =
        active[0].status === 'RUNNING' ? 'RUNNING' : 'QUEUED';
    else if (!target) snapshot.partner.status = 'TARGET_REQUIRED';
    else if (
      target.provisioningState !== 'READY' ||
      (target.dnsState !== undefined && target.dnsState !== 'RESOLVED') ||
      (target.sslState !== undefined && target.sslState !== 'READY')
    )
      snapshot.partner.status = 'TARGET_PENDING';
    else if (snapshot.partner.status !== 'CURRENT')
      snapshot.partner.status =
        job && ['FAILED', 'CANCELLED'].includes(job.status)
          ? 'FAILED'
          : 'READY';
    snapshot.partner.blockedReasons = [...new Set(reasons)];
    snapshot.partner.canPrepareTarget = [
      'TARGET_REQUIRED',
      'TARGET_PENDING'
    ].includes(snapshot.partner.status);
    snapshot.partner.canPublish = ['READY', 'CURRENT', 'FAILED'].includes(
      snapshot.partner.status
    );
    if (job)
      snapshot.partner.currentJob = masterSitesSafeJobSchema.parse({
        id: job.id,
        status: job.status,
        phase: job.phase,
        attemptCount: job.attemptCount,
        updatedAt: job.updatedAt,
        ...(job.completedAt ? { completedAt: job.completedAt } : {}),
        ...(job.lastErrorCode ? { lastErrorCode: job.lastErrorCode } : {})
      });
    if (snapshot.partner.status === 'BLOCKED')
      snapshot.input = null;
    return snapshot;
  }

  async function readPartnerSnapshot(activationLeadId: string) {
    z.string().uuid().parse(activationLeadId);
    const context = await readContext();
    const lead = context.leads.find(candidate => candidate.id === activationLeadId);
    if (!lead) throw new Error('MASTER_SITES_PARTNER_NOT_FOUND');
    return snapshotFor(lead, context);
  }

  return {
    async get(): Promise<MasterSitesBusinessReadResponse> {
      const context = await readContext();
      const partners = await Promise.all(
        context.leads.map((lead) => snapshotFor(lead, context))
      );
      return masterSitesBusinessReadResponseSchema.parse({
        template: templateFor(context),
        partners: partners.map((snapshot) => snapshot.partner)
      });
    },
    async getPartner(
      activationLeadId: string
    ): Promise<BusinessPartnerSnapshot> {
      const snapshot = await readPartnerSnapshot(activationLeadId);
      // Public/operator actions remain unavailable while a job owns delivery.
      if (['QUEUED', 'RUNNING'].includes(snapshot.partner.status)) snapshot.input = null;
      return snapshot;
    },
    async getMeasurementAuthoritySnapshot(
      activationLeadId: string
    ): Promise<BusinessPartnerSnapshot> {
      // Server-only generation read, not an action/UI-unlock API. Reuse every
      // identity, entitlement, source, inventory and job-ambiguity check above;
      // only the active-job UI suppression is separate. BLOCKED stays null.
      return readPartnerSnapshot(activationLeadId);
    }
  };
}

export const masterSitesBusinessPreviewService =
  createMasterSitesBusinessPreviewService();
