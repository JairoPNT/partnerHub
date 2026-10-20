import { PublicationTargetError, resolvePublicationTarget } from "@/server/services/publicationTargetResolver";
import { getPublishingTarget } from "@/server/services/subdomainProvisioningService";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { activationLeadService } from "@/server/services/activationLeadService";
import { resolveProductPublicationDestination, type ProductPublicationSource, type ProductPublicationHosting } from "@/server/services/productPublicationDestinationPolicy";
import type { PublicationTargetSnapshot } from "@/server/services/publicationTargetResolver";

export async function resolvePublicationTargetForSite(
  siteId: string,
  legacyRemoteRoot: string,
  siteContext?: { source: ProductPublicationSource | null; hosting: ProductPublicationHosting; resolveLegacyRemoteRoot: () => Promise<string> }
) {
  if (siteContext) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(siteId)) throw new Error("Invalid Product publication site ID.");
    let target: PublicationTargetSnapshot | null = null;
    try {
      // Product publication is read-only: do not invoke the generic reader's v1 migration.
      target = JSON.parse(await readFile(resolve(process.env.PRODUCT_PAGE_SOURCE_DIR ?? "/data/generated-sites/.sources", ".publishing-targets", `${siteId}.json`), "utf8"));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    const sourceEcosystem = siteContext.source?.ecosystemType ?? "PRODUCT";
    // A mutable source discriminator cannot exempt a contradictory Product target.
    // Check both identities before selecting any generic fallback or v1 migration.
    if (target && target.ecosystemType !== sourceEcosystem) {
      throw new PublicationTargetError("PUBLICATION_TARGET_INVALID", "Publication source and target ecosystems do not match.");
    }
    if (sourceEcosystem !== "BUSINESS" && sourceEcosystem !== "PERSONAL_BRAND") {
      return resolveProductPublicationDestination({ siteId, ...siteContext, target, leads: await activationLeadService.list({ includeArchived: true }) });
    }
    const genericTarget = await getPublishingTarget(siteId);
    if (genericTarget && genericTarget.ecosystemType !== sourceEcosystem) {
      throw new PublicationTargetError("PUBLICATION_TARGET_INVALID", "Publication source and target ecosystems do not match.");
    }
    return resolvePublicationTarget(await siteContext.resolveLegacyRemoteRoot(), genericTarget);
  }
  return resolvePublicationTarget(legacyRemoteRoot, await getPublishingTarget(siteId));
}
