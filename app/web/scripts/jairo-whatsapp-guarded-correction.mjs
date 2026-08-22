import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

export const REQUEST_ID = "CDX-20260821-017";
export const DRY_CONFIRMATION = "DRY_RUN_JAIRO_WHATSAPP_CORRECTION";
export const APPLY_CONFIRMATION = "APPLY_JAIRO_WHATSAPP_CORRECTION";
const SNAPSHOT_HASH = "21ac97693f7834fc411159713da353a12d28b56109f3b57d94ceb8b17824dfeb";
const EXPECTED = {
  activationLeadId: "f403f29e-95c8-4825-9320-967376443020", siteId: "jairo-pinto",
  leadWhatsapp: "+573188430283", current: "+5673188430283", phone: "+573188430283",
  target: "+573188430283", waMeDigits: "573188430283"
};
const HASH = /^[0-9a-f]{64}$/;
const STALE_MS = 15 * 60 * 1000;
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
async function exists(path) { try { await stat(path); return true; } catch (error) { if (error.code === "ENOENT") return false; throw error; } }
async function atomicWrite(path, source, token) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${token}`;
  await writeFile(temporary, source, { encoding: "utf8", flag: "wx" });
  await rename(temporary, path);
}

function validateEntry(manifest, confirmation, expectedSnapshotHash = SNAPSHOT_HASH) {
  if (manifest?.confirmation !== confirmation || !Array.isArray(manifest.allowlist) || manifest.allowlist.length !== 1) {
    throw new Error(`MANIFEST_INVALID: confirmation=${confirmation} and exactly one allowlist entry required`);
  }
  const entry = manifest.allowlist[0];
  for (const [key, expected] of Object.entries({
    activationLeadId: EXPECTED.activationLeadId, siteId: EXPECTED.siteId,
    expectedActivationLeadSnapshotHash: expectedSnapshotHash,
    expectedCurrentLeadWhatsapp: EXPECTED.leadWhatsapp,
    expectedCurrentOnboardingWhatsapp: EXPECTED.current,
    expectedCurrentOnboardingPhone: EXPECTED.phone,
    targetOnboardingWhatsapp: EXPECTED.target, targetWaMeDigits: EXPECTED.waMeDigits
  })) if (entry[key] !== expected) throw new Error(`ALLOWLIST_MISMATCH:${key}`);
  if (!HASH.test(entry.expectedLeadsFileHash ?? "")) throw new Error("EXPECTED_LEADS_HASH_INVALID");
  if (confirmation === APPLY_CONFIRMATION && !HASH.test(entry.expectedProjectedLeadsFileHash ?? "")) throw new Error("EXPECTED_PROJECTED_HASH_INVALID");
  if (typeof entry.auditPackage !== "string" || !entry.auditPackage) throw new Error("AUDIT_PACKAGE_REQUIRED");
  return entry;
}

function paths(entry, leadsPath, snapshotPath) {
  const audit = resolve(entry.auditPackage);
  return { leads: resolve(leadsPath), snapshot: resolve(snapshotPath), audit,
    backup: resolve(audit, "backup", "leads.json"), dryRun: resolve(audit, "dry-run.json"),
    apply: resolve(audit, "apply.json"), claim: resolve(audit, ".apply-claim"), owner: resolve(audit, ".apply-claim", "owner.json") };
}

async function loadPlan({ manifestPath, leadsPath, snapshotPath, confirmation, expectedSnapshotHash = SNAPSHOT_HASH }) {
  const manifest = JSON.parse(await readFile(resolve(manifestPath), "utf8"));
  const entry = validateEntry(manifest, confirmation, expectedSnapshotHash);
  const targetPaths = paths(entry, leadsPath, snapshotPath);
  const [leadsSource, snapshotSource] = await Promise.all([readFile(targetPaths.leads, "utf8"), readFile(targetPaths.snapshot, "utf8")]);
  const reasons = [];
  const leadsHash = sha256(leadsSource); const snapshotHash = sha256(snapshotSource);
  if (leadsHash !== entry.expectedLeadsFileHash) reasons.push("LEADS_FILE_HASH_DRIFT");
  if (snapshotHash !== expectedSnapshotHash) reasons.push("ACTIVATION_LEAD_SNAPSHOT_HASH_DRIFT");
  let leads; let snapshot;
  try { leads = JSON.parse(leadsSource); snapshot = JSON.parse(snapshotSource); } catch { reasons.push("INPUT_JSON_INVALID"); }
  if (!Array.isArray(leads)) reasons.push("LEADS_SHAPE_INVALID");
  const matches = Array.isArray(leads) ? leads.filter((lead) => lead.id === EXPECTED.activationLeadId) : [];
  if (matches.length !== 1) reasons.push(matches.length ? "ACTIVATION_LEAD_DUPLICATE" : "ACTIVATION_LEAD_NOT_FOUND");
  const lead = matches[0];
  if (lead && JSON.stringify(lead) !== JSON.stringify(snapshot)) reasons.push("SNAPSHOT_CONTENT_DRIFT");
  if (lead?.siteId !== EXPECTED.siteId) reasons.push("SITE_ID_DRIFT");
  if (lead?.whatsapp !== EXPECTED.leadWhatsapp) reasons.push("LEAD_WHATSAPP_DRIFT");
  if (lead?.onboardingData?.whatsapp !== EXPECTED.current) reasons.push("ONBOARDING_WHATSAPP_DRIFT");
  if (lead?.onboardingData?.phone !== EXPECTED.phone) reasons.push("ONBOARDING_PHONE_DRIFT");
  let projectedSource = null; let projectedHash = null;
  if (lead) {
    const projected = leads.map((item) => item.id === EXPECTED.activationLeadId
      ? { ...item, onboardingData: { ...item.onboardingData, whatsapp: EXPECTED.target } } : item);
    projectedSource = json(projected); projectedHash = sha256(projectedSource);
    const before = JSON.parse(JSON.stringify(lead));
    const after = JSON.parse(JSON.stringify(projected.find((item) => item.id === lead.id)));
    before.onboardingData.whatsapp = after.onboardingData.whatsapp;
    if (JSON.stringify(before) !== JSON.stringify(after)) reasons.push("DIFF_SCOPE_VIOLATION");
  }
  const planMaterial = { requestId: REQUEST_ID, activationLeadId: EXPECTED.activationLeadId,
    leadsHash, snapshotHash, projectedHash, field: "onboardingData.whatsapp", from: EXPECTED.current, to: EXPECTED.target };
  return { entry, paths: targetPaths, leadsSource, projectedSource, leadsHash, snapshotHash, projectedHash,
    planMaterial, planHash: sha256(JSON.stringify(planMaterial)), blockedReasons: [...new Set(reasons)] };
}

export async function dryRunJairoWhatsappCorrection(options) {
  const plan = await loadPlan({ ...options, confirmation: DRY_CONFIRMATION });
  if (plan.blockedReasons.length) return { mode: "DRY_RUN", changed: false, blocked: true, blockedReasons: plan.blockedReasons, planHash: plan.planHash };
  if (await exists(plan.paths.audit)) throw new Error("AUDIT_PACKAGE_COLLISION");
  await mkdir(resolve(plan.paths.audit, "backup"), { recursive: true });
  await writeFile(plan.paths.backup, plan.leadsSource, { encoding: "utf8", flag: "wx" });
  const result = { requestId: REQUEST_ID, mode: "DRY_RUN", changed: false, blocked: false, blockedReasons: [],
    planHash: plan.planHash, hashes: { leads: plan.leadsHash, snapshot: plan.snapshotHash, projected: plan.projectedHash },
    diff: [{ path: "onboardingData.whatsapp", from: EXPECTED.current, to: EXPECTED.target }], backup: plan.paths.backup };
  await writeFile(plan.paths.dryRun, json(result), { encoding: "utf8", flag: "wx" });
  return result;
}

async function claimReason(targetPaths) {
  if (!(await exists(targetPaths.claim))) return null;
  try { const owner = JSON.parse(await readFile(targetPaths.owner, "utf8")); const age = Date.now() - Date.parse(owner.acquiredAt);
    if (!owner.token || !Number.isFinite(age)) return "APPLY_CLAIM_INCOMPLETE";
    return age >= STALE_MS ? "APPLY_CLAIM_STALE" : "APPLY_CLAIM_ACTIVE";
  } catch { return "APPLY_CLAIM_INCOMPLETE"; }
}
async function acquire(targetPaths) {
  const owner = { token: randomUUID(), pid: process.pid, acquiredAt: new Date().toISOString() };
  try { await mkdir(targetPaths.claim); } catch (error) { if (error.code === "EEXIST") throw new Error((await claimReason(targetPaths)) ?? "APPLY_CLAIM_RACE"); throw error; }
  await writeFile(targetPaths.owner, json(owner), { encoding: "utf8", flag: "wx" }); return owner;
}
async function assertOwner(targetPaths, owner) {
  try { const actual = JSON.parse(await readFile(targetPaths.owner, "utf8")); if (actual.token !== owner.token) throw new Error(); }
  catch { throw new Error("APPLY_CLAIM_OWNERSHIP_LOST"); }
}
async function release(targetPaths, owner) { await assertOwner(targetPaths, owner); await rm(targetPaths.claim, { recursive: true }); }

export async function applyJairoWhatsappCorrection(options) {
  const supplied = JSON.parse(await readFile(resolve(options.manifestPath), "utf8"));
  const entry = validateEntry(supplied, APPLY_CONFIRMATION, options.expectedSnapshotHash ?? SNAPSHOT_HASH);
  const terminalPaths = paths(entry, options.leadsPath, options.snapshotPath);
  if (await exists(terminalPaths.apply)) {
    const journal = JSON.parse(await readFile(terminalPaths.apply, "utf8"));
    const current = await readFile(terminalPaths.leads, "utf8");
    const finalLead = JSON.parse(current).find((lead) => lead.id === EXPECTED.activationLeadId);
    if (journal.planHash === supplied.expectedPlanHash && journal.projectedHash === sha256(current) &&
        journal.projectedHash === entry.expectedProjectedLeadsFileHash && finalLead?.onboardingData?.whatsapp === EXPECTED.target &&
        finalLead?.whatsapp === EXPECTED.leadWhatsapp && !(await claimReason(terminalPaths))) {
      return { mode: "APPLY", outcome: "ALREADY_APPLIED", changed: false, blocked: false, planHash: journal.planHash };
    }
    throw new Error("APPLY_JOURNAL_OR_FINAL_STATE_DRIFT");
  }
  const initial = await loadPlan({ ...options, confirmation: APPLY_CONFIRMATION });
  if (supplied.expectedPlanHash !== initial.planHash) throw new Error("PLAN_HASH_MISMATCH");
  if (initial.blockedReasons.length) throw new Error(`APPLY_BLOCKED:${initial.blockedReasons.join(",")}`);
  if (initial.entry.expectedProjectedLeadsFileHash !== initial.projectedHash) throw new Error("PROJECTED_HASH_MISMATCH");
  const reviewed = JSON.parse(await readFile(initial.paths.dryRun, "utf8"));
  const backup = await readFile(initial.paths.backup, "utf8");
  if (reviewed.planHash !== initial.planHash || reviewed.blocked !== false || sha256(backup) !== initial.leadsHash) throw new Error("AUDIT_PACKAGE_DRIFT");
  const owner = await acquire(initial.paths); let committed = false;
  try {
    const locked = await loadPlan({ ...options, confirmation: APPLY_CONFIRMATION });
    if (locked.planHash !== initial.planHash || locked.blockedReasons.length) throw new Error("LOCKED_PREFLIGHT_DRIFT");
    await assertOwner(initial.paths, owner);
    await atomicWrite(initial.paths.leads, locked.projectedSource, owner.token);
    if (options.hooks?.afterWrite) await options.hooks.afterWrite(initial.paths, owner);
    await assertOwner(initial.paths, owner);
    const finalSource = await readFile(initial.paths.leads, "utf8");
    if (sha256(finalSource) !== locked.projectedHash) throw new Error("POST_VERIFICATION_HASH_FAILED");
    const finalLead = JSON.parse(finalSource).find((lead) => lead.id === EXPECTED.activationLeadId);
    if (finalLead?.onboardingData?.whatsapp !== EXPECTED.target || finalLead?.whatsapp !== EXPECTED.leadWhatsapp) throw new Error("POST_VERIFICATION_IDENTITY_FAILED");
    await assertOwner(initial.paths, owner);
    await atomicWrite(initial.paths.apply, json({ requestId: REQUEST_ID, mode: "APPLY", changed: true,
      planHash: locked.planHash, projectedHash: locked.projectedHash, appliedAt: new Date().toISOString() }), owner.token);
    committed = true;
    await release(initial.paths, owner);
    return { mode: "APPLY", outcome: "APPLIED", changed: true, blocked: false, planHash: locked.planHash, journal: initial.paths.apply };
  } catch (error) {
    if (!committed) {
      await assertOwner(initial.paths, owner);
      await atomicWrite(initial.paths.leads, initial.leadsSource, `${owner.token}-rollback`);
      await release(initial.paths, owner);
    }
    throw error;
  }
}

async function main() {
  const mode = process.env.JAIRO_WHATSAPP_CORRECTION_MODE ?? "DRY_RUN";
  const options = { manifestPath: process.env.JAIRO_WHATSAPP_CORRECTION_MANIFEST,
    leadsPath: process.env.JAIRO_WHATSAPP_LEADS_PATH ?? "/data/generated-sites/.activation/leads.json",
    snapshotPath: process.env.JAIRO_WHATSAPP_SNAPSHOT_PATH ?? "/data/generated-sites/.migration-inputs/CDX-20260821-017/activation-lead.json" };
  if (!options.manifestPath) throw new Error("JAIRO_WHATSAPP_CORRECTION_MANIFEST is required");
  const result = mode === "DRY_RUN" ? await dryRunJairoWhatsappCorrection(options)
    : mode === "APPLY" ? await applyJairoWhatsappCorrection(options) : (() => { throw new Error("MODE_NOT_ALLOWED"); })();
  process.stdout.write(json(result)); if (result.blocked) process.exitCode = 2;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
