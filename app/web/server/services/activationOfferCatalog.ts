import { z } from "zod";

export const ACTIVATION_OFFER_CATALOG_VERSION = "2026-08-12.v1" as const;

export const activationOfferCodeSchema = z.enum([
  "PRODUCT_ONLY",
  "BUSINESS_ONLY",
  "PERSONAL_BRAND_ONLY",
  "PLAN_360"
]);

export const activationOfferEcosystemSchema = z.enum([
  "PRODUCT",
  "BUSINESS",
  "PERSONAL_BRAND"
]);

export const activationOfferSchema = z.object({
  offerCode: activationOfferCodeSchema,
  ecosystemTypes: z.array(activationOfferEcosystemSchema).min(1),
  amountCop: z.number().int().positive(),
  currency: z.literal("COP"),
  billingType: z.literal("ONE_TIME")
}).strict();

export const activationOfferSnapshotSchema = activationOfferSchema.extend({
  ecosystemType: activationOfferEcosystemSchema.nullable(),
  catalogVersion: z.literal(ACTIVATION_OFFER_CATALOG_VERSION),
  selectedAt: z.string().datetime({ offset: true })
}).strict();

const activationOfferDerivedFieldsSchema = z.object({
  offerSnapshot: z.never().optional(),
  amountCop: z.never().optional(),
  ecosystemTypes: z.never().optional(),
  currency: z.never().optional(),
  billingType: z.never().optional(),
  catalogVersion: z.never().optional(),
  selectedAt: z.never().optional()
});

export const activationOfferSelectionSchema = activationOfferDerivedFieldsSchema.extend({
  offerCode: activationOfferCodeSchema.optional()
});

export const immutableActivationOfferFieldsSchema = activationOfferDerivedFieldsSchema.extend({
  offerCode: z.never().optional()
});

export type ActivationOfferCode = z.infer<typeof activationOfferCodeSchema>;
export type ActivationOffer = z.infer<typeof activationOfferSchema>;
export type ActivationOfferSnapshot = z.infer<typeof activationOfferSnapshotSchema>;

export function resolveActivationOfferEcosystemType(
  offerCode: ActivationOfferCode | undefined,
  ecosystemType: z.infer<typeof activationOfferEcosystemSchema> | undefined
) {
  if (!offerCode) return ecosystemType;

  const offer = resolveActivationOffer(offerCode);
  if (offer.ecosystemTypes.length !== 1) {
    if (ecosystemType !== undefined) {
      throw new Error(`${offerCode} must not use a single ecosystemType.`);
    }
    return undefined;
  }

  const expectedEcosystemType = offer.ecosystemTypes[0];
  if (ecosystemType !== undefined && ecosystemType !== expectedEcosystemType) {
    throw new Error(`${offerCode} requires ecosystemType ${expectedEcosystemType}.`);
  }
  return expectedEcosystemType;
}

const catalog = z.object({
  PRODUCT_ONLY: activationOfferSchema,
  BUSINESS_ONLY: activationOfferSchema,
  PERSONAL_BRAND_ONLY: activationOfferSchema,
  PLAN_360: activationOfferSchema
}).strict().parse({
  PRODUCT_ONLY: {
    offerCode: "PRODUCT_ONLY",
    ecosystemTypes: ["PRODUCT"],
    amountCop: 180000,
    currency: "COP",
    billingType: "ONE_TIME"
  },
  BUSINESS_ONLY: {
    offerCode: "BUSINESS_ONLY",
    ecosystemTypes: ["BUSINESS"],
    amountCop: 180000,
    currency: "COP",
    billingType: "ONE_TIME"
  },
  PERSONAL_BRAND_ONLY: {
    offerCode: "PERSONAL_BRAND_ONLY",
    ecosystemTypes: ["PERSONAL_BRAND"],
    amountCop: 100000,
    currency: "COP",
    billingType: "ONE_TIME"
  },
  PLAN_360: {
    offerCode: "PLAN_360",
    ecosystemTypes: ["PRODUCT", "BUSINESS", "PERSONAL_BRAND"],
    amountCop: 350000,
    currency: "COP",
    billingType: "ONE_TIME"
  }
});

function copyOffer(offer: ActivationOffer): ActivationOffer {
  return { ...offer, ecosystemTypes: [...offer.ecosystemTypes] };
}

export function resolveActivationOffer(offerCode: unknown): ActivationOffer {
  const parsedCode = activationOfferCodeSchema.parse(offerCode);
  return copyOffer(catalog[parsedCode]);
}

export function getActivationOfferCatalog(): ActivationOffer[] {
  return activationOfferCodeSchema.options.map((offerCode) => copyOffer(catalog[offerCode]));
}

export function createActivationOfferSnapshot(
  offerCode: ActivationOfferCode,
  selectedAt = new Date().toISOString()
): ActivationOfferSnapshot {
  const offer = resolveActivationOffer(offerCode);
  return activationOfferSnapshotSchema.parse({
    ...offer,
    ecosystemType: offer.ecosystemTypes.length === 1 ? offer.ecosystemTypes[0] : null,
    catalogVersion: ACTIVATION_OFFER_CATALOG_VERSION,
    selectedAt
  });
}

export function createActivationOfferSelection(
  offerCode: ActivationOfferCode | undefined,
  selectedAt = new Date().toISOString()
): { offerCode?: ActivationOfferCode; offerSnapshot?: ActivationOfferSnapshot } {
  return offerCode
    ? { offerCode, offerSnapshot: createActivationOfferSnapshot(offerCode, selectedAt) }
    : {};
}

export function serializeActivationOfferSnapshot(snapshot: unknown) {
  return snapshot === undefined ? undefined : activationOfferSnapshotSchema.parse(snapshot);
}
