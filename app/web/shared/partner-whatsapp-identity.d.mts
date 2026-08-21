export type PartnerWhatsappResolution = {
  value: string | null;
  leadWhatsapp: string | null;
  onboardingWhatsapp: string | null;
  conflict: boolean;
};

export function normalizePartnerWhatsapp(value: unknown): string;
export function resolvePartnerWhatsappIdentity(input: {
  leadWhatsapp?: unknown;
  onboardingWhatsapp?: unknown;
}): PartnerWhatsappResolution;
export function assertPartnerWhatsappIdentity(input: {
  leadWhatsapp?: unknown;
  onboardingWhatsapp?: unknown;
}): PartnerWhatsappResolution;
