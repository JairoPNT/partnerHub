import "server-only";

import { access, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve, sep } from "node:path";

import { z } from "zod";

import { productPageSourceService } from "@/server/services/productPageSourceService";
import { activationLeadService } from "@/server/services/activationLeadService";

const siteIdSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "site.id must be a lowercase slug");

const domainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/, "domain must be a valid hostname");

const httpsUrlSchema = z.string().url().refine((value) => new URL(value).protocol === "https:", {
  message: "URL must use HTTPS"
});

const purchaseUrlSchema = httpsUrlSchema.refine(
  (value) => new URL(value).hostname.toLowerCase() !== "colombia.ganoexcel.com",
  {
    message: "Usa la URL exacta de compra del empresario. No uses colombia.ganoexcel.com."
  }
);

const measurementIdSchema = z
  .string()
  .trim()
  .regex(/^G-[A-Z0-9]+$/i, "Measurement ID must use the G-XXXXXXXX format")
  .transform((value) => value.toUpperCase());

const DEFAULT_HERO_DESKTOP = "https://media.partnerhub.club/comunes/producto/v1/hero-desktop.webp";
const DEFAULT_HERO_MOBILE = "https://media.partnerhub.club/comunes/producto/v1/hero-mobile.webp";

const fontPresetSchema = z.enum([
  "executive",
  "modern",
  "editorial",
  "friendly",
  "premium",
  "minimal",
  "serif-chic",
  "romantic-serif",
  "luxury-serif"
]);

const palettePresetSchema = z.enum([
  "cobalt-cyan",
  "emerald-slate",
  "coffee-gold",
  "rose-graphite",
  "indigo-lime",
  "teal-navy",
  "wine-blush",
  "forest-mint",
  "charcoal-amber",
  "sky-stone"
]);

export function getFaviconInitial(brandName?: string, fullName?: string): string {
  const brandChar = brandName?.trim()?.[0];
  const fullChar = fullName?.trim()?.[0];
  return (brandChar || fullChar || "P").toUpperCase();
}

