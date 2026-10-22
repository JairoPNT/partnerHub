import "server-only";
import { createHash } from "node:crypto";
import { readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { captureBusinessConsentCutoverArtifacts, createBusinessConsentCutoverAdapter,
  validateBusinessConsentCutoverPlan, readBusinessConsentCutoverArtifacts,
  type ConsentPlanMaterial, type ReleaseCapture } from "../../scripts/business-consent-master-release.mjs";
import { executeBusinessMasterTransition, captureBusinessMasterTree, type BusinessMasterTransitionAdapter } from "../../scripts/business-master-transition-lifecycle.mjs";
import { assertBusinessCutoverExclusive, bindBusinessCutoverMigration, readBusinessCutoverMigrationBinding,
  startBusinessCutoverMigration, withBusinessCutoverScopedWork, readBusinessCutoverStatus,
  type BusinessCutoverExclusiveScope, type MigrationBinding } from "@/server/services/businessCutoverMaintenanceService";

declare const captureBrand: unique symbol;
declare const permitBrand: unique symbol;
export type BusinessConsentCutoverCapture = { readonly [captureBrand]: true };
export type BusinessCutoverMigrationPermit = { readonly [permitBrand]: true };
export type CutoverPreview = Readonly<{ planHash: string; blockedReasons: readonly string[] }>;
const releaseId = "business-consent-successor-v1";
const closed = () => new Error("BUSINESS_CUTOVER_CLOSED");
const domain = (code: "PLAN_MISMATCH" | "PROFILE_INVALID" | "ARTIFACTS_UNAVAILABLE") => new Error(`BUSINESS_CUTOVER_${code}`);
const hash = (material: Uint8Array) => createHash("sha256").update(material).digest("hex");
type Captured = { scope: BusinessCutoverExclusiveScope; metadata: Awaited<ReturnType<typeof assertBusinessCutoverExclusive>>;
  releaseCapture: ReleaseCapture; material: ConsentPlanMaterial; bytes: Buffer; preview: CutoverPreview };
const captures = new WeakMap<BusinessConsentCutoverCapture, Captured>();
type Permit = { scope: BusinessCutoverExclusiveScope; adapter: BusinessMasterTransitionAdapter; captured: Captured; active: boolean };
const permits = new WeakMap<BusinessCutoverMigrationPermit, Permit>();

async function assertCapturePreStart(scope: BusinessCutoverExclusiveScope, binding: MigrationBinding | null) {
  const metadata = await assertBusinessCutoverExclusive(scope);
  const status = await readBusinessCutoverStatus(metadata.outputDirectory);
  if (status.operationId !== metadata.operationId || status.migrationStarted ||
    status.blockedReasons.some((reason) => reason !== "BUSINESS_CONTROLLER_PRESENT")) throw domain("PLAN_MISMATCH");
  if (binding && (await readdir(metadata.outputDirectory)).some((name) => name.startsWith(".ganomaster-business.refresh-"))) {
    throw domain("ARTIFACTS_UNAVAILABLE");
  }
  await assertBusinessCutoverExclusive(scope);
}

export function captureBusinessConsentCutover(scope: BusinessCutoverExclusiveScope): Promise<BusinessConsentCutoverCapture> {
  return withBusinessCutoverScopedWork(scope, () => captureCutover(scope));
}
async function captureCutover(scope: BusinessCutoverExclusiveScope): Promise<BusinessConsentCutoverCapture> {
  const metadata = await assertBusinessCutoverExclusive(scope);
  const binding = await readBusinessCutoverMigrationBinding(scope);
  try {
    await assertCapturePreStart(scope, binding);
    if (binding) {
      if (binding.releaseId !== releaseId) throw domain("PROFILE_INVALID");
      let saved: unknown;
      try { saved = JSON.parse(Buffer.from(binding.material).toString("utf8")); }
      catch { throw domain("PROFILE_INVALID"); }
      validateBusinessConsentCutoverPlan(saved, metadata);
      if (!Buffer.from(JSON.stringify(saved)).equals(Buffer.from(binding.material))) throw domain("PROFILE_INVALID");
    }
    const current = await captureBusinessConsentCutoverArtifacts({ outputRoot: metadata.outputDirectory,
      templateDirectory: resolve("/app/runtime-assets/business-consent-successor"),
      businessJobsDirectory: process.env.PRODUCT_PAGE_PUBLICATION_JOB_DIR ?? resolve(metadata.outputDirectory, ".publication-jobs") });
    await assertBusinessCutoverExclusive(scope);
    const material: ConsentPlanMaterial = { ...current.material, schemaVersion: 2,
      cutover: { operationId: metadata.operationId, recordDigest: metadata.recordDigest, releaseId } };
    validateBusinessConsentCutoverPlan(material, metadata);
    const bytes = Buffer.from(JSON.stringify(material));
    if (binding && (binding.planHash !== hash(bytes) || !bytes.equals(Buffer.from(binding.material)))) throw domain("PLAN_MISMATCH");
    const latest = await readBusinessCutoverMigrationBinding(scope);
    if (binding ? !latest || latest.planHash !== binding.planHash || latest.releaseId !== binding.releaseId ||
      !Buffer.from(latest.material).equals(Buffer.from(binding.material)) : latest !== null) throw domain("PLAN_MISMATCH");
    await assertCapturePreStart(scope, binding);
    const preview = Object.freeze({ planHash: hash(bytes), blockedReasons: Object.freeze([...current.blockedReasons]) });
    const capture = Object.freeze(Object.create(null)) as BusinessConsentCutoverCapture;
    captures.set(capture, { scope, metadata, releaseCapture: current.capture, material, bytes, preview });
    return capture;
  } catch (error) {
    await assertBusinessCutoverExclusive(scope);
    if (error instanceof Error && ["BUSINESS_CUTOVER_PROFILE_INVALID", "BUSINESS_CUTOVER_PLAN_MISMATCH"].includes(error.message)) throw error;
    throw domain("ARTIFACTS_UNAVAILABLE");
  }
}

export function describeBusinessConsentCutover(capture: BusinessConsentCutoverCapture): CutoverPreview {
  const state = captures.get(capture); if (!state) throw closed();
  return state.preview;
}

export function assertBusinessCutoverMigrationPermit(permit: BusinessCutoverMigrationPermit,
  adapter?: BusinessMasterTransitionAdapter, previousDirectory?: string): Promise<void> {
  const state = permits.get(permit);
  if (!state?.active) return Promise.reject(closed());
  return withBusinessCutoverScopedWork(state.scope, () => assertPermit(permit, adapter, previousDirectory));
}
async function assertPermit(permit: BusinessCutoverMigrationPermit,
  adapter?: BusinessMasterTransitionAdapter, previousDirectory?: string): Promise<void> {
  const state = permits.get(permit);
  if (!state?.active || (adapter !== undefined && adapter !== state.adapter)) throw closed();
  const metadata = await assertBusinessCutoverExclusive(state.scope);
  if (metadata.operationId !== state.captured.metadata.operationId || metadata.recordDigest !== state.captured.metadata.recordDigest ||
    metadata.outputDirectory !== state.captured.metadata.outputDirectory) throw closed();
  const binding = await readBusinessCutoverMigrationBinding(state.scope);
  if (!binding || binding.releaseId !== releaseId || binding.planHash !== state.captured.preview.planHash ||
    !Buffer.from(binding.material).equals(state.captured.bytes)) throw closed();
  // A closure cannot be borrowed from another operation or replaced with the
  // same JSON: controller/store prove the active physical owner on every call.
  if (JSON.stringify(await captureBusinessMasterTree(state.captured.material.paths.claimDirectory)) !==
    JSON.stringify(state.captured.material.writerSnapshot.claim)) throw closed();
  await state.adapter.assertRetainedCapture?.(previousDirectory);
  await assertBusinessCutoverExclusive(state.scope);
  if (!state.active) throw closed();
}

export function applyBusinessConsentCutover(scope: BusinessCutoverExclusiveScope, expectedPlanHash: string) {
  return withBusinessCutoverScopedWork(scope, () => applyCutover(scope, expectedPlanHash));
}
async function applyCutover(scope: BusinessCutoverExclusiveScope, expectedPlanHash: string): Promise<Readonly<{
  outcome: "APPLIED"; planHash: string; journalHash: string }>> {
  await assertBusinessCutoverExclusive(scope);
  if (typeof expectedPlanHash !== "string" || !/^[0-9a-f]{64}$/.test(expectedPlanHash)) throw domain("PLAN_MISMATCH");
  // Bound preSTART facts may be inspected for CANCEL, but never replay APPLY.
  if (await readBusinessCutoverMigrationBinding(scope)) throw domain("PLAN_MISMATCH");
  let authority: Permit | undefined;
  try {
    const capture = await captureBusinessConsentCutover(scope), state = captures.get(capture)!;
    if (state.preview.planHash !== expectedPlanHash) throw domain("PLAN_MISMATCH");
    if (state.preview.blockedReasons.length) throw domain("ARTIFACTS_UNAVAILABLE");
    const adapter = createBusinessConsentCutoverAdapter(state.releaseCapture, state.material, expectedPlanHash);
    await adapter.assertRetainedCapture?.();
    await assertBusinessCutoverExclusive(scope);
    await bindBusinessCutoverMigration(scope, { planHash: expectedPlanHash, releaseId, material: state.bytes });
    await adapter.assertRetainedCapture?.();
    await assertBusinessCutoverExclusive(scope);
    await startBusinessCutoverMigration(scope, expectedPlanHash);
    // The only mint is private, after current capture + exact durable start.
    const permit = Object.freeze(Object.create(null)) as BusinessCutoverMigrationPermit;
    authority = { scope, adapter, captured: state, active: true };
    permits.set(permit, authority); adapter.cutoverPermit = permit;
    Object.freeze(adapter);
    await assertBusinessCutoverMigrationPermit(permit, adapter);
    await executeBusinessMasterTransition(adapter);
    const readback = await readBusinessConsentCutover(scope);
    return Object.freeze({ outcome: "APPLIED", planHash: expectedPlanHash, journalHash: readback.journalHash });
  } catch (error) {
    await assertBusinessCutoverExclusive(scope);
    if (error instanceof Error && ["BUSINESS_CUTOVER_CLOSED", "BUSINESS_CUTOVER_PLAN_MISMATCH", "BUSINESS_CUTOVER_PROFILE_INVALID"].includes(error.message)) throw error;
    throw domain("ARTIFACTS_UNAVAILABLE");
  } finally { if (authority) authority.active = false; }
}

export function readBusinessConsentCutover(scope: BusinessCutoverExclusiveScope) {
  return withBusinessCutoverScopedWork(scope, () => readCutover(scope));
}
async function readCutover(scope: BusinessCutoverExclusiveScope): Promise<Readonly<{
  planHash: string; journalHash: string; packageHash: string; releaseId: string }>> {
  const metadata = await assertBusinessCutoverExclusive(scope);
  const binding = await readBusinessCutoverMigrationBinding(scope);
  if (!binding) throw domain("ARTIFACTS_UNAVAILABLE");
  try {
    if (binding.releaseId !== releaseId || hash(binding.material) !== binding.planHash) throw domain("PROFILE_INVALID");
    const material = JSON.parse(Buffer.from(binding.material).toString("utf8")) as ConsentPlanMaterial;
    if (!Buffer.from(JSON.stringify(material)).equals(Buffer.from(binding.material))) throw domain("PROFILE_INVALID");
    validateBusinessConsentCutoverPlan(material, metadata);
    const status = await readBusinessCutoverStatus(metadata.outputDirectory);
    // STATUS remains read-only and may report our live controller as BLOCKED;
    // its independently validated journal still must prove this exact start.
    if (status.operationId !== metadata.operationId || !status.migrationStarted) throw domain("ARTIFACTS_UNAVAILABLE");
    const facts = await readBusinessConsentCutoverArtifacts(material, metadata);
    await assertBusinessCutoverExclusive(scope);
    return Object.freeze({ planHash: binding.planHash, ...facts, releaseId });
  } catch (error) {
    await assertBusinessCutoverExclusive(scope);
    if (error instanceof Error && error.message === "BUSINESS_CUTOVER_PROFILE_INVALID") throw error;
    throw domain("ARTIFACTS_UNAVAILABLE");
  }
}
