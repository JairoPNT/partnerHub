export const INTERNAL_VSL_POSTER_PLACEHOLDER: "favicon.svg";
export function extractProductHero(source: { ecosystemType?: unknown; hero?: { desktop?: unknown; mobile?: unknown } } | null): {
  desktop?: string;
  mobile?: string;
};
export function resolveBusinessVslThumbnail(hero: { desktop?: string; mobile?: string }): string;
