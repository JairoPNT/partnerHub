import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { resumeBusinessCutoverClosure } from "@/server/services/businessCutoverClaimStore";
import { beginBusinessCutover, drainBusinessCutover, readBusinessCutoverStatus,
  withBusinessCutoverController, withBusinessCutoverExclusive } from "@/server/services/businessCutoverMaintenanceService";
import { captureBusinessConsentCutover, describeBusinessConsentCutover, applyBusinessConsentCutover } from "@/server/services/businessConsentCutoverMigration";
import { inspectBusinessCutoverReleaseProfile } from "@/server/services/businessCutoverReleaseProfile";
import { verifyBusinessConsentRelease, assertBusinessCutoverVerifiedRelease } from "@/server/services/businessCutoverReleaseVerification";
import { finishBusinessConsentCutover, readBusinessConsentCutoverOutcome, readBusinessCutoverReleaseError,
  type CutoverReleaseResult } from "@/server/services/businessCutoverReleaseService";

type Mode = "BEGIN" | "DRAIN" | "PREVIEW" | "APPLY" | "VERIFY" | "REOPEN" | "CANCEL";
type Arguments = Readonly<{ mode: Mode; operationId: string; timeoutMs: number; expectedPlanHash?: string }>;
type Output = { requestId: "CDX-20261021-011"; mode: Mode | null; status: string; reasons: string[]; planHash?: string;
  metadataWritesMade: boolean | null; packageWritesMade: boolean | null; providerCallsMade: false; publicationMade: false;
  commitObserved?: boolean; persistenceConfirmed?: boolean };
type Result = { exitCode: 0 | 1 | 2 | 3; output: Output };
const invalid = () => new Error("BUSINESS_CUTOVER_ARGUMENT_INVALID");
const domains = new Set(["BUSINESS_CUTOVER_CLOSED", "BUSINESS_CUTOVER_PLAN_MISMATCH", "BUSINESS_CUTOVER_PROFILE_INVALID", "BUSINESS_CUTOVER_ARTIFACTS_UNAVAILABLE"]);

/** Data only. No root, capability, runtime profile or approval input is accepted. */
export function parseBusinessConsentCutoverArguments(argv: readonly string[]): Arguments {
  const fields = new Map<string, string>();
  for (const arg of argv) {
    const match = /^--([a-z-]+)=(.+)$/.exec(arg);
    if (!match || fields.has(match[1])) throw invalid();
    fields.set(match[1], match[2]);
  }
  const mode = fields.get("mode") as Mode, operationId = fields.get("operation-id");
  if (!["BEGIN", "DRAIN", "PREVIEW", "APPLY", "VERIFY", "REOPEN", "CANCEL"].includes(mode) ||
    !operationId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(operationId)) throw invalid();
  const allowed = new Set(["mode", "operation-id"]);
  let timeoutMs = 0;
  if (mode === "DRAIN") {
    allowed.add("timeout-ms");
    const value = fields.get("timeout-ms");
    if (value !== undefined) {
      if (!/^(0|[1-9][0-9]*)$/.test(value) || Number(value) > 30000) throw invalid();
      timeoutMs = Number(value);
    }
  }
  const confirmations = { APPLY: "MIGRATE_REVIEWED_BUSINESS_CONSENT_MASTER", REOPEN: "REOPEN_VERIFIED_BUSINESS_CONSENT_MASTER",
    CANCEL: "CANCEL_UNSTARTED_BUSINESS_CONSENT_CUTOVER" };
  if (mode === "APPLY" || mode === "REOPEN" || mode === "CANCEL") {
    allowed.add("confirm"); if (fields.get("confirm") !== confirmations[mode]) throw invalid();
  }
  if (mode === "APPLY") {
    allowed.add("expected-plan-hash"); if (!/^[0-9a-f]{64}$/.test(fields.get("expected-plan-hash") ?? "")) throw invalid();
  }
  if ([...fields.keys()].some((key) => !allowed.has(key))) throw invalid();
  return Object.freeze({ mode, operationId, timeoutMs, ...(mode === "APPLY" ? { expectedPlanHash: fields.get("expected-plan-hash")! } : {}) });
}

/** The only dispatcher. Each invocation resolves config and genuine handles in
 * this graph; callers cannot inject controllers, profiles, permits or proofs.
 * null write flags mean an attempted operation failed at an unobservable phase,
 * never a claim of no writes. No provider or publisher is invoked here.
 */
