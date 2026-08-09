import { resolvePublicationTarget } from "@/server/services/publicationTargetResolver";
import { getPublishingTarget } from "@/server/services/subdomainProvisioningService";

export async function resolvePublicationTargetForSite(
  siteId: string,
  legacyRemoteRoot: string
) {
  return resolvePublicationTarget(legacyRemoteRoot, await getPublishingTarget(siteId));
}
