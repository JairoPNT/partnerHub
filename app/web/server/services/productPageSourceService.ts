import "server-only";

import { lstat, mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { createHash, randomUUID } from "node:crypto";

import { z } from "zod";
import { assertBusinessPublicationSiteIdentity, isBusinessPublicationSiteId, withBusinessPublicationSite } from "@/server/services/businessPublicationSiteCoordinator";
import { needsProductMutation, withProductMutation } from "@/server/services/productMutationCoordinator";
import { businessLandingContentSchema, type BusinessLandingContent } from "@/shared/business-landing-content-contract";

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

// Content updates deliberately do not pass through save/normalization: existing
// generated presentation and extension fields must survive byte-CAS updates.
async function assertContentPath(target: string) {
  let current = target;
  while (true) {
    try {
      const stat = await lstat(current);
      if (stat.isSymbolicLink() || (current === target && !stat.isFile()) || (current !== target && !stat.isDirectory()))
        throw new Error('BUSINESS_CONTENT_SOURCE_PATH_INVALID');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
}

async function updateBusinessLandingContent(input: {
  siteId: string; expectedSourceHash: string | null; sourceConfiguration: unknown; profile: BusinessLandingContent;
}) {
  assertBusinessPublicationSiteIdentity(input.siteId, 'BUSINESS');
  const profile = businessLandingContentSchema.parse(input.profile);
  const identitySchema = z.object({ ecosystemType: z.literal('BUSINESS'), site: z.object({ id: z.literal(input.siteId), domain: z.string().min(1) }) });
  const expected = identitySchema.safeParse(input.sourceConfiguration);
  if (!expected.success) throw new Error('BUSINESS_CONTENT_SOURCE_IDENTITY_INVALID');
  return withBusinessPublicationSite(input.siteId, async () => {
    const target = sourcePath(input.siteId);
    const readCurrent = async () => {
      await assertContentPath(target);
      try { return await readFile(target); }
      catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
    };
    const hash = (bytes: Buffer | null) => bytes === null ? null : createHash('sha256').update(bytes).digest('hex');
    const bytes = await readCurrent();
    if (hash(bytes) !== input.expectedSourceHash) throw new Error('BUSINESS_CONTENT_SOURCE_CONFLICT');
    const source = bytes === null ? input.sourceConfiguration : JSON.parse(bytes.toString('utf8')) as unknown;
    const actual = identitySchema.safeParse(source);
    if (!actual.success || actual.data.site.domain !== expected.data.site.domain)
      throw new Error('BUSINESS_CONTENT_SOURCE_IDENTITY_INVALID');
    const next = { ...(source as Record<string, unknown>), businessLandingContent: profile };
    await mkdir(dirname(target), { recursive: true });
    await assertContentPath(target);
    const temporary = `${target}.tmp-${randomUUID()}`;
    try {
      await writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
      if (hash(await readCurrent()) !== input.expectedSourceHash) throw new Error('BUSINESS_CONTENT_SOURCE_CONFLICT');
      await rename(temporary, target);
    } finally { await rm(temporary, { force: true }); }
  });
}

export const productPageSourceService = { clearLastVerification, get, list, save, updateBusinessLandingContent };
