import "server-only";

import { mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { resolve, sep } from "node:path";

import { z } from "zod";
import { assertBusinessPublicationSiteIdentity, isBusinessPublicationSiteId, withBusinessPublicationSite } from "@/server/services/businessPublicationSiteCoordinator";
import { needsProductMutation, withProductMutation } from "@/server/services/productMutationCoordinator";

const siteIdSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "siteId must be a lowercase slug");

function getSourceDirectory() {
  return process.env.PRODUCT_PAGE_SOURCE_DIR ?? "/data/generated-sites/.sources";
}

function sourcePath(siteId: string) {
  const safeSiteId = siteIdSchema.parse(siteId);
  const root = resolve(getSourceDirectory());
  const target = resolve(root, `${safeSiteId}.json`);

  if (!target.startsWith(`${root}${sep}`)) {
    throw new Error("Product page source path escaped the configured source directory.");
  }

  return target;
}

function verificationPath(siteId: string) {
  const safeSiteId = siteIdSchema.parse(siteId);
  const root = resolve(getSourceDirectory(), ".verifications");
  const target = resolve(root, `${safeSiteId}.json`);

  if (!target.startsWith(`${root}${sep}`)) {
    throw new Error("Product page verification path escaped the configured verification directory.");
  }

  return target;
}

async function save(siteId: string, configuration: unknown) {
  const ecosystemType = (configuration as { ecosystemType?: unknown } | null)?.ecosystemType;
  assertBusinessPublicationSiteIdentity(siteId, ecosystemType);
  const action = async () => {
    const target = sourcePath(siteId);
    const directory = resolve(getSourceDirectory());
    const temporary = `${target}.tmp-${process.pid}-${Date.now()}`;

    await mkdir(directory, { recursive: true });
    await writeFile(temporary, `${JSON.stringify(configuration, null, 2)}\n`, "utf8");
    await rename(temporary, target);
  };
  return isBusinessPublicationSiteId(siteId) ? withBusinessPublicationSite(siteId, action)
    : needsProductMutation(siteId, ecosystemType) ? withProductMutation(siteId, action) : action();
}

async function clearLastVerification(siteId: string) {
  await rm(verificationPath(siteId), { force: true });
}

async function get(siteId: string) {
  try {
    return JSON.parse(await readFile(sourcePath(siteId), "utf8")) as unknown;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

async function list() {
  try {
    const entries = await readdir(getSourceDirectory(), { withFileTypes: true });
    return Promise.all(
      entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
        .map(async (entry) => ({
          siteId: entry.name.slice(0, -5),
          configuration: await get(entry.name.slice(0, -5))
        }))
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

export const productPageSourceService = { clearLastVerification, get, list, save };
