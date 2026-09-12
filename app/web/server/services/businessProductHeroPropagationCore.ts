import { extractProductHero } from "@/server/services/businessProductHeroCorrelation";
import { applyBusinessVslPoster } from "@/server/services/businessVslPoster";

type EcosystemType = "PRODUCT" | "BUSINESS" | "PERSONAL_BRAND";

export type PublishingTargetIdentity = {
  ownerKey: string;
  siteId: string;
  ecosystemType: EcosystemType;
};

export type BusinessSourceConfiguration = {
  ecosystemType: "BUSINESS";
  hero: { desktop?: string; mobile?: string };
  vsl?: Record<string, unknown>;
  [key: string]: unknown;
};

type SourceBySiteId = Record<string, unknown>;

export type BusinessPosterRefresh = {
  siteId: string;
  configuration: BusinessSourceConfiguration;
};

function isBusinessSource(value: unknown): value is BusinessSourceConfiguration {
  return Boolean(value) && typeof value === "object" && (value as { ecosystemType?: unknown }).ecosystemType === "BUSINESS";
}

function isProductSource(value: unknown): value is Parameters<typeof extractProductHero>[0] {
  return Boolean(value) && typeof value === "object" && (value as { ecosystemType?: unknown }).ecosystemType === "PRODUCT";
}

function currentThumbnailUrl(configuration: BusinessSourceConfiguration) {
  const value = configuration.vsl?.thumbnailUrl;
  return typeof value === "string" ? value : undefined;
}

export function planBusinessPosterPropagation(
  productSiteId: string,
  targets: PublishingTargetIdentity[],
  sources: SourceBySiteId
): BusinessPosterRefresh[] {
  const productSite = targets.find((target) => target.siteId === productSiteId && target.ecosystemType === "PRODUCT");
  if (!productSite) return [];
  if (targets.filter((target) => target.ownerKey === productSite.ownerKey && target.ecosystemType === "PRODUCT").length !== 1) {
    return [];
  }

  const productSource = sources[productSiteId];
  if (!isProductSource(productSource)) return [];

  const productHero = extractProductHero(productSource);
  return targets
    .filter((target) => target.ownerKey === productSite.ownerKey && target.ecosystemType === "BUSINESS")
    .sort((left, right) => left.siteId.localeCompare(right.siteId))
    .flatMap((target) => {
      const source = sources[target.siteId];
      if (!isBusinessSource(source)) return [];

      const configuration = applyBusinessVslPoster(source, true, productHero);
      if (currentThumbnailUrl(source) === currentThumbnailUrl(configuration)) return [];
      return [{ siteId: target.siteId, configuration }];
    });
}
