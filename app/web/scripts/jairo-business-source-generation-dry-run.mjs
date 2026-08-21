import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { pathToFileURL, URL } from "node:url";
import vm from "node:vm";

const CONFIRMATION = "DRY_RUN_JAIRO_BUSINESS_SOURCE";
const EXPECTED = {
  activationLeadId: "f403f29e-95c8-4825-9320-967376443020",
  ownerSiteId: "jairo-pinto",
  productSiteId: "jairo-pinto-product",
  businessSiteId: "jairo-pinto-business",
  ecosystemType: "BUSINESS",
  baseDomain: "jairopinto.pro",
  publicHost: "negocio.jairopinto.pro"
};
const HASH = /^[0-9a-f]{64}$/i;
const FORBIDDEN = ["dQw4w9WgXcQ", "573000000000", "contacto@tudominio.com", "ganomaster-business", "Nexus Team", "Diana Ramos", "Carlos Mendoza", "GrupoMomentumStarter"];

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const clone = (value) => JSON.parse(JSON.stringify(value));

export function resolveCanonicalBusinessConfigPath(environment = process.env) {
  return resolve(environment.PRODUCT_PAGE_BUSINESS_TEMPLATE_CONFIG ?? "/app/runtime-assets/business-config.js");
}

function validateManifest(manifest) {
  if (manifest?.confirmation !== CONFIRMATION || !Array.isArray(manifest.allowlist) || manifest.allowlist.length !== 1) {
    throw new Error(`Manifest requires confirmation=${CONFIRMATION} and exactly one allowlisted projection.`);
  }
  const entry = manifest.allowlist[0];
  for (const [key, expected] of Object.entries(EXPECTED)) if (entry[key] !== expected) throw new Error(`Allowlist ${key} must equal ${expected}.`);
  for (const field of ["expectedActivationLeadHash", "expectedEntitlementHash", "expectedBusinessProfileHash", "expectedBrandSourceHash", "expectedProductSourceHash", "expectedCanonicalTemplateHash"]) {
    if (!HASH.test(entry[field] ?? "")) throw new Error(`${field} must be a complete SHA-256.`);
  }
  return entry;
}

async function optionalFile(path) {
  try { const source = await readFile(path, "utf8"); return { path, source, hash: sha256(source) }; }
  catch (error) { if (error.code === "ENOENT") return null; throw error; }
}

function parseCanonicalConfig(source, filename) {
  const script = new vm.Script(`${source}\n;CONFIG;`, { filename });
  return clone(script.runInNewContext(Object.create(null), { timeout: 1000 }));
}

function nonempty(value) { return typeof value === "string" && value.trim().length > 0; }
function https(value) { try { return new URL(value).protocol === "https:"; } catch { return false; } }
function digits(value) { return typeof value === "string" ? value.replace(/\D/g, "") : ""; }

function missingProfileFields(profile) {
  const fields = [
    "role", "siteTitle", "ogTitle", "ogDescription", "metaDescription", "defaultMessage",
    "hero.badge", "hero.headline", "hero.subheadline", "hero.desktopBgUrl", "hero.mobileBgUrl",
    "vsl.provider", "vsl.embedUrl", "vsl.videoTitle", "vsl.thumbnailUrl", "vsl.durationText",
    "cta.primaryText", "cta.directRegisterUrl", "cta.secondaryText", "cta.guaranteeText"
  ];
  return fields.filter((field) => {
    const value = field.split(".").reduce((current, part) => current?.[part], profile);
    return !nonempty(value);
  });
}

function forbiddenPaths(value, path = "projection") {
  if (typeof value === "string") return FORBIDDEN.some((token) => value.includes(token)) ? [path] : [];
  if (Array.isArray(value)) return value.flatMap((item, index) => forbiddenPaths(item, `${path}[${index}]`));
  if (value && typeof value === "object") return Object.entries(value).flatMap(([key, item]) => forbiddenPaths(item, `${path}.${key}`));
  return [];
}

