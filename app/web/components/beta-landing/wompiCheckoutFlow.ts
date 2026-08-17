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
 * Builds the Wompi Checkout URL using server-generated signature and reference.
 * CRITICAL SECURITY & ACCESSIBILITY RULE:
 * The `redirect-url` query parameter MUST NEVER contain an onboarding path (e.g. /onboarding/[token]).
 * It must point back to a public payment status / landing page (e.g. /oferta-beta or /activar).
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
    params.append("redirect-url", `${baseUrl}${normalizedPath}`);
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

  if (!transactionId && !reference && !activationLeadId && !intentId) {
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
