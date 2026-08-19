import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

export const APPLY_MODE = "APPLY_PAYMENT_TEST_DATA_PURGE";
export const APPLY_CONFIRMATION = "PURGE_CONFIRMED_PAYMENT_TEST_DATA";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function inventoryRecord(payment) {
  return {
    id: payment.id,
    partner: payment.siteId ?? payment.activationLeadId,
    amountCop: payment.amountCop,
    paidAt: payment.paidAt,
    status: payment.status,
    method: payment.method,
    reference: payment.reference ?? null,
    hasCommercialSnapshot: Boolean(payment.commercialSnapshot)
  };
}

function validateManifest(manifest) {
  if (!manifest || manifest.confirmation !== APPLY_CONFIRMATION || !Array.isArray(manifest.paymentIds)) {
    throw new Error(`Manifest requires confirmation=${APPLY_CONFIRMATION} and paymentIds.`);
  }
  if (manifest.paymentIds.length === 0) throw new Error("Manifest paymentIds must not be empty.");
  if (manifest.paymentIds.some((id) => typeof id !== "string" || !uuidPattern.test(id))) {
    throw new Error("Every paymentId must be a complete UUID.");
  }
  if (new Set(manifest.paymentIds).size !== manifest.paymentIds.length) {
    throw new Error("Manifest paymentIds must not contain duplicates.");
  }
  return manifest.paymentIds;
}

export function planPaymentTestDataPurge({ payments, manifest }) {
  const paymentIds = validateManifest(manifest);
  const selectedIds = new Set(paymentIds);
  const selected = payments.filter((payment) => selectedIds.has(payment.id));
  const foundIds = new Set(selected.map((payment) => payment.id));
  const missingIds = paymentIds.filter((id) => !foundIds.has(id));
  const confirmedAmountCop = selected
    .filter((payment) => payment.status === "CONFIRMED")
    .reduce((total, payment) => total + payment.amountCop, 0);
  return {
    requestedCount: paymentIds.length,
    selectedCount: selected.length,
    missingIds,
    blocked: missingIds.length > 0,
    inventory: selected.map(inventoryRecord),
    commercialSnapshotCount: selected.filter((payment) => payment.commercialSnapshot).length,
    confirmedAmountCop,
    protectedPaymentCount: payments.length - selected.length
  };
}

async function writeBackup({ backupDirectory, ledgerSource, plan, ledgerHash, manifest }) {
  await mkdir(backupDirectory, { recursive: true });
  await Promise.all([
    writeFile(resolve(backupDirectory, "payments.json"), ledgerSource, "utf8"),
    writeFile(resolve(backupDirectory, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8"),
    writeFile(resolve(backupDirectory, "dry-run.json"), `${JSON.stringify({ ...plan, ledgerHash }, null, 2)}\n`, "utf8")
  ]);
}

export async function purgePaymentTestData({
  storageDirectory,
  manifest,
  mode = "DRY_RUN",
  confirmation,
  expectedLedgerHash,
  now = new Date()
}) {
  if (mode !== "DRY_RUN" && mode !== APPLY_MODE) throw new Error(`Unsupported purge mode: ${mode}.`);
  if (mode === APPLY_MODE && confirmation !== APPLY_CONFIRMATION) {
    throw new Error(`${APPLY_MODE} requires --confirm=${APPLY_CONFIRMATION}.`);
  }
  const paymentsPath = resolve(storageDirectory, "payments.json");
  const ledgerSource = await readFile(paymentsPath, "utf8");
  const payments = JSON.parse(ledgerSource);
  if (!Array.isArray(payments)) throw new Error("Payments ledger must be a JSON array.");
  const ledgerHash = sha256(ledgerSource);
  const plan = planPaymentTestDataPurge({ payments, manifest });
  const backupName = `${now.toISOString().replaceAll(":", "-")}-payment-test-data-purge`;
  const backupDirectory = resolve(storageDirectory, "backups", backupName);

  if (mode === "DRY_RUN") {
    await writeBackup({ backupDirectory, ledgerSource, plan, ledgerHash, manifest });
    return { mode, changed: false, ledgerHash, backupDirectory, ...plan };
  }
  if (plan.blocked) throw new Error(`APPLY blocked; missing payment IDs: ${plan.missingIds.join(", ")}.`);
  if (!expectedLedgerHash || expectedLedgerHash !== ledgerHash) {
    throw new Error("APPLY blocked because the ledger hash does not match the reviewed DRY_RUN.");
  }

  await writeBackup({ backupDirectory, ledgerSource, plan, ledgerHash, manifest });
  const selectedIds = new Set(manifest.paymentIds);
  const remaining = payments.filter((payment) => !selectedIds.has(payment.id));
  const temporary = `${paymentsPath}.tmp-${process.pid}-${Date.now()}`;
  await writeFile(temporary, `${JSON.stringify(remaining, null, 2)}\n`, "utf8");
  await rename(temporary, paymentsPath);

  const persisted = JSON.parse(await readFile(paymentsPath, "utf8"));
  const residual = persisted.filter((payment) => selectedIds.has(payment.id));
  if (residual.length > 0) throw new Error("Post-APPLY verification failed: selected payments remain.");
  return {
    mode,
    changed: plan.selectedCount > 0,
    ledgerHash,
    backupDirectory,
    ...plan,
    verification: {
      remainingSelectedPayments: 0,
      remainingSelectedCommercialSnapshots: 0,
      remainingSelectedConfirmedAmountCop: 0,
      metricsDerivedFromSelectedPayments: false
    }
  };
}

async function main() {
  if (process.argv.includes("--apply")) throw new Error(`Generic --apply is disabled. Use --mode=${APPLY_MODE}.`);
  const argument = (name) => process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);
  const manifestPath = argument("manifest");
  if (!manifestPath) throw new Error("--manifest=<path> is required.");
  const manifest = JSON.parse(await readFile(resolve(manifestPath), "utf8"));
  const result = await purgePaymentTestData({
    storageDirectory: process.env.PRODUCT_PAGE_PAYMENT_DIR ?? "/data/generated-sites/.payments",
    manifest,
    mode: argument("mode") ?? "DRY_RUN",
    confirmation: argument("confirm"),
    expectedLedgerHash: argument("expected-ledger-hash")
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
