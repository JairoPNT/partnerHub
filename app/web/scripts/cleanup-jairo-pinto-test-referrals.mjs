import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

export const TARGET_SITE_ID = "jairo-pinto-test";
export const DESTINATION_SITE_ID = "jairo-pinto";
export const APPLY_MODE = "APPLY_REFERRAL_RELATIONS";
export const APPLY_CONFIRMATION = `${APPLY_MODE}:${TARGET_SITE_ID}->${DESTINATION_SITE_ID}`;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function relationView(record) {
  return {
    id: record.id,
    referrerCode: record.referrerCode,
    referrerSiteId: record.referrerSiteId,
    referredSiteId: record.referredSiteId,
    status: record.status
  };
}

export function planReferralRelationCleanup({ codes, referrals }) {
  const candidates = referrals.filter((record) => record.referrerSiteId === TARGET_SITE_ID).map(relationView);
  const blocked = candidates
    .filter((record) => typeof record.id !== "string" || !uuidPattern.test(record.id))
    .map((record) => ({ ...record, reason: "INVALID_OR_MISSING_REFERRAL_UUID" }));
  const blockedIds = new Set(blocked.map((record) => record.id));
  const deletable = candidates.filter((record) => !blockedIds.has(record.id));
  const targetCodes = codes.filter((record) => record.siteId === TARGET_SITE_ID);
  const destinationCodes = new Set(codes.filter((record) => record.siteId === DESTINATION_SITE_ID).map((record) => record.code));
  const codeConflicts = targetCodes.filter((record) => codes.some((candidate) =>
    candidate.code === record.code && candidate.siteId !== TARGET_SITE_ID && candidate.siteId !== DESTINATION_SITE_ID
  ));
  const codeReleaseCandidate = targetCodes.length === 1
    ? {
        code: targetCodes[0].code,
        fromSiteId: TARGET_SITE_ID,
        destinationSiteId: DESTINATION_SITE_ID,
        alreadyAssignedToDestination: destinationCodes.has(targetCodes[0].code),
        releasable: blocked.length === 0 && codeConflicts.length === 0,
        blockers: [
          ...blocked.map((record) => `REFERRAL_BLOCKED:${record.id ?? "MISSING_ID"}`),
          ...codeConflicts.map((record) => `CODE_ASSIGNED_TO_UNEXPECTED_SITE:${record.code}`)
        ]
      }
    : null;

  return {
    targetSiteId: TARGET_SITE_ID,
    destinationSiteId: DESTINATION_SITE_ID,
    referralRelationsCandidates: candidates,
    referralRelationsDeletable: deletable,
    referralRelationsBlocked: blocked,
    leadDeletionBlocked: true,
    protectedDependencies: [
      {
        type: "LEAD_DELETION_OUT_OF_SCOPE",
        siteId: TARGET_SITE_ID,
        reason: "Physical lead deletion requires a separate dependency audit."
      },
      ...targetCodes.map((record) => ({
        type: "REFERRAL_CODE_ASSIGNMENT",
        siteId: TARGET_SITE_ID,
        code: record.code,
        reason: "The code assignment may only change inside the relation cleanup transaction."
      }))
    ],
    codeReleaseCandidate
  };
}

async function writeTransaction({ codesPath, referralsPath, codesSource, referralsSource, nextCodes, nextReferrals }) {
  const suffix = `${process.pid}-${Date.now()}`;
  const codesTemporary = `${codesPath}.tmp-${suffix}`;
  const referralsTemporary = `${referralsPath}.tmp-${suffix}`;
  await Promise.all([
    writeFile(codesTemporary, `${JSON.stringify(nextCodes, null, 2)}\n`, "utf8"),
    writeFile(referralsTemporary, `${JSON.stringify(nextReferrals, null, 2)}\n`, "utf8")
  ]);
  await rename(referralsTemporary, referralsPath);
  try {
    await rename(codesTemporary, codesPath);
  } catch (error) {
    await writeFile(referralsPath, referralsSource, "utf8");
    await writeFile(codesPath, codesSource, "utf8");
    throw error;
  }
}

export async function cleanupJairoPintoTestReferrals({ storageDirectory, mode = "DRY_RUN", confirmation, now = new Date() }) {
  if (mode !== "DRY_RUN" && mode !== APPLY_MODE) throw new Error(`Unsupported cleanup mode: ${mode}.`);
  if (mode === APPLY_MODE && confirmation !== APPLY_CONFIRMATION) {
    throw new Error(`${APPLY_MODE} requires --confirm=${APPLY_CONFIRMATION}.`);
  }
  const codesPath = resolve(storageDirectory, "codes.json");
  const referralsPath = resolve(storageDirectory, "referrals.json");
  const [codesSource, referralsSource] = await Promise.all([readFile(codesPath, "utf8"), readFile(referralsPath, "utf8")]);
  const codes = JSON.parse(codesSource);
  const referrals = JSON.parse(referralsSource);
  const plan = planReferralRelationCleanup({ codes, referrals });
  const result = { mode, ...plan, backupDirectory: null, changed: false };

  if (mode === "DRY_RUN" || plan.referralRelationsCandidates.length === 0) return result;
  if (plan.referralRelationsBlocked.length > 0 || !plan.codeReleaseCandidate?.releasable) {
    throw new Error("APPLY_REFERRAL_RELATIONS is blocked by the DRY_RUN plan.");
  }
  const deletableIds = new Set(plan.referralRelationsDeletable.map((record) => record.id));
  const nextReferrals = referrals.filter((record) => !deletableIds.has(record.id));
  const releasedCode = plan.codeReleaseCandidate.code;
  const nextCodes = codes.filter((record) => !(record.siteId === TARGET_SITE_ID && record.code === releasedCode));
  const backupName = `${now.toISOString().replaceAll(":", "-")}-${APPLY_MODE.toLowerCase()}`;
  const backupDirectory = resolve(storageDirectory, "backups", backupName);
  await mkdir(backupDirectory, { recursive: true });
  await Promise.all([
    writeFile(resolve(backupDirectory, "codes.json"), codesSource, "utf8"),
    writeFile(resolve(backupDirectory, "referrals.json"), referralsSource, "utf8"),
    writeFile(resolve(backupDirectory, "audit.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8")
  ]);
  await writeTransaction({ codesPath, referralsPath, codesSource, referralsSource, nextCodes, nextReferrals });
  return { ...result, backupDirectory, changed: true };
}

async function main() {
  if (process.argv.includes("--apply")) throw new Error(`Generic --apply is disabled. Use --mode=${APPLY_MODE}.`);
  const mode = process.argv.find((argument) => argument.startsWith("--mode="))?.split("=")[1] ?? "DRY_RUN";
  const confirmation = process.argv.find((argument) => argument.startsWith("--confirm="))?.slice("--confirm=".length);
  const storageDirectory = process.env.PRODUCT_PAGE_REFERRAL_DIR ?? "/data/generated-sites/.referrals";
  const result = await cleanupJairoPintoTestReferrals({ storageDirectory, mode, confirmation });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
