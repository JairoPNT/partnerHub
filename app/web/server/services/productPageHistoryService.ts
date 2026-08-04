import "server-only";

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { resolve, sep } from "node:path";

import { z } from "zod";

import type { ProductPageVerificationCheck } from "@/server/services/productPageVerificationService";

const siteIdSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "siteId must be a lowercase slug");

const MAX_HISTORY_EVENTS = 100;

export type ProductPageHistoryEventType = "GENERATED" | "PUBLISHED" | "VERIFIED" | "VERIFY_FAILED";

export type ProductPageHistoryEvent = {
  id: string;
  siteId: string;
  type: ProductPageHistoryEventType;
  occurredAt: string;
  domain?: string | null;
  outputDirectory?: string;
  remoteRoot?: string;
  fileCount?: number;
  verificationStatus?: "VERIFIED" | "VERIFY_FAILED";
  failedChecks?: ProductPageVerificationCheck[];
  message?: string;
};

export type ProductPageHistoryRecord = {
  siteId: string;
  events: ProductPageHistoryEvent[];
};

function getHistoryDirectory() {
  return resolve(process.env.PRODUCT_PAGE_SOURCE_DIR ?? "/data/generated-sites/.sources", ".history");
}

function historyPath(siteId: string) {
  const safeSiteId = siteIdSchema.parse(siteId);
  const root = getHistoryDirectory();
  const target = resolve(root, `${safeSiteId}.json`);

  if (!target.startsWith(`${root}${sep}`)) {
    throw new Error("Product page history path escaped the configured directory.");
  }

  return target;
}

function createEventId(type: ProductPageHistoryEventType, occurredAt: string) {
  return `${Date.parse(occurredAt).toString(36)}-${type.toLowerCase()}`;
}

async function get(siteId: string): Promise<ProductPageHistoryRecord> {
  const safeSiteId = siteIdSchema.parse(siteId);

  try {
    const record = JSON.parse(await readFile(historyPath(safeSiteId), "utf8")) as ProductPageHistoryRecord;

    return {
      siteId: safeSiteId,
      events: Array.isArray(record.events) ? record.events : []
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { siteId: safeSiteId, events: [] };
    }

    throw error;
  }
}

async function append(event: Omit<ProductPageHistoryEvent, "id" | "occurredAt"> & { occurredAt?: string }) {
  const safeSiteId = siteIdSchema.parse(event.siteId);
  const occurredAt = event.occurredAt ?? new Date().toISOString();
  const record = await get(safeSiteId);
  const nextEvent: ProductPageHistoryEvent = {
    ...event,
    siteId: safeSiteId,
    occurredAt,
    id: createEventId(event.type, occurredAt)
  };
  const nextRecord: ProductPageHistoryRecord = {
    siteId: safeSiteId,
    events: [nextEvent, ...record.events].slice(0, MAX_HISTORY_EVENTS)
  };
  const directory = getHistoryDirectory();
  const target = historyPath(safeSiteId);
  const temporary = `${target}.tmp-${process.pid}-${Date.now()}`;

  await mkdir(directory, { recursive: true });
  await writeFile(temporary, `${JSON.stringify(nextRecord, null, 2)}\n`, "utf8");
  await rename(temporary, target);

  return nextEvent;
}

export const productPageHistoryService = { append, get };
