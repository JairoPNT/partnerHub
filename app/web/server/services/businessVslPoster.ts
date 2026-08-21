import { resolveBusinessVslThumbnail } from "../../shared/business-vsl-poster-contract.mjs";
export { INTERNAL_VSL_POSTER_PLACEHOLDER, resolveBusinessVslThumbnail } from "../../shared/business-vsl-poster-contract.mjs";

type HeroUrls = {
  desktop?: string;
  mobile?: string;
};

type BusinessVslConfiguration = {
  ecosystemType: "PRODUCT" | "BUSINESS" | "PERSONAL_BRAND";
  hero: HeroUrls;
  vsl?: Record<string, unknown>;
};

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