export function generateFaviconSvg(initial: string): string {
  const char = (initial || "P").toUpperCase();
  const safeInitial = char
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="fav-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0F172A" />
      <stop offset="100%" stop-color="#1E293B" />
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="16" fill="url(#fav-grad)" />
  <rect width="64" height="64" rx="16" fill="none" stroke="#06B6D4" stroke-width="2" stroke-opacity="0.5" />
  <text x="32" y="34" dominant-baseline="central" text-anchor="middle" fill="#06B6D4" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="34">${safeInitial}</text>
</svg>
`;
}

export const productPageGenerationInputSchema = z.object({
  site: z.object({
    id: siteIdSchema,
    domain: domainSchema.optional(),
    title: z.string().trim().min(1),
    appName: z.string().trim().min(1).optional(),
    ogTitle: z.string().trim().min(1).optional(),
    ogDescription: z.string().trim().min(1).optional(),
    metaDescription: z.string().trim().min(1).optional(),
    faviconUrl: httpsUrlSchema.optional()
  }),
  distributor: z.object({
    brandName: z.string().trim().min(1),
    firstName: z.string().trim().min(1),
    fullName: z.string().trim().min(1),
    role: z.string().trim().min(1).optional(),
    whatsappNumber: z.string().trim().min(10).max(20),
    phoneNumber: z.string().trim().min(1).optional(),
    displayPhone: z.string().trim().min(1).optional(),
    purchaseUrl: purchaseUrlSchema.optional(),
    defaultMessage: z.string().trim().min(1).optional()
  }),
  hero: z.object({
    desktop: httpsUrlSchema.default(DEFAULT_HERO_DESKTOP),
    mobile: httpsUrlSchema.default(DEFAULT_HERO_MOBILE)
  }).default({
    desktop: DEFAULT_HERO_DESKTOP,
    mobile: DEFAULT_HERO_MOBILE
  }),
  analytics: z
    .object({
      measurementId: measurementIdSchema
    })
    .optional(),
  integrations: z
    .object({
      analytics: z
        .object({
          provider: z.literal("GA4").default("GA4"),
          measurementId: measurementIdSchema.optional()
        })
        .optional(),
      meta: z
        .object({
          pixelId: z.string().trim().min(1).optional()
        })
        .optional(),
      googleAds: z
        .object({
          conversionId: z.string().trim().min(1).optional()
        })
        .optional()
    })
    .optional(),
  theme: z
    .object({
      fontPreset: fontPresetSchema.default("executive"),
      palettePreset: palettePresetSchema.default("cobalt-cyan")
    })
    .optional(),
  mediaBaseUrl: httpsUrlSchema.optional(),
  faviconUrl: httpsUrlSchema.optional()
});

export type ProductPageGenerationInput = z.infer<typeof productPageGenerationInputSchema>;

export type ProductPageGenerationResult = {
  siteId: string;
  generatedAt: string;
  outputDirectory: string;
  previewUrl: string;
  files: string[];
};

const templateEntries = ["index.html", "styles.css", "app.js", "favicon.svg", "tipografia"];
const noCacheHtaccessSource = `DirectoryIndex index.html

<IfModule mod_headers.c>
  <FilesMatch "^(index\\.html|config\\.js|app\\.js|styles\\.css|manifest\\.json)$">
    Header set Cache-Control "no-cache, must-revalidate"
    Header set Pragma "no-cache"
    Header set Expires "0"
  </FilesMatch>
</IfModule>
`;

function getTemplateDirectory() {
  return process.env.PRODUCT_PAGE_TEMPLATE_DIR ?? "/app/plantillas-de-pagina/producto";
}

function getOutputRoot() {
  return process.env.PRODUCT_PAGE_OUTPUT_DIR ?? "/data/generated-sites";
}

export type ProductPageGenerationOptions = {
  templateSource?: "canonical" | "master";
};

async function parseSavedSource(siteId: string) {
  const source = await productPageSourceService.get(siteId);

  if (!source) {
    throw new Error(`No saved product page configuration exists for siteId: ${siteId}.`);
  }

  return productPageGenerationInputSchema.parse(source);
}

async function resolveTemplateDirectory(siteId: string, options?: ProductPageGenerationOptions) {
  const source = options?.templateSource ?? (siteId === "ganomaster" ? "canonical" : "master");
  if (source === "canonical") {
    return getTemplateDirectory();
  }

  const masterDirectory = resolveInsideDirectory(getOutputRoot(), "ganomaster");
  try {
    await access(masterDirectory);
  } catch {
    throw new Error(
      "The master template is not published yet. Publish ganomaster.pro before generating client pages."
    );
  }

  return masterDirectory;
}

function resolveInsideDirectory(rootDirectory: string, childName: string) {
  const root = resolve(rootDirectory);
  const target = resolve(root, childName);

  if (!target.startsWith(`${root}${sep}`)) {
    throw new Error("Generated package path escaped the configured output directory.");
  }

  return target;
}

function normalizedConfiguration(input: ProductPageGenerationInput) {
  const whatsappNumber = input.distributor.whatsappNumber.replace(/\D/g, "");

  if (whatsappNumber.length < 10 || whatsappNumber.length > 15) {
    throw new Error("distributor.whatsappNumber must contain between 10 and 15 digits.");
  }

  const faviconUrl = input.site.faviconUrl ?? input.faviconUrl;

  const analyticsMeasurementId =
    input.analytics?.measurementId ?? input.integrations?.analytics?.measurementId;

  return {
    site: {
      id: input.site.id,
      domain: input.site.domain,
      title: input.site.title,
      appName: input.site.appName ?? input.site.id.replaceAll("-", "_"),
      ogTitle: input.site.ogTitle ?? input.site.title,
      ogDescription: input.site.ogDescription ?? input.site.metaDescription ?? "",
      metaDescription: input.site.metaDescription ?? input.site.ogDescription ?? "",
      faviconUrl: faviconUrl ? faviconUrl : undefined
    },
    distributor: {
      brandName: input.distributor.brandName,
      firstName: input.distributor.firstName,
      fullName: input.distributor.fullName,
      role: input.distributor.role ?? "Distribuidor Autorizado",
      whatsappNumber,
      phoneNumber: input.distributor.phoneNumber ?? whatsappNumber,
      displayPhone: input.distributor.displayPhone ?? input.distributor.phoneNumber ?? whatsappNumber,
      purchaseUrl: input.distributor.purchaseUrl,
      defaultMessage:
        input.distributor.defaultMessage ??
        `Hola ${input.distributor.firstName}, vengo de tu página web y me gustaría recibir más información.`
    },
    hero: input.hero,
    analytics: analyticsMeasurementId
      ? { measurementId: analyticsMeasurementId }
      : undefined,
    integrations: input.integrations,
    theme: input.theme
      ? {
          fontPreset: input.theme.fontPreset,
          palettePreset: input.theme.palettePreset
        }
      : undefined,
    mediaBaseUrl: input.mediaBaseUrl ?? "https://media.partnerhub.club/comunes/producto/v1/"
  };
}

function buildConfigSource(configuration: ReturnType<typeof normalizedConfiguration>) {
  return `// Generated by PartnerHub PH-005B. Do not edit manually.\nconst CONFIG = ${JSON.stringify(configuration, null, 2)};\n\nif (typeof window !== "undefined") {\n  window.CONFIG = CONFIG;\n}\n`;
}

