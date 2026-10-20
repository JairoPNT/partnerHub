import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildMasterSitesBusinessInput } from './masterSitesBusinessInput.ts';
import { createMasterSitesBusinessPreviewService } from './masterSitesBusinessPreviewService.ts';

test('builds_business_input_without_purchase_url_or_master_tracking', async () => {
  const lead = {
    id: '11111111-1111-4111-8111-111111111111',
    siteId: 'ana',
    status: 'PAID' as const,
    recordState: 'ACTIVE' as const,
    fullName: 'Ana Perez',
    brandName: 'Ana Negocios',
    whatsapp: '573101234567',
    onboardingData: {
      domain: 'ana.pro',
      purchaseUrl: 'https://checkout.product.test',
      analyticsMeasurementId: 'G-ANA123',
      metaPixelId: '123456789',
      googleAdsConversionId: 'AW-ANA'
    }
  };
  const service = createMasterSitesBusinessPreviewService({
    listLeads: async () => [lead],
    getEntitlement: async () => ({
      activationLeadId: lead.id,
      commercialState: 'KNOWN',
      includedEcosystems: ['BUSINESS'],
      existingTargets: []
    }),
    readTargets: async () => [],
    readSources: async () => [],
    listJobs: async () => [],
    readJournals: async () => [],
    readMaster: async () => ({
      revision: 'a'.repeat(64),
      packageHash: 'b'.repeat(64),
      previewUrl: null,
      content: {
        hero: {},
        vsl: {
          provider: 'custom',
          embedUrl:
            'https://media.partnerhub.club/comunes/business/v1/vsl/business-vsl-pilot-v1.mp4'
        },
        integrations: { meta: { pixelId: '9999999' } },
        distributor: {
          whatsappNumber: '573000000000',
          purchaseUrl: 'https://master.checkout.test'
        }
      }
    })
  });
  const input = buildMasterSitesBusinessInput(
    await service.getPartner(lead.id)
  );
  assert.equal(input.ecosystemType, 'BUSINESS');
  assert.equal(input.site.id, 'ana-business');
  assert.equal(input.site.domain, 'negocio.ana.pro');
  assert.equal(input.distributor.fullName, 'Ana Perez');
  assert.equal(input.distributor.whatsappNumber, '573101234567');
  assert.equal(input.distributor.purchaseUrl, undefined);
  assert.equal(input.integrations?.meta?.pixelId, '123456789');
  assert.equal(input.analytics?.measurementId, 'G-ANA123');
  assert.equal(input.integrations?.googleAds?.conversionId, 'AW-ANA');
  assert.ok(input.site.metaDescription?.length);
  assert.ok(input.site.ogDescription?.length);
  assert.equal(
    input.vsl?.embedUrl,
    'https://media.partnerhub.club/comunes/business/v1/vsl/business-vsl-pilot-v1.mp4'
  );
  assert.equal(JSON.stringify(input).includes('9999999'), false);
  assert.equal(JSON.stringify(input).includes('573000000000'), false);
});
