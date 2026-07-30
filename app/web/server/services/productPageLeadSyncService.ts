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
  };
};

type ProductPageSource = {
  site?: Record<string, unknown>;
  distributor?: Record<string, unknown>;
  hero?: Record<string, unknown>;
  analytics?: Record<string, unknown>;
  mediaBaseUrl?: unknown;
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

export const productPageLeadSyncService = {
  async syncLeadToExistingSource(lead: LeadSnapshot) {
    if (!lead.siteId) return null;

    const existing = (await productPageSourceService.get(lead.siteId)) as ProductPageSource | null;
    if (!existing) return null;

    const onboarding = lead.onboardingData ?? {};
    const existingSite = existing.site ?? {};
    const existingDistributor = existing.distributor ?? {};
    const existingHero = existing.hero ?? {};

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

    const nextSource = {
      ...existing,
      site: {
        ...existingSite,
        id: lead.siteId,
        domain: optionalTrimmed(onboarding.domain) ?? typedString(existingSite.domain),
        title,
        appName: typedString(existingSite.appName) ?? lead.siteId.replaceAll("-", "_"),
        ogTitle: title,
        ogDescription: metaDescription,
        metaDescription,
        faviconUrl: optionalTrimmed(onboarding.faviconUrl) ?? typedString(existingSite.faviconUrl)
      },
      distributor: {
        ...existingDistributor,
        brandName: lead.brandName,
        firstName: firstNameFrom(lead.fullName),
        fullName: lead.fullName,
        whatsappNumber,
        phoneNumber,
        displayPhone: phoneNumber,
        purchaseUrl: optionalTrimmed(onboarding.purchaseUrl) ?? typedString(existingDistributor.purchaseUrl),
        defaultMessage:
          optionalTrimmed(onboarding.defaultMessage) ??
          typedString(existingDistributor.defaultMessage)
      },
      hero: {
        desktop: optionalTrimmed(onboarding.heroDesktopUrl) ?? typedString(existingHero.desktop),
        mobile: optionalTrimmed(onboarding.heroMobileUrl) ?? typedString(existingHero.mobile)
      },
      analytics: analyticsMeasurementId
        ? { measurementId: analyticsMeasurementId.toUpperCase() }
        : existing.analytics,
      mediaBaseUrl: existing.mediaBaseUrl
    };

    const parsed = productPageGenerationInputSchema.parse(nextSource);
    await productPageSourceService.save(lead.siteId, parsed);
    return parsed;
  }
};
