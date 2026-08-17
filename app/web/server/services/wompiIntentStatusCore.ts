import { z } from "zod";

import type { ManualPaymentRecord } from "./manualPaymentLedgerCore";
import type { WompiPaymentIntent } from "./wompiSandboxCore";

export const wompiIntentStatusQuerySchema = z.object({
  activationLeadId: z.string().trim().min(1).max(160),
  reference: z.string().trim().min(1).max(255).optional(),
  intentId: z.string().trim().uuid().optional()
}).strict().superRefine((value, context) => {
  if (Boolean(value.reference) === Boolean(value.intentId)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Provide exactly one of reference or intentId."
    });
  }
});

export type WompiIntentStatusQuery = z.infer<typeof wompiIntentStatusQuerySchema>;

export function lookupWompiIntentStatus(
  intents: WompiPaymentIntent[],
  payments: ManualPaymentRecord[],
  query: WompiIntentStatusQuery
) {
  const parsed = wompiIntentStatusQuerySchema.parse(query);
  const intent = intents.find((candidate) =>
    candidate.activationLeadId === parsed.activationLeadId &&
    (parsed.reference ? candidate.reference === parsed.reference : candidate.id === parsed.intentId)
  );
  if (!intent) return null;

  const paymentRecorded = payments.some((payment) =>
    payment.activationLeadId === intent.activationLeadId &&
    payment.reference === intent.reference &&
    payment.method === "WOMPI" &&
    payment.status === "CONFIRMED"
  );

  return {
    intentId: intent.id,
    reference: intent.reference,
    status: intent.status,
    amountInCents: intent.amountInCents,
    currency: intent.currency,
    activationLeadId: intent.activationLeadId,
    paymentRecorded
  };
}
