import { z } from "zod";

export const paymentCategorySchema = z.enum([
  "ACTIVATION",
  "MONTHLY_FEE",
  "ANNUAL_RENEWAL",
  "ADD_ON",
  "OTHER"
]);

export const paymentMethodSchema = z.enum([
  "WOMPI",
  "BANCOLOMBIA",
  "NEQUI",
  "NU",
  "CASH",
  "OTHER"
]);

export const paymentStatusSchema = z.enum(["CONFIRMED", "VOIDED"]);
export const manualPaymentEcosystemSchema = z.enum(["PRODUCT", "BUSINESS", "PERSONAL_BRAND"]);
export const manualPaymentPricingModeSchema = z.enum(["CATALOG", "MANUAL_NEGOTIATED"]);

const isoTimestampSchema = z.string().datetime({ offset: true });
const optionalText = (max: number) => z.string().trim().min(1).max(max).optional();

export const manualPaymentCreateSchema = z.object({
  activationLeadId: z.string().trim().min(1).max(160),
  siteId: z.string().trim().min(1).max(160).optional(),
  category: paymentCategorySchema,
  amountCop: z.number().int().positive(),
  method: paymentMethodSchema,
  paidAt: isoTimestampSchema,
  reference: optionalText(160),
  notes: optionalText(2000),
  idempotencyKey: optionalText(160),
  offerCode: optionalText(80),
  ecosystemTypes: z.array(manualPaymentEcosystemSchema).min(1).optional(),
  pricingMode: manualPaymentPricingModeSchema.optional()
}).superRefine((value, context) => {
  if (value.method !== "WOMPI" && (!value.ecosystemTypes || !value.pricingMode)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Manual payments require ecosystemTypes and pricingMode." });
  }
  if (value.ecosystemTypes && new Set(value.ecosystemTypes).size !== value.ecosystemTypes.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["ecosystemTypes"], message: "ecosystemTypes must not contain duplicates." });
  }
  if (value.pricingMode === "CATALOG") {
    const catalog = {
      PRODUCT_ONLY: { amountCop: 180000, ecosystemTypes: ["PRODUCT"] },
      BUSINESS_ONLY: { amountCop: 180000, ecosystemTypes: ["BUSINESS"] },
      PERSONAL_BRAND_ONLY: { amountCop: 100000, ecosystemTypes: ["PERSONAL_BRAND"] },
      PLAN_360: { amountCop: 350000, ecosystemTypes: ["PRODUCT", "BUSINESS", "PERSONAL_BRAND"] }
    } as const;
    const offer = value.offerCode ? catalog[value.offerCode as keyof typeof catalog] : undefined;
    const matchesEcosystems = offer && value.ecosystemTypes &&
      value.ecosystemTypes.length === offer.ecosystemTypes.length &&
      value.ecosystemTypes.every((ecosystem) => (offer.ecosystemTypes as readonly string[]).includes(ecosystem));
    if (!offer || value.amountCop !== offer.amountCop || !matchesEcosystems) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "CATALOG payment must match its server catalog offer." });
    }
  }
});

export type ManualPaymentCommercialSnapshot = {
  version: 1;
  offerCode: string | null;
  ecosystemTypes: ReadonlyArray<z.infer<typeof manualPaymentEcosystemSchema>>;
  pricingMode: z.infer<typeof manualPaymentPricingModeSchema>;
  amountCop: number;
  currency: "COP";
  selectedAt: string;
};

export const paymentListFilterSchema = z.object({
  activationLeadId: z.string().trim().min(1).max(160).optional(),
  siteId: z.string().trim().min(1).max(160).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "from must use YYYY-MM-DD").optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "to must use YYYY-MM-DD").optional(),
  status: paymentStatusSchema.optional()
}).superRefine((value, context) => {
  for (const key of ["from", "to"] as const) {
    if (value[key] && !isValidLocalDate(value[key])) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: `${key} must be a valid calendar date` });
    }
  }
  if (value.from && value.to && value.from > value.to) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["to"], message: "to must be on or after from" });
  }
});

export const paymentVoidSchema = z.object({
  reason: z.string().trim().min(1).max(1000)
});

export type ManualPaymentCreateInput = z.infer<typeof manualPaymentCreateSchema>;
export type PaymentListFilter = z.infer<typeof paymentListFilterSchema>;
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

export type ManualPaymentRecord = Omit<ManualPaymentCreateInput, "siteId"> & {
  id: string;
  siteId: string | null;
  status: PaymentStatus;
  createdAt: string;
  updatedAt: string;
  voidedAt?: string;
  voidReason?: string;
  commercialSnapshot?: ManualPaymentCommercialSnapshot;
  regenerationRequired?: boolean;
};

