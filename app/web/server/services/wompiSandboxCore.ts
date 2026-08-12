import { createHash, timingSafeEqual } from "node:crypto";

import { z } from "zod";

export const wompiIntentInputSchema = z.object({
  activationLeadId: z.string().trim().min(1).max(160),
  offerCode: z.enum(["PRODUCT_ONLY", "BUSINESS_ONLY", "PERSONAL_BRAND_ONLY", "PLAN_360"])
}).strict();

export const wompiIntentStatusSchema = z.enum([
  "PENDING", "APPROVED", "DECLINED", "VOIDED", "ERROR", "EXPIRED"
]);

const wompiTransactionSchema = z.object({
  id: z.string().trim().min(1).max(255),
  reference: z.string().trim().min(1).max(255),
  status: wompiIntentStatusSchema,
  amount_in_cents: z.number().int().positive(),
  currency: z.literal("COP"),
  finalized_at: z.string().datetime({ offset: true }).nullable().optional()
}).passthrough();

export const wompiEventSchema = z.object({
  event: z.literal("transaction.updated"),
  data: z.object({ transaction: wompiTransactionSchema }).passthrough(),
  environment: z.literal("test"),
  signature: z.object({
    properties: z.array(z.string().trim().min(1)).min(1),
    checksum: z.string().regex(/^[a-f0-9]{64}$/i)
  }),
  timestamp: z.number().int().nonnegative(),
  sent_at: z.string().datetime({ offset: true })
}).passthrough();

export type WompiIntentInput = z.infer<typeof wompiIntentInputSchema>;
export type WompiIntentStatus = z.infer<typeof wompiIntentStatusSchema>;
export type WompiEvent = z.infer<typeof wompiEventSchema>;

export type WompiPaymentIntent = {
  id: string;
  activationLeadId: string;
  offerCode: WompiIntentInput["offerCode"];
  reference: string;
  amountCop: number;
  amountInCents: number;
  currency: "COP";
  status: WompiIntentStatus;
  createdAt: string;
  updatedAt: string;
  transactionId?: string;
  processedEventChecksums: string[];
};

export function resolveWompiSandboxConfig(source: NodeJS.ProcessEnv) {
  if (source.WOMPI_ENV !== "sandbox") throw new Error("Wompi Sandbox is not configured.");
  const publicKey = source.WOMPI_SANDBOX_PUBLIC_KEY;
  const privateKey = source.WOMPI_SANDBOX_PRIVATE_KEY;
  const integritySecret = source.WOMPI_SANDBOX_INTEGRITY_SECRET;
  const eventsSecret = source.WOMPI_SANDBOX_EVENTS_SECRET;
  if (!publicKey || !privateKey || !integritySecret || !eventsSecret) {
    throw new Error("Wompi Sandbox credentials are incomplete.");
  }
  if (
    !publicKey.startsWith("pub_test_") ||
    !privateKey.startsWith("prv_test_") ||
    integritySecret.startsWith("prod_") ||
    eventsSecret.startsWith("prod_")
  ) {
    throw new Error("Wompi Sandbox credentials are invalid for the configured environment.");
  }
  return { publicKey, integritySecret, eventsSecret };
}

export function copToAmountInCents(amountCop: number) {
  if (!Number.isSafeInteger(amountCop) || amountCop <= 0) throw new Error("Snapshot amount must be positive COP.");
  return amountCop * 100;
}

export function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function createCheckoutIntegritySignature(
  reference: string,
  amountInCents: number,
  currency: "COP",
  integritySecret: string
) {
  return sha256(`${reference}${amountInCents}${currency}${integritySecret}`);
}

function getProperty(source: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((value, segment) => {
    if (!value || typeof value !== "object" || !(segment in value)) {
      throw new Error(`Wompi event signature property ${path} is missing.`);
    }
    return (value as Record<string, unknown>)[segment];
  }, source);
}

export function createEventChecksum(event: WompiEvent, eventsSecret: string) {
  const values = event.signature.properties.map((property) => getProperty(event.data, property));
  return sha256(`${values.map(String).join("")}${event.timestamp}${eventsSecret}`);
}

export function verifyEventChecksum(event: WompiEvent, eventsSecret: string, headerChecksum?: string | null) {
  const expected = Buffer.from(createEventChecksum(event, eventsSecret), "hex");
  const suppliedValues = [event.signature.checksum, ...(headerChecksum ? [headerChecksum] : [])];
  return suppliedValues.every((value) => {
    if (!/^[a-f0-9]{64}$/i.test(value)) return false;
    const supplied = Buffer.from(value, "hex");
    return supplied.length === expected.length && timingSafeEqual(supplied, expected);
  });
}

export function validateTransactionForIntent(event: WompiEvent, intent: WompiPaymentIntent) {
  const transaction = event.data.transaction;
  if (transaction.reference !== intent.reference) throw new Error("Wompi transaction reference mismatch.");
  if (transaction.amount_in_cents !== intent.amountInCents) throw new Error("Wompi transaction amount mismatch.");
  if (transaction.currency !== intent.currency) throw new Error("Wompi transaction currency mismatch.");
  return transaction;
}

export function applyWompiEvent(intent: WompiPaymentIntent, event: WompiEvent, now: string) {
  const checksum = event.signature.checksum.toLowerCase();
  if (intent.processedEventChecksums.includes(checksum)) return { intent, duplicate: true };
  const transaction = validateTransactionForIntent(event, intent);
  if (intent.transactionId === transaction.id && intent.status !== "PENDING") {
    return { intent, duplicate: true };
  }
  return {
    duplicate: false,
    intent: {
      ...intent,
      status: transaction.status,
      transactionId: transaction.id,
      updatedAt: now,
      processedEventChecksums: [...intent.processedEventChecksums, checksum]
    }
  };
}
