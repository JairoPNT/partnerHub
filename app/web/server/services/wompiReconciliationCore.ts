import { z } from "zod";

import type { ManualPaymentRecord } from "./manualPaymentLedgerCore";
import type { WompiPaymentIntent } from "./wompiSandboxCore";

export const WOMPI_NO_TRANSACTION_REFERENCE = "PH-a456d9c3-f7e5-488c-b52f-003dd3625300";

export const wompiRemoteTransactionSchema = z.object({
  id: z.string().trim().min(1).max(255),
  reference: z.string().trim().min(1).max(255),
  status: z.string().trim().min(1).max(40),
  amount_in_cents: z.number().int().positive(),
  currency: z.string().trim().min(1).max(8),
  finalized_at: z.string().datetime({ offset: true }).nullable().optional()
}).passthrough();

export type WompiRemoteTransaction = z.infer<typeof wompiRemoteTransactionSchema>;
export type WompiReconciliationMode = "DRY_RUN" | "APPLY";

export function parseWompiTransactionList(payload: unknown) {
  const data = z.object({ data: z.array(wompiRemoteTransactionSchema) }).parse(payload).data;
  return data;
}

export function hasWompiPaymentForReference(payments: ManualPaymentRecord[], intent: WompiPaymentIntent) {
  return payments.some((payment) =>
    payment.activationLeadId === intent.activationLeadId &&
    payment.reference === intent.reference &&
    payment.method === "WOMPI"
  );
}

export async function reconcileWompiIntent(input: {
  intent: WompiPaymentIntent;
  transactions: WompiRemoteTransaction[];
  payments: ManualPaymentRecord[];
  mode?: WompiReconciliationMode;
  settle: (transaction: WompiRemoteTransaction) => Promise<{ idempotent: boolean }>;
}) {
  const mode = input.mode ?? "DRY_RUN";
  if (input.intent.reference === WOMPI_NO_TRANSACTION_REFERENCE) {
    return { outcome: "PROTECTED_NO_TRANSACTION_REFERENCE" as const, mode };
  }
  const matches = input.transactions.filter((transaction) => transaction.reference === input.intent.reference);
  if (matches.length === 0) return { outcome: "TRANSACTION_NOT_FOUND" as const, mode };
  if (matches.length !== 1) throw new Error("Wompi reconciliation found multiple transactions for the reference.");
  const transaction = matches[0];
  if (transaction.amount_in_cents !== input.intent.amountInCents) {
    throw new Error("Wompi reconciliation amount mismatch.");
  }
  if (transaction.currency !== input.intent.currency) {
    throw new Error("Wompi reconciliation currency mismatch.");
  }
  if (transaction.status !== "APPROVED") {
    return { outcome: "TRANSACTION_NOT_APPROVED" as const, mode, transactionId: transaction.id };
  }
  if (hasWompiPaymentForReference(input.payments, input.intent) && mode === "DRY_RUN") {
    return { outcome: "ALREADY_RECORDED" as const, mode, transactionId: transaction.id };
  }
  if (mode === "DRY_RUN") {
    return { outcome: "VALIDATED_DRY_RUN" as const, mode, transactionId: transaction.id };
  }
  const settlement = await input.settle(transaction);
  return {
    outcome: settlement.idempotent ? "ALREADY_RECORDED" as const : "LEDGER_PERSISTED" as const,
    mode,
    transactionId: transaction.id
  };
}
