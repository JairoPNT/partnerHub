import 'server-only';

import {
  productPageGenerationInputSchema,
  type ProductPageGenerationInput
} from '@/server/services/productPageGenerationService';
import { resolveBusinessVslThumbnail } from '@/server/services/businessVslPoster';
import type {
  BusinessPartnerSnapshot,
  MasterSitesBusinessLead,
  MasterSitesBusinessMaster
} from '@/server/services/masterSitesBusinessPreviewService';

// Pure assembler used by preview to validate effective data before exposing actions.
// No source saves, Product correlation, generation, or enqueue.
export function assembleMasterSitesBusinessInput(material: {
  lead: MasterSitesBusinessLead;
  siteId: string;
  publicHost: string;
  whatsapp: string;
  master: MasterSitesBusinessMaster;
  source: ProductPageGenerationInput | null;
}): ProductPageGenerationInput {
  const { lead, siteId, publicHost, whatsapp, master, source } = material;
  const data = lead.onboardingData ?? {};
  const firstName = lead.fullName.trim().split(/\s+/)[0];
  const title = source?.site.title ?? `Negocio con ${lead.brandName}`;
  const description =
    source?.site.metaDescription ||
    source?.site.ogDescription ||
    `Conoce la oportunidad de negocio con ${lead.fullName}. Recibe orientación personalizada y resuelve tus dudas por WhatsApp.`;
  const measurementId =
    data.analyticsMeasurementId !== undefined
      ? data.analyticsMeasurementId
      : (source?.analytics?.measurementId ??
        source?.integrations?.analytics?.measurementId);
  const pixelId =
    data.metaPixelId !== undefined
      ? data.metaPixelId
      : source?.integrations?.meta?.pixelId;
  const conversionId =
    data.googleAdsConversionId !== undefined
      ? data.googleAdsConversionId
      : source?.integrations?.googleAds?.conversionId;
  const theme = {
    fontPreset:
      data.fontPreset ??
      source?.theme?.fontPreset ??
      master.content.theme?.fontPreset ??
      'executive',
    palettePreset:
      data.palettePreset ??
      source?.theme?.palettePreset ??
      master.content.theme?.palettePreset ??
      'cobalt-cyan'
  };
  return productPageGenerationInputSchema.parse({
    ecosystemType: 'BUSINESS',
    site: {
      id: siteId,
      domain: publicHost,
      title,
      appName: source?.site.appName ?? siteId,
      ogTitle: source?.site.ogTitle ?? title,
      ogDescription: source?.site.ogDescription || description,
      metaDescription: description,
      faviconUrl: data.faviconUrl ?? source?.site.faviconUrl
    },
    distributor: {
      brandName: lead.brandName,
      fullName: lead.fullName,
      firstName,
      role: source?.distributor.role ?? 'Asesor de negocios',
      whatsappNumber: whatsapp,
      phoneNumber: data.phone || source?.distributor.phoneNumber || whatsapp,
      displayPhone: data.phone || data.whatsapp || lead.whatsapp,
      defaultMessage:
        data.defaultMessage ||
        source?.distributor.defaultMessage ||
        `Hola ${firstName}, quiero conocer la oportunidad de negocio.`
    },
    hero: source?.hero ?? {},
    cta: source?.cta,
    // Only approved Business presentation, never master contacts, checkout, or tracking.
    vsl: {
      ...master.content.vsl,
      thumbnailUrl: resolveBusinessVslThumbnail({})
    },
    ...(measurementId ? { analytics: { measurementId } } : {}),
    integrations: {
      ...(measurementId
        ? { analytics: { provider: 'GA4', measurementId } }
        : {}),
      ...(pixelId ? { meta: { pixelId } } : {}),
      ...(conversionId ? { googleAds: { conversionId } } : {})
    },
    theme,
    mediaBaseUrl: 'https://media.partnerhub.club/comunes/business/v1/'
  });
}

export function buildMasterSitesBusinessInput(
  snapshot: BusinessPartnerSnapshot
): ProductPageGenerationInput {
  if (
    !snapshot.input ||
    snapshot.partner.status === 'BLOCKED' ||
    ['QUEUED', 'RUNNING'].includes(snapshot.partner.status)
  ) {
    throw new Error('MASTER_SITES_BUSINESS_INPUT_BLOCKED');
  }
  // Return a fresh, validated object, not mutable references into the snapshot.
  return productPageGenerationInputSchema.parse(snapshot.input);
}