export type PaymentListResult = {
  payments: ManualPaymentRecord[];
  totalAmountCop: number;
  totalsByLocalDate: Record<string, number>;
};

function isValidLocalDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function localBogotaDate(isoTimestamp: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(isoTimestamp));
}

export function normalizePaymentInput(input: ManualPaymentCreateInput) {
  const parsed = manualPaymentCreateSchema.parse(input);
  return { ...parsed, paidAt: new Date(parsed.paidAt).toISOString() };
}

export function createPaymentRecord(
  input: ManualPaymentCreateInput,
  context: { siteId: string | null; now: string; id: string; existingRecords?: ManualPaymentRecord[] }
): ManualPaymentRecord {
  const parsed = normalizePaymentInput(input);
  const commercialSnapshot = parsed.ecosystemTypes && parsed.pricingMode
    ? Object.freeze({
        version: 1 as const,
        offerCode: parsed.offerCode ?? null,
        ecosystemTypes: Object.freeze([...parsed.ecosystemTypes]),
        pricingMode: parsed.pricingMode,
        amountCop: parsed.amountCop,
        currency: "COP" as const,
        selectedAt: context.now
      })
    : undefined;
  const previouslyConfirmed = new Set((context.existingRecords ?? [])
    .filter((payment) => payment.status === "CONFIRMED")
    .flatMap((payment) => payment.commercialSnapshot?.ecosystemTypes ?? []));
  const regenerationRequired = commercialSnapshot
    ? commercialSnapshot.ecosystemTypes.some((ecosystem) => !previouslyConfirmed.has(ecosystem))
    : undefined;
  return {
    ...parsed,
    siteId: context.siteId,
    id: context.id,
    status: "CONFIRMED",
    ...(commercialSnapshot ? { commercialSnapshot, regenerationRequired } : {}),
    createdAt: context.now,
    updatedAt: context.now
  };
}

export function findIdempotentPayment(records: ManualPaymentRecord[], input: ManualPaymentCreateInput) {
  const parsed = manualPaymentCreateSchema.parse(input);
  return (
    records.find(
      (payment) =>
        payment.activationLeadId === parsed.activationLeadId &&
        (
          (Boolean(parsed.idempotencyKey) && payment.idempotencyKey === parsed.idempotencyKey) ||
          (parsed.method === "WOMPI" && Boolean(parsed.reference) && payment.reference === parsed.reference)
        )
    ) ?? null
  );
}

export function listPaymentRecords(records: ManualPaymentRecord[], filters: PaymentListFilter): PaymentListResult {
  const parsedFilters = paymentListFilterSchema.parse(filters);
  const payments = records.filter((payment) => {
    const localDate = localBogotaDate(payment.paidAt);
    return (
      (!parsedFilters.activationLeadId || payment.activationLeadId === parsedFilters.activationLeadId) &&
      (!parsedFilters.siteId || payment.siteId === parsedFilters.siteId) &&
      (!parsedFilters.status || payment.status === parsedFilters.status) &&
      (!parsedFilters.from || localDate >= parsedFilters.from) &&
      (!parsedFilters.to || localDate <= parsedFilters.to)
    );
  });
  const totalsByLocalDate: Record<string, number> = {};
  let totalAmountCop = 0;

  for (const payment of payments) {
    if (payment.status !== "CONFIRMED") continue;
    const localDate = localBogotaDate(payment.paidAt);
    totalAmountCop += payment.amountCop;
    totalsByLocalDate[localDate] = (totalsByLocalDate[localDate] ?? 0) + payment.amountCop;
  }

  return { payments, totalAmountCop, totalsByLocalDate };
}

export function voidPaymentRecord(
  records: ManualPaymentRecord[],
  id: string,
  reason: string,
  now: string
) {
  const parsedReason = paymentVoidSchema.parse({ reason }).reason;
  const existing = records.find((payment) => payment.id === id);
  if (!existing) return { records, payment: null, alreadyVoided: false };
  if (existing.status === "VOIDED") return { records, payment: existing, alreadyVoided: true };

  const payment: ManualPaymentRecord = {
    ...existing,
    status: "VOIDED",
    voidedAt: now,
    voidReason: parsedReason,
    updatedAt: now
  };
  return {
    records: records.map((record) => (record.id === id ? payment : record)),
    payment,
    alreadyVoided: false
  };
}
