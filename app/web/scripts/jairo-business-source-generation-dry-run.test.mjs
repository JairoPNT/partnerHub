import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import process from "node:process";
import test from "node:test";
import { resolveCanonicalBusinessConfigPath, runJairoBusinessSourceDryRun } from "./jairo-business-source-generation-dry-run.mjs";

const hash = (value) => createHash("sha256").update(value).digest("hex");
const stringify = (value) => `${JSON.stringify(value, null, 2)}\n`;

async function fixture() {
  const root = await mkdtemp(resolve(tmpdir(), "jairo-business-dry-run-")); const sources = resolve(root, "sources");
  const inputs = resolve(root, "inputs"); const audits = resolve(root, "audits"); await mkdir(sources); await mkdir(inputs);
  const canonicalPath = resolve(root, "business-config.js");
  const canonical = { ecosystemType: "BUSINESS", site: { id: "ganomaster-business" }, distributor: { brandName: "Nexus Team", whatsappNumber: "573000000000" },
    hero: {}, vsl: { embedUrl: "https://youtube.com/embed/dQw4w9WgXcQ" }, socialProof: { enabled: true, avatars: ["placeholder"] },
    testimonials: { enabled: true, items: [{ name: "Diana Ramos" }] }, cta: {}, theme: { fontPreset: "executive", palettePreset: "cobalt-cyan" }, benefits: [{ id: "b1", title: "Real canonical copy", description: "Approved generic content" }] };
  const lead = { id: "f403f29e-95c8-4825-9320-967376443020", siteId: "jairo-pinto", fullName: "Jairo Pinto", brandName: "Equipo Jairo Pinto", whatsapp: "+57 310 555 1111",
    onboardingData: { domain: "jairopinto.pro", whatsapp: "+57 310 555 1111", phone: "+57 310 555 1111", analyticsMeasurementId: "G-REAL123", fontPreset: "executive", palettePreset: "cobalt-cyan" } };
  const entitlement = { activationLeadId: lead.id, commercialState: "KNOWN", includedEcosystems: ["PRODUCT", "BUSINESS", "PERSONAL_BRAND"],
    expectedTargets: [{ ecosystemType: "BUSINESS", role: "SUBDOMAIN", publicHost: "negocio.jairopinto.pro" }] };
  const profile = { role: "Líder de Negocio", siteTitle: "Negocio con Jairo Pinto", ogTitle: "Conoce el negocio de Jairo", ogDescription: "Presentación autorizada del modelo.",
    metaDescription: "Información autorizada para conocer el negocio.", defaultMessage: "Hola Jairo, quiero conocer tu proyecto de negocio.",
    hero: { badge: "Presentación de negocio", headline: "Construye un proyecto acompañado", subheadline: "Conoce el sistema y evalúa si es para ti.",
      desktopBgUrl: "https://cdn.example/jairo/business-desktop.webp", mobileBgUrl: "https://cdn.example/jairo/business-mobile.webp" },
    vsl: { provider: "youtube", embedUrl: "https://www.youtube-nocookie.com/embed/real-jairo-video", videoTitle: "Presentación de Jairo Pinto",
      thumbnailUrl: "https://cdn.example/jairo/business-vsl.webp", durationText: "Ver presentación", autoPlay: false },
    cta: { primaryText: "Quiero conocer el negocio", directRegisterUrl: "https://example.com/jairo/registro", secondaryText: "Hablar con Jairo", guaranteeText: "Información sin compromiso." } };
  const brand = stringify({ ecosystemType: "PERSONAL_BRAND", site: { id: "jairo-pinto" } });
  const product = stringify({ ecosystemType: "PRODUCT", site: { id: "jairo-pinto-product" } });
  const sourcesByName = { "activation-lead.json": stringify(lead), "entitlement.json": stringify(entitlement), "business-profile.json": stringify(profile) };
  for (const [name, source] of Object.entries(sourcesByName)) await writeFile(resolve(inputs, name), source);
  await writeFile(resolve(sources, "jairo-pinto.json"), brand); await writeFile(resolve(sources, "jairo-pinto-product.json"), product);
  const canonicalSource = `const CONFIG = ${JSON.stringify(canonical)};\n`; await writeFile(canonicalPath, canonicalSource);
  const entry = { activationLeadId: lead.id, ownerSiteId: "jairo-pinto", productSiteId: "jairo-pinto-product", businessSiteId: "jairo-pinto-business",
    ecosystemType: "BUSINESS", baseDomain: "jairopinto.pro", publicHost: "negocio.jairopinto.pro", expectedActivationLeadHash: hash(sourcesByName["activation-lead.json"]),
    expectedEntitlementHash: hash(sourcesByName["entitlement.json"]), expectedBusinessProfileHash: hash(sourcesByName["business-profile.json"]),
    expectedBrandSourceHash: hash(brand), expectedProductSourceHash: hash(product), expectedCanonicalTemplateHash: hash(canonicalSource) };
  const manifestPath = resolve(inputs, "manifest.json"); await writeFile(manifestPath, stringify({ confirmation: "DRY_RUN_JAIRO_BUSINESS_SOURCE", allowlist: [entry] }));
  return { root, sources, inputs, audits, canonicalPath, manifestPath, entry, lead, entitlement, profile, brand, product };
}

async function run(fx) { return runJairoBusinessSourceDryRun({ sourceDirectory: fx.sources, canonicalBusinessConfigPath: fx.canonicalPath,
  manifestPath: fx.manifestPath, auditDirectory: fx.audits, now: new Date("2026-08-21T18:00:00.000Z") }); }

