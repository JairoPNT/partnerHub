export type WompiCheckoutStatus = "INITIAL" | "PENDING" | "APPROVED" | "DECLINED" | "VOIDED" | "ERROR" | "EXPIRED";

export interface WompiIntentData {
  intentId: string;
  reference: string;
  amountInCents: number;
  currency: string;
  publicKey: string;
  signature: {
    integrity: string;
  };
  activationLeadId?: string;
  idempotent?: boolean;
}

export interface WompiStatusResponse {
  intentId: string;
  reference: string;
  status: WompiCheckoutStatus;
  amountInCents: number;
  currency: string;
  activationLeadId: string;
  paymentRecorded: boolean;
  error?: string;
}

export interface WompiReturnUrlParams {
  transactionId?: string;
  environment?: string;
  reference?: string;
  activationLeadId?: string;
  intentId?: string;
}

/**
 * Checks if the onboarding path can be accessed.
 * CRITICAL SECURITY RULE:
 * For Wompi payments, onboarding is allowed ONLY when status === "APPROVED" AND paymentRecorded === true.
 */
export function isOnboardingAllowed(
  status: WompiCheckoutStatus,
  paymentMethod: "wompi" | "direct",
  paymentRecorded?: boolean
): boolean {
  if (paymentMethod === "direct") return true;
  return status === "APPROVED" && Boolean(paymentRecorded);
}

/**
 * Builds the Wompi Checkout URL with correlation query parameters in the redirect-url.
 * CRITICAL SECURITY & ACCESSIBILITY RULES:
 * 1. The `redirect-url` query parameter MUST contain PartnerHub correlation parameters:
 *    `activationLeadId`, `reference`, `intentId` so Wompi return carries the context back to PartnerHub.
 * 2. The `redirect-url` parameter MUST NEVER contain an onboarding path (e.g. /onboarding/[token]).
 * 3. It must point to a public landing page (default: /oferta-beta).
 */
export function buildWompiCheckoutUrl(
  intent: WompiIntentData,
  baseUrl?: string,
  resultPath: string = "/oferta-beta"
): string {
  const safeResultPath = resultPath.includes("/onboarding/") ? "/oferta-beta" : resultPath;
  const normalizedPath = safeResultPath.startsWith("/") ? safeResultPath : `/${safeResultPath}`;

  const params = new URLSearchParams({
    "public-key": intent.publicKey,
    currency: intent.currency,
    "amount-in-cents": intent.amountInCents.toString(),
    reference: intent.reference,
    "signature:integrity": intent.signature.integrity
  });

  if (baseUrl) {
    const returnParams = new URLSearchParams();
    if (intent.activationLeadId) returnParams.append("activationLeadId", intent.activationLeadId);
    returnParams.append("reference", intent.reference);
    returnParams.append("intentId", intent.intentId);

    const fullReturnUrl = `${baseUrl}${normalizedPath}?${returnParams.toString()}`;
    params.append("redirect-url", fullReturnUrl);
  }

  return `https://checkout.wompi.co/p/?${params.toString()}`;
}

export function buildWompiStatusQueryUrl(
  activationLeadId: string,
  params: { reference?: string; intentId?: string }
): string {
  const query = new URLSearchParams({ activationLeadId });
  if (params.intentId) {
    query.append("intentId", params.intentId);
  } else if (params.reference) {
    query.append("reference", params.reference);
  }
  return `/api/public/payments/wompi/status?${query.toString()}`;
}

export function parseWompiReturnParams(searchParamsString: string): WompiReturnUrlParams | null {
  const params = new URLSearchParams(searchParamsString);
  const transactionId = params.get("id") ?? undefined;
  const environment = params.get("env") ?? undefined;
  const reference = params.get("reference") ?? params.get("ref") ?? undefined;
  const activationLeadId = params.get("activationLeadId") ?? params.get("leadId") ?? undefined;
  const intentId = params.get("intentId") ?? undefined;

  // Correlation REQUIRES activationLeadId AND (reference OR intentId).
  // Return URLs containing only `id` and `env` without correlation parameters CANNOT be polled and MUST NOT fabricate artificial intents.
  if (!activationLeadId || (!reference && !intentId)) {
    return null;
  }

  return {
    transactionId,
    environment,
    reference,
    activationLeadId,
    intentId
  };
}

export function formatWompiAmount(cents: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(cents / 100);
}
