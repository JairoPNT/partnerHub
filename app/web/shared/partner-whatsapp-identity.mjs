export function normalizePartnerWhatsapp(value) {
  return typeof value === "string" ? value.replace(/\D/g, "") : "";
}

export function resolvePartnerWhatsappIdentity({ leadWhatsapp, onboardingWhatsapp }) {
  const normalizedLead = normalizePartnerWhatsapp(leadWhatsapp);
  const normalizedOnboarding = normalizePartnerWhatsapp(onboardingWhatsapp);
  if (normalizedLead && normalizedOnboarding && normalizedLead !== normalizedOnboarding) {
    return { value: null, leadWhatsapp: normalizedLead, onboardingWhatsapp: normalizedOnboarding, conflict: true };
  }
  return {
    value: normalizedOnboarding || normalizedLead || null,
    leadWhatsapp: normalizedLead || null,
    onboardingWhatsapp: normalizedOnboarding || null,
    conflict: false
  };
}

export function assertPartnerWhatsappIdentity(input) {
  const resolution = resolvePartnerWhatsappIdentity(input);
  if (resolution.conflict) throw new Error("PARTNER_WHATSAPP_CONFLICT");
  return resolution;
}
