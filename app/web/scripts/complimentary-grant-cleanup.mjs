import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

export const APPLY_MODE = "APPLY_COMPLIMENTARY_GRANT_CLEANUP";
export const APPLY_CONFIRMATION = "REMOVE_EXPLICIT_DUPLICATE_GRANT";
const grantIdPattern = /^[0-9a-f]{64}$/i;
const ecosystems = ["PRODUCT", "BUSINESS", "PERSONAL_BRAND"];

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function activeOn(record, effectiveDate) {
  return record.effectiveDate <= effectiveDate && (!record.cutoffDate || record.cutoffDate >= effectiveDate);
}

function validateManifest(manifest) {
  if (!manifest || manifest.confirmation !== APPLY_CONFIRMATION) {
    throw new Error(`Manifest requires confirmation=${APPLY_CONFIRMATION}.`);
  }
  for (const field of ["activationLeadId", "removeGrantId", "keepGrantId", "effectiveDate"]) {
    if (typeof manifest[field] !== "string" || manifest[field].length === 0) throw new Error(`Manifest requires ${field}.`);
  }
  if (!grantIdPattern.test(manifest.removeGrantId) || !grantIdPattern.test(manifest.keepGrantId)) {
    throw new Error("Grant IDs must be complete 64-character SHA-256 identifiers.");
  }
  if (manifest.removeGrantId === manifest.keepGrantId) throw new Error("removeGrantId and keepGrantId must differ.");
  if (!Array.isArray(manifest.expectedEntitlement) || manifest.expectedEntitlement.some((item) => !ecosystems.includes(item))) {
    throw new Error("Manifest expectedEntitlement must contain supported ecosystems.");
  }
  return manifest;
}

function inventory(record) {
  return {
    id: record.id,
    activationLeadId: record.activationLeadId,
    ecosystemTypes: record.ecosystemTypes,
    grantReason: record.grantReason,
    effectiveDate: record.effectiveDate,
    cutoffDate: record.cutoffDate ?? null,
    createdAt: record.createdAt
  };
}

export function planComplimentaryGrantCleanup({ records, manifest }) {
  const checked = validateManifest(manifest);
  const remove = records.find((record) => record.id === checked.removeGrantId);
  const keep = records.find((record) => record.id === checked.keepGrantId);
  const protectedRecords = records.filter((record) => record.id !== checked.removeGrantId);
  const projectedEntitlement = [...new Set(protectedRecords
    .filter((record) => record.activationLeadId === checked.activationLeadId)
    .filter((record) => activeOn(record, checked.effectiveDate))
    .flatMap((record) => record.ecosystemTypes))];
  const missingEntitlement = checked.expectedEntitlement.filter((item) => !projectedEntitlement.includes(item));
  const blockedReasons = [];
  if (!remove) blockedReasons.push("REMOVE_GRANT_NOT_FOUND");
  if (!keep) blockedReasons.push("KEEP_GRANT_NOT_FOUND");
  if (remove && remove.activationLeadId !== checked.activationLeadId) blockedReasons.push("REMOVE_GRANT_PARTNER_MISMATCH");
  if (keep && keep.activationLeadId !== checked.activationLeadId) blockedReasons.push("KEEP_GRANT_PARTNER_MISMATCH");
  if (missingEntitlement.length > 0) blockedReasons.push("EXPECTED_ENTITLEMENT_NOT_PRESERVED");
  return {
    blocked: blockedReasons.length > 0,
    blockedReasons,
    remove: remove ? inventory(remove) : null,
    keep: keep ? inventory(keep) : null,
    projectedEntitlement,
    expectedEntitlement: [...checked.expectedEntitlement],
    missingEntitlement,
    protectedGrantCount: protectedRecords.length
  };
}

async function writeBackup({ backupDirectory, ledgerSource, ledgerHash, manifest, plan }) {
  await mkdir(backupDirectory, { recursive: true });
  await Promise.all([
    writeFile(resolve(backupDirectory, "complimentary-ecosystem-grants.json"), ledgerSource, "utf8"),
    writeFile(resolve(backupDirectory, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8"),
    writeFile(resolve(backupDirectory, "dry-run.json"), `${JSON.stringify({ ...plan, ledgerHash }, null, 2)}\n`, "utf8")
  ]);
}

export async function cleanupComplimentaryGrant({ storageDirectory, manifest, mode = "DRY_RUN", confirmation, expectedLedgerHash, now = new Date() }) {
  if (mode !== "DRY_RUN" && mode !== APPLY_MODE) throw new Error(`Unsupported cleanup mode: ${mode}.`);
  if (mode === APPLY_MODE && confirmation !== APPLY_CONFIRMATION) {
    throw new Error(`${APPLY_MODE} requires --confirm=${APPLY_CONFIRMATION}.`);
  }
  const ledgerPath = resolve(storageDirectory, "complimentary-ecosystem-grants.json");
  const ledgerSource = await readFile(ledgerPath, "utf8");
  const records = JSON.parse(ledgerSource);
  if (!Array.isArray(records)) throw new Error("Complimentary grant ledger must be a JSON array.");
  const ledgerHash = sha256(ledgerSource);
  const plan = planComplimentaryGrantCleanup({ records, manifest });
  const backupDirectory = resolve(storageDirectory, "backups", `${now.toISOString().replaceAll(":", "-")}-complimentary-grant-cleanup`);
  if (mode === "DRY_RUN") {
    await writeBackup({ backupDirectory, ledgerSource, ledgerHash, manifest, plan });
    return { mode, changed: false, ledgerHash, backupDirectory, ...plan };
  }
  if (plan.blocked) throw new Error(`APPLY blocked: ${plan.blockedReasons.join(", ")}.`);
  if (!expectedLedgerHash || expectedLedgerHash !== ledgerHash) {
    throw new Error("APPLY blocked because the ledger hash does not match the reviewed DRY_RUN.");
  }
  await writeBackup({ backupDirectory, ledgerSource, ledgerHash, manifest, plan });
  const remaining = records.filter((record) => record.id !== manifest.removeGrantId);
  const temporary = `${ledgerPath}.tmp-${process.pid}-${Date.now()}`;
  await writeFile(temporary, `${JSON.stringify(remaining, null, 2)}\n`, "utf8");
  await rename(temporary, ledgerPath);
  const persisted = JSON.parse(await readFile(ledgerPath, "utf8"));
  if (persisted.some((record) => record.id === manifest.removeGrantId)) throw new Error("Post-APPLY verification failed.");
  return { mode, changed: true, ledgerHash, backupDirectory, ...plan };
}

async function main() {
  if (process.argv.includes("--apply")) throw new Error(`Generic --apply is disabled. Use --mode=${APPLY_MODE}.`);
  const argument = (name) => process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);
  const manifestPath = argument("manifest");
  if (!manifestPath) throw new Error("--manifest=<path> is required.");
  const manifest = JSON.parse(await readFile(resolve(manifestPath), "utf8"));
  const result = await cleanupComplimentaryGrant({
    storageDirectory: process.env.PRODUCT_PAGE_COMMERCIAL_GRANT_DIR ?? "/data/generated-sites/.commercial-grants",
    manifest,
    mode: argument("mode") ?? "DRY_RUN",
    confirmation: argument("confirm"),
    expectedLedgerHash: argument("expected-ledger-hash")
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
