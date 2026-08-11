export type FinalHeroConfiguration = {
  desktop?: unknown;
  mobile?: unknown;
};

export type FinalHeroUrls = {
  heroDesktopUrl?: string;
  heroMobileUrl?: string;
};

export type HeroLeadStore = {
  updateHeroUrlsBySiteId(siteId: string, heroUrls: FinalHeroUrls): Promise<unknown | null>;
};

export type ProductPageHeroSyncResult = {
  status: "synced" | "lead_not_found" | "no_valid_heroes";
  warning?: string;
};

function validHttpsUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return undefined;

  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

export function finalHeroUrls(configuration: FinalHeroConfiguration): FinalHeroUrls {
  return {
    heroDesktopUrl: validHttpsUrl(configuration.desktop),
    heroMobileUrl: validHttpsUrl(configuration.mobile)
  };
}

export function mergeFinalHeroUrls<T extends Record<string, unknown>>(
  onboardingData: T,
  heroUrls: FinalHeroUrls
): T & FinalHeroUrls {
  return {
    ...onboardingData,
    ...(heroUrls.heroDesktopUrl ? { heroDesktopUrl: heroUrls.heroDesktopUrl } : {}),
    ...(heroUrls.heroMobileUrl ? { heroMobileUrl: heroUrls.heroMobileUrl } : {})
  };
}

export async function syncProductPageHeroesToLead(
  siteId: string,
  configuration: FinalHeroConfiguration,
  store: HeroLeadStore
): Promise<ProductPageHeroSyncResult> {
  const heroUrls = finalHeroUrls(configuration);

  if (!heroUrls.heroDesktopUrl && !heroUrls.heroMobileUrl) {
    return {
      status: "no_valid_heroes",
      warning: `No valid HTTPS hero URLs were available to sync for siteId ${siteId}.`
    };
  }

  const lead = await store.updateHeroUrlsBySiteId(siteId, heroUrls);
  if (!lead) {
    return {
      status: "lead_not_found",
      warning: `No activation lead is linked to siteId ${siteId}; saved hero configuration was not synchronized.`
    };
  }

  return { status: "synced" };
}
