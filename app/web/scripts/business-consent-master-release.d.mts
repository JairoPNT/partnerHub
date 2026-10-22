import type { BusinessCutoverOperation } from "../server/services/businessCutoverClaimStore.ts";
import type { BusinessMasterTransitionAdapter, TreeProof, AncestorProof } from "./business-master-transition-lifecycle.mjs";
export const REQUEST_ID: "CDX-20261021-009";
export const OPERATION: "MIGRATE_REVIEWED_BUSINESS_CONSENT_MASTER";
export const APPLY_MODE: "APPLY_GUARDED_BUSINESS_CONSENT_MASTER_MIGRATION";
export const APPLY_CONFIRMATION: "MIGRATE_REVIEWED_BUSINESS_CONSENT_MASTER";
export type MigrationOptions = { outputRoot?: string; templateDirectory?: string; businessJobsDirectory?: string;
  mode?: string; confirmation?: string; expectedPlanHash?: string };
export type ConsentPlanMaterial = {
  schemaVersion: number; requestId: string; operation: string; reviewedCommit: string; providers: { ga4: false; meta: false };
  paths: Record<string, string>; ancestors: Record<string, AncestorProof>; predecessor: TreeProof;
  lineage: { originalJournalHash: string; refreshJournalHash: string; archive: TreeProof; originalProof: TreeProof; refreshProof: TreeProof;
    originalJournal: unknown; refreshJournal: unknown };
  successor: { hash: string; files: { path: string; hash: string }[]; templateHash: string; templateProof: TreeProof; manifest: unknown };
  writerSnapshot: { claim: TreeProof; jobs: TreeProof; siteClaims: TreeProof; classified: unknown[]; blockedReasons: string[] };
  previousPackageFiles: { path: string; hash: string }[];
  cutover?: { operationId: string; recordDigest: string; releaseId: string };
};
declare const releaseCaptureBrand: unique symbol;
export type ReleaseCapture = { readonly [releaseCaptureBrand]: true };
export function captureBusinessConsentCutoverArtifacts(options: MigrationOptions): Promise<{
  capture: ReleaseCapture; material: ConsentPlanMaterial; blockedReasons: readonly string[] }>;
export function createBusinessConsentCutoverAdapter(capture: ReleaseCapture, material: ConsentPlanMaterial, hash: string): BusinessMasterTransitionAdapter;
export function validateBusinessConsentCutoverPlan(material: unknown, operation: BusinessCutoverOperation): Readonly<{ hash: string }>;
export function readBusinessConsentCutoverArtifacts(material: ConsentPlanMaterial, operation: BusinessCutoverOperation): Promise<Readonly<{ journalHash: string; packageHash: string }>>;
export function planBusinessConsentMasterMigration(options?: MigrationOptions): Promise<Readonly<{ planHash: string; blockedReasons: string[]; blocked: boolean }>>;
export function applyBusinessConsentMasterMigration(options?: MigrationOptions): Promise<never>;
export function readBusinessConsentMasterMigration(options?: MigrationOptions): Promise<unknown>;
