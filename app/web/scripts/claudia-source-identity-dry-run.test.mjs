import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import { buildSourceIdentityPlan, resolveCanonicalBrandConfigPath, runSourceIdentityDryRun } from "./claudia-source-identity-dry-run.mjs";

const source = { ecosystemType: "PRODUCT", site: { id: "claudia-calero", appName: "claudia_calero", domain: "claudiacalero.pro", title: "Claudia" }, distributor: { fullName: "Claudia Calero" } };
const canonicalBrand = { ecosystemType: "PERSONAL_BRAND", site: { id: "ganomaster-personal-brand", appName: "ganomaster-personal-brand", title: "Brand" }, profile: { fullName: "Nombre del Profesional" } };
const sourceText = `${JSON.stringify(source, null, 2)}\n`;
const sourceHash = createHash("sha256").update(sourceText).digest("hex");
const manifestEntry = { expectedSourceHash: sourceHash };

test("projects separated Product and Brand identities without changing the apex", () => {
  const plan = buildSourceIdentityPlan({ source, canonicalBrand, manifestEntry, sourceHash, dependentHashes: { verification: "v", history: "h" }, productDestinationExists: false });
  assert.equal(plan.changed, false);
  assert.equal(plan.blocked, false);
  assert.equal(plan.projectedProduct.site.id, "claudia-calero-product");
  assert.equal(plan.projectedProduct.ecosystemType, "PRODUCT");
  assert.equal(plan.projectedBrand.site.id, "claudia-calero");
  assert.equal(plan.projectedBrand.ecosystemType, "PERSONAL_BRAND");
  assert.equal(plan.projectedBrand.profile.fullName, "Nombre del Profesional");
  assert.deepEqual(plan.apex, { hostname: "claudiacalero.pro", preserved: true, rewritten: false });
});

test("blocks hash drift, invalid source identity and an existing Product destination", () => {
  const plan = buildSourceIdentityPlan({ source: { ...source, ecosystemType: "BUSINESS" }, canonicalBrand, manifestEntry, sourceHash: "0".repeat(64), dependentHashes: {}, productDestinationExists: true });
  assert.deepEqual(plan.blockedReasons, ["SOURCE_HASH_MISMATCH", "SOURCE_IDENTITY_NOT_PRODUCT", "PRODUCT_DESTINATION_ALREADY_EXISTS"]);
});

test("resolves the packaged runtime artifact without a development templates directory", () => {
  assert.equal(resolveCanonicalBrandConfigPath({}), resolve("/app/runtime-assets/personal-brand-config.js"));
  assert.equal(
    resolveCanonicalBrandConfigPath({ PRODUCT_PAGE_BRAND_TEMPLATE_CONFIG: "/runtime/canonical-brand.js" }),
    resolve("/runtime/canonical-brand.js")
  );
});

test("DRY_RUN writes backups and projections only under the audit directory", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "claudia-source-dry-run-"));
  const sources = resolve(root, "sources");
  const runtimeAssets = resolve(root, "runtime-assets");
  const audits = resolve(root, "audits");
  await mkdir(resolve(sources, ".verifications"), { recursive: true });
  await mkdir(resolve(sources, ".history"), { recursive: true });
  await mkdir(runtimeAssets, { recursive: true });
  await writeFile(resolve(sources, "claudia-calero.json"), sourceText);
  await writeFile(resolve(sources, ".verifications", "claudia-calero.json"), "{\"status\":\"VERIFIED\"}\n");
  await writeFile(resolve(sources, ".history", "claudia-calero.json"), "{\"entries\":[]}\n");
  await writeFile(resolve(runtimeAssets, "personal-brand-config.js"), `const CONFIG = ${JSON.stringify(canonicalBrand)};`);
  const manifest = { confirmation: "DRY_RUN_CLAUDIA_SOURCE_IDENTITY", allowlist: [{ sourceSiteId: "claudia-calero", productSiteId: "claudia-calero-product", brandSiteId: "claudia-calero", baseDomain: "claudiacalero.pro", expectedSourceHash: sourceHash }] };
  const manifestPath = resolve(root, "manifest.json");
  await writeFile(manifestPath, JSON.stringify(manifest));
  const result = await runSourceIdentityDryRun({ sourceDirectory: sources, canonicalBrandConfigPath: resolve(runtimeAssets, "personal-brand-config.js"), manifestPath, auditDirectory: audits, now: new Date("2026-08-20T21:00:00Z") });
  assert.equal(result.changed, false);
  assert.equal(await readFile(resolve(sources, "claudia-calero.json"), "utf8"), sourceText);
  assert.equal(JSON.parse(await readFile(resolve(result.backupDirectory, "projected", "claudia-calero-product.json"), "utf8")).site.id, "claudia-calero-product");
  assert.equal(JSON.parse(await readFile(resolve(result.backupDirectory, "projected", "claudia-calero.json"), "utf8")).ecosystemType, "PERSONAL_BRAND");
  assert.ok(result.hashes.verification);
  assert.ok(result.hashes.history);
});
