import "server-only";

import { z } from "zod";

import {
  ecosystemTypeSchema,
  getMasterSiteId,
  isMasterSiteId,
  normalizeEcosystemType,
  type EcosystemType
} from "@/server/services/ecosystemService";
import {
  productPageGenerationInputSchema,
  productPageGenerationService
} from "@/server/services/productPageGenerationService";
import { productPagePublicationService } from "@/server/services/productPagePublicationService";
import { productPageSourceService } from "@/server/services/productPageSourceService";

const siteIdSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const MASTER_SITE_ID = getMasterSiteId("PRODUCT");

export const productPageReplicationInputSchema = z.object({
  siteIds: z.array(siteIdSchema).min(1).optional(),
  ecosystemType: ecosystemTypeSchema.default("PRODUCT"),
  confirmation: z.literal("REPLICATE_TEMPLATE")
});

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function mergeTemplateConfiguration(
  masterConfiguration: unknown,
  clientConfiguration: unknown,
  ecosystemType: EcosystemType,
  siteId: string
) {
  const master = asRecord(masterConfiguration);
  const client = asRecord(clientConfiguration);
  const masterSite = asRecord(master.site);
  const clientSite = asRecord(client.site);

  return {
    ...master,
    ...client,
    ecosystemType,
    site: { ...masterSite, ...clientSite, id: siteId },
    distributor: { ...asRecord(master.distributor), ...asRecord(client.distributor) },
    hero: { ...asRecord(master.hero), ...asRecord(client.hero) },
    analytics: client.analytics ?? master.analytics,
    integrations: client.integrations ?? master.integrations,
    theme: client.theme ?? master.theme,
    mediaBaseUrl: client.mediaBaseUrl ?? master.mediaBaseUrl
  };
}

function sourceEcosystemType(source: { configuration?: unknown; ecosystemType?: unknown }): EcosystemType {
  const configuration = asRecord(source.configuration);
  return normalizeEcosystemType(source.ecosystemType ?? configuration.ecosystemType);
}

export const productPageReplicationService = {
  async publishMasterPreview(input: { ecosystemType?: unknown } = {}) {
    const ecosystemType = ecosystemTypeSchema.parse(input.ecosystemType ?? "PRODUCT");
    const siteId = getMasterSiteId(ecosystemType);
    const source = await productPageSourceService.get(siteId);

    if (!source) {
      throw new Error(`No saved master site configuration exists for ${siteId}.`);
    }

    const configuration = productPageGenerationInputSchema.parse({
      ...asRecord(source),
      ecosystemType
    });
    const generated = await productPageGenerationService.generate(configuration, { templateSource: "canonical" });
    const published = await productPagePublicationService.publish({ siteId });

    return {
      ecosystemType,
      siteId,
      previewUrl: ecosystemType === "PRODUCT" ? "https://ganomaster.pro" : undefined,
      generated,
      published
    };
  },

  async replicate(input: z.infer<typeof productPageReplicationInputSchema>) {
    const parsed = productPageReplicationInputSchema.parse(input);
    const masterSiteId = getMasterSiteId(parsed.ecosystemType);
    const masterSource = await productPageSourceService.get(masterSiteId);

    if (!masterSource) {
      throw new Error(`No saved master site configuration exists for ${masterSiteId}.`);
    }

    const sources = await productPageSourceService.list();
    const selected = sources.filter((source) => {
      if (isMasterSiteId(source.siteId)) return false;
      if (parsed.siteIds && !parsed.siteIds.includes(source.siteId)) return false;
      return sourceEcosystemType(source) === parsed.ecosystemType;
    });

    if (selected.length === 0) {
      throw new Error(`No saved ${parsed.ecosystemType} page sources match the requested replication scope.`);
    }

    const masterConfiguration = productPageGenerationInputSchema.parse({
      ...asRecord(masterSource),
      ecosystemType: parsed.ecosystemType
    });
    const results = [];

    for (const source of selected) {
      const clientConfiguration = asRecord(source.configuration ?? source);
      const configuration = productPageGenerationInputSchema.parse(
        mergeTemplateConfiguration(masterConfiguration, clientConfiguration, parsed.ecosystemType, source.siteId)
      );
      const generated = await productPageGenerationService.generate(configuration, {
        templateSource: "master",
        masterSiteId
      });
      const published = await productPagePublicationService.publish({ siteId: source.siteId });
      results.push({ siteId: source.siteId, generated, published });
    }

    return {
      replicatedAt: new Date().toISOString(),
      ecosystemType: parsed.ecosystemType,
      templateSiteId: masterSiteId,
      count: results.length,
      results
    };
  }
};