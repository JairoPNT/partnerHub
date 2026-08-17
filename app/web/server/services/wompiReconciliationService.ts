import "server-only";

import { manualPaymentLedgerService } from "@/server/services/manualPaymentLedgerService";
import {
  parseWompiTransactionList,
  reconcileWompiIntent,
  WOMPI_NO_TRANSACTION_REFERENCE,
  type WompiReconciliationMode
} from "@/server/services/wompiReconciliationCore";
import { resolveWompiSandboxConfig } from "@/server/services/wompiSandboxCore";
import { wompiSandboxPersistence } from "@/server/services/wompiSandboxService";

async function reconcileReference(
  reference: string,
  options: { mode?: WompiReconciliationMode; fetchImpl?: typeof fetch } = {}
) {
  const mode = options.mode ?? "DRY_RUN";
  const intents = await wompiSandboxPersistence.readIntents();
  const intent = intents.find((candidate) => candidate.reference === reference);
  if (!intent) throw new Error("Wompi payment intent was not found.");
  if (reference === WOMPI_NO_TRANSACTION_REFERENCE) {
    return reconcileWompiIntent({ intent, transactions: [], payments: [], mode, settle: async () => ({ idempotent: true }) });
  }

  const config = resolveWompiSandboxConfig(process.env);
  const response = await (options.fetchImpl ?? fetch)(
    `https://sandbox.wompi.co/v1/transactions?reference=${encodeURIComponent(reference)}`,
    { method: "GET", headers: { Authorization: `Bearer ${config.privateKey}` }, cache: "no-store" }
  );
  if (!response.ok) throw new Error(`Wompi Sandbox reconciliation lookup failed with HTTP ${response.status}.`);
  const transactions = parseWompiTransactionList(await response.json());
  const ledger = await manualPaymentLedgerService.list({ activationLeadId: intent.activationLeadId });

  return reconcileWompiIntent({
    intent,
    transactions,
    payments: ledger.payments,
    mode,
    settle: async (transaction) => {
      const result = await manualPaymentLedgerService.create({
        activationLeadId: intent.activationLeadId,
        category: "ACTIVATION",
        amountCop: intent.amountCop,
        method: "WOMPI",
        paidAt: transaction.finalized_at ?? new Date().toISOString(),
        reference: intent.reference,
        notes: `Wompi Sandbox reconciliation ${transaction.id}`,
        idempotencyKey: `wompi:${transaction.id}`
      });
      const index = intents.findIndex((candidate) => candidate.id === intent.id);
      intents[index] = {
        ...intent,
        status: "APPROVED",
        transactionId: transaction.id,
        updatedAt: new Date().toISOString()
      };
      await wompiSandboxPersistence.writeIntents(intents);
      return { idempotent: result.idempotent };
    }
  });
}

export const wompiReconciliationService = { reconcileReference };