export function buildJairoBusinessProjection({ canonical, lead, entitlement, profile, hashes, destinationExists }) {
  const blockedReasons = [];
  for (const [actual, expected, reason] of [
    [hashes.activationLead, hashes.expectedActivationLead, "ACTIVATION_LEAD_HASH_DRIFT"],
    [hashes.entitlement, hashes.expectedEntitlement, "ENTITLEMENT_HASH_DRIFT"],
    [hashes.businessProfile, hashes.expectedBusinessProfile, "BUSINESS_PROFILE_HASH_DRIFT"],
    [hashes.brandSource, hashes.expectedBrandSource, "BRAND_SOURCE_HASH_DRIFT"],
    [hashes.productSource, hashes.expectedProductSource, "PRODUCT_SOURCE_HASH_DRIFT"],
    [hashes.canonicalTemplate, hashes.expectedCanonicalTemplate, "CANONICAL_TEMPLATE_HASH_DRIFT"]
  ]) if (actual !== expected) blockedReasons.push(reason);
  if (destinationExists) blockedReasons.push("BUSINESS_SOURCE_COLLISION");
  if (canonical?.ecosystemType !== "BUSINESS") blockedReasons.push("CANONICAL_BUSINESS_TEMPLATE_INVALID");
  if (lead?.id !== EXPECTED.activationLeadId || lead?.siteId !== EXPECTED.ownerSiteId) blockedReasons.push("ACTIVATION_LEAD_IDENTITY_INVALID");
  if (lead?.onboardingData?.domain !== EXPECTED.baseDomain) blockedReasons.push("ACTIVATION_LEAD_DOMAIN_INVALID");
  const whatsapp = digits(lead?.onboardingData?.whatsapp || lead?.whatsapp);
  if (whatsapp.length < 10 || whatsapp.length > 15) blockedReasons.push("PARTNER_WHATSAPP_MISSING");
  if (!nonempty(lead?.fullName) || !nonempty(lead?.brandName)) blockedReasons.push("PARTNER_IDENTITY_FIELDS_MISSING");
  if (entitlement?.activationLeadId !== EXPECTED.activationLeadId || entitlement?.commercialState !== "KNOWN") blockedReasons.push("ENTITLEMENT_IDENTITY_INVALID");
  if (!Array.isArray(entitlement?.includedEcosystems) || !entitlement.includedEcosystems.includes("BUSINESS")) blockedReasons.push("BUSINESS_NOT_ENTITLED");
  const expectedBusinessTarget = entitlement?.expectedTargets?.find((target) => target.ecosystemType === "BUSINESS");
  if (expectedBusinessTarget?.role !== "SUBDOMAIN" || expectedBusinessTarget?.publicHost !== EXPECTED.publicHost) blockedReasons.push("BUSINESS_ENTITLEMENT_TARGET_INVALID");
  const missing = missingProfileFields(profile);
  blockedReasons.push(...missing.map((field) => `BUSINESS_DATA_MISSING:${field}`));
  if (profile?.vsl?.provider && !["youtube", "vimeo", "wistia", "custom"].includes(profile.vsl.provider)) blockedReasons.push("BUSINESS_VSL_PROVIDER_INVALID");
  for (const [value, reason] of [[profile?.hero?.desktopBgUrl, "BUSINESS_HERO_DESKTOP_INVALID"], [profile?.hero?.mobileBgUrl, "BUSINESS_HERO_MOBILE_INVALID"],
    [profile?.vsl?.embedUrl, "BUSINESS_VSL_EMBED_INVALID"], [profile?.vsl?.thumbnailUrl, "BUSINESS_VSL_THUMBNAIL_INVALID"],
    [profile?.cta?.directRegisterUrl, "BUSINESS_REGISTRATION_URL_INVALID"]]) if (nonempty(value) && !https(value)) blockedReasons.push(reason);

  let projectedBusiness = null;
  if (canonical && lead && profile && missing.length === 0) {
    projectedBusiness = clone(canonical);
    projectedBusiness.ecosystemType = "BUSINESS";
    projectedBusiness.site = { ...projectedBusiness.site, id: EXPECTED.businessSiteId, appName: EXPECTED.businessSiteId,
      domain: EXPECTED.publicHost, title: profile.siteTitle, ogTitle: profile.ogTitle, ogDescription: profile.ogDescription, metaDescription: profile.metaDescription };
    projectedBusiness.distributor = { ...projectedBusiness.distributor, brandName: lead.brandName, firstName: String(lead.fullName ?? "").trim().split(/\s+/)[0],
      fullName: lead.fullName, role: profile.role, whatsappNumber: whatsapp, phoneNumber: digits(lead.onboardingData?.phone) || whatsapp,
      displayPhone: lead.onboardingData?.phone || lead.onboardingData?.whatsapp || lead.whatsapp, ctaUrl: `https://wa.me/${whatsapp}`, defaultMessage: profile.defaultMessage };
    projectedBusiness.hero = { ...projectedBusiness.hero, ...profile.hero };
    projectedBusiness.vsl = { ...projectedBusiness.vsl, ...profile.vsl, autoPlay: Boolean(profile.vsl?.autoPlay) };
    projectedBusiness.cta = { ...projectedBusiness.cta, ...profile.cta, primaryUrl: profile.cta?.directRegisterUrl,
      secondaryUrl: `https://wa.me/${whatsapp}`, directRegisterText: profile.cta?.primaryText };
    projectedBusiness.socialProof = { enabled: false, avatars: [] };
    projectedBusiness.testimonials = { enabled: false, items: [] };
    projectedBusiness.analytics = lead.onboardingData?.analyticsMeasurementId ? { measurementId: lead.onboardingData.analyticsMeasurementId } : undefined;
    projectedBusiness.integrations = {
      ...(lead.onboardingData?.metaPixelId ? { meta: { pixelId: lead.onboardingData.metaPixelId } } : {}),
      ...(lead.onboardingData?.googleAdsConversionId ? { googleAds: { conversionId: lead.onboardingData.googleAdsConversionId } } : {})
    };
    projectedBusiness.theme = { fontPreset: lead.onboardingData?.fontPreset ?? canonical.theme?.fontPreset ?? "executive",
      palettePreset: lead.onboardingData?.palettePreset ?? canonical.theme?.palettePreset ?? "cobalt-cyan" };
    const placeholders = forbiddenPaths(projectedBusiness);
    blockedReasons.push(...placeholders.map((path) => `PLACEHOLDER_PRESENT:${path}`));
    if (placeholders.length > 0) projectedBusiness = null;
  }
  return {
    mode: "DRY_RUN", changed: false, blocked: blockedReasons.length > 0, blockedReasons: [...new Set(blockedReasons)],
    activationLeadId: EXPECTED.activationLeadId,
    apex: { hostname: EXPECTED.baseDomain, preserved: true, rewritten: false, isPublishingTarget: false },
    projection: { siteId: EXPECTED.businessSiteId, ecosystemType: "BUSINESS", baseDomain: EXPECTED.baseDomain, publicHost: EXPECTED.publicHost,
      source: "CANONICAL_BUSINESS_TEMPLATE_PLUS_AUTHORIZED_PARTNER_INPUT" },
    hashes: { ...hashes, projectedBusiness: projectedBusiness ? sha256(json(projectedBusiness)) : null }, projectedBusiness
  };
}

