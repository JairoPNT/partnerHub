import { createHash, randomUUID } from "node:crypto";
import { access, readFile, rename, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

import { createInProcessProvisioner, planJairoBusinessProvisioning } from "./jairo-business-guarded-provisioning.mjs";

export const RESUME_MODE = "RESUME_JAIRO_BUSINESS_PROVISIONING";
export const RESUME_CONFIRMATION = "RESUME_RETAINED_JAIRO_BUSINESS_TARGET";
const ORIGINAL_PLAN_HASH = "7c3c7447792130c8380c5c4c1587b90418e6f609b17db642be8a8103dd78eccf";
const RETAINED_TARGET_HASH = "0300146188f6f6711a1314e3f1a64d54e4584c813e71a1e9f83e08f30a712eca";
const SOURCE_DIRECTORY = "/data/generated-sites/.sources";
const MANIFEST_PATH = "/data/generated-sites/.provisioning-inputs/CDX-20260824-007/manifest.json";
const STATE_DIRECTORY = "/data/generated-sites/.provisioning-audits/CDX-20260824-007";
const TARGET_PATH = `${SOURCE_DIRECTORY}/.publishing-targets/jairo-pinto-business.json`;
const sha = (value) => createHash("sha256").update(value).digest("hex");
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
async function exists(path) { try { await access(path); return true; } catch (error) { if (error.code === "ENOENT") return false; throw error; } }
function finalTarget(value) { return value?.version === 2 && value.ownerKey === "f403f29e-95c8-4825-9320-967376443020" && value.siteId === "jairo-pinto-business" && value.ecosystemType === "BUSINESS" && value.baseDomain === "jairopinto.pro" && value.publicHost === "negocio.jairopinto.pro" && value.provisioningState === "READY" && value.publicationState === "PENDING" && value.hostingerState === "READY" && value.dnsState === "RESOLVED" && value.sslState === "READY" && typeof value.remoteRoot === "string" && value.remoteRoot.startsWith("/"); }
async function atomicJson(path, value) { const temporary = `${path}.tmp-${randomUUID()}`; await writeFile(temporary, json(value), { flag: "wx", mode: 0o600 }); await rename(temporary, path); }

export async function planResume(options = {}) {
  const sourceDirectory = options.sourceDirectory ?? SOURCE_DIRECTORY; const manifestPath = options.manifestPath ?? MANIFEST_PATH; const stateDirectory = options.stateDirectory ?? STATE_DIRECTORY; const targetPath = options.targetPath ?? TARGET_PATH;
  const originalPlanHash = options.originalPlanHash ?? ORIGINAL_PLAN_HASH; const retainedTargetHash = options.retainedTargetHash ?? RETAINED_TARGET_HASH;
  const claimOwnerPath = resolve(stateDirectory, "claim", "owner.json"); const journalPath = resolve(stateDirectory, "apply.json");
  const [targetBytes, ownerBytes, journalPresent, preview] = await Promise.all([readFile(targetPath), readFile(claimOwnerPath), exists(journalPath), planJairoBusinessProvisioning({ sourceDirectory, manifestPath, environment: options.environment ?? process.env })]);
  const target = JSON.parse(targetBytes); const owner = JSON.parse(ownerBytes); const targetHash = sha(targetBytes); const reasons = [];
  if (journalPresent) reasons.push("JOURNAL_ALREADY_PRESENT"); if (targetHash !== retainedTargetHash) reasons.push("RETAINED_TARGET_HASH_DRIFT"); if (owner.planHash !== originalPlanHash) reasons.push("CLAIM_PLAN_HASH_DRIFT");
  if (target?.version !== 2 || target.ownerKey !== "f403f29e-95c8-4825-9320-967376443020" || target.siteId !== "jairo-pinto-business" || target.ecosystemType !== "BUSINESS" || target.baseDomain !== "jairopinto.pro" || target.publicHost !== "negocio.jairopinto.pro" || target.provisioningState !== "FAILED" || target.publicationState !== "PENDING" || target.hostingerState !== "READY" || target.dnsState !== "PENDING" || target.sslState !== "PENDING" || typeof target.remoteRoot !== "string" || !target.remoteRoot.startsWith("/")) reasons.push("RETAINED_TARGET_CONTRACT_INVALID");
  if (preview.blocked) reasons.push(...preview.blockedReasons); if (!preview.applyReadiness.ready) reasons.push("APPLY_CONFIGURATION_NOT_READY");
  const material = { requestId: "CDX-20260825-004", operation: "RESUME_RETAINED_JAIRO_BUSINESS_PROVISIONING", originalPlanHash, retainedTargetHash, claimAcquiredAt: owner.acquiredAt, sourceHash: preview.planMaterial.sourceHash, entitlementHash: preview.planMaterial.entitlementHash, expectedFinalState: { provisioningState: "READY", publicationState: "PENDING", dnsState: "RESOLVED", sslState: "READY" } };
  return { requestId: "CDX-20260825-004", mode: "PREVIEW_RESUME", changed: false, blocked: reasons.length > 0, blockedReasons: [...new Set(reasons)], planHash: sha(JSON.stringify(material)), planMaterial: material, target: { sha256: targetHash, provisioningState: target.provisioningState, publicationState: target.publicationState, hostingerState: target.hostingerState, dnsState: target.dnsState, sslState: target.sslState, remoteRootPresent: true }, claim: { present: true, planHashValid: owner.planHash === originalPlanHash, ownerTokenRedacted: true }, safety: { providerCallsMade: false, localWritesMade: false, claimPreserved: true } };
}

export async function runResume(options = {}) {
  const preview = await planResume(options); if (options.mode !== RESUME_MODE) return preview;
  if (options.confirmation !== RESUME_CONFIRMATION) throw new Error(`RESUME_REQUIRES_CONFIRMATION:${RESUME_CONFIRMATION}`); if (options.expectedPlanHash !== preview.planHash) throw new Error("RESUME_PLAN_HASH_MISMATCH"); if (preview.blocked) throw new Error(`RESUME_PREVIEW_BLOCKED:${preview.blockedReasons.join(",")}`);
  const stateDirectory = options.stateDirectory ?? STATE_DIRECTORY; const targetPath = options.targetPath ?? TARGET_PATH; const claimOwnerPath = resolve(stateDirectory, "claim", "owner.json"); const journalPath = resolve(stateDirectory, "apply.json");
  const originalPlanHash = options.originalPlanHash ?? ORIGINAL_PLAN_HASH; const retainedTargetHash = options.retainedTargetHash ?? RETAINED_TARGET_HASH;
  const owner = JSON.parse(await readFile(claimOwnerPath)); const assertRetained = async () => { const currentOwner = JSON.parse(await readFile(claimOwnerPath)); if (currentOwner.token !== owner.token || currentOwner.planHash !== originalPlanHash) throw new Error("RETAINED_CLAIM_OWNERSHIP_LOST"); if (sha(await readFile(targetPath)) !== retainedTargetHash) throw new Error("RETAINED_TARGET_HASH_DRIFT"); };
  await assertRetained(); const provisioner = options.provisioner ?? createInProcessProvisioner(options.environment ?? process.env); await provisioner({ ownerKey: "f403f29e-95c8-4825-9320-967376443020", siteId: "jairo-pinto-business", ecosystemType: "BUSINESS", rootEcosystemType: "PERSONAL_BRAND", baseDomain: "jairopinto.pro", confirmation: "PROVISION_SUBDOMAIN" });
  const finalBytes = await readFile(targetPath); const target = JSON.parse(finalBytes); if (!finalTarget(target)) throw Object.assign(new Error(`RESUME_NOT_READY:${target.provisioningState ?? "MISSING"}`), { recovery: "RETAIN_CLAIM_FOR_NEW_AUDITED_PREVIEW" });
  const journal = { requestId: "CDX-20260824-007", recoveryRequestId: "CDX-20260825-004", outcome: "APPLIED", planHash: originalPlanHash, recoveryPlanHash: preview.planHash, targetHash: sha(finalBytes), appliedAt: new Date().toISOString(), providerStarted: true, finalState: { siteId: target.siteId, provisioningState: target.provisioningState, publicationState: target.publicationState, remoteRootPresent: true } };
  const currentOwner = JSON.parse(await readFile(claimOwnerPath)); if (currentOwner.token !== owner.token) throw new Error("RETAINED_CLAIM_OWNERSHIP_LOST"); await atomicJson(journalPath, journal); await rm(resolve(stateDirectory, "claim"), { recursive: true });
  return { ...preview, mode: RESUME_MODE, outcome: "APPLIED", changed: true, journal, target: journal.finalState };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) { const arg = (name) => process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3); runResume({ mode: arg("mode") ?? "PREVIEW_RESUME", confirmation: arg("confirm"), expectedPlanHash: arg("expected-plan-hash"), environment: process.env }).then((value) => process.stdout.write(json(value))).catch((error) => { process.stderr.write(json({ error: error.message, recovery: error.recovery })); process.exitCode = 1; }); }
