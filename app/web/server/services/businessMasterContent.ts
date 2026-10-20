import "server-only";

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import { z } from "zod";

// This is an operator-managed local template, never an uploaded partner script.
// Select presentation data explicitly so master contacts and tracking never bleed into partners.
const presentationSchema = z.object({
  ecosystemType: z.literal("BUSINESS"),
  site: z.object({ id: z.literal("ganomaster-business") }),
  hero: z.object({ headline: z.string().min(1), subheadline: z.string().min(1) }).passthrough(),
  benefits: z.array(z.object({ title: z.string().min(1), description: z.string().min(1) }).passthrough()).min(1),
  comparison: z.record(z.unknown()),
  methodology: z.object({ steps: z.array(z.record(z.unknown())).min(1) }).passthrough(),
  faq: z.object({ items: z.array(z.record(z.unknown())).min(1) }).passthrough(),
  socialProof: z.record(z.unknown()).optional(),
  testimonials: z.record(z.unknown()).optional(),
  legal: z.record(z.unknown()).optional(),
  vsl: z.object({ embedUrl: z.string().url() }).passthrough(),
  theme: z.object({ fontPreset: z.string(), palettePreset: z.string() }).optional()
});

export async function loadBusinessMasterContent(templateDirectory: string) {
  try {
    const source = await readFile(resolve(templateDirectory, "config.js"), "utf8");
    const serialized = runInNewContext(`${source}\nJSON.stringify(CONFIG)`, Object.create(null), {
      timeout: 100,
      contextCodeGeneration: { strings: false, wasm: false }
    });
    const { ecosystemType: _type, site: _site, ...presentation } = presentationSchema.parse(JSON.parse(serialized));
    return presentation;
  } catch {
    throw new Error("BUSINESS_MASTER_CONFIGURATION_INVALID_OR_MISSING");
  }
}

export function composeBusinessMasterContent<T extends {
  hero: Record<string, unknown>;
  vsl?: Record<string, unknown>;
  theme?: { fontPreset: string; palettePreset: string };
}>(configuration: T, presentation: Awaited<ReturnType<typeof loadBusinessMasterContent>>) {
  return {
    ...presentation,
    ...configuration,
    hero: { ...presentation.hero, ...configuration.hero },
    vsl: { ...presentation.vsl, ...configuration.vsl },
    theme: configuration.theme ?? presentation.theme
  };
}
