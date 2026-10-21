import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import type { TestContext } from 'node:test';
import { createMasterSitesBusinessPreviewService } from '@/server/services/masterSitesBusinessPreviewService';
import { productPageSourceService } from '@/server/services/productPageSourceService';

export const anaId = '11111111-1111-4111-8111-111111111111';
export const bobId = '22222222-2222-4222-8222-222222222222';
export const profile = { hero: { headline: 'Actividad independiente', subheadline: 'Decide con información.' }, benefits: [{ title: 'Apoyo', description: 'Resuelve tus dudas.' }], theme: { fontPreset: 'modern' as const, palettePreset: 'indigo-lime' as const }, dedicationText: 'Requiere trabajo comercial.' };

export async function contentFixture(t: TestContext) {
  const root = await mkdtemp(resolve(tmpdir(), 'ph-content-'));
  const env = { ...process.env };
  const directory = resolve(root, '.sources'); await mkdir(directory);
  Object.assign(process.env, { PRODUCT_PAGE_OUTPUT_DIR: root, PRODUCT_PAGE_SOURCE_DIR: directory });
  t.after(async () => { process.env = env; await rm(root, { recursive: true, force: true }); });
  const state = { eligible: true };
  const leads = [
    { id: anaId, siteId: 'ana', status: 'PAID' as const, recordState: 'ACTIVE' as const, fullName: 'Ana Perez', brandName: 'Ana', whatsapp: '573101234567', onboardingData: { domain: 'ana.pro' } },
    { id: bobId, siteId: 'bob', status: 'PAID' as const, recordState: 'ACTIVE' as const, fullName: 'Bob Perez', brandName: 'Bob', whatsapp: '573109876543', onboardingData: { domain: 'bob.pro' } }
  ];
  const preview = createMasterSitesBusinessPreviewService({
    listLeads: async () => leads,
    getEntitlement: async ({ activationLeadId }) => ({ activationLeadId, commercialState: 'KNOWN', includedEcosystems: state.eligible ? ['BUSINESS'] : [], existingTargets: [] }),
    readTargets: async () => [], listJobs: async () => [], readJournals: async () => [],
    readSources: async () => Promise.all((await readdir(directory)).filter((file) => file.endsWith('.json')).map(async (file) => {
      const bytes = await readFile(resolve(directory, file));
      return { siteId: file.slice(0, -5), hash: createHash('sha256').update(bytes).digest('hex'), value: JSON.parse(bytes.toString('utf8')) as unknown };
    })),
    readMaster: async () => ({ revision: 'a'.repeat(64), packageHash: 'b'.repeat(64), previewUrl: null, content: { hero: {}, vsl: { provider: 'custom', embedUrl: 'https://media.partnerhub.club/comunes/business/v1/vsl/business-vsl-pilot-v1.mp4' } } })
  });
  return { root, directory, preview, sources: productPageSourceService, state };
}
