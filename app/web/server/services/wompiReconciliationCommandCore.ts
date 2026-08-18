import type { ManualPaymentRecord } from "./manualPaymentLedgerCore";
import type { WompiPaymentIntent } from "./wompiSandboxCore";
import type { WompiRemoteTransaction } from "./wompiReconciliationCore";

export const WOMPI_RECONCILIATION_ALLOWED_REFERENCES = [
  "PH-640eb48c-a676-48ca-baec-455b2170397e",
  "PH-881d27b5-c757-491d-b46e-fa4ff7c80b4f"
] as const;

export const WOMPI_RECONCILIATION_BLOCKED_REFERENCE =
  "PH-a456d9c3-f7e5-488c-b52f-003dd3625300";

export type WompiReconciliationCommandMode = "DRY_RUN" | "APPLY";

export type WompiReconciliationCommandResult = {
  mode: WompiReconciliationCommandMode;
  reference: string;
  transactionId: string | null;
  remoteStatus: string | null;
  amountInCents: number | null;
  currency: string | null;
  activationLeadId: string;
  validation: "VALID" | "REJECTED" | "TRANSACTION_NOT_FOUND";
  action: "NONE" | "CREATE_PAYMENT_AND_APPROVE_INTENT" | "REUSE_PAYMENT_AND_APPROVE_INTENT";
};

type CommandDependencies = {
  loadIntent: (reference: string) => Promise<WompiPaymentIntent | null>;
  queryTransactions: (reference: string) => Promise<WompiRemoteTransaction[]>;
  loadPayments: (activationLeadId: string) => Promise<ManualPaymentRecord[]>;
  apply: (input: {
    intent: WompiPaymentIntent;
    transaction: WompiRemoteTransaction;
    paymentExists: boolean;
  }) => Promise<void>;
};

export function parseWompiReconciliationCommandArgs(args: string[]) {
  let reference: string | undefined;
  let applyConfirmed = false;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--reference") {
      reference = args[index + 1];
      index += 1;
      continue;
    }
    if (argument === "--apply") {
      applyConfirmed = true;
      continue;
    }
    throw new Error(`Unsupported reconciliation option: ${argument}`);
  }

  if (!reference?.trim()) throw new Error("An explicit --reference is required.");
  return {
    reference: reference.trim(),
    mode: applyConfirmed ? "APPLY" as const : "DRY_RUN" as const,
    applyConfirmed
  };
}

export function approveReconciledWompiIntent(
  intent: WompiPaymentIntent,
  transactionId: string,
  now: string
): WompiPaymentIntent {
  if (!transactionId.trim()) throw new Error("A valid Wompi transactionId is required.");
  return {
    ...intent,
    status: "APPROVED",
    transactionId,
    paymentRecorded: true,
    updatedAt: now
  };
}

function assertAuthorizedReference(reference: string) {
  if (reference === WOMPI_RECONCILIATION_BLOCKED_REFERENCE) {
    throw new Error("This Wompi reference is explicitly blocked from reconciliation.");
  }
  if (!(WOMPI_RECONCILIATION_ALLOWED_REFERENCES as readonly string[]).includes(reference)) {
    throw new Error("This Wompi reference is not authorized for reconciliation.");
  }
}

function hasPayment(payments: ManualPaymentRecord[], intent: WompiPaymentIntent) {
  return payments.some((payment) =>
    payment.activationLeadId === intent.activationLeadId &&
    payment.method === "WOMPI" &&
    payment.reference === intent.reference &&
    payment.status === "CONFIRMED"
  );
}

export async function runWompiReconciliationCommand(
  input: {
    reference: string;
    mode?: WompiReconciliationCommandMode;
    applyConfirmed?: boolean;
  },
  dependencies: CommandDependencies
): Promise<WompiReconciliationCommandResult> {
  const mode = input.mode ?? "DRY_RUN";
  if (mode === "APPLY" && input.applyConfirmed !== true) {
    throw new Error("APPLY requires the explicit --apply option.");
  }
  assertAuthorizedReference(input.reference);

  const intent = await dependencies.loadIntent(input.reference);
  if (!intent) throw new Error("Wompi payment intent was not found.");
  const transactions = await dependencies.queryTransactions(input.reference);
  const matching = transactions.filter((transaction) => transaction.reference === input.reference);
  if (matching.length > 1) throw new Error("Multiple Wompi transactions matched the reference.");

  const transaction = matching[0];
  if (!transaction) {
    return {
      mode,
      reference: input.reference,
      transactionId: null,
      remoteStatus: null,
      amountInCents: null,
      currency: null,
      activationLeadId: intent.activationLeadId,
      validation: "TRANSACTION_NOT_FOUND",
      action: "NONE"
    };
  }

  const valid =
    transaction.status === "APPROVED" &&
    transaction.reference === intent.reference &&
    transaction.amount_in_cents === intent.amountInCents &&
    transaction.currency === "COP" &&
    transaction.currency === intent.currency &&
    transaction.id.trim().length > 0;
  if (!valid) {
    return {
      mode,
      reference: input.reference,
      transactionId: transaction.id,
      remoteStatus: transaction.status,
      amountInCents: transaction.amount_in_cents,
      currency: transaction.currency,
      activationLeadId: intent.activationLeadId,
      validation: "REJECTED",
      action: "NONE"
    };
  }

  const payments = await dependencies.loadPayments(intent.activationLeadId);
  const paymentExists = hasPayment(payments, intent);
  const action = paymentExists
    ? "REUSE_PAYMENT_AND_APPROVE_INTENT" as const
    : "CREATE_PAYMENT_AND_APPROVE_INTENT" as const;

  if (mode === "APPLY") {
    await dependencies.apply({ intent, transaction, paymentExists });
  }

  return {
    mode,
    reference: input.reference,
    transactionId: transaction.id,
    remoteStatus: transaction.status,
    amountInCents: transaction.amount_in_cents,
    currency: transaction.currency,
    activationLeadId: intent.activationLeadId,
    validation: "VALID",
    action
  };
}
