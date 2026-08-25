import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { APPLY_CONFIRMATION, APPLY_MODE, createInProcessProvisioner, planJairoBusinessProvisioning, runJairoBusinessProvisioning } from "./jairo-business-guarded-provisioning.mjs";

const text = (value) => `${JSON.stringify(value, null, 2)}\n`; const sha = (value) => createHash("sha256").update(value).digest("hex");
const sourceText = text({ site: { id: "jairo-pinto-business", domain: "negocio.jairopinto.pro" }, ecosystemType: "BUSINESS" });
async function fixture() {
  const root = await mkdtemp(resolve(tmpdir(), "jairo-business-provisioning-")); const sources = resolve(root, "sources"); const inputs = resolve(root, "inputs"); const state = resolve(root, "state");
  await mkdir(resolve(sources, ".publishing-targets"), { recursive: true }); await mkdir(inputs);
  await writeFile(resolve(sources, "jairo-pinto-business.json"), sourceText);
  const entitlement = { activationLeadId: "f403f29e-95c8-4825-9320-967376443020", commercialState: "KNOWN", includedEcosystems: ["PRODUCT", "BUSINESS", "PERSONAL_BRAND"],
    expectedTargets: [{ ecosystemType: "BUSINESS", role: "SUBDOMAIN", publicHost: "negocio.jairopinto.pro" }], rootRedirectApex: { preserved: true, isPublishingTarget: false } };
  const entitlementText = text(entitlement); await writeFile(resolve(inputs, "entitlement.json"), entitlementText);
  const manifest = { confirmation: "PREVIEW_JAIRO_BUSINESS_PROVISIONING", allowlist: [{ ownerKey: entitlement.activationLeadId, siteId: "jairo-pinto-business", ecosystemType: "BUSINESS",
    rootEcosystemType: "PERSONAL_BRAND", baseDomain: "jairopinto.pro", publicHost: "negocio.jairopinto.pro", expectedSourceHash: sha(sourceText), expectedEntitlementHash: sha(entitlementText) }] };
  const manifestPath = resolve(inputs, "manifest.json"); await writeFile(manifestPath, text(manifest));
  const environment = { HOSTINGER_API_TOKEN: "secret", HOSTINGER_API_USERNAME: "u123", PARTNERHUB_PROVISIONING_IPV4: "82.29.157.103", CLOUDFLARE_API_TOKEN: "secret", CLOUDFLARE_ZONE_ID: "zone" };
  let calls = 0; const targetPath = resolve(sources, ".publishing-targets", "jairo-pinto-business.json");
  const ready = () => ({ version: 2, ownerKey: entitlement.activationLeadId, siteId: "jairo-pinto-business", ecosystemType: "BUSINESS", rootEcosystemType: "PERSONAL_BRAND", baseDomain: "jairopinto.pro",
    publicHost: "negocio.jairopinto.pro", remoteRoot: "/domains/jairopinto.pro/public_html/negocio", provisioningState: "READY", hostingerState: "READY", dnsState: "RESOLVED", sslState: "READY",
    publicationState: "PENDING", createdAt: "2026-08-24T00:00:00.000Z", updatedAt: "2026-08-24T00:01:00.000Z" });
  const provisioner = async () => { calls += 1; await writeFile(targetPath, text(ready())); return ready(); };
  return { root, sources, inputs, state, manifestPath, environment, targetPath, ready, provisioner, calls: () => calls };
}
const options = (fx, extra = {}) => ({ sourceDirectory: fx.sources, manifestPath: fx.manifestPath, stateDirectory: fx.state, environment: fx.environment, provisioner: fx.provisioner, ...extra });
async function apply(fx, extra = {}) { const preview = await planJairoBusinessProvisioning(options(fx)); return runJairoBusinessProvisioning(options(fx, { mode: APPLY_MODE, confirmation: APPLY_CONFIRMATION, expectedPlanHash: preview.planHash, ...extra })); }

test("PREVIEW validates source and entitlement without provider calls or writes", async () => { const fx = await fixture(); const result = await planJairoBusinessProvisioning(options(fx));
  assert.equal(result.blocked, false); assert.equal(result.changed, false); assert.equal(result.safety.providerCallsMade, false); assert.equal(fx.calls(), 0); });
test("PREVIEW returns its plan when APPLY configuration is absent", async () => { const fx = await fixture(); const result = await planJairoBusinessProvisioning(options(fx, { environment: {} }));
  assert.equal(result.blocked, false); assert.equal(result.applyReadiness.ready, false); assert.deepEqual(result.applyReadiness.missing.sort(), ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ZONE_ID", "HOSTINGER_API_TOKEN",
    "HOSTINGER_API_USERNAME_OR_HOSTINGER_SFTP_USERNAME", "PARTNERHUB_PROVISIONING_IPV4"].sort()); assert.equal(fx.calls(), 0); });
test("APPLY rejects missing or invalid configuration before claim and provider", async () => { const fx = await fixture(); const environment = { PARTNERHUB_PROVISIONING_IPV4: "not-an-ip" };
  const preview = await planJairoBusinessProvisioning(options(fx, { environment })); assert.equal(preview.blocked, false);
  await assert.rejects(() => runJairoBusinessProvisioning(options(fx, { environment, mode: APPLY_MODE, confirmation: APPLY_CONFIRMATION, expectedPlanHash: preview.planHash })), /APPLY_CONFIGURATION_NOT_READY/);
  assert.equal(fx.calls(), 0); await assert.rejects(() => readFile(resolve(fx.state, "claim", "owner.json")), /ENOENT/); });
