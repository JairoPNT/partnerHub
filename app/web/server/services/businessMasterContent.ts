import "server-only";

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import { z } from "zod";

// This is an operator-managed local template, never an uploaded partner script.
// Select presentation data explicitly so master contacts and tracking never bleed into partners.
const text = z.string().trim().min(1);
const httpsUrl = z.string().url().refine((value) => /^https:\/\//i.test(value), "URL must use HTTPS");
const sectionHeading = { enabled: z.boolean().optional(), badge: text.optional(), title: text.optional(), subtitle: text.optional() };
const presentationSchema = z.object({
  ecosystemType: z.literal("BUSINESS"),
  site: z.object({ id: z.literal("ganomaster-business") }),
  hero: z.object({
    headline: z.string().min(1), subheadline: z.string().min(1),
    desktop: httpsUrl.optional(), mobile: httpsUrl.optional()
  }).passthrough(),
  benefits: z.array(z.object({ title: z.string().min(1), description: z.string().min(1) }).passthrough()).min(1),
  comparison: z.object({
    ...sectionHeading,
    traditionalTitle: text.optional(), opportunityTitle: text.optional(),
    traditionalItems: z.array(text), opportunityItems: z.array(text)
  }),
  methodology: z.object({
    ...sectionHeading,
    steps: z.array(z.object({ number: text.optional(), title: text, description: text })).min(1)
  }),
  faq: z.object({
    ...sectionHeading,
    items: z.array(z.object({ id: text.optional(), question: text, answer: text })).min(1)
  }),
  socialProof: z.object({
    enabled: z.boolean().optional(), headline: text.optional(), subheadline: text.optional(),
    ratingStars: text.optional(), avatars: z.array(text)
  }).optional(),
  testimonials: z.object({
    ...sectionHeading,
    items: z.array(z.object({ quote: text, name: text, role: text, avatarUrl: text.optional() }))
  }).optional(),
  legal: z.record(z.unknown()).optional(),
  // These fields must remain parseable by productPageGenerationInputSchema on regeneration.
  vsl: z.object({
    embedUrl: z.string().url(),
    provider: z.enum(["youtube", "vimeo", "wistia", "custom"]).optional(),
    videoTitle: text.optional(), aspectRatio: z.enum(["16:9", "4:3"]).optional(),
    caption: text.optional(), autoPlay: z.boolean().optional(), thumbnailUrl: text.optional(), durationText: text.optional()
  }),
  theme: z.object({
    fontPreset: z.enum(["executive", "modern", "editorial", "friendly", "premium", "minimal", "serif-chic", "romantic-serif", "luxury-serif"]),
    palettePreset: z.enum(["cobalt-cyan", "emerald-slate", "coffee-gold", "rose-graphite", "indigo-lime", "teal-navy", "wine-blush", "forest-mint", "charcoal-amber", "sky-stone"])
  }).optional()
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
