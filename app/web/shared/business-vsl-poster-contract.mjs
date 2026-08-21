import { URL } from "node:url";

export const INTERNAL_VSL_POSTER_PLACEHOLDER = "favicon.svg";

function literalHttpsUrl(value) {
  if (typeof value !== "string" || !value.trim()) return undefined;
  try { return new URL(value).protocol === "https:" ? value : undefined; } catch { return undefined; }
}

export function extractProductHero(source) {
  if (!source || (source.ecosystemType !== undefined && source.ecosystemType !== "PRODUCT")) return {};
  return { desktop: literalHttpsUrl(source.hero?.desktop), mobile: literalHttpsUrl(source.hero?.mobile) };
}

export function resolveBusinessVslThumbnail(hero) {
  return hero.desktop || hero.mobile || INTERNAL_VSL_POSTER_PLACEHOLDER;
}
