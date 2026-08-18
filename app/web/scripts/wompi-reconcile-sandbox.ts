import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import {
  createPaymentRecord,
  findIdempotentPayment,
  type ManualPaymentRecord
} from "../server/services/manualPaymentLedgerCore.ts";
import {
  parseWompiTransactionList
} from "../server/services/wompiReconciliationCore.ts";
import {
  approveReconciledWompiIntent,
  parseWompiReconciliationCommandArgs,
  runWompiReconciliationCommand
} from "../server/services/wompiReconciliationCommandCore.ts";
import {
  resolveWompiSandboxConfig,
  type WompiPaymentIntent
} from "../server/services/wompiSandboxCore.ts";

const paymentDirectory = process.env.PRODUCT_PAGE_PAYMENT_DIR ?? "/data/generated-sites/.payments";
const activationDirectory = process.env.PRODUCT_PAGE_ACTIVATION_DIR ?? "/data/generated-sites/.activation";
const intentsPath = resolve(paymentDirectory, "wompi-sandbox-intents.json");
const paymentsPath = resolve(paymentDirectory, "payments.json");
const leadsPath = resolve(activationDirectory, "leads.json");

async function readJsonArray<T>(path: string): Promise<T[]> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function writeJsonArray(path: string, values: unknown[]) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}-${Date.now()}`;
  await writeFile(temporary, `${JSON.stringify(values, null, 2)}\n`, "utf8");
  await rename(temporary, path);
}

async function queryTransactions(reference: string) {
  const config = resolveWompiSandboxConfig(process.env);
  const response = await fetch(
    `https://sandbox.wompi.co/v1/transactions?reference=${encodeURIComponent(reference)}`,
    { method: "GET", headers: { Authorization: `Bearer ${config.privateKey}` }, cache: "no-store" }
  );
  if (!response.ok) throw new Error(`Wompi Sandbox lookup failed with HTTP ${response.status}.`);
  return parseWompiTransactionList(await response.json());
}

async function main() {
  const command = parseWompiReconciliationCommandArgs(process.argv.slice(2));
  const result = await runWompiReconciliationCommand(command, {
    loadIntent: async (reference) =>
      (await readJsonArray<WompiPaymentIntent>(intentsPath)).find((intent) => intent.reference === reference) ?? null,
    queryTransactions,
    loadPayments: async (activationLeadId) =>
      (await readJsonArray<ManualPaymentRecord>(paymentsPath)).filter(
        (payment) => payment.activationLeadId === activationLeadId
      ),
    apply: async ({ intent, transaction }) => {
      const [intents, payments, leads] = await Promise.all([
        readJsonArray<WompiPaymentIntent>(intentsPath),
        readJsonArray<ManualPaymentRecord>(paymentsPath),
        readJsonArray<{ id: string; siteId?: string | null }>(leadsPath)
      ]);
      const intentIndex = intents.findIndex((candidate) => candidate.id === intent.id);
      if (intentIndex < 0) throw new Error("Wompi payment intent disappeared before APPLY.");
      const lead = leads.find((candidate) => candidate.id === intent.activationLeadId);
      if (!lead) throw new Error("Activation lead was not found before APPLY.");

      const now = new Date().toISOString();
      const paymentInput = {
          activationLeadId: intent.activationLeadId,
          category: "ACTIVATION" as const,
          amountCop: intent.amountCop,
          method: "WOMPI" as const,
          paidAt: transaction.finalized_at ?? now,
          reference: intent.reference,
          notes: `Wompi Sandbox reconciliation ${transaction.id}`,
          idempotencyKey: `wompi:${transaction.id}`
      };
      if (!findIdempotentPayment(payments, paymentInput)) {
        payments.push(createPaymentRecord(
          paymentInput,
          { id: randomUUID(), now, siteId: lead.siteId ?? null }
        ));
        await writeJsonArray(paymentsPath, payments);
      }

      intents[intentIndex] = approveReconciledWompiIntent(
        intent,
        transaction.id,
        new Date().toISOString()
      );
      await writeJsonArray(intentsPath, intents);
    }
  });

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Wompi reconciliation failed.";
  process.stderr.write(`${JSON.stringify({ error: message })}\n`);
  process.exitCode = 1;
});
