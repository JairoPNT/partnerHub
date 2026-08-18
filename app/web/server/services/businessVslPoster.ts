export const INTERNAL_VSL_POSTER_PLACEHOLDER = "favicon.svg";

type HeroUrls = {
  desktop?: string;
  mobile?: string;
};

type BusinessVslConfiguration = {
  ecosystemType: "PRODUCT" | "BUSINESS" | "PERSONAL_BRAND";
  hero: HeroUrls;
  vsl?: Record<string, unknown>;
};

export function resolveBusinessVslThumbnail(hero: HeroUrls) {
  return hero.desktop || hero.mobile || INTERNAL_VSL_POSTER_PLACEHOLDER;
}

export function applyBusinessVslPoster<T extends BusinessVslConfiguration>(
  configuration: T,
  isPartnerPage: boolean,
  productHero: HeroUrls = {}
): T {
  if (!isPartnerPage || configuration.ecosystemType !== "BUSINESS") return configuration;

  return {
    ...configuration,
    vsl: {
      ...configuration.vsl,
      thumbnailUrl: resolveBusinessVslThumbnail(productHero)
    }
  };
}
