import "server-only";

import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { z } from "zod";

import { extractProductHero } from "@/server/services/businessProductHeroCorrelation";
import { activationLeadService } from "@/server/services/activationLeadService";
import { productPageSourceService } from "@/server/services/productPageSourceService";

const siteIdSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const hostnameSchema = z.string().regex(/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/);
const targetIdentitySchema = z.object({
  version: z.literal(2),
  ownerKey: z.string().uuid(),
  siteId: siteIdSchema,
  ecosystemType: z.enum(["PRODUCT", "BUSINESS", "PERSONAL_BRAND"]),
  baseDomain: hostnameSchema.optional()
}).passthrough();

const legacyLeadSchema = z.object({
  id: z.string().uuid(),
  siteId: siteIdSchema,
  onboardingData: z.object({ domain: hostnameSchema })
});
const legacyProductSourceSchema = z.object({
  ecosystemType: z.literal("PRODUCT"),
  site: z.object({ id: siteIdSchema, domain: hostnameSchema })
}).passthrough();

function targetDirectory() {
  return resolve(
    process.env.PRODUCT_PAGE_SOURCE_DIR ?? "/data/generated-sites/.sources",
    ".publishing-targets"
  );
}

async function readTargetIdentities(): Promise<z.infer<typeof targetIdentitySchema>[]> {
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
  const targets = await readTargetIdentities();
  const businessTargets = targets.filter((target) => target.siteId === businessSiteId && target.ecosystemType === "BUSINESS");
  if (businessTargets.length !== 1) return {};
  const business = businessTargets[0];
  const products = targets.filter((target) => target.ownerKey === business.ownerKey && target.ecosystemType === "PRODUCT");
  if (products.length > 1) return {};
  if (products.length === 1) {
    return extractProductHero(await productPageSourceService.get(products[0].siteId) as Parameters<typeof extractProductHero>[0]);
  }

  // Legacy sources use the activation lead's assigned site ID, never a guessed slug.
  if (!business.baseDomain) return {};
  const parsedLead = legacyLeadSchema.safeParse(await activationLeadService.getById(business.ownerKey));
  if (!parsedLead.success) return {};
  const lead = parsedLead.data;
  if (lead.id !== business.ownerKey || lead.onboardingData.domain !== business.baseDomain) return {};
  if (targets.some((target) => target.siteId === lead.siteId && target.ownerKey !== business.ownerKey)) return {};
  const source = await productPageSourceService.get(lead.siteId);
  const parsedSource = legacyProductSourceSchema.safeParse(source);
  if (!parsedSource.success || parsedSource.data.site.id !== lead.siteId) return {};
  if (![business.baseDomain, `producto.${business.baseDomain}`].includes(parsedSource.data.site.domain)) return {};
  return extractProductHero(source as Parameters<typeof extractProductHero>[0]);
}

export const businessProductHeroCorrelationService = { resolveForBusinessSite };
