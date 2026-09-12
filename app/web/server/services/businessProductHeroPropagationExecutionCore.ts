import {
  planBusinessPosterPropagation,
  type BusinessSourceConfiguration,
  type PublishingTargetIdentity
} from "@/server/services/businessProductHeroPropagationCore";

export type BusinessPosterPropagationDependencies = {
  listTargets: () => Promise<PublishingTargetIdentity[]>;
  getSource: (siteId: string) => Promise<unknown>;
  generate: (configuration: BusinessSourceConfiguration) => Promise<unknown>;
  afterSourceChange: (siteId: string) => Promise<unknown>;
};

export type BusinessPosterPropagationResult = {
  outcome: "REFRESHED" | "SKIPPED" | "PARTIAL" | "FAILED_SAFE";
  refreshedSiteIds: string[];
  skippedCount: number;
};

async function sourcesForTargets(
  targets: PublishingTargetIdentity[],
  getSource: BusinessPosterPropagationDependencies["getSource"]
) {
  const entries = await Promise.all(targets.map(async (target) => [target.siteId, await getSource(target.siteId)] as const));
  return Object.fromEntries(entries);
}

export async function executeBusinessPosterPropagation(
  productSiteId: string,
  dependencies: BusinessPosterPropagationDependencies
): Promise<BusinessPosterPropagationResult> {
  try {
    const targets = await dependencies.listTargets();
    const productTarget = targets.find((target) => target.siteId === productSiteId && target.ecosystemType === "PRODUCT");
    if (!productTarget) return { outcome: "SKIPPED", refreshedSiteIds: [], skippedCount: 0 };

    const relatedTargets = targets.filter((target) =>
      target.siteId === productTarget.siteId ||
      (target.ownerKey === productTarget.ownerKey && target.ecosystemType === "BUSINESS")
    );
    const plan = planBusinessPosterPropagation(
      productSiteId,
      targets,
      await sourcesForTargets(relatedTargets, dependencies.getSource)
    );
    if (!plan.length) return { outcome: "SKIPPED", refreshedSiteIds: [], skippedCount: 0 };

    const refreshedSiteIds: string[] = [];
    let skippedCount = 0;
    for (const refresh of plan) {
      try {
        await dependencies.generate(refresh.configuration);
        await dependencies.afterSourceChange(refresh.siteId);
        refreshedSiteIds.push(refresh.siteId);
      } catch {
        skippedCount += 1;
      }
    }

    return {
      outcome: skippedCount ? (refreshedSiteIds.length ? "PARTIAL" : "FAILED_SAFE") : "REFRESHED",
      refreshedSiteIds,
      skippedCount
    };
  } catch {
    return { outcome: "FAILED_SAFE", refreshedSiteIds: [], skippedCount: 0 };
  }
}
