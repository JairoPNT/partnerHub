import "server-only";

import { productPageGenerationService, type ProductPageGenerationInput } from "@/server/services/productPageGenerationService";
import { productPageSourceService } from "@/server/services/productPageSourceService";
import { partnerEcosystemTargetReader } from "@/server/services/partnerEcosystemTargetReader";
import { publicationEventEnqueueService } from "@/server/services/publicationEventEnqueueService";
import {
  executeBusinessPosterPropagation,
  type BusinessPosterPropagationDependencies,
  type BusinessPosterPropagationResult
} from "@/server/services/businessProductHeroPropagationExecutionCore";

const defaultDependencies: BusinessPosterPropagationDependencies = {
  listTargets: partnerEcosystemTargetReader.list,
  getSource: productPageSourceService.get,
  generate: (configuration) => productPageGenerationService.generate(configuration as ProductPageGenerationInput),
  afterSourceChange: publicationEventEnqueueService.afterSourceChange
};

export function createBusinessProductHeroPropagationService(dependencies: BusinessPosterPropagationDependencies = defaultDependencies) {
  async function afterProductSourceChange(productSiteId: string): Promise<BusinessPosterPropagationResult> {
    return executeBusinessPosterPropagation(productSiteId, dependencies);
  }

  return { afterProductSourceChange };
}

export const businessProductHeroPropagationService = createBusinessProductHeroPropagationService();
export type { BusinessPosterPropagationResult } from "@/server/services/businessProductHeroPropagationExecutionCore";
