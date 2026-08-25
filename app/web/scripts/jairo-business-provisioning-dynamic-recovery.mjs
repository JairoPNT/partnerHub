import { createHash, randomUUID } from "node:crypto";
import { access, readFile, rename, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

import { createInProcessProvisioner, planJairoBusinessProvisioning } from "./jairo-business-guarded-provisioning.mjs";

export const RECOVERY_MODE = "RECOVER_CURRENT_JAIRO_BUSINESS_PROVISIONING";
export const RECOVERY_CONFIRMATION = "RECOVER_CURRENT_RETAINED_JAIRO_BUSINESS_TARGET";
const REQUEST_ID = "CDX-20260825-007";
const ORIGINAL_PLAN_HASH = "7c3c7447792130c8380c5c4c1587b90418e6f609b17db642be8a8103dd78eccf";
const SOURCE_DIRECTORY = "/data/generated-sites/.sources";
const MANIFEST_PATH = "/data/generated-sites/.provisioning-inputs/CDX-20260824-007/manifest.json";
const STATE_DIRECTORY = "/data/generated-sites/.provisioning-audits/CDX-20260824-007";
const TARGET_PATH = `${SOURCE_DIRECTORY}/.publishing-targets/jairo-pinto-business.json`;
const sha = (value) => createHash("sha256").update(value).digest("hex");
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

async function exists(path) { try { await access(path); return true; } catch (error) { if (error.code === "ENOENT") return false; throw error; } }
function exactIdentity(value) {
  return value?.version === 2 && value.ownerKey === "f403f29e-95c8-4825-9320-967376443020" && value.siteId === "jairo-pinto-business" &&
    value.ecosystemType === "BUSINESS" && value.rootEcosystemType === "PERSONAL_BRAND" && value.baseDomain === "jairopinto.pro" &&
    value.publicHost === "negocio.jairopinto.pro" && value.publicationState === "PENDING" && value.hostingerState === "READY" &&
    typeof value.remoteRoot === "string" && value.remoteRoot.startsWith("/") && value.remoteRoot !== "/";
}
function recoverableTarget(value) {
  if (!exactIdentity(value) || !["FAILED", "DNS_PENDING", "SSL_PENDING"].includes(value.provisioningState) || value.sslState !== "PENDING") return false;
  if (value.provisioningState === "FAILED") return ["PENDING", "CREATED", "RESOLVED"].includes(value.dnsState);
  if (value.provisioningState === "DNS_PENDING") return value.dnsState === "CREATED";
  return value.dnsState === "RESOLVED";
}
function readyTarget(value) { return exactIdentity(value) && value.provisioningState === "READY" && value.dnsState === "RESOLVED" && value.sslState === "READY"; }
function safeProvider(error) {
  const rawCode = error && typeof error === "object" && typeof error.providerCode === "string" ? error.providerCode : "";
  const code = /^[A-Z][A-Z0-9_]{0,79}$/.test(rawCode) ? rawCode : "PROVISIONING_PROVIDER_FAILED";
  const status = error && typeof error === "object" && Number.isInteger(error.providerStatus) && error.providerStatus >= 100 && error.providerStatus <= 599 ? error.providerStatus : null;
  return { code, httpStatus: status };
}
async function atomicJson(path, value) { const temporary = `${path}.tmp-${randomUUID()}`; await writeFile(temporary, json(value), { flag: "wx", mode: 0o600 }); await rename(temporary, path); }

export async function planDynamicRecovery(options = {}) {
  const sourceDirectory = options.sourceDirectory ?? SOURCE_DIRECTORY;
  const manifestPath = options.manifestPath ?? MANIFEST_PATH;
  const stateDirectory = options.stateDirectory ?? STATE_DIRECTORY;
  const targetPath = options.targetPath ?? TARGET_PATH;
  const originalPlanHash = options.originalPlanHash ?? ORIGINAL_PLAN_HASH;
  const claimPath = resolve(stateDirectory, "claim");
  const claimOwnerPath = resolve(claimPath, "owner.json");
  const journalPath = resolve(stateDirectory, "apply.json");
  const [targetBytes, ownerBytes, journalPresent, basePreview] = await Promise.all([
    readFile(targetPath), readFile(claimOwnerPath), exists(journalPath),
    planJairoBusinessProvisioning({ sourceDirectory, manifestPath, environment: options.environment ?? process.env })
  ]);
  const target = JSON.parse(targetBytes); const owner = JSON.parse(ownerBytes); const targetHash = sha(targetBytes); const reasons = [];
  if (journalPresent) reasons.push("JOURNAL_ALREADY_PRESENT");
  if (owner.planHash !== originalPlanHash || typeof owner.token !== "string" || !owner.token) reasons.push("RETAINED_CLAIM_INVALID");
  if (!recoverableTarget(target)) reasons.push("CURRENT_TARGET_NOT_RECOVERABLE");
  if (basePreview.blocked) reasons.push(...basePreview.blockedReasons);
  if (!basePreview.applyReadiness.ready) reasons.push("APPLY_CONFIGURATION_NOT_READY");
  if (basePreview.planMaterial.initialTargetHash !== targetHash) reasons.push("BASE_PREVIEW_TARGET_HASH_MISMATCH");
  const material = {
    requestId: REQUEST_ID,
    operation: "RECOVER_CURRENT_RETAINED_JAIRO_BUSINESS_PROVISIONING",
    originalPlanHash,
    currentTargetHash: targetHash,
    currentProvisioningState: target.provisioningState,
    currentDnsState: target.dnsState,
    currentSslState: target.sslState,
    claimAcquiredAt: owner.acquiredAt,
    sourceHash: basePreview.planMaterial.sourceHash,
    entitlementHash: basePreview.planMaterial.entitlementHash,
    expectedFinalState: { provisioningState: "READY", publicationState: "PENDING", dnsState: "RESOLVED", sslState: "READY" }
  };
  return {
    requestId: REQUEST_ID,
    mode: "PREVIEW_DYNAMIC_RECOVERY",
    changed: false,
    blocked: reasons.length > 0,
    blockedReasons: [...new Set(reasons)],
    planHash: sha(JSON.stringify(material)),
    planMaterial: material,
    target: { sha256: targetHash, provisioningState: target.provisioningState, publicationState: target.publicationState, hostingerState: target.hostingerState, dnsState: target.dnsState, sslState: target.sslState, remoteRootPresent: true },
    claim: { present: true, planHashValid: owner.planHash === originalPlanHash, ownerTokenRedacted: true },
    safety: { providerCallsMade: false, localWritesMade: false, claimPreserved: true }
  };
}

export async function runDynamicRecovery(options = {}) {
  const preview = await planDynamicRecovery(options);
  if (options.mode !== RECOVERY_MODE) return preview;
  if (options.confirmation !== RECOVERY_CONFIRMATION) throw new Error(`RECOVERY_REQUIRES_CONFIRMATION:${RECOVERY_CONFIRMATION}`);
  if (options.expectedPlanHash !== preview.planHash) throw new Error("RECOVERY_PLAN_HASH_MISMATCH");
  if (preview.blocked) throw new Error(`RECOVERY_PREVIEW_BLOCKED:${preview.blockedReasons.join(",")}`);

  const stateDirectory = options.stateDirectory ?? STATE_DIRECTORY;
  const targetPath = options.targetPath ?? TARGET_PATH;
  const originalPlanHash = options.originalPlanHash ?? ORIGINAL_PLAN_HASH;
  const claimPath = resolve(stateDirectory, "claim");
  const ownerPath = resolve(claimPath, "owner.json");
  const journalPath = resolve(stateDirectory, "apply.json");
  const owner = JSON.parse(await readFile(ownerPath));
  const assertOwner = async () => {
    const currentOwner = JSON.parse(await readFile(ownerPath));
    if (currentOwner.token !== owner.token || currentOwner.planHash !== originalPlanHash) throw new Error("RETAINED_CLAIM_OWNERSHIP_LOST");
  };
  const assertCurrent = async () => {
    await assertOwner();
    if (sha(await readFile(targetPath)) !== preview.planMaterial.currentTargetHash) throw new Error("CURRENT_TARGET_HASH_DRIFT");
  };
  await assertCurrent();
  const provisioner = options.provisioner ?? createInProcessProvisioner(options.environment ?? process.env);
  try {
    await provisioner({ ownerKey: "f403f29e-95c8-4825-9320-967376443020", siteId: "jairo-pinto-business", ecosystemType: "BUSINESS", rootEcosystemType: "PERSONAL_BRAND", baseDomain: "jairopinto.pro", confirmation: "PROVISION_SUBDOMAIN" });
  } catch (error) {
    await assertOwner();
    const currentBytes = await readFile(targetPath); const current = JSON.parse(currentBytes); const provider = safeProvider(error);
    return { ...preview, mode: RECOVERY_MODE, outcome: "PROVIDER_REJECTED", changed: sha(currentBytes) !== preview.planMaterial.currentTargetHash, blocked: true,
      blockedReasons: [provider.code], provider, target: { sha256: sha(currentBytes), provisioningState: current.provisioningState, publicationState: current.publicationState, hostingerState: current.hostingerState, dnsState: current.dnsState, sslState: current.sslState, remoteRootPresent: Boolean(current.remoteRoot) },
      claim: { present: true, planHashValid: true, ownerTokenRedacted: true }, recovery: "RETAIN_CLAIM_AND_REVIEW_SAFE_PROVIDER_STATUS" };
  }

  const currentBytes = await readFile(targetPath); const current = JSON.parse(currentBytes);
  await assertOwner();
  if (!readyTarget(current)) {
    if (!recoverableTarget(current)) throw new Error(`RECOVERY_RESULT_INVALID:${current.provisioningState ?? "MISSING"}`);
    return { ...preview, mode: RECOVERY_MODE, outcome: "PENDING_READINESS", changed: sha(currentBytes) !== preview.planMaterial.currentTargetHash,
      target: { sha256: sha(currentBytes), provisioningState: current.provisioningState, publicationState: current.publicationState, hostingerState: current.hostingerState, dnsState: current.dnsState, sslState: current.sslState, remoteRootPresent: true },
      claim: { present: true, planHashValid: true, ownerTokenRedacted: true }, recovery: "RUN_NEW_PREVIEW_AFTER_PROPAGATION" };
  }
  const journal = { requestId: "CDX-20260824-007", recoveryRequestId: REQUEST_ID, outcome: "APPLIED", planHash: originalPlanHash, recoveryPlanHash: preview.planHash, targetHash: sha(currentBytes), appliedAt: new Date().toISOString(), providerStarted: true,
    finalState: { siteId: current.siteId, provisioningState: current.provisioningState, publicationState: current.publicationState, remoteRootPresent: true } };
  await assertOwner(); await atomicJson(journalPath, journal); await assertOwner(); await rm(claimPath, { recursive: true });
  return { ...preview, mode: RECOVERY_MODE, outcome: "APPLIED", changed: true, journal, target: journal.finalState, claim: { present: false, ownerTokenRedacted: true } };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const arg = (name) => process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);
  runDynamicRecovery({ mode: arg("mode") ?? "PREVIEW_DYNAMIC_RECOVERY", confirmation: arg("confirm"), expectedPlanHash: arg("expected-plan-hash"), environment: process.env })
    .then((value) => { process.stdout.write(json(value)); if (value.outcome === "PROVIDER_REJECTED") process.exitCode = 1; })
    .catch((error) => { process.stderr.write(json({ requestId: REQUEST_ID, error: error.message, secretsExposed: false })); process.exitCode = 1; });
}