test("PREVIEW blocks source drift, entitlement drift and immutable target conflicts", async () => { const fx = await fixture(); await writeFile(resolve(fx.sources, "jairo-pinto-business.json"), `${sourceText} `);
  assert.ok((await planJairoBusinessProvisioning(options(fx))).blockedReasons.includes("SOURCE_HASH_DRIFT")); const fx2 = await fixture(); await writeFile(fx2.targetPath, text({ ...fx2.ready(), siteId: "foreign" }));
  assert.ok((await planJairoBusinessProvisioning(options(fx2))).blockedReasons.includes("PUBLISHING_TARGET_CONFLICT")); });
test("APPLY requires exact confirmation and reviewed plan hash", async () => { const fx = await fixture(); const preview = await planJairoBusinessProvisioning(options(fx));
  await assert.rejects(() => runJairoBusinessProvisioning(options(fx, { mode: APPLY_MODE, expectedPlanHash: preview.planHash })), /APPLY_REQUIRES_CONFIRMATION/);
  await assert.rejects(() => runJairoBusinessProvisioning(options(fx, { mode: APPLY_MODE, confirmation: APPLY_CONFIRMATION, expectedPlanHash: "0".repeat(64) })), /PLAN_HASH_MISMATCH/); assert.equal(fx.calls(), 0); });
test("target creation after PREVIEW changes planHash and blocks APPLY", async () => { const fx = await fixture(); const preview = await planJairoBusinessProvisioning(options(fx));
  await writeFile(fx.targetPath, text({ ...fx.ready(), provisioningState: "DNS_PENDING", dnsState: "CREATED", sslState: "PENDING", remoteRoot: "/domains/jairopinto.pro/public_html/negocio" }));
  await assert.rejects(() => runJairoBusinessProvisioning(options(fx, { mode: APPLY_MODE, confirmation: APPLY_CONFIRMATION, expectedPlanHash: preview.planHash })), /PLAN_HASH_MISMATCH/); assert.equal(fx.calls(), 0); });
test("successful supported provisioning journals READY/PENDING and reruns idempotently", async () => { const fx = await fixture(); const preview = await planJairoBusinessProvisioning(options(fx));
  const guarded = options(fx, { mode: APPLY_MODE, confirmation: APPLY_CONFIRMATION, expectedPlanHash: preview.planHash }); const first = await runJairoBusinessProvisioning(guarded);
  assert.equal(first.outcome, "APPLIED"); assert.equal(first.target.publicationState, "PENDING"); const second = await runJairoBusinessProvisioning(guarded);
  assert.equal(second.outcome, "ALREADY_APPLIED"); assert.equal(second.changed, false); assert.equal(fx.calls(), 1); });
test("concurrent process is blocked by the exclusive claim", async () => { const fx = await fixture(); let release; const paused = new Promise((resolvePromise) => { release = resolvePromise; }); let signalEntered;
  const entered = new Promise((resolvePromise) => { signalEntered = resolvePromise; });
  const first = apply(fx, { hooks: { beforeProvider: async () => { signalEntered(); await paused; } } }); await entered;
  await assert.rejects(() => apply(fx), /PROVISIONING_CLAIM_PRESENT/); release(); await first; assert.equal(fx.calls(), 1); });
test("ownership loss before provider makes no provider mutation", async () => { const fx = await fixture(); await assert.rejects(() => apply(fx, { hooks: { beforeProvider: async ({ claimPath }) => {
  await writeFile(resolve(claimPath, "owner.json"), text({ token: "foreign" })); } } }), /PROVISIONING_CLAIM_OWNERSHIP_LOST/); assert.equal(fx.calls(), 0); });
test("provider-started incomplete state is retained fail-closed for audited resume", async () => { const fx = await fixture(); fx.provisioner = async () => { await writeFile(fx.targetPath, text({ ...fx.ready(), remoteRoot: null, provisioningState: "FAILED", hostingerState: "PENDING", dnsState: "PENDING", sslState: "PENDING" })); throw new Error("PROVIDER_FAILED"); };
  await assert.rejects(() => apply(fx), (error) => error.message === "PROVIDER_FAILED" && error.providerStarted === true && error.recovery.includes("RETAIN_CLAIM")); assert.equal(JSON.parse(await readFile(fx.targetPath)).provisioningState, "FAILED"); });

test("in-process adapter loads the compiled runtime and returns its target", async () => {
  const calls = [];
  const expected = { siteId: "jairo-pinto-business", provisioningState: "READY" };
  const provision = createInProcessProvisioner(
    { PARTNERHUB_IN_PROCESS_PROVISIONER_PATH: "/app/runtime-assets/provisioner.mjs" },
    async (url) => ({ provisionJairoBusinessInProcess: async (body, environment) => { calls.push({ url, body, environment }); return expected; } })
  );
  assert.equal(await provision({ siteId: "jairo-pinto-business" }), expected);
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /provisioner\.mjs$/);
});

test("in-process adapter rejects a runtime without the required export", async () => {
  const provision = createInProcessProvisioner({}, async () => ({}));
  await assert.rejects(() => provision({}), /IN_PROCESS_PROVISIONER_EXPORT_INVALID/);
});