export async function runJairoBusinessSourceDryRun({ sourceDirectory, canonicalBusinessConfigPath, manifestPath, auditDirectory, now = new Date() }) {
  const manifestFile = await optionalFile(resolve(manifestPath)); if (!manifestFile) throw new Error("Manifest does not exist.");
  const manifest = JSON.parse(manifestFile.source); const entry = validateManifest(manifest); const inputDirectory = dirname(resolve(manifestPath));
  const paths = { activationLead: resolve(inputDirectory, "activation-lead.json"), entitlement: resolve(inputDirectory, "entitlement.json"),
    businessProfile: resolve(inputDirectory, "business-profile.json"), brandSource: resolve(sourceDirectory, `${EXPECTED.ownerSiteId}.json`),
    productSource: resolve(sourceDirectory, `${EXPECTED.productSiteId}.json`), destination: resolve(sourceDirectory, `${EXPECTED.businessSiteId}.json`) };
  const [leadFile, entitlementFile, profileFile, brandFile, productFile, destination, canonicalFile] = await Promise.all([
    optionalFile(paths.activationLead), optionalFile(paths.entitlement), optionalFile(paths.businessProfile), optionalFile(paths.brandSource),
    optionalFile(paths.productSource), optionalFile(paths.destination), optionalFile(resolve(canonicalBusinessConfigPath))
  ]);
  if (!leadFile || !entitlementFile || !profileFile || !brandFile || !productFile || !canonicalFile) throw new Error("Required DRY_RUN input, source, or canonical template is missing.");
  const hashes = { activationLead: leadFile.hash, expectedActivationLead: entry.expectedActivationLeadHash.toLowerCase(), entitlement: entitlementFile.hash,
    expectedEntitlement: entry.expectedEntitlementHash.toLowerCase(), businessProfile: profileFile.hash, expectedBusinessProfile: entry.expectedBusinessProfileHash.toLowerCase(),
    brandSource: brandFile.hash, expectedBrandSource: entry.expectedBrandSourceHash.toLowerCase(), productSource: productFile.hash,
    expectedProductSource: entry.expectedProductSourceHash.toLowerCase(), canonicalTemplate: canonicalFile.hash, expectedCanonicalTemplate: entry.expectedCanonicalTemplateHash.toLowerCase() };
  const plan = buildJairoBusinessProjection({ canonical: parseCanonicalConfig(canonicalFile.source, canonicalBusinessConfigPath),
    lead: JSON.parse(leadFile.source), entitlement: JSON.parse(entitlementFile.source), profile: JSON.parse(profileFile.source), hashes, destinationExists: Boolean(destination) });
  const backupDirectory = resolve(auditDirectory, `${now.toISOString().replaceAll(":", "-")}-jairo-business-source-dry-run`);
  await mkdir(resolve(backupDirectory, "inputs"), { recursive: true }); await mkdir(resolve(backupDirectory, "backup"), { recursive: true });
  const writes = [writeFile(resolve(backupDirectory, "manifest.json"), manifestFile.source), writeFile(resolve(backupDirectory, "inputs", "activation-lead.json"), leadFile.source),
    writeFile(resolve(backupDirectory, "inputs", "entitlement.json"), entitlementFile.source), writeFile(resolve(backupDirectory, "inputs", "business-profile.json"), profileFile.source),
    writeFile(resolve(backupDirectory, "backup", "jairo-pinto.json"), brandFile.source), writeFile(resolve(backupDirectory, "backup", "jairo-pinto-product.json"), productFile.source),
    writeFile(resolve(backupDirectory, "canonical-business-config.js"), canonicalFile.source),
    writeFile(resolve(backupDirectory, "dry-run.json"), json({ ...plan, projectedBusiness: undefined }))];
  if (plan.projectedBusiness) { await mkdir(resolve(backupDirectory, "projected"), { recursive: true }); writes.push(writeFile(resolve(backupDirectory, "projected", `${EXPECTED.businessSiteId}.json`), json(plan.projectedBusiness))); }
  await Promise.all(writes);
  return { ...plan, projectedBusiness: undefined, backupDirectory };
}

async function main() {
  if (process.argv.some((value) => value === "--apply" || value.startsWith("--mode=APPLY"))) throw new Error("APPLY is not implemented.");
  const argument = (name) => process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);
  const manifestPath = argument("manifest"); if (!manifestPath) throw new Error("--manifest=<path> is required.");
  const result = await runJairoBusinessSourceDryRun({ sourceDirectory: process.env.PRODUCT_PAGE_SOURCE_DIR ?? "/data/generated-sites/.sources",
    canonicalBusinessConfigPath: resolveCanonicalBusinessConfigPath(), manifestPath,
    auditDirectory: process.env.PRODUCT_PAGE_MIGRATION_AUDIT_DIR ?? "/data/generated-sites/.migration-audits" });
  process.stdout.write(json(result));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((error) => {
  process.stderr.write(json({ error: error instanceof Error ? error.message : "DRY_RUN failed." })); process.exitCode = 1;
});
