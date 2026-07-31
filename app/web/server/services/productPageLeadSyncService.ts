import "server-only";

import { productPageGenerationInputSchema } from "@/server/services/productPageGenerationService";
import { productPageSourceService } from "@/server/services/productPageSourceService";

type LeadSnapshot = {
  siteId: string | null;
  fullName: string;
  whatsapp: string;
  brandName: string;
  onboardingData?: {
    domain?: string;
    whatsapp?: string;
    phone?: string;
    purchaseUrl?: string;
    heroDesktopUrl?: string;
    heroMobileUrl?: string;
    logoMode?: "TYPOGRAPHY" | "IMAGE";
    logoUrl?: string;
    faviconUrl?: string;
    seoTitle?: string;
    metaDescription?: string;
    defaultMessage?: string;
    analyticsMeasurementId?: string;
    fontPreset?: "executive" | "modern" | "editorial" | "friendly" | "premium" | "minimal";
    palettePreset?: "cobalt-cyan" | "emerald-slate" | "coffee-gold" | "rose-graphite" | "indigo-lime" | "teal-navy" | "wine-blush" | "forest-mint" | "charcoal-amber" | "sky-stone";
    metaPixelId?: string;
    googleAdsConversionId?: string;
  };
};

type ProductPageSource = {
  site?: Record<string, unknown>;
  distributor?: Record<string, unknown>;
  hero?: Record<string, unknown>;
  analytics?: Record<string, unknown>;
  integrations?: {
    analytics?: { provider?: string; measurementId?: string };
    meta?: { pixelId?: string };
    googleAds?: { conversionId?: string };
  };
  theme?: {
    fontPreset?: string;
    palettePreset?: string;
  };
  mediaBaseUrl?: unknown;
};

type LeadSyncOptions = {
  overwriteExistingValues?: boolean;
};

function cleanDigits(value?: string | null) {
  return (value ?? "").replace(/\D/g, "");
}

function optionalTrimmed(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function firstNameFrom(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || fullName.trim();
}

function typedString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function pickValue(leadValue: string | undefined, existingValue: string | undefined, overwriteExistingValues: boolean) {
  return overwriteExistingValues ? leadValue ?? existingValue : existingValue ?? leadValue;
}

export const productPageLeadSyncService = {
  async syncLeadToExistingSource(lead: LeadSnapshot, options: LeadSyncOptions = {}) {
    if (!lead.siteId) return null;

    const existing = (await productPageSourceService.get(lead.siteId)) as ProductPageSource | null;
    const overwriteExistingValues = options.overwriteExistingValues ?? true;
    const onboarding = lead.onboardingData ?? {};
    const existingSite = existing?.site ?? {};
    const existingDistributor = existing?.distributor ?? {};
    const existingHero = existing?.hero ?? {};

    const whatsappNumber =
      cleanDigits(onboarding.whatsapp) ||
      cleanDigits(lead.whatsapp) ||
      cleanDigits(typedString(existingDistributor.whatsappNumber));

    const phoneNumber =
      optionalTrimmed(onboarding.phone) ??
      typedString(existingDistributor.phoneNumber) ??
      whatsappNumber;

    const title =
      optionalTrimmed(onboarding.seoTitle) ??
      typedString(existingSite.title) ??
      `${lead.brandName} - Bienestar y Vitalidad`;

    const metaDescription =
      optionalTrimmed(onboarding.metaDescription) ??
      typedString(existingSite.metaDescription) ??
      typedString(existingSite.ogDescription) ??
      `Pagina de ${lead.brandName}.`;

    const analyticsMeasurementId = optionalTrimmed(onboarding.analyticsMeasurementId);
    const fontPreset = onboarding.fontPreset ?? existing?.theme?.fontPreset ?? "executive";
    const palettePreset = onboarding.palettePreset ?? existing?.theme?.palettePreset ?? "cobalt-cyan";
    const metaPixelId = optionalTrimmed(onboarding.metaPixelId) ?? existing?.integrations?.meta?.pixelId;
    const googleAdsConversionId = optionalTrimmed(onboarding.googleAdsConversionId) ?? existing?.integrations?.googleAds?.conversionId;

    const nextSource = {
      ...existing,
      site: {
        ...existingSite,
        id: lead.siteId,
        domain: pickValue(optionalTrimmed(onboarding.domain), typedString(existingSite.domain), overwriteExistingValues),
        title: pickValue(title, typedString(existingSite.title), overwriteExistingValues) ?? title,
        appName: typedString(existingSite.appName) ?? lead.siteId.replaceAll("-", "_"),
        ogTitle: pickValue(title, typedString(existingSite.ogTitle), overwriteExistingValues) ?? title,
        ogDescription: pickValue(metaDescription, typedString(existingSite.ogDescription), overwriteExistingValues) ?? metaDescription,
        metaDescription: pickValue(metaDescription, typedString(existingSite.metaDescription), overwriteExistingValues) ?? metaDescription,
        faviconUrl: pickValue(optionalTrimmed(onboarding.faviconUrl), typedString(existingSite.faviconUrl), overwriteExistingValues)
      },
      distributor: {
        ...existingDistributor,
        brandName: pickValue(lead.brandName, typedString(existingDistributor.brandName), overwriteExistingValues) ?? lead.brandName,
        firstName:
          pickValue(firstNameFrom(lead.fullName), typedString(existingDistributor.firstName), overwriteExistingValues) ??
          firstNameFrom(lead.fullName),
        fullName: pickValue(lead.fullName, typedString(existingDistributor.fullName), overwriteExistingValues) ?? lead.fullName,
        whatsappNumber:
          pickValue(whatsappNumber, typedString(existingDistributor.whatsappNumber), overwriteExistingValues) ?? whatsappNumber,
        phoneNumber: pickValue(phoneNumber, typedString(existingDistributor.phoneNumber), overwriteExistingValues) ?? phoneNumber,
        displayPhone: pickValue(phoneNumber, typedString(existingDistributor.displayPhone), overwriteExistingValues) ?? phoneNumber,
        purchaseUrl: pickValue(
          optionalTrimmed(onboarding.purchaseUrl),
          typedString(existingDistributor.purchaseUrl),
          overwriteExistingValues
        ),
        defaultMessage:
          pickValue(
            optionalTrimmed(onboarding.defaultMessage),
            typedString(existingDistributor.defaultMessage),
            overwriteExistingValues
          )
      },
      hero: {
        desktop: pickValue(optionalTrimmed(onboarding.heroDesktopUrl), typedString(existingHero.desktop), overwriteExistingValues),
        mobile: pickValue(optionalTrimmed(onboarding.heroMobileUrl), typedString(existingHero.mobile), overwriteExistingValues)
      },
      analytics: analyticsMeasurementId
        ? { measurementId: analyticsMeasurementId.toUpperCase() }
        : existing?.analytics,
      integrations: {
        analytics: analyticsMeasurementId
          ? { provider: "GA4", measurementId: analyticsMeasurementId.toUpperCase() }
          : existing?.integrations?.analytics,
        meta: metaPixelId ? { pixelId: metaPixelId } : existing?.integrations?.meta,
        googleAds: googleAdsConversionId ? { conversionId: googleAdsConversionId } : existing?.integrations?.googleAds
      },
      theme: {
        fontPreset,
        palettePreset
      },
      mediaBaseUrl: existing?.mediaBaseUrl
    };

    const parsed = productPageGenerationInputSchema.parse(nextSource);
    await productPageSourceService.save(lead.siteId, parsed);
    return parsed;
  }
};
