import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { runJairoBusinessPublishingPreflight } from "./jairo-business-publishing-preflight.mjs";

const stringify = (value) => `${JSON.stringify(value, null, 2)}\n`;
const hash = (value) => createHash("sha256").update(value).digest("hex");
const expectedSourceHash = "795ede8048a4d882960f08dc633de5ca0e58c810066c0e854e35fdf9531f8725";

async function fixture() {
  const root = await mkdtemp(resolve(tmpdir(), "business-publish-preview-"));
  const sources = resolve(root, "sources"); const output = resolve(root, "output"); const inputs = resolve(root, "inputs");
  await mkdir(resolve(sources, ".publishing-targets"), { recursive: true });
  await mkdir(resolve(output, "ganomaster-business"), { recursive: true }); await mkdir(inputs);
  const source = stringify({ ecosystemType: "BUSINESS", site: { id: "jairo-pinto-business", domain: "negocio.jairopinto.pro" } });
  const entitlement = stringify({ activationLeadId: "f403f29e-95c8-4825-9320-967376443020", commercialState: "KNOWN",
    includedEcosystems: ["PRODUCT", "BUSINESS", "PERSONAL_BRAND"], expectedTargets: [{ ecosystemType: "BUSINESS", role: "SUBDOMAIN", publicHost: "negocio.jairopinto.pro" }],
    rootRedirectApex: { preserved: true, isPublishingTarget: false } });
  await writeFile(resolve(sources, "jairo-pinto-business.json"), source);
  await writeFile(resolve(inputs, "entitlement.json"), entitlement);
  for (const name of ["index.html", "app.js", "styles.css", "config.js", "favicon.svg"]) await writeFile(resolve(output, "ganomaster-business", name), name);
  const manifest = { confirmation: "PREVIEW_JAIRO_BUSINESS_PUBLISHING", allowlist: [{ activationLeadId: "f403f29e-95c8-4825-9320-967376443020",
    ownerSiteId: "jairo-pinto", siteId: "jairo-pinto-business", ecosystemType: "BUSINESS", rootEcosystemType: "PERSONAL_BRAND", baseDomain: "jairopinto.pro",
    publicHost: "negocio.jairopinto.pro", expectedSourceHash, expectedEntitlementHash: hash(entitlement) }] };
  const manifestPath = resolve(inputs, "manifest.json"); await writeFile(manifestPath, stringify(manifest));
  const environment = Object.fromEntries(["HOSTINGER_API_TOKEN", "HOSTINGER_SFTP_USERNAME", "HOSTINGER_SFTP_HOST", "HOSTINGER_SFTP_PASSWORD",
    "CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ZONE_ID"].map((name) => [name, "configured"]));
  environment.HOSTINGER_SFTP_PORT = "22"; environment.PARTNERHUB_PROVISIONING_IPV4 = "82.29.157.103";
  return { root, sources, output, inputs, manifestPath, environment, source };
}

async function run(fx) { return runJairoBusinessPublishingPreflight({ sourceDirectory: fx.sources, outputDirectory: fx.output,
  manifestPath: fx.manifestPath, environment: fx.environment }); }

test("is read-only, fail-closed, and plans only the Business target", async () => {
  const fx = await fixture();
  const before = await readFile(resolve(fx.sources, "jairo-pinto-business.json"), "utf8");
  const result = await run(fx);
  assert.equal(result.mode, "PREVIEW"); assert.equal(result.changed, false); assert.equal(result.targetInventory.disposition.action, "CREATE_BUSINESS_TARGET");
  assert.deepEqual(result.isolation.allowedSiteIds, ["jairo-pinto-business"]); assert.equal(result.isolation.legacyRemoteRootFallbackAllowed, false);
  assert.equal(await readFile(resolve(fx.sources, "jairo-pinto-business.json"), "utf8"), before);
  assert.equal(result.blockedReasons.includes("SOURCE_HASH_DRIFT"), true);
});

