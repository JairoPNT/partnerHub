import "server-only";

import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { z } from "zod";

import type { EntitlementTarget } from "@/server/services/partnerEcosystemEntitlementCore";

const targetSchema = z.object({
  version: z.literal(2),
  ownerKey: z.string().uuid(),
  siteId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  ecosystemType: z.enum(["PRODUCT", "BUSINESS", "PERSONAL_BRAND"]),
  baseDomain: z.string().min(1),
  publicHost: z.string().min(1),
  provisioningState: z.string().min(1),
  publicationState: z.string().min(1)
}).passthrough();

function storageDirectory() {
  return resolve(
    process.env.PRODUCT_PAGE_SOURCE_DIR ?? "/data/generated-sites/.sources",
    ".publishing-targets"
  );
}

async function list(): Promise<EntitlementTarget[]> {
  try {
    const directory = storageDirectory();
    const entries = await readdir(directory, { withFileTypes: true });
    const targets = await Promise.all(entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map(async (entry) => {
        try {
          return targetSchema.safeParse(JSON.parse(await readFile(resolve(directory, entry.name), "utf8")));
        } catch {
          return null;
        }
      }));
    return targets.flatMap((target) => target?.success ? [target.data] : []);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

export const partnerEcosystemTargetReader = { list };
