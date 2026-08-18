import "server-only";

import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { z } from "zod";

import {
  extractProductHero,
  findPartnerProductSiteId,
  type PartnerPublishingTargetIdentity
} from "@/server/services/businessProductHeroCorrelation";
import { productPageSourceService } from "@/server/services/productPageSourceService";

const targetIdentitySchema = z.object({
  version: z.literal(2),
  ownerKey: z.string().uuid(),
  siteId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  ecosystemType: z.enum(["PRODUCT", "BUSINESS", "PERSONAL_BRAND"])
}).passthrough();

function targetDirectory() {
  return resolve(
    process.env.PRODUCT_PAGE_SOURCE_DIR ?? "/data/generated-sites/.sources",
    ".publishing-targets"
  );
}

async function readTargetIdentities(): Promise<PartnerPublishingTargetIdentity[]> {
  try {
    const directory = targetDirectory();
    const entries = await readdir(directory, { withFileTypes: true });
    const targets = await Promise.all(entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map(async (entry) => {
        try {
          return targetIdentitySchema.safeParse(
            JSON.parse(await readFile(resolve(directory, entry.name), "utf8"))
          );
        } catch {
          return null;
        }
      }));
    return targets.flatMap((result) => result?.success ? [result.data] : []);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function resolveForBusinessSite(businessSiteId: string) {
  const productSiteId = findPartnerProductSiteId(businessSiteId, await readTargetIdentities());
  if (!productSiteId) return {};
  return extractProductHero(await productPageSourceService.get(productSiteId) as Parameters<typeof extractProductHero>[0]);
}

export const businessProductHeroCorrelationService = { resolveForBusinessSite };