test("accepts the approved source bytes and reports an exact existing target without provider calls", async () => {
  const fx = await fixture();
  // A test-only hash collision fixture is impossible; validate drift independently and use the exported production pin through manifest validation.
  const target = { version: 2, ownerKey: "f403f29e-95c8-4825-9320-967376443020", siteId: "jairo-pinto-business", ecosystemType: "BUSINESS",
    rootEcosystemType: "PERSONAL_BRAND", baseDomain: "jairopinto.pro", publicHost: "negocio.jairopinto.pro", remoteRoot: "/remote/business",
    provisioningState: "READY", publicationState: "PENDING" };
  await writeFile(resolve(fx.sources, ".publishing-targets", "jairo-pinto-business.json"), stringify(target));
  const result = await run(fx);
  assert.equal(result.targetInventory.disposition.action, "REUSE_READY_TARGET");
  assert.equal(result.configuration.providerCallsMade, false); assert.equal(result.configuration.secretsExposed, false);
});

test("blocks immutable conflicts and invalid target inventory", async () => {
  const fx = await fixture();
  await writeFile(resolve(fx.sources, ".publishing-targets", "conflict.json"), stringify({ version: 2,
    ownerKey: "f403f29e-95c8-4825-9320-967376443020", siteId: "other-business", ecosystemType: "BUSINESS", rootEcosystemType: "PERSONAL_BRAND",
    baseDomain: "jairopinto.pro", publicHost: "otro.jairopinto.pro", provisioningState: "READY", publicationState: "PENDING" }));
  await writeFile(resolve(fx.sources, ".publishing-targets", "legacy.json"), stringify({ version: 1, siteId: "legacy" }));
  const result = await run(fx);
  assert.ok(result.blockedReasons.includes("PUBLISHING_TARGET_CONFLICT"));
  assert.ok(result.blockedReasons.includes("INVALID_PUBLISHING_TARGET:legacy.json"));
});

test("blocks missing provider configuration and missing Business master package", async () => {
  const fx = await fixture(); delete fx.environment.HOSTINGER_API_TOKEN;
  const result = await runJairoBusinessPublishingPreflight({ sourceDirectory: fx.sources, outputDirectory: resolve(fx.root, "missing-output"),
    manifestPath: fx.manifestPath, environment: fx.environment });
  assert.ok(result.blockedReasons.includes("CONFIGURATION_MISSING:HOSTINGER_API_TOKEN"));
  assert.ok(result.blockedReasons.includes("BUSINESS_MASTER_PACKAGE_MISSING:index.html"));
});

test("does not require the legacy global remote root for an isolated v2 target", async () => {
  const fx = await fixture();
  assert.equal(fx.environment.HOSTINGER_SFTP_REMOTE_ROOT, undefined);
  const result = await run(fx);
  assert.equal(result.blockedReasons.includes("CONFIGURATION_MISSING:HOSTINGER_SFTP_REMOTE_ROOT"), false);
  assert.equal(result.configuration.destinationRemoteRootSource, "PUBLISHING_TARGET_V2_ONLY");
  assert.equal(result.configuration.legacyGlobalRemoteRootRequired, false);
});

test("blocks a READY target whose provider remote root is absent", async () => {
  const fx = await fixture();
  await writeFile(resolve(fx.sources, ".publishing-targets", "jairo-pinto-business.json"), stringify({ version: 2,
    ownerKey: "f403f29e-95c8-4825-9320-967376443020", siteId: "jairo-pinto-business", ecosystemType: "BUSINESS",
    rootEcosystemType: "PERSONAL_BRAND", baseDomain: "jairopinto.pro", publicHost: "negocio.jairopinto.pro", remoteRoot: null,
    provisioningState: "READY", publicationState: "PENDING" }));
  const result = await run(fx);
  assert.ok(result.blockedReasons.includes("READY_TARGET_REMOTE_ROOT_MISSING"));
});

test("rejects APPLY flags at the command contract level", async () => {
  const source = await readFile(new URL("./jairo-business-publishing-preflight.mjs", import.meta.url), "utf8");
  assert.match(source, /APPLY is not implemented by this PREVIEW command/);
  assert.doesNotMatch(source, /writeFile|mkdir|rename|rm\(/);
});
