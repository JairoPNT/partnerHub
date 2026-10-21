import 'server-only';

import type { BusinessPartnerSnapshot } from '@/server/services/masterSitesBusinessPreviewService';

const invalid = () => new Error('BUSINESS_MEASUREMENT_AUTHORITY_INVALID');

export async function resolveBusinessMeasurementAuthority(
  { siteId, activationLeadId }: { siteId: string; activationLeadId: string },
  { getPartner }: { getPartner(id: string): Promise<BusinessPartnerSnapshot> }
): Promise<{ expectedOrigin: string; ga4MeasurementId: string | null; metaPixelId: string | null }> {
  try {
    const snapshot = await getPartner(activationLeadId);
    const input = snapshot.input;
    const host = snapshot.publicHost;
    if (!activationLeadId || siteId === 'ganomaster-business'
      || snapshot.activationLeadId !== activationLeadId || snapshot.ownerKey !== activationLeadId
      || snapshot.lead.id !== activationLeadId || snapshot.siteId !== siteId
      || snapshot.partner.siteId !== siteId || snapshot.partner.activationLeadId !== activationLeadId
      || snapshot.entitlement?.activationLeadId !== activationLeadId
      || snapshot.entitlement.commercialState !== 'KNOWN' || !snapshot.entitlement.includedEcosystems.includes('BUSINESS')
      || !input || input.ecosystemType !== 'BUSINESS' || input.site.id !== siteId
      || !host || host === 'app.partnerhub.club'
      || !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(host)
      || input.site.domain !== host || snapshot.partner.publicHost !== host) throw invalid();
    const ga4MeasurementId = input.analytics?.measurementId ?? input.integrations?.analytics?.measurementId ?? null;
    const metaPixelId = input.integrations?.meta?.pixelId ?? null;
    if ((ga4MeasurementId !== null && !/^G-[A-Z0-9]+$/.test(ga4MeasurementId)) || (metaPixelId !== null && !/^\d{5,32}$/.test(metaPixelId))) throw invalid();
    return { expectedOrigin: `https://${host}`, ga4MeasurementId, metaPixelId };
  } catch { throw invalid(); }
}
