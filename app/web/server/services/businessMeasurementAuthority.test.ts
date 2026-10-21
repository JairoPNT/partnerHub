import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveBusinessMeasurementAuthority } from './businessMeasurementAuthority.ts';
import { contentFixture, anaId, bobId } from './masterSitesBusinessContent.test-fixtures.ts';

test('authority_uses_fresh_onboarding_and_saved_input_from_the_same_partner', async t => {
  const f = await contentFixture(t);
  const original = f.preview.getPartner;
  const getPartner = async (id: string) => {
    const snapshot = await original(id);
    snapshot.lead.onboardingData = { ...snapshot.lead.onboardingData, analyticsMeasurementId: 'G-ANAFIXTURE', metaPixelId: '1234500000' };
    // Input must be assembled by getPartner, never reassembled from the generator body.
    snapshot.input!.analytics = { measurementId: 'G-ANAFIXTURE' };
    snapshot.input!.integrations = { meta: { pixelId: '1234500000' } };
    return snapshot;
  };
  assert.deepEqual(await resolveBusinessMeasurementAuthority({ siteId: 'ana-business', activationLeadId: anaId }, { getPartner }), {
    expectedOrigin: 'https://negocio.ana.pro', ga4MeasurementId: 'G-ANAFIXTURE', metaPixelId: '1234500000'
  });
  assert.deepEqual(await resolveBusinessMeasurementAuthority({ siteId: 'bob-business', activationLeadId: bobId }, { getPartner: original }), {
    expectedOrigin: 'https://negocio.bob.pro', ga4MeasurementId: null, metaPixelId: null
  });
});

test('fresh_onboarding_disable_overrides_saved_id_using_existing_assembler', async t => {
  const f = await contentFixture(t); const snapshot = await f.preview.getPartner(anaId);
  await f.sources.save('ana-business', { ...snapshot.input!, analytics: { measurementId: 'G-SAVEDFIXTURE' }, integrations: { meta: { pixelId: '1234500000' } } });
  const lead = (await f.preview.getPartner(anaId)).lead;
  lead.onboardingData = { ...lead.onboardingData, analyticsMeasurementId: '', metaPixelId: '' };
  assert.deepEqual(await resolveBusinessMeasurementAuthority({ siteId: 'ana-business', activationLeadId: anaId }, { getPartner: f.preview.getPartner }), {
    expectedOrigin: 'https://negocio.ana.pro', ga4MeasurementId: null, metaPixelId: null
  });
});

test('mismatched_lead_site_entitlement_is_rejected', async t => {
  const f = await contentFixture(t); const valid = await f.preview.getPartner(anaId);
  const mutations = [
    { activationLeadId: bobId }, { ownerKey: bobId }, { siteId: 'bob-business' },
    { lead: { ...valid.lead, id: bobId } },
    { partner: { ...valid.partner, siteId: 'bob-business' } },
    { entitlement: { ...valid.entitlement!, activationLeadId: bobId } },
    { entitlement: { ...valid.entitlement!, includedEcosystems: ['PRODUCT'] } },
    { entitlement: { ...valid.entitlement!, commercialState: 'UNKNOWN' } },
    { input: { ...valid.input!, ecosystemType: 'PRODUCT' } },
    { input: { ...valid.input!, site: { ...valid.input!.site, domain: 'foreign.example' } } },
    { publicHost: 'app.partnerhub.club' }, { publicHost: 'https://ana.pro' },
    { input: null }
  ];
  for (const mutation of mutations) await assert.rejects(resolveBusinessMeasurementAuthority({ siteId: 'ana-business', activationLeadId: anaId }, { getPartner: async () => ({ ...valid, ...mutation }) as never }), /^Error: BUSINESS_MEASUREMENT_AUTHORITY_INVALID$/);
});
