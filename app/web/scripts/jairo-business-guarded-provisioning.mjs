import { createHash, randomUUID } from "node:crypto";
import { access, mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { isIP } from "node:net";
import { dirname, resolve, sep } from "node:path";
import process from "node:process";
import { pathToFileURL, URL } from "node:url";

export const APPLY_MODE = "APPLY_JAIRO_BUSINESS_PROVISIONING";
export const APPLY_CONFIRMATION = "PROVISION_ALLOWLISTED_JAIRO_BUSINESS_TARGET";
const PREVIEW_CONFIRMATION = "PREVIEW_JAIRO_BUSINESS_PROVISIONING";
const EXPECTED = Object.freeze({ ownerKey: "f403f29e-95c8-4825-9320-967376443020", siteId: "jairo-pinto-business", ecosystemType: "BUSINESS",
  rootEcosystemType: "PERSONAL_BRAND", baseDomain: "jairopinto.pro", publicHost: "negocio.jairopinto.pro" });
const HASH = /^[0-9a-f]{64}$/; const json = (value) => `${JSON.stringify(value, null, 2)}\n`; const sha = (value) => createHash("sha256").update(value).digest("hex");
async function exists(path) { try { await access(path); return true; } catch (error) { if (error.code === "ENOENT") return false; throw error; } }
function inside(root, name) { const base = resolve(root); const path = resolve(base, name); if (!path.startsWith(`${base}${sep}`)) throw new Error("LOCAL_PATH_ESCAPE"); return path; }
function validateManifest(value) {
  if (value?.confirmation !== PREVIEW_CONFIRMATION || !Array.isArray(value.allowlist) || value.allowlist.length !== 1) throw new Error("MANIFEST_EXACT_ALLOWLIST_REQUIRED");
  const entry = value.allowlist[0]; for (const [key, expected] of Object.entries(EXPECTED)) if (entry?.[key] !== expected) throw new Error(`ALLOWLIST_MISMATCH:${key}`);
  if (!HASH.test(entry.expectedSourceHash ?? "") || !HASH.test(entry.expectedEntitlementHash ?? "")) throw new Error("MANIFEST_HASH_INVALID"); return entry;
}
async function inventory(root) {
  try { const names = await readdir(root); const targets = [];
    for (const name of names.filter((item) => item.endsWith(".json"))) { const bytes = await readFile(resolve(root, name)); targets.push({ name, bytes, value: JSON.parse(bytes) }); }
    return targets;
  } catch (error) { if (error.code === "ENOENT") return []; throw error; }
}
function validateEntitlement(value) {
  const business = value?.expectedTargets?.find((item) => item.ecosystemType === "BUSINESS");
  return value?.activationLeadId === EXPECTED.ownerKey && value?.commercialState === "KNOWN" && value?.includedEcosystems?.includes("BUSINESS") &&
    business?.role === "SUBDOMAIN" && business?.publicHost === EXPECTED.publicHost && value?.rootRedirectApex?.preserved === true && value?.rootRedirectApex?.isPublishingTarget === false;
}
function exactTarget(value) { return value?.version === 2 && Object.entries(EXPECTED).every(([key, expected]) => value[key] === expected); }
function finalTarget(value) { return exactTarget(value) && value.provisioningState === "READY" && value.publicationState === "PENDING" &&
  value.hostingerState === "READY" && value.dnsState === "RESOLVED" && value.sslState === "READY" && typeof value.remoteRoot === "string" && value.remoteRoot.startsWith("/") && value.remoteRoot !== "/"; }

export async function planJairoBusinessProvisioning({ sourceDirectory, manifestPath, environment = process.env }) {
  const manifestBytes = await readFile(resolve(manifestPath)); const entry = validateManifest(JSON.parse(manifestBytes)); const inputDirectory = dirname(resolve(manifestPath));
  const sourcePath = inside(sourceDirectory, `${EXPECTED.siteId}.json`); const entitlementPath = inside(inputDirectory, "entitlement.json");
  const [sourceBytes, entitlementBytes, targets] = await Promise.all([readFile(sourcePath), readFile(entitlementPath), inventory(inside(sourceDirectory, ".publishing-targets"))]);
  const source = JSON.parse(sourceBytes); const entitlement = JSON.parse(entitlementBytes); const reasons = [];
  if (sha(sourceBytes) !== entry.expectedSourceHash) reasons.push("SOURCE_HASH_DRIFT"); if (sha(entitlementBytes) !== entry.expectedEntitlementHash) reasons.push("ENTITLEMENT_HASH_DRIFT");
  if (source?.site?.id !== EXPECTED.siteId || source?.ecosystemType !== "BUSINESS" || source?.site?.domain !== EXPECTED.publicHost) reasons.push("SOURCE_IDENTITY_INVALID");
  if (!validateEntitlement(entitlement)) reasons.push("BUSINESS_ENTITLEMENT_INVALID");
  const candidates = targets.filter(({ value }) => value.siteId === EXPECTED.siteId || value.publicHost === EXPECTED.publicHost || (value.ownerKey === EXPECTED.ownerKey && value.ecosystemType === "BUSINESS"));
  if (candidates.some(({ value }) => !exactTarget(value)) || candidates.length > 1) reasons.push("PUBLISHING_TARGET_CONFLICT");
  const existingRecord = candidates[0] ?? null; const existing = existingRecord?.value ?? null; if (existing && !["PENDING", "HOSTING_CREATED", "DNS_PENDING", "SSL_PENDING", "FAILED", "READY"].includes(existing.provisioningState)) reasons.push("TARGET_STATE_INVALID");
  if (existing?.provisioningState === "READY" && !finalTarget(existing)) reasons.push("READY_TARGET_INVALID");
  const required = ["HOSTINGER_API_TOKEN", "PARTNERHUB_PROVISIONING_IPV4", "CF_Authorization", "PARTNERHUB_INTERNAL_BASE_URL"];
  const missingConfiguration = required.filter((name) => !environment[name]?.trim());
  if (!environment.HOSTINGER_API_USERNAME?.trim() && !environment.HOSTINGER_SFTP_USERNAME?.trim()) missingConfiguration.push("HOSTINGER_API_USERNAME_OR_HOSTINGER_SFTP_USERNAME");
  const invalidConfiguration = [];
  if (environment.PARTNERHUB_PROVISIONING_IPV4 && isIP(environment.PARTNERHUB_PROVISIONING_IPV4) !== 4) invalidConfiguration.push("PARTNERHUB_PROVISIONING_IPV4");
  if (environment.PARTNERHUB_INTERNAL_BASE_URL) { try { const endpoint = new URL(environment.PARTNERHUB_INTERNAL_BASE_URL); if (endpoint.protocol !== "https:") invalidConfiguration.push("PARTNERHUB_INTERNAL_BASE_URL"); } catch { invalidConfiguration.push("PARTNERHUB_INTERNAL_BASE_URL"); } }
  const disposition = existing ? (finalTarget(existing) ? "ALREADY_READY" : "RESUME_SUPPORTED_SERVICE") : "CREATE_WITH_SUPPORTED_SERVICE";
  const material = { requestId: "CDX-20260824-007", identity: EXPECTED, sourceHash: entry.expectedSourceHash, entitlementHash: entry.expectedEntitlementHash,
    operation: "ENSURE_SUPPORTED_BUSINESS_TARGET_READY_PENDING", initialTargetHash: existingRecord ? sha(existingRecord.bytes) : "ABSENT", expectedFinalState: { provisioningState: "READY", publicationState: "PENDING" },
    apexMutationAllowed: false, publicationAllowed: false, providerContract: "POST_INTERNAL_PUBLISHING_TARGETS" };
  return { requestId: "CDX-20260824-007", mode: "PREVIEW", changed: false, blocked: reasons.length > 0, blockedReasons: [...new Set(reasons)], planHash: sha(JSON.stringify(material)), planMaterial: material,
    disposition, target: existing ? { siteId: existing.siteId, provisioningState: existing.provisioningState, publicationState: existing.publicationState, remoteRootPresent: Boolean(existing.remoteRoot) } : null,
    applyReadiness: { ready: missingConfiguration.length === 0 && invalidConfiguration.length === 0, missing: missingConfiguration, invalid: invalidConfiguration, secretsExposed: false },
    safety: { providerCallsMade: false, localWritesMade: false, apexPreserved: true, contentPublicationAllowed: false } };
}

async function readOwner(path) { try { return JSON.parse(await readFile(resolve(path, "owner.json"), "utf8")); } catch (error) { if (error.code === "ENOENT") return null; throw error; } }
async function assertOwner(path, owner) { const current = await readOwner(path); if (current?.token !== owner.token) throw new Error("PROVISIONING_CLAIM_OWNERSHIP_LOST"); }
async function atomicJson(path, value) { const temporary = `${path}.tmp-${randomUUID()}`; await writeFile(temporary, json(value), { flag: "wx", mode: 0o600 }); await rename(temporary, path); }

export async function runJairoBusinessProvisioning(options) {
  const preview = await planJairoBusinessProvisioning(options); if (options.mode !== APPLY_MODE) return preview;
  if (options.confirmation !== APPLY_CONFIRMATION) throw new Error(`APPLY_REQUIRES_CONFIRMATION:${APPLY_CONFIRMATION}`);
  if (!preview.applyReadiness.ready) throw new Error(`APPLY_CONFIGURATION_NOT_READY:missing=${preview.applyReadiness.missing.join("|")}:invalid=${preview.applyReadiness.invalid.join("|")}`);
  const stateRoot = resolve(options.stateDirectory); const journalPath = inside(stateRoot, "apply.json"); const claimPath = inside(stateRoot, "claim");
  const targetPath = inside(inside(options.sourceDirectory, ".publishing-targets"), `${EXPECTED.siteId}.json`);
  if (await exists(journalPath)) { const journal = JSON.parse(await readFile(journalPath)); const target = JSON.parse(await readFile(targetPath));
    if (options.expectedPlanHash !== journal.planHash || !finalTarget(target) || sha(await readFile(targetPath)) !== journal.targetHash) throw new Error("JOURNAL_OR_TARGET_DRIFT");
    return { ...preview, mode: APPLY_MODE, outcome: "ALREADY_APPLIED", changed: false, target: { provisioningState: "READY", publicationState: "PENDING", remoteRootPresent: true } };
  }
  if (options.expectedPlanHash !== preview.planHash) throw new Error("PLAN_HASH_MISMATCH"); if (preview.blocked) throw new Error(`PREVIEW_BLOCKED:${preview.blockedReasons.join(",")}`);
  if (await exists(claimPath)) throw new Error("PROVISIONING_CLAIM_PRESENT"); await mkdir(stateRoot, { recursive: true, mode: 0o700 }); await mkdir(claimPath, { recursive: false, mode: 0o700 });
  const owner = { token: randomUUID(), planHash: preview.planHash, acquiredAt: new Date().toISOString() }; await writeFile(resolve(claimPath, "owner.json"), json(owner), { flag: "wx", mode: 0o600 }); let providerStarted = false;
  try {
    await assertOwner(claimPath, owner); const locked = await planJairoBusinessProvisioning(options); if (locked.planHash !== preview.planHash || locked.blocked) throw new Error("LOCKED_PREFLIGHT_DRIFT");
    if (options.hooks?.beforeProvider) await options.hooks.beforeProvider({ claimPath, owner }); await assertOwner(claimPath, owner); providerStarted = true;
    await options.provisioner({ ownerKey: EXPECTED.ownerKey, siteId: EXPECTED.siteId, ecosystemType: "BUSINESS", rootEcosystemType: "PERSONAL_BRAND", baseDomain: EXPECTED.baseDomain, confirmation: "PROVISION_SUBDOMAIN" });
    if (options.hooks?.afterProvider) await options.hooks.afterProvider({ claimPath, owner }); await assertOwner(claimPath, owner);
    const targetBytes = await readFile(targetPath); const target = JSON.parse(targetBytes); if (!finalTarget(target)) throw new Error(`PROVISIONING_NOT_READY:${target.provisioningState ?? "MISSING"}`);
    const journal = { requestId: "CDX-20260824-007", outcome: "APPLIED", planHash: preview.planHash, targetHash: sha(targetBytes), appliedAt: new Date().toISOString(), providerStarted: true,
      finalState: { siteId: target.siteId, provisioningState: target.provisioningState, publicationState: target.publicationState, remoteRootPresent: true } };
    await assertOwner(claimPath, owner); await atomicJson(journalPath, journal); await assertOwner(claimPath, owner); await rm(claimPath, { recursive: true });
    return { ...preview, mode: APPLY_MODE, outcome: "APPLIED", changed: true, journal, target: journal.finalState };
  } catch (error) {
    if (!providerStarted) { await assertOwner(claimPath, owner); await rm(claimPath, { recursive: true }); }
    throw Object.assign(error, { providerStarted, recovery: providerStarted ? "FAIL_CLOSED_RETAIN_CLAIM_AND_TARGET_FOR_AUDITED_RESUME" : "NO_PROVIDER_MUTATION" });
  }
}

export function createInternalProvisioner(environment = process.env, fetchImplementation = globalThis.fetch) {
  return async (body) => { const url = new URL("/api/internal/publishing-targets", environment.PARTNERHUB_INTERNAL_BASE_URL); const response = await fetchImplementation(url, { method: "POST", redirect: "manual",
    headers: { "Content-Type": "application/json", Cookie: `CF_Authorization=${environment.CF_Authorization}` }, body: JSON.stringify(body) });
    if (response.status !== 200) throw new Error(`SUPPORTED_PROVISIONING_API_HTTP_${response.status}`); const value = await response.json(); if (!value?.target) throw new Error("SUPPORTED_PROVISIONING_API_INVALID_JSON"); return value.target; };
}
async function main() { const arg = (name) => process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3); const manifestPath = arg("manifest"); if (!manifestPath) throw new Error("MANIFEST_REQUIRED");
  const result = await runJairoBusinessProvisioning({ sourceDirectory: process.env.PRODUCT_PAGE_SOURCE_DIR ?? "/data/generated-sites/.sources", manifestPath, environment: process.env,
    stateDirectory: arg("state-dir"), mode: arg("mode") ?? "PREVIEW", confirmation: arg("confirm"), expectedPlanHash: arg("expected-plan-hash"), provisioner: createInternalProvisioner(process.env) });
  process.stdout.write(json(result)); if (result.blocked) process.exitCode = 2; }
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch((error) => { process.stderr.write(json({ error: error.message, providerStarted: error.providerStarted, recovery: error.recovery })); process.exitCode = 1; });
