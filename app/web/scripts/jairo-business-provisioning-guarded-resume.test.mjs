import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { planResume, RESUME_CONFIRMATION, RESUME_MODE, runResume } from "./jairo-business-provisioning-guarded-resume.mjs";

const text = (value) => `${JSON.stringify(value, null, 2)}\n`; const sha = (value) => createHash("sha256").update(value).digest("hex");
async function fixture() {
  const root = await mkdtemp(resolve(tmpdir(), "jairo-resume-")); const sources = resolve(root, "sources"); const inputs = resolve(root, "inputs"); const state = resolve(root, "state"); const targets = resolve(sources, ".publishing-targets"); const claim = resolve(state, "claim"); await mkdir(targets, { recursive: true }); await mkdir(inputs); await mkdir(claim, { recursive: true });
  const sourceBytes = text({ site: { id: "jairo-pinto-business", domain: "negocio.jairopinto.pro" }, ecosystemType: "BUSINESS" }); await writeFile(resolve(sources, "jairo-pinto-business.json"), sourceBytes);
  const entitlementBytes = text({ activationLeadId: "f403f29e-95c8-4825-9320-967376443020", commercialState: "KNOWN", includedEcosystems: ["BUSINESS"], expectedTargets: [{ ecosystemType: "BUSINESS", role: "SUBDOMAIN", publicHost: "negocio.jairopinto.pro" }], rootRedirectApex: { preserved: true, isPublishingTarget: false } }); await writeFile(resolve(inputs, "entitlement.json"), entitlementBytes);
  const manifestPath = resolve(inputs, "manifest.json"); await writeFile(manifestPath, text({ confirmation: "PREVIEW_JAIRO_BUSINESS_PROVISIONING", allowlist: [{ ownerKey: "f403f29e-95c8-4825-9320-967376443020", siteId: "jairo-pinto-business", ecosystemType: "BUSINESS", rootEcosystemType: "PERSONAL_BRAND", baseDomain: "jairopinto.pro", publicHost: "negocio.jairopinto.pro", expectedSourceHash: sha(sourceBytes), expectedEntitlementHash: sha(entitlementBytes) }] }));
  const partial = { version: 2, ownerKey: "f403f29e-95c8-4825-9320-967376443020", siteId: "jairo-pinto-business", ecosystemType: "BUSINESS", rootEcosystemType: "PERSONAL_BRAND", baseDomain: "jairopinto.pro", publicHost: "negocio.jairopinto.pro", remoteRoot: "/domains/negocio/public_html", provisioningState: "FAILED", publicationState: "PENDING", hostingerState: "READY", dnsState: "PENDING", sslState: "PENDING" };
  const targetPath = resolve(targets, "jairo-pinto-business.json"); const targetBytes = text(partial); await writeFile(targetPath, targetBytes); const originalPlanHash = "a".repeat(64); await writeFile(resolve(claim, "owner.json"), text({ token: "secret-owner", planHash: originalPlanHash, acquiredAt: "2026-08-25T16:14:08.170Z" }));
  const environment = { HOSTINGER_API_TOKEN: "secret", HOSTINGER_API_USERNAME: "u123", PARTNERHUB_PROVISIONING_IPV4: "82.29.157.103" }; const ready = { ...partial, provisioningState: "READY", dnsState: "RESOLVED", sslState: "READY" };
  return { sourceDirectory: sources, manifestPath, stateDirectory: state, targetPath, environment, originalPlanHash, retainedTargetHash: sha(targetBytes), state, ready };
}
async function present(path) { try { await access(path); return true; } catch (error) { if (error.code === "ENOENT") return false; throw error; } }

test("PREVIEW binds retained target and claim without provider calls or writes", async () => { const fx = await fixture(); const preview = await planResume(fx); assert.equal(preview.blocked, false); assert.equal(preview.changed, false); assert.equal(preview.safety.providerCallsMade, false); assert.equal(preview.claim.ownerTokenRedacted, true); });

test("RESUME requires confirmation and plan hash, then journals READY and removes only its claim", async () => { const fx = await fixture(); let calls = 0; const provisioner = async () => { calls += 1; await writeFile(fx.targetPath, text(fx.ready)); }; const preview = await planResume(fx);
  await assert.rejects(() => runResume({ ...fx, mode: RESUME_MODE, expectedPlanHash: preview.planHash, provisioner }), /RESUME_REQUIRES_CONFIRMATION/); assert.equal(calls, 0);
  await assert.rejects(() => runResume({ ...fx, mode: RESUME_MODE, confirmation: RESUME_CONFIRMATION, expectedPlanHash: "b".repeat(64), provisioner }), /RESUME_PLAN_HASH_MISMATCH/); assert.equal(calls, 0);
  const result = await runResume({ ...fx, mode: RESUME_MODE, confirmation: RESUME_CONFIRMATION, expectedPlanHash: preview.planHash, provisioner }); assert.equal(result.outcome, "APPLIED"); assert.equal(calls, 1); assert.equal(await present(resolve(fx.state, "claim")), false); assert.equal(JSON.parse(await readFile(resolve(fx.state, "apply.json"))).recoveryPlanHash, preview.planHash);
});
