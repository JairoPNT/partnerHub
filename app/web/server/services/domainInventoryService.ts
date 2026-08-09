import { activationLeadService } from "@/server/services/activationLeadService";
import { buildDomainInventory } from "@/server/services/domainInventoryBuilder";
import { productPageSourceService } from "@/server/services/productPageSourceService";
import { productPageVerificationService } from "@/server/services/productPageVerificationService";
import { listPublishingTargets } from "@/server/services/subdomainProvisioningService";

export const domainInventoryService = {
  async list() {
    const [leads, sources, targets] = await Promise.all([
      activationLeadService.list(),
      productPageSourceService.list(),
      listPublishingTargets()
    ]);
    const siteIds = new Set([
      "ganomaster",
      "ganomaster-business",
      "ganomaster-personal-brand",
      ...sources.map((source) => source.siteId),
      ...targets.map((target) => target.siteId)
    ]);
    const verifications = (await Promise.all(
      [...siteIds].map((siteId) => productPageVerificationService.getLastVerification(siteId))
    )).filter((verification): verification is NonNullable<typeof verification> => Boolean(verification));

    return buildDomainInventory({ leads, sources, targets, verifications });
  }
};