async function applyAssetVersion(outputDirectory: string, assetVersion: string) {
  const indexPath = resolve(outputDirectory, "index.html");
  const html = await readFile(indexPath, "utf8");
  const versionedHtml = html
    .replace(/\bsrc=["']config\.js(?:\?v=[^"']*)?["']/g, `src="config.js?v=${assetVersion}"`)
    .replace(/\bhref=["']styles\.css(?:\?v=[^"']*)?["']/g, `href="styles.css?v=${assetVersion}"`)
    .replace(/\bsrc=["']app\.js(?:\?v=[^"']*)?["']/g, `src="app.js?v=${assetVersion}"`);

  await writeFile(indexPath, versionedHtml, "utf8");
}

export const productPageGenerationService = {
  async generate(
    input: ProductPageGenerationInput,
    options?: ProductPageGenerationOptions
  ): Promise<ProductPageGenerationResult> {
    const configuration = normalizedConfiguration(input);
    const templateDirectory = await resolveTemplateDirectory(configuration.site.id, options);
    const outputDirectory = resolveInsideDirectory(getOutputRoot(), configuration.site.id);

    await rm(outputDirectory, { recursive: true, force: true });
    await mkdir(outputDirectory, { recursive: true });

    for (const entry of templateEntries) {
      await cp(resolve(templateDirectory, entry), resolve(outputDirectory, entry), {
        recursive: true,
        errorOnExist: false
      });
    }

    if (!configuration.site.faviconUrl) {
      const initial = getFaviconInitial(configuration.distributor.brandName, configuration.distributor.fullName);
      const svgContent = generateFaviconSvg(initial);
      await writeFile(resolve(outputDirectory, "favicon.svg"), svgContent, "utf8");
    }

    const generatedAt = new Date().toISOString();
    const assetVersion = Date.parse(generatedAt).toString(36);
    const files = [...templateEntries.filter((entry) => entry !== "tipografia"), ".htaccess", "config.js", "tipografia/"];

    await writeFile(resolve(outputDirectory, "config.js"), buildConfigSource(configuration), "utf8");
    await writeFile(resolve(outputDirectory, ".htaccess"), noCacheHtaccessSource, "utf8");
    await applyAssetVersion(outputDirectory, assetVersion);
    await writeFile(
      resolve(outputDirectory, "manifest.json"),
      `${JSON.stringify({ siteId: configuration.site.id, generatedAt, assetVersion, files }, null, 2)}\n`,
      "utf8"
    );

    await productPageSourceService.save(configuration.site.id, configuration);
    await activationLeadService.updatePublicationStateBySiteId(configuration.site.id, "GENERATED");

    return {
      siteId: configuration.site.id,
      generatedAt,
      outputDirectory,
      previewUrl: `/api/internal/product-pages/preview/${configuration.site.id}/`,
      files: [...files, "manifest.json"]
    };
  },

  async regenerateFromSavedSource(
    siteId: string,
    options?: ProductPageGenerationOptions
  ): Promise<ProductPageGenerationResult> {
    const input = await parseSavedSource(siteId);
    return this.generate(input, options);
  }
};