export async function runBusinessConsentCutover(argv: readonly string[]): Promise<Result> {
  const output: Output = { requestId: "CDX-20261021-011", mode: null, status: "ERROR", reasons: [],
    metadataWritesMade: false, packageWritesMade: false, providerCallsMade: false, publicationMade: false };
  let options: Arguments;
  try { options = parseBusinessConsentCutoverArguments(argv); }
  catch { return { exitCode: 1, output: { ...output, reasons: ["BUSINESS_CUTOVER_ARGUMENT_INVALID"] } }; }
  output.mode = options.mode;
  const fail = (error: unknown): Result => {
    // Registered same-graph identity takes precedence over every message/shape.
    const observed = readBusinessCutoverReleaseError(error);
    if (observed) return terminal(observed);
    const reason = error instanceof Error && domains.has(error.message) ? error.message : "BUSINESS_CUTOVER_COMMAND_FAILED";
    output.status = domains.has(reason) ? "BLOCKED" : "ERROR"; output.reasons = [reason];
    return { exitCode: domains.has(reason) ? 2 : 1, output };
  };
  const terminal = (value: CutoverReleaseResult): Result => {
    output.status = value.outcome; output.reasons = value.persistenceConfirmed ? [] : ["RELEASE_COMMIT_UNCONFIRMED"];
    output.commitObserved = value.commitObserved; output.persistenceConfirmed = value.persistenceConfirmed;
    return { exitCode: value.persistenceConfirmed ? 0 : 3, output };
  };
  let diagnosticRoot: string | undefined, verificationStarted = false;
  try {
    const root = resolve(process.env.PRODUCT_PAGE_OUTPUT_DIR ?? "/data/generated-sites");
    diagnosticRoot = root;
    if (options.mode === "BEGIN") {
      // Fresh inventory and pins, NOT compiled metadata, before any claim/write.
      const profile = await inspectBusinessCutoverReleaseProfile();
      // This runner implements one fixed predecessor→successor transition.
      // SUCCESSOR is valid for resumed VERIFY/REOPEN, never a fresh BEGIN.
      if (profile.releaseId !== "business-consent-predecessor-v1") throw new Error("BUSINESS_CUTOVER_PROFILE_INVALID");
      output.metadataWritesMade = null;
      const state = await beginBusinessCutover(root, options.operationId);
      output.metadataWritesMade = true; output.status = state.status; output.reasons = state.blockedReasons;
      return { exitCode: state.status === "BLOCKED" ? 2 : 0, output };
    }
    const handle = await resumeBusinessCutoverClosure(root, options.operationId);
    output.metadataWritesMade = null;
    // Await OUTER cleanup too: successful rename followed by cleanup failure is
    // privately registered uncertainty, never a confirmed successful release.
    const result = await withBusinessCutoverController(handle, async (control) => {
      output.metadataWritesMade = true;
      if (options.mode === "DRAIN") {
        const state = await drainBusinessCutover(control, options.timeoutMs);
        output.status = state.status; output.reasons = state.blockedReasons;
        return { exitCode: state.status === "BLOCKED" ? 2 : 0, output } as Result;
      }
      return withBusinessCutoverExclusive(control, async (scope): Promise<Result> => {
        // Controlled domain errors are values; throwing through the010 wrapper
        // deliberately normalizes them to CLOSED. Genuine terminal errors are
        // also authenticated here and again if outer cleanup later fails.
        try {
          if (options.mode === "PREVIEW" || options.mode === "APPLY") {
            const preview = describeBusinessConsentCutover(await captureBusinessConsentCutover(scope));
            output.planHash = preview.planHash;
            if (preview.blockedReasons.length) { output.status = "BLOCKED"; output.reasons = [...preview.blockedReasons]; return { exitCode: 2, output }; }
            if (options.mode === "PREVIEW") { output.status = "PREVIEWED"; return { exitCode: 0, output }; }
            if (preview.planHash !== options.expectedPlanHash) throw new Error("BUSINESS_CUTOVER_PLAN_MISMATCH");
            output.packageWritesMade = null;
            const applied = await applyBusinessConsentCutover(scope, options.expectedPlanHash!);
            output.packageWritesMade = true; output.status = applied.outcome; output.planHash = applied.planHash;
            return { exitCode: 0, output };
          }
          if (options.mode === "VERIFY") {
            // Once genuine scoped verification starts, its profile/plan/proof
            // failures stay failures; historical data must never replace them.
            verificationStarted = true;
            const state = await readBusinessCutoverStatus(root);
            const proof = await verifyBusinessConsentRelease(scope, state.migrationStarted ? "REOPEN" : "CANCEL");
            const facts = await assertBusinessCutoverVerifiedRelease(proof, scope);
            if (facts.planHash) output.planHash = facts.planHash;
            output.status = "VERIFIED"; return { exitCode: 0, output };
          }
          if (options.mode === "REOPEN" || options.mode === "CANCEL")
            return terminal(await finishBusinessConsentCutover(scope, options.mode));
          throw invalid();
        } catch (error) { return fail(error); }
      });
    });
    return result;
  } catch (error) {
    if (options.mode === "VERIFY" && diagnosticRoot !== undefined && !verificationStarted) {
      // Authority is unavailable (released, orphaned or conflicting). The
      // existing operation-specific reader is data-only: never resume from its
      // result, retry APPLY/finish, or touch a newer global owner. Preserve any
      // preceding controller attempt's truthful false/true/null write flags.
      const value = await readBusinessConsentCutoverOutcome(diagnosticRoot, options.operationId)
        .catch(() => ({ outcome: "UNKNOWN" as const, persistenceConfirmed: false }));
      output.status = value.outcome; output.persistenceConfirmed = false;
      output.reasons = [value.outcome === "RELEASED" ? "RELEASE_COMMIT_UNCONFIRMED" :
        value.outcome === "CLOSED" ? "BUSINESS_CUTOVER_CLOSED" : "BUSINESS_CUTOVER_OUTCOME_UNKNOWN"];
      if (value.outcome === "RELEASED") output.commitObserved = true;
      // Even a complete on-disk receipt cannot certify its final fsync/cleanup.
      return { exitCode: value.outcome === "RELEASED" ? 3 : 2, output };
    }
    return fail(error);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const result = await runBusinessConsentCutover(process.argv.slice(2));
  const emit = result.exitCode === 1 ? console.error : console.log;
  emit(JSON.stringify(result.output)); process.exitCode = result.exitCode;
}