test("uses the packaged runtime Business config path", () => {
  assert.equal(resolveCanonicalBusinessConfigPath({}), resolve("/app/runtime-assets/business-config.js"));
});

test("projects canonical Business identity from entitled real partner inputs without placeholders", async () => {
  const fx = await fixture(); const result = await run(fx);
  assert.equal(result.mode, "DRY_RUN"); assert.equal(result.changed, false); assert.equal(result.blocked, false);
  assert.deepEqual(result.apex, { hostname: "jairopinto.pro", preserved: true, rewritten: false, isPublishingTarget: false });
  const projected = JSON.parse(await readFile(resolve(result.backupDirectory, "projected", "jairo-pinto-business.json"), "utf8"));
  assert.equal(projected.site.id, "jairo-pinto-business"); assert.equal(projected.site.domain, "negocio.jairopinto.pro"); assert.equal(projected.ecosystemType, "BUSINESS");
  assert.equal(projected.distributor.fullName, "Jairo Pinto"); assert.equal(projected.vsl.embedUrl, fx.profile.vsl.embedUrl);
  assert.equal(projected.socialProof.enabled, false); assert.deepEqual(projected.testimonials.items, []);
  assert.doesNotMatch(JSON.stringify(projected), /dQw4w9WgXcQ|573000000000|Nexus Team|Diana Ramos|ganomaster-business/);
  assert.equal(await readFile(resolve(fx.sources, "jairo-pinto.json"), "utf8"), fx.brand);
  assert.equal(await readFile(resolve(fx.sources, "jairo-pinto-product.json"), "utf8"), fx.product);
  await assert.rejects(readFile(resolve(fx.sources, "jairo-pinto-business.json")), /ENOENT/);
});

test("the repository canonical Business artifact produces a placeholder-free partner projection", async () => {
  const fx = await fixture(); const canonicalSource = await readFile(resolve(process.cwd(), "../../plantillas-de-pagina/business/config.js"), "utf8");
  await writeFile(fx.canonicalPath, canonicalSource); fx.entry.expectedCanonicalTemplateHash = hash(canonicalSource);
  await writeFile(fx.manifestPath, stringify({ confirmation: "DRY_RUN_JAIRO_BUSINESS_SOURCE", allowlist: [fx.entry] }));
  const result = await run(fx); assert.equal(result.blocked, false);
  const projected = await readFile(resolve(result.backupDirectory, "projected", "jairo-pinto-business.json"), "utf8");
  assert.doesNotMatch(projected, /dQw4w9WgXcQ|573000000000|Nexus Team|Diana Ramos|Carlos Mendoza|GrupoMomentumStarter|ganomaster-business/);
});

test("blocks when the current entitlement does not include BUSINESS", async () => {
  const fx = await fixture(); const source = stringify({ ...fx.entitlement, includedEcosystems: ["PRODUCT", "PERSONAL_BRAND"] });
  await writeFile(resolve(fx.inputs, "entitlement.json"), source); fx.entry.expectedEntitlementHash = hash(source);
  await writeFile(fx.manifestPath, stringify({ confirmation: "DRY_RUN_JAIRO_BUSINESS_SOURCE", allowlist: [fx.entry] }));
  const result = await run(fx); assert.ok(result.blockedReasons.includes("BUSINESS_NOT_ENTITLED"));
});

test("blocks missing authorized fields and does not emit an incomplete projection", async () => {
  const fx = await fixture(); const profile = clone(fx.profile); delete profile.vsl.embedUrl; const source = stringify(profile);
  await writeFile(resolve(fx.inputs, "business-profile.json"), source); fx.entry.expectedBusinessProfileHash = hash(source);
  await writeFile(fx.manifestPath, stringify({ confirmation: "DRY_RUN_JAIRO_BUSINESS_SOURCE", allowlist: [fx.entry] }));
  const result = await run(fx); assert.ok(result.blockedReasons.includes("BUSINESS_DATA_MISSING:vsl.embedUrl")); assert.equal(result.hashes.projectedBusiness, null);
  await assert.rejects(readFile(resolve(result.backupDirectory, "projected", "jairo-pinto-business.json")), /ENOENT/);
});

test("blocks placeholder input, destination collision and hash drift", async () => {
  const fx = await fixture(); fx.profile.vsl.embedUrl = "https://youtube.com/embed/dQw4w9WgXcQ"; const source = stringify(fx.profile);
  await writeFile(resolve(fx.inputs, "business-profile.json"), source); fx.entry.expectedBusinessProfileHash = hash(source);
  fx.entry.expectedProductSourceHash = "0".repeat(64); await writeFile(resolve(fx.sources, "jairo-pinto-business.json"), "collision");
  await writeFile(fx.manifestPath, stringify({ confirmation: "DRY_RUN_JAIRO_BUSINESS_SOURCE", allowlist: [fx.entry] }));
  const result = await run(fx); assert.ok(result.blockedReasons.includes("PRODUCT_SOURCE_HASH_DRIFT"));
  assert.ok(result.blockedReasons.includes("BUSINESS_SOURCE_COLLISION")); assert.ok(result.blockedReasons.some((reason) => reason.startsWith("PLACEHOLDER_PRESENT:")));
  assert.equal(result.hashes.projectedBusiness, null);
});

function clone(value) { return JSON.parse(JSON.stringify(value)); }
