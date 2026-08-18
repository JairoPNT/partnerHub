export type WompiWebhookStage =
  | "EVENT_VALIDATION"
  | "CONFIGURATION"
  | "SIGNATURE_VALIDATION"
  | "INTENT_LOOKUP"
  | "TRANSACTION_VALIDATION"
  | "LEDGER_PERSISTENCE"
  | "INTENT_PERSISTENCE"
  | "COMPLETED";

export type WompiWebhookOutcome =
  | "REJECTED"
  | "EVENT_ACCEPTED"
  | "DUPLICATE"
  | "LEDGER_PERSISTED";

export type WompiWebhookObservation = {
  timestamp: string;
  reference?: string;
  activationLeadId?: string;
  transactionId?: string;
  httpStatus: number;
  stage: WompiWebhookStage;
  outcome: WompiWebhookOutcome;
  reason: string;
};

const SAFE_REASONS: Array<[RegExp, WompiWebhookStage, string]> = [
  [/checksum/i, "SIGNATURE_VALIDATION", "INVALID_SIGNATURE"],
  [/payment intent was not found/i, "INTENT_LOOKUP", "REFERENCE_NOT_FOUND"],
  [/reference mismatch/i, "TRANSACTION_VALIDATION", "REFERENCE_MISMATCH"],
  [/amount mismatch/i, "TRANSACTION_VALIDATION", "AMOUNT_MISMATCH"],
  [/currency mismatch/i, "TRANSACTION_VALIDATION", "CURRENCY_MISMATCH"],
  [/ledger persistence failed/i, "LEDGER_PERSISTENCE", "LEDGER_PERSISTENCE_FAILED"],
  [/intent persistence failed/i, "INTENT_PERSISTENCE", "INTENT_PERSISTENCE_FAILED"],
  [/configured|credentials/i, "CONFIGURATION", "SANDBOX_CONFIGURATION_INVALID"]
];

export function safeWebhookIdentifiers(value: unknown) {
  if (!value || typeof value !== "object") return {};
  const transaction = (value as { data?: { transaction?: unknown } }).data?.transaction;
  if (!transaction || typeof transaction !== "object") return {};
  const candidate = transaction as Record<string, unknown>;
  return {
    ...(typeof candidate.reference === "string" ? { reference: candidate.reference.slice(0, 255) } : {}),
    ...(typeof candidate.id === "string" ? { transactionId: candidate.id.slice(0, 255) } : {})
  };
}

export function classifyWebhookFailure(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  for (const [pattern, stage, reason] of SAFE_REASONS) {
    if (pattern.test(message)) return { stage, reason };
  }
  return { stage: "EVENT_VALIDATION" as const, reason: "INVALID_EVENT" };
}

export function webhookSuccessObservation(input: {
  timestamp: string;
  reference: string;
  activationLeadId: string;
  transactionId: string;
  status: string;
  duplicate: boolean;
}) : WompiWebhookObservation {
  const outcome = input.duplicate
    ? "DUPLICATE"
    : input.status === "APPROVED"
      ? "LEDGER_PERSISTED"
      : "EVENT_ACCEPTED";
  return {
    timestamp: input.timestamp,
    reference: input.reference,
    activationLeadId: input.activationLeadId,
    transactionId: input.transactionId,
    httpStatus: 200,
    stage: "COMPLETED",
    outcome,
    reason: outcome
  };
}
