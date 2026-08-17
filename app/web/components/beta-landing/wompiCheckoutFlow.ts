export type WompiCheckoutStatus = "INITIAL" | "PENDING" | "APPROVED" | "DECLINED" | "ERROR";

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

export function isOnboardingAllowed(status: WompiCheckoutStatus, paymentMethod: "wompi" | "direct"): boolean {
  if (paymentMethod === "direct") return true;
  return status === "APPROVED";
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
  // Sanitize resultPath to prevent any accidental onboarding token leakage into Wompi query params
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

export function formatWompiAmount(cents: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(cents / 100);
}
