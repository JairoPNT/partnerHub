import { z } from "zod";

import { getPartnerCanonicalPublicHost } from "#partner-hostname-contract";
import { PublicationTargetError, resolvePublicationTarget } from "@/server/services/publicationTargetResolver";
import type { PublicationTargetSnapshot } from "@/server/services/publicationTargetResolver";

export type ProductPublicationSource = {
  ecosystemType?: unknown;
  ownerKey?: unknown;
  activationLeadId?: unknown;
  baseDomain?: unknown;
  site?: { id?: unknown; domain?: unknown; baseDomain?: unknown; ownerKey?: unknown; activationLeadId?: unknown };
};

export type ProductPublicationLead = {
  id: string;
  siteId?: string | null;
  onboardingData?: { domain?: string };
};

export type ProductPublicationHosting = {
  username: string;
  remoteRoot: string;
  remoteRootTemplate?: string;
  remoteRoots: Record<string, string>;
};

function invalid(): never {
  // Do not expose account configuration, credentials, or foreign tenant metadata.
  throw new PublicationTargetError("PUBLICATION_TARGET_INVALID", "Product publication destination identity or configuration is invalid.");
}

export function normalizeProductBaseDomain(value: unknown): string {
  if (typeof value !== "string") return invalid();
  const base = value.trim().toLowerCase().replace(/^www\./, "");
  if (/^(?:www|producto|negocio|brand|product|business)\./.test(base) || base === "ganomaster.pro" || base.endsWith(".ganomaster.pro")) return invalid();
  try { getPartnerCanonicalPublicHost(base, "PRODUCT", "PRODUCT"); }
  catch { return invalid(); }
  return base;
}

export function canonicalProductHost(base: unknown): string {
  return getPartnerCanonicalPublicHost(normalizeProductBaseDomain(base), "PRODUCT", "PRODUCT");
}

/** Product-only boundary; generic Business/Brand and master resolution stays unchanged. */
export function resolveProductPublicationDestination(input: {
  siteId: string;
  source: ProductPublicationSource | null;
  leads: ProductPublicationLead[];
  target: PublicationTargetSnapshot | null;
  hosting: ProductPublicationHosting;
}) {
  const { siteId, source, target, hosting } = input;
  if (!source || source.site?.id !== siteId || (source.ecosystemType !== undefined && source.ecosystemType !== "PRODUCT")) return invalid();
  // Activation lead IDs are the authoritative owner keys. A canonical derived Product ID
  // is allowed only with the same base-domain evidence, never by name or target assertion.
  const candidates = input.leads.filter((lead) => lead.siteId === siteId || (lead.siteId && `${lead.siteId}-product` === siteId));
  if (candidates.length !== 1) return invalid();
  const lead = candidates[0];
  if (!z.string().uuid().safeParse(lead.id).success) return invalid();
  const base = normalizeProductBaseDomain(lead.onboardingData?.domain);
  // Distinct owners cannot share the same physical Product root, even when their
  // assigned site IDs differ. Compare canonical bases across authoritative leads.
  const domainCollision = input.leads.some((other) => {
    if (other.id === lead.id) return false;
    try { return normalizeProductBaseDomain(other.onboardingData?.domain) === base; }
    catch { return false; } // An unrelated missing/invalid domain is not a claim to this base.
  });
  if (domainCollision) return invalid();
  const host = canonicalProductHost(base);
  if (source.site.domain !== host) return invalid();
  for (const evidence of [source, source.site]) {
    if (evidence.ownerKey !== undefined && evidence.ownerKey !== lead.id) return invalid();
    if (evidence.activationLeadId !== undefined && evidence.activationLeadId !== lead.id) return invalid();
    if (evidence.baseDomain !== undefined && normalizeProductBaseDomain(evidence.baseDomain) !== base) return invalid();
  }
  if (!target) throw new PublicationTargetError("PUBLICATION_TARGET_NOT_READY", "Product publication requires an explicit READY target.");
  if (target.version !== 2 || target.siteId !== siteId || target.ownerKey !== lead.id || target.ecosystemType !== "PRODUCT" || target.baseDomain !== base || target.publicHost !== host) return invalid();
  if (!["PRODUCT", "BUSINESS", "PERSONAL_BRAND"].includes(target.rootEcosystemType ?? "")) return invalid();

  if (!/^u[0-9]+$/.test(hosting.username)) return invalid();
  const accountPrefix = `/home/${hosting.username}/domains/`;
  if (!hosting.remoteRoot.startsWith(accountPrefix) || /(?:^|\/)\.\.?\//.test(hosting.remoteRoot)) return invalid();
  const baseTemplate = `${accountPrefix}{domain}/public_html`;
  const template = hosting.remoteRootTemplate;
  if (template && template !== baseTemplate && template !== `${baseTemplate}/producto`) return invalid();
  const remoteRoot = `${accountPrefix}${base}/public_html/producto`;
  const mappedRoot = hosting.remoteRoots[siteId];
  if ((mappedRoot !== undefined && mappedRoot !== remoteRoot) || target.remoteRoot !== remoteRoot) return invalid();
  return resolvePublicationTarget(remoteRoot, target);
}
