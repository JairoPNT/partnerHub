import { resolvePublicationTarget } from "@/server/services/publicationTargetResolver";
import { getPublishingTarget } from "@/server/services/subdomainProvisioningService";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { activationLeadService } from "@/server/services/activationLeadService";
import { resolveProductPublicationDestination, type ProductPublicationSource, type ProductPublicationHosting } from "@/server/services/productPublicationDestinationPolicy";
import type { PublicationTargetSnapshot } from "@/server/services/publicationTargetResolver";

export async function resolvePublicationTargetForSite(
  siteId: string,
  legacyRemoteRoot: string,
  productContext?: { source: ProductPublicationSource | null; hosting: ProductPublicationHosting }
) {
  if (productContext) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(siteId)) throw new Error("Invalid Product publication site ID.");
    let target: PublicationTargetSnapshot | null = null;
    try {
      // Product publication is read-only: do not invoke the generic reader's v1 migration.
      target = JSON.parse(await readFile(resolve(process.env.PRODUCT_PAGE_SOURCE_DIR ?? "/data/generated-sites/.sources", ".publishing-targets", `${siteId}.json`), "utf8"));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    return resolveProductPublicationDestination({ siteId, ...productContext, target, leads: await activationLeadService.list({ includeArchived: true }) });
  }
  return resolvePublicationTarget(legacyRemoteRoot, await getPublishingTarget(siteId));
}
