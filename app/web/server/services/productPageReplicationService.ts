import "server-only";

import { z } from "zod";

import {
  productPageGenerationInputSchema,
  productPageGenerationService
} from "@/server/services/productPageGenerationService";
import { productPagePublicationService } from "@/server/services/productPagePublicationService";
import { productPageSourceService } from "@/server/services/productPageSourceService";

const siteIdSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const MASTER_SITE_ID = "ganomaster";

export const productPageReplicationInputSchema = z.object({
  siteIds: z.array(siteIdSchema).min(1).optional(),
  confirmation: z.literal("REPLICATE_TEMPLATE")
});

export const productPageReplicationService = {
  async publishMasterPreview() {
    const source = (await productPageSourceService.get(MASTER_SITE_ID)) as { site?: { id?: string } } | null;
    if (!source) {
      throw new Error("No saved master site configuration exists for ganomaster.");
    }

    const configuration = productPageGenerationInputSchema.parse(source);
    const generated = await productPageGenerationService.generate(configuration);
    const published = await productPagePublicationService.publish({ siteId: MASTER_SITE_ID });

    return {
      siteId: MASTER_SITE_ID,
      previewUrl: "https://ganomaster.pro",
      generated,
      published
    };
  },

  async replicate(input: z.infer<typeof productPageReplicationInputSchema>) {
    const parsed = productPageReplicationInputSchema.parse(input);
    const sources = await productPageSourceService.list();
    const selected = parsed.siteIds
      ? sources.filter((source) => parsed.siteIds?.includes(source.siteId) && source.siteId !== MASTER_SITE_ID)
      : sources.filter((source) => source.siteId !== MASTER_SITE_ID);

    if (selected.length === 0) {
      throw new Error("No saved product page sources match the requested replication scope.");
    }

    const results = [];
    for (const source of selected) {
      const configuration = productPageGenerationInputSchema.parse(source.configuration);
      const generated = await productPageGenerationService.generate(configuration);
      const published = await productPagePublicationService.publish({ siteId: source.siteId });
      results.push({ siteId: source.siteId, generated, published });
    }

    return {
      replicatedAt: new Date().toISOString(),
      count: results.length,
      results
    };
  }
};
