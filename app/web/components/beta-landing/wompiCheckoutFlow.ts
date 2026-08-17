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

export function buildWompiCheckoutUrl(
  intent: WompiIntentData,
  baseUrl?: string,
  onboardingPath?: string
): string {
  const params = new URLSearchParams({
    "public-key": intent.publicKey,
    currency: intent.currency,
    "amount-in-cents": intent.amountInCents.toString(),
    reference: intent.reference,
    "signature:integrity": intent.signature.integrity
  });
  if (onboardingPath && baseUrl) {
    params.append("redirect-url", `${baseUrl}${onboardingPath}`);
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
