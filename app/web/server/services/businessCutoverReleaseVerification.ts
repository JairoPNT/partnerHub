import "server-only";
import { createHash } from "node:crypto";
import { readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { captureBusinessMasterTree } from "../../scripts/business-master-transition-lifecycle.mjs";
import { assertBusinessCutoverExclusive, readBusinessCutoverMigrationBinding, readBusinessCutoverStatus,
  withBusinessCutoverScopedWork, type BusinessCutoverExclusiveScope } from "@/server/services/businessCutoverMaintenanceService";
import { captureBusinessConsentCutover, describeBusinessConsentCutover, readBusinessConsentCutover } from "@/server/services/businessConsentCutoverMigration";
import { inspectBusinessCutoverReleaseProfile, type CutoverReleaseId } from "@/server/services/businessCutoverReleaseProfile";

declare const proofBrand: unique symbol;
export type BusinessCutoverVerifiedRelease = { readonly [proofBrand]: true };
type Kind = "CANCEL" | "REOPEN";
type Facts = Readonly<{ kind: Kind; releaseId: CutoverReleaseId; planHash: string | null; factsHash: string }>;
const proofs = new WeakMap<BusinessCutoverVerifiedRelease, { scope: BusinessCutoverExclusiveScope; facts: Facts }>();
const closed = () => new Error("BUSINESS_CUTOVER_CLOSED");
const invalid = () => new Error("BUSINESS_CUTOVER_PROFILE_INVALID");
const unavailable = () => new Error("BUSINESS_CUTOVER_ARTIFACTS_UNAVAILABLE");
const hash = (bytes: string | Uint8Array) => createHash("sha256").update(bytes).digest("hex");

async function currentFacts(scope: BusinessCutoverExclusiveScope, kind: Kind): Promise<Facts> {
  const metadata = await assertBusinessCutoverExclusive(scope);
  if (kind !== "CANCEL" && kind !== "REOPEN") throw invalid();
  try {
    const profile = await inspectBusinessCutoverReleaseProfile();
    await assertBusinessCutoverExclusive(scope);
    const expected = kind === "CANCEL" ? "business-consent-predecessor-v1" : "business-consent-successor-v1";
    if (profile.releaseId !== expected) throw invalid();
    const status = await readBusinessCutoverStatus(metadata.outputDirectory);
    const binding = await readBusinessCutoverMigrationBinding(scope);
    if (status.operationId !== metadata.operationId) throw unavailable();
    let planHash: string | null = null, packageFacts: unknown;
    if (kind === "CANCEL") {
      if (status.migrationStarted) throw invalid();
      if ((await readdir(metadata.outputDirectory)).some((name) => name.startsWith(".ganomaster-business.refresh-"))) throw unavailable();
      // Genuine T2 capture rechecks9760/e9a2, original canonical hashes, fixed
      // successor pins, histories, private claim, jobs and absent audit/reserves.
      const preview = describeBusinessConsentCutover(await captureBusinessConsentCutover(scope));
      if (preview.blockedReasons.length) throw unavailable();
      // Binding is control metadata, not migration: T2 freshly proves an exact
      // intact bound preSTART capture, while APPLY keeps its replay guard.
      planHash = binding?.planHash ?? null;
      packageFacts = { predecessorPlanHash: preview.planHash };
    } else {
      if (!status.migrationStarted || !binding) throw unavailable();
      // Authority producer owns schema2, current ancestry and immutable lineage
      // checks. Never parse a stored VERIFIED value or mint a migration permit.
      const readback = await readBusinessConsentCutover(scope);
      if (readback.releaseId !== expected || binding.releaseId !== expected || binding.planHash !== readback.planHash) throw invalid();
      planHash = readback.planHash;
      // Pin facts during this proof's short lifetime, not to the old /app overlay.
      packageFacts = { ...readback, installed: await captureBusinessMasterTree(resolve(metadata.outputDirectory, "ganomaster-business")) };
    }
    await assertBusinessCutoverExclusive(scope);
    return Object.freeze({ kind, releaseId: profile.releaseId, planHash,
      factsHash: hash(JSON.stringify({ metadata, profile, binding: binding ? { planHash: binding.planHash, releaseId: binding.releaseId, materialHash: hash(binding.material) } : null,
        migrationStarted: status.migrationStarted, packageFacts })) });
  } catch (error) {
    await assertBusinessCutoverExclusive(scope);
    if (error instanceof Error && ["BUSINESS_CUTOVER_CLOSED", "BUSINESS_CUTOVER_PROFILE_INVALID", "BUSINESS_CUTOVER_PLAN_MISMATCH", "BUSINESS_CUTOVER_ARTIFACTS_UNAVAILABLE"].includes(error.message)) throw error;
    throw unavailable();
  }
}

export function verifyBusinessConsentRelease(scope: BusinessCutoverExclusiveScope, kind: Kind): Promise<BusinessCutoverVerifiedRelease> {
  return withBusinessCutoverScopedWork(scope, async () => {
    const facts = await currentFacts(scope, kind);
    await assertBusinessCutoverExclusive(scope);
    const proof = Object.freeze(Object.create(null)) as BusinessCutoverVerifiedRelease;
    proofs.set(proof, { scope, facts }); return proof;
  });
}

export function assertBusinessCutoverVerifiedRelease(proof: BusinessCutoverVerifiedRelease,
  scope: BusinessCutoverExclusiveScope): Promise<Facts> {
  return withBusinessCutoverScopedWork(scope, async () => {
    const state = proofs.get(proof);
    if (!state || state.scope !== scope) throw closed();
    const fresh = await currentFacts(scope, state.facts.kind);
    if (JSON.stringify(fresh) !== JSON.stringify(state.facts)) throw unavailable();
    await assertBusinessCutoverExclusive(scope); return fresh;
  });
}
