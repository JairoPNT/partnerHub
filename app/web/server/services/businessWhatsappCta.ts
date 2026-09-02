export type BusinessCtaCopy = {
  primaryText?: string;
  secondaryText?: string;
  guaranteeText?: string;
  directRegisterText?: string;
};

export type BusinessWhatsappCta = BusinessCtaCopy & {
  primaryUrl: string;
  secondaryUrl: string;
  directRegisterUrl: "";
};

type BusinessWhatsappIdentity = {
  whatsappNumber: string;
  defaultMessage: string;
};

function optionalText(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

export function buildBusinessWhatsappCta(
  identity: BusinessWhatsappIdentity,
  copy: BusinessCtaCopy = {}
): BusinessWhatsappCta {
  const whatsappNumber = identity.whatsappNumber.replace(/\D/g, "");
  const defaultMessage = identity.defaultMessage.trim();

  if (whatsappNumber.length < 10 || whatsappNumber.length > 15) {
    throw new Error("BUSINESS_WHATSAPP_NUMBER_INVALID");
  }
  if (!defaultMessage) throw new Error("BUSINESS_WHATSAPP_MESSAGE_INVALID");

  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(defaultMessage)}`;
  const primaryText = optionalText(copy.primaryText);
  const secondaryText = optionalText(copy.secondaryText);
  const guaranteeText = optionalText(copy.guaranteeText);
  const directRegisterText = optionalText(copy.directRegisterText);

  return {
    ...(primaryText ? { primaryText } : {}),
    ...(secondaryText ? { secondaryText } : {}),
    ...(guaranteeText ? { guaranteeText } : {}),
    ...(directRegisterText ? { directRegisterText } : {}),
    primaryUrl: whatsappUrl,
    secondaryUrl: whatsappUrl,
    directRegisterUrl: ""
  };
}
