#!/usr/bin/env node

import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(SCRIPT_DIR, "..");
const DEFAULT_TEMPLATE_DIR = resolve(PROJECT_ROOT, "plantillas-de-pagina", "producto");
const PUBLIC_TEMPLATE_ENTRIES = ["index.html", "styles.css", "app.js", "favicon.svg", "tipografia"];
const REQUIRED_STRING_PATHS = [
  ["site", "id"],
  ["site", "title"],
  ["distributor", "brandName"],
  ["distributor", "firstName"],
  ["distributor", "fullName"],
  ["distributor", "whatsappNumber"],
  ["hero", "desktop"],
  ["hero", "mobile"],
];

function getFaviconInitial(brandName, fullName) {
  const brandChar = brandName?.trim()?.[0];
  const fullChar = fullName?.trim()?.[0];
  return (brandChar || fullChar || "P").toUpperCase();
}

function generateFaviconSvg(initial) {
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

function usage() {
  console.log(`
Uso:
  node scripts/generate-product-page.mjs --input <cliente.json> --output <carpeta> [--force]

El resultado contiene solo los archivos necesarios para subir al document root:
index.html, styles.css, app.js, config.js y tipografia/.
`);
}

function readArguments(argumentsList) {
  const result = { force: false };

  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === "--force") {
      result.force = true;
      continue;
    }
    if (argument === "--input" || argument === "--output") {
      const value = argumentsList[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`Falta el valor para ${argument}.`);
      }
      result[argument.slice(2)] = value;
      index += 1;
      continue;
    }
    if (argument === "--help" || argument === "-h") {
      result.help = true;
      continue;
    }
    throw new Error(`Argumento no reconocido: ${argument}`);
  }

  return result;
}

function getRequiredString(configuration, path) {
  const value = configuration[path[0]]?.[path[1]];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Falta un texto válido en ${path.join(".")}.`);
  }
  return value.trim();
}

function validateAbsoluteHttpsUrl(value, fieldName) {
  let parsedUrl;
  try {
    parsedUrl = new URL(value);
  } catch {
    throw new Error(`${fieldName} debe ser una URL válida.`);
  }
  if (parsedUrl.protocol !== "https:") {
    throw new Error(`${fieldName} debe usar HTTPS.`);
  }
}

function validateConfiguration(configuration) {
  if (!configuration || typeof configuration !== "object" || Array.isArray(configuration)) {
    throw new Error("El archivo de entrada debe contener un objeto JSON.");
  }

  for (const path of REQUIRED_STRING_PATHS) {
    getRequiredString(configuration, path);
  }

  const siteId = configuration.site.id;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(siteId)) {
    throw new Error("site.id debe ser un slug en minúsculas, por ejemplo: jenny-varela.");
  }

  const whatsappNumber = configuration.distributor.whatsappNumber.replace(/\D/g, "");
  if (whatsappNumber.length < 10 || whatsappNumber.length > 15) {
    throw new Error("distributor.whatsappNumber debe tener entre 10 y 15 dígitos.");
  }
  configuration.distributor.whatsappNumber = whatsappNumber;

  validateAbsoluteHttpsUrl(configuration.hero.desktop, "hero.desktop");
  validateAbsoluteHttpsUrl(configuration.hero.mobile, "hero.mobile");

  if (configuration.logoUrl !== undefined) {
    if (typeof configuration.logoUrl !== "string" || configuration.logoUrl.trim().length === 0) {
      throw new Error("logoUrl debe ser texto cuando se incluya.");
    }
    validateAbsoluteHttpsUrl(configuration.logoUrl, "logoUrl");
  }

  const customFavicon = configuration.site?.faviconUrl ?? configuration.faviconUrl;
  if (customFavicon !== undefined) {
    if (typeof customFavicon !== "string" || customFavicon.trim().length === 0) {
      throw new Error("faviconUrl debe ser texto cuando se incluya.");
    }
    validateAbsoluteHttpsUrl(customFavicon, "faviconUrl");
    configuration.site.faviconUrl = customFavicon.trim();
  }

  configuration.site.appName ??= siteId.replaceAll("-", "_");
  configuration.site.ogTitle ??= configuration.site.title;
  configuration.site.ogDescription ??= configuration.site.metaDescription ?? "";
  configuration.site.metaDescription ??= configuration.site.ogDescription;
  configuration.distributor.phoneNumber ??= whatsappNumber;
  configuration.distributor.displayPhone ??= configuration.distributor.phoneNumber;
  configuration.distributor.role ??= "Distribuidor Autorizado";
  configuration.distributor.defaultMessage ??= `Hola ${configuration.distributor.firstName}, vengo de tu página web y me gustaría recibir más información.`;
  configuration.mediaBaseUrl ??= "https://media.partnerhub.club/comunes/producto/v1/";

  return configuration;
}

function buildConfigFile(configuration) {
  const json = JSON.stringify(configuration, null, 2);
  return `// Generado por PH-005A. No editar manualmente.\nconst CONFIG = ${json};\n\nif (typeof window !== "undefined") {\n  window.CONFIG = CONFIG;\n}\n`;
}

async function copyTemplate(templateDir, outputDir) {
  for (const entry of PUBLIC_TEMPLATE_ENTRIES) {
    await cp(resolve(templateDir, entry), resolve(outputDir, entry), { recursive: true, errorOnExist: false });
  }
}

async function main() {
  const argumentsValue = readArguments(process.argv.slice(2));
  if (argumentsValue.help) {
    usage();
    return;
  }
  if (!argumentsValue.input || !argumentsValue.output) {
    usage();
    throw new Error("Se requieren --input y --output.");
  }

  const inputPath = resolve(process.cwd(), argumentsValue.input);
  const outputPath = resolve(process.cwd(), argumentsValue.output);
  if (outputPath === PROJECT_ROOT || !outputPath.startsWith(`${PROJECT_ROOT}\\`)) {
    throw new Error("La carpeta de salida debe estar dentro del proyecto PartnerHub.");
  }

  const rawInput = await readFile(inputPath, "utf8");
  let inputConfiguration;
  try {
    inputConfiguration = JSON.parse(rawInput);
  } catch {
    throw new Error("El archivo de entrada no contiene JSON válido.");
  }

  const configuration = validateConfiguration(inputConfiguration);
  if (argumentsValue.force) {
    await rm(outputPath, { recursive: true, force: true });
  }
  await mkdir(outputPath, { recursive: true });
  await copyTemplate(DEFAULT_TEMPLATE_DIR, outputPath);
  if (!configuration.site?.faviconUrl) {
    const initial = getFaviconInitial(configuration.distributor.brandName, configuration.distributor.fullName);
    const svgContent = generateFaviconSvg(initial);
    await writeFile(resolve(outputPath, "favicon.svg"), svgContent, "utf8");
  }
  await writeFile(resolve(outputPath, "config.js"), buildConfigFile(configuration), "utf8");

  console.log(`Paquete generado para ${configuration.site.id}.`);
  console.log(`Salida: ${outputPath}`);
  console.log(`Publica el contenido de esta carpeta en el document root del dominio.`);
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});
