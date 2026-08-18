import "server-only";

import { appendFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

import type { WompiWebhookObservation } from "@/server/services/wompiWebhookObservabilityCore";

function directory() {
  return process.env.PRODUCT_PAGE_PAYMENT_DIR ?? "/data/generated-sites/.payments";
}

function path() {
  return resolve(directory(), "wompi-webhook-observability.jsonl");
}

async function record(observation: WompiWebhookObservation) {
  try {
    await mkdir(directory(), { recursive: true });
    await appendFile(path(), `${JSON.stringify(observation)}\n`, "utf8");
  } catch {
    // Observability must never change webhook settlement semantics.
  }
}

export const wompiWebhookObservabilityService = { record };
