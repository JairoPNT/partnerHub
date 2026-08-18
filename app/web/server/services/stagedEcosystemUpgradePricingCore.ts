export type PricingEcosystem = "PRODUCT" | "BUSINESS" | "PERSONAL_BRAND";
export type SettledCommercialPaymentStatus = "CONFIRMED" | "APPROVED" | "PENDING" | "DECLINED" | "VOIDED";
export type PricingMode = "DIRECT_BUNDLE" | "STAGED_BUNDLE_UPGRADE" | "INDIVIDUAL_ADDON";

export type CommercialPaymentEvidence = {
  id: string;
  reference?: string;
  status: SettledCommercialPaymentStatus;
  amountCop: number;
  offerCode: string;
  ecosystemTypes: PricingEcosystem[];
  pricingMode?: PricingMode;
};

export type EcosystemQuoteRequest = {
  requestedEcosystems: PricingEcosystem[];
  payments: CommercialPaymentEvidence[];
  quotedAt?: string;
};

const ecosystems = ["PRODUCT", "BUSINESS", "PERSONAL_BRAND"] as const;
const individualPrices: Record<PricingEcosystem, number> = {
  PRODUCT: 180000,
  BUSINESS: 180000,
  PERSONAL_BRAND: 100000
};

function uniqueEcosystems(values: PricingEcosystem[]) {
  const unique = [...new Set(values)];
  if (unique.length !== values.length || unique.some((value) => !ecosystems.includes(value))) {
    throw new Error("Requested ecosystems must be unique supported values.");
  }
  return unique;
}

function immutableQuote<T extends object>(value: T): Readonly<T> {
  for (const nested of Object.values(value)) {
    if (nested && typeof nested === "object") Object.freeze(nested);
  }
  return Object.freeze(value);
}

export function quoteEcosystemPurchase(request: EcosystemQuoteRequest) {
  const requestedEcosystems = uniqueEcosystems([...request.requestedEcosystems]);
  if (requestedEcosystems.length === 0) throw new Error("At least one ecosystem must be requested.");

  const confirmedPayments = request.payments.filter((payment) =>
    payment.status === "CONFIRMED" || payment.status === "APPROVED"
  );
  for (const payment of confirmedPayments) {
    if (!Number.isSafeInteger(payment.amountCop) || payment.amountCop <= 0) {
      throw new Error(`Confirmed payment ${payment.id} has an invalid COP amount.`);
    }
    if (payment.ecosystemTypes.length === 0) {
      throw new Error(`Confirmed payment ${payment.id} has no commercial ecosystem evidence.`);
    }
    uniqueEcosystems(payment.ecosystemTypes);
  }
  const alreadyConfirmedEcosystems = uniqueEcosystems(confirmedPayments.flatMap((payment) => payment.ecosystemTypes));
  const duplicate = requestedEcosystems.find((ecosystem) => alreadyConfirmedEcosystems.includes(ecosystem));
  if (duplicate) throw new Error(`${duplicate} is already confirmed for this partner.`);

  const remainingEcosystems = ecosystems.filter((ecosystem) => !alreadyConfirmedEcosystems.includes(ecosystem));
  const requestedSet = new Set(requestedEcosystems);
  const requestsAllRemaining = remainingEcosystems.length === requestedEcosystems.length &&
    remainingEcosystems.every((ecosystem) => requestedSet.has(ecosystem));
  const hasIndividualAddon = confirmedPayments.some((payment) => payment.pricingMode === "INDIVIDUAL_ADDON");
  const eligibleForStagedUpgrade = alreadyConfirmedEcosystems.length === 1 &&
    !hasIndividualAddon &&
    remainingEcosystems.length === 2;
  const confirmedPaymentsTotalCop = confirmedPayments.reduce((sum, payment) => sum + payment.amountCop, 0);

  let offerCode: string;
  let pricingMode: PricingMode;
  let amountCop: number;
  if (alreadyConfirmedEcosystems.length === 0 && requestsAllRemaining) {
    offerCode = "PLAN_360";
    pricingMode = "DIRECT_BUNDLE";
    amountCop = 350000;
  } else if (eligibleForStagedUpgrade && requestsAllRemaining) {
    offerCode = "PLAN_360_STAGED_UPGRADE";
    pricingMode = "STAGED_BUNDLE_UPGRADE";
    amountCop = 400000 - confirmedPaymentsTotalCop;
    if (amountCop <= 0) throw new Error("Confirmed payment total is incompatible with staged upgrade pricing.");
  } else if (requestedEcosystems.length === 1) {
    offerCode = `${requestedEcosystems[0]}_ADDON`;
    pricingMode = "INDIVIDUAL_ADDON";
    amountCop = individualPrices[requestedEcosystems[0]];
  } else {
    throw new Error("The requested ecosystem combination is not eligible for a server-side quote.");
  }

  const previousPaymentIds = confirmedPayments.map((payment) => payment.id);
  const previousPaymentReferences = confirmedPayments.flatMap((payment) => payment.reference ? [payment.reference] : []);
  const quotedAt = request.quotedAt ?? new Date().toISOString();
  const snapshot = immutableQuote({
    offerCode,
    pricingMode,
    includedEcosystems: [...requestedEcosystems],
    alreadyConfirmedEcosystems: [...alreadyConfirmedEcosystems],
    eligibleForStagedUpgrade,
    confirmedPaymentsTotalCop,
    amountCop,
    currency: "COP" as const,
    previousPaymentIds: [...previousPaymentIds],
    previousPaymentReferences: [...previousPaymentReferences],
    quotedAt
  });
  return { ...snapshot, snapshot };
}
