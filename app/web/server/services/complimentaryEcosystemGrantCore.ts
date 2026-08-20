import { createHash } from "node:crypto";

import { z } from "zod";

import type { EcosystemType } from "./partnerEcosystemEntitlementCore";

const ecosystemSchema = z.enum(["PRODUCT", "BUSINESS", "PERSONAL_BRAND"]);
const localDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "Date must be a valid YYYY-MM-DD calendar date.");

export const complimentaryGrantInputSchema = z.object({
  ecosystemTypes: z.array(ecosystemSchema).min(1),
  grantReason: z.string().trim().min(2).max(160),
  effectiveDate: localDateSchema,
  cutoffDate: localDateSchema.nullable().default(null),
  notes: z.string().trim().max(2000).nullable().optional().default(null)
}).strict().superRefine((value, context) => {
  if (new Set(value.ecosystemTypes).size !== value.ecosystemTypes.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["ecosystemTypes"], message: "ecosystemTypes must not contain duplicates." });
  }
  if (value.cutoffDate && value.cutoffDate < value.effectiveDate) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["cutoffDate"], message: "cutoffDate must be on or after effectiveDate." });
  }
});

export type ComplimentaryGrantInput = z.infer<typeof complimentaryGrantInputSchema>;

export type ComplimentaryEcosystemGrant = ComplimentaryGrantInput & {
  id: string;
  activationLeadId: string;
  operatorSubject: string;
  operatorEmail: string | null;
  regenerationRequired: boolean;
  createdAt: string;
};

export type ComplimentaryGrantConflictSource = "CONFIRMED_PAYMENT" | "ACTIVE_COMPLIMENTARY_GRANT";

export type ComplimentaryGrantConflict = {
  ecosystemType: EcosystemType;
  sources: ComplimentaryGrantConflictSource[];
};

export class ComplimentaryGrantConflictError extends Error {
  readonly code = "ECOSYSTEM_ALREADY_GRANTED";
  readonly conflicts: ComplimentaryGrantConflict[];

  constructor(conflicts: ComplimentaryGrantConflict[]) {
    super("One or more ecosystems are already covered by a confirmed payment or active complimentary grant.");
    this.name = "ComplimentaryGrantConflictError";
    this.conflicts = conflicts;
  }
}

const order: Record<EcosystemType, number> = { PRODUCT: 0, BUSINESS: 1, PERSONAL_BRAND: 2 };

export function normalizeComplimentaryGrantInput(input: unknown) {
  const parsed = complimentaryGrantInputSchema.parse(input);
  return {
    ...parsed,
    ecosystemTypes: [...parsed.ecosystemTypes].sort((left, right) => order[left] - order[right])
  };
}

export function complimentaryGrantIdentity(activationLeadId: string, input: unknown) {
  const normalized = normalizeComplimentaryGrantInput(input);
  return createHash("sha256").update(JSON.stringify({ activationLeadId, ...normalized })).digest("hex");
}

export function createComplimentaryGrant(
  records: ComplimentaryEcosystemGrant[],
  activationLeadId: string,
  input: unknown,
  context: {
    operatorSubject: string;
    operatorEmail?: string;
    existingEntitlements: ReadonlyArray<EcosystemType>;
    confirmedPaymentEcosystems?: ReadonlyArray<EcosystemType>;
    activeComplimentaryGrantEcosystems?: ReadonlyArray<EcosystemType>;
    now: string;
  }
) {
  const normalized = normalizeComplimentaryGrantInput(input);
  const paid = new Set(context.confirmedPaymentEcosystems ?? []);
  const complimentary = new Set(context.activeComplimentaryGrantEcosystems ?? []);
  const conflicts = normalized.ecosystemTypes.flatMap((ecosystemType) => {
    const sources: ComplimentaryGrantConflictSource[] = [];
    if (paid.has(ecosystemType)) sources.push("CONFIRMED_PAYMENT");
    if (complimentary.has(ecosystemType)) sources.push("ACTIVE_COMPLIMENTARY_GRANT");
    return sources.length > 0 ? [{ ecosystemType, sources }] : [];
  });
  if (conflicts.length > 0) throw new ComplimentaryGrantConflictError(conflicts);
  const id = complimentaryGrantIdentity(activationLeadId, normalized);
  const entitled = new Set(context.existingEntitlements);
  const grant: ComplimentaryEcosystemGrant = {
    id,
    activationLeadId,
    ...normalized,
    operatorSubject: context.operatorSubject,
    operatorEmail: context.operatorEmail ?? null,
    regenerationRequired: normalized.ecosystemTypes.some((ecosystem) => !entitled.has(ecosystem)),
    createdAt: context.now
  };
  return { records: [...records, grant], grant, idempotent: false };
}

export function activeComplimentaryGrantEcosystems(
  records: ComplimentaryEcosystemGrant[],
  activationLeadId: string,
  effectiveDate: string
) {
  return [...new Set(records
    .filter((record) => record.activationLeadId === activationLeadId)
    .filter((record) => record.effectiveDate <= effectiveDate && (!record.cutoffDate || record.cutoffDate >= effectiveDate))
    .flatMap((record) => record.ecosystemTypes))] as EcosystemType[];
}
