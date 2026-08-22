import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import { APPLY_CONFIRMATION, DRY_CONFIRMATION, applyJairoWhatsappCorrection, dryRunJairoWhatsappCorrection } from "./jairo-whatsapp-guarded-correction.mjs";

const hash = (value) => createHash("sha256").update(value).digest("hex");
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const lead = () => ({
  id: "f403f29e-95c8-4825-9320-967376443020", siteId: "jairo-pinto", fullName: "Jairo Pinto",
  whatsapp: "+573188430283", updatedAt: "2026-08-20T19:17:02.933Z",
  onboardingData: { domain: "jairopinto.pro", whatsapp: "+5673188430283", phone: "+573188430283" }
});

async function fixture() {
  const root = await mkdtemp(resolve(tmpdir(), "cdx017-"));
  const leadsPath = resolve(root, "leads.json"); const snapshotPath = resolve(root, "activation-lead.json");
  const auditPackage = resolve(root, "audit"); const dryManifest = resolve(root, "dry-manifest.json"); const applyManifest = resolve(root, "apply-manifest.json");
  const leadsSource = json([lead()]); const snapshotSource = json(lead());
  const projectedSource = json([{ ...lead(), onboardingData: { ...lead().onboardingData, whatsapp: "+573188430283" } }]);
  await writeFile(leadsPath, leadsSource); await writeFile(snapshotPath, snapshotSource);
  const entry = { activationLeadId: "f403f29e-95c8-4825-9320-967376443020", siteId: "jairo-pinto",
    expectedActivationLeadSnapshotHash: hash(snapshotSource), expectedLeadsFileHash: hash(leadsSource),
    expectedCurrentLeadWhatsapp: "+573188430283", expectedCurrentOnboardingWhatsapp: "+5673188430283",
    expectedCurrentOnboardingPhone: "+573188430283", targetOnboardingWhatsapp: "+573188430283",
    targetWaMeDigits: "573188430283", auditPackage };
  await writeFile(dryManifest, json({ confirmation: DRY_CONFIRMATION, allowlist: [entry] }));
  return { root, leadsPath, snapshotPath, auditPackage, dryManifest, applyManifest, entry, leadsSource, projectedSource,
    expectedSnapshotHash: hash(snapshotSource) };
}

test("DRY_RUN backs up and proves an exact one-field projection without changing leads", async () => {
  const f = await fixture();
  const result = await dryRunJairoWhatsappCorrection({ ...f, manifestPath: f.dryManifest });
  assert.equal(result.changed, false); assert.equal(result.blocked, false);
  assert.deepEqual(result.diff, [{ path: "onboardingData.whatsapp", from: "+5673188430283", to: "+573188430283" }]);
  assert.equal(await readFile(f.leadsPath, "utf8"), f.leadsSource);
  assert.equal(await readFile(resolve(f.auditPackage, "backup", "leads.json"), "utf8"), f.leadsSource);
});

test("DRY_RUN blocks leads drift and snapshot drift without creating an audit package", async () => {
  const f = await fixture(); await writeFile(f.leadsPath, `${f.leadsSource} `);
  const drift = await dryRunJairoWhatsappCorrection({ ...f, manifestPath: f.dryManifest });
  assert.deepEqual(drift.blockedReasons, ["LEADS_FILE_HASH_DRIFT"]);
  const g = await fixture(); await writeFile(g.snapshotPath, json({ ...lead(), fullName: "Drift" }));
  const snapshotDrift = await dryRunJairoWhatsappCorrection({ ...g, manifestPath: g.dryManifest });
  assert(snapshotDrift.blockedReasons.includes("ACTIVATION_LEAD_SNAPSHOT_HASH_DRIFT"));
});

test("APPLY requires reviewed plan, writes atomically, journals and reruns idempotently", async () => {
  const f = await fixture(); const preview = await dryRunJairoWhatsappCorrection({ ...f, manifestPath: f.dryManifest });
  const applyEntry = { ...f.entry, expectedProjectedLeadsFileHash: hash(f.projectedSource) };
  await writeFile(f.applyManifest, json({ confirmation: APPLY_CONFIRMATION, expectedPlanHash: preview.planHash, allowlist: [applyEntry] }));
  const options = { ...f, manifestPath: f.applyManifest };
  const applied = await applyJairoWhatsappCorrection(options);
  assert.equal(applied.outcome, "APPLIED"); assert.equal(applied.changed, true);
  assert.equal(await readFile(f.leadsPath, "utf8"), f.projectedSource);
  const rerun = await applyJairoWhatsappCorrection(options);
  assert.equal(rerun.outcome, "ALREADY_APPLIED"); assert.equal(rerun.changed, false);
});

test("APPLY rolls back its write when post-write verification fails", async () => {
  const f = await fixture(); const preview = await dryRunJairoWhatsappCorrection({ ...f, manifestPath: f.dryManifest });
  await writeFile(f.applyManifest, json({ confirmation: APPLY_CONFIRMATION, expectedPlanHash: preview.planHash,
    allowlist: [{ ...f.entry, expectedProjectedLeadsFileHash: hash(f.projectedSource) }] }));
  await assert.rejects(applyJairoWhatsappCorrection({ ...f, manifestPath: f.applyManifest,
    hooks: { afterWrite: async ({ leads }) => writeFile(leads, "[]\n") } }), /POST_VERIFICATION_HASH_FAILED/);
  assert.equal(await readFile(f.leadsPath, "utf8"), f.leadsSource);
});

test("APPLY fails closed when claim ownership is lost and does not rollback shared state", async () => {
  const f = await fixture(); const preview = await dryRunJairoWhatsappCorrection({ ...f, manifestPath: f.dryManifest });
  await writeFile(f.applyManifest, json({ confirmation: APPLY_CONFIRMATION, expectedPlanHash: preview.planHash,
    allowlist: [{ ...f.entry, expectedProjectedLeadsFileHash: hash(f.projectedSource) }] }));
  await assert.rejects(applyJairoWhatsappCorrection({ ...f, manifestPath: f.applyManifest,
    hooks: { afterWrite: async (paths) => writeFile(paths.owner, json({ token: "winner", acquiredAt: new Date().toISOString() })) } }), /APPLY_CLAIM_OWNERSHIP_LOST/);
  assert.equal(await readFile(f.leadsPath, "utf8"), f.projectedSource);
});
