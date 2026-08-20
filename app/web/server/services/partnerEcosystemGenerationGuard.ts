import type { EcosystemType } from "@/server/services/ecosystemService";

type PartnerEntitlement = {
  activationLeadId: string;
  includedEcosystems: EcosystemType[];
};

export class PartnerEcosystemGenerationError extends Error {
  readonly code: "PARTNER_ENTITLEMENT_NOT_FOUND" | "ECOSYSTEM_NOT_ENTITLED";
  readonly details: { siteId: string; ecosystemType: EcosystemType };

  constructor(
    code: "PARTNER_ENTITLEMENT_NOT_FOUND" | "ECOSYSTEM_NOT_ENTITLED",
    message: string,
    details: { siteId: string; ecosystemType: EcosystemType }
  ) {
    super(message);
    this.name = "PartnerEcosystemGenerationError";
    this.code = code;
    this.details = details;
  }
}

export function assertPartnerEcosystemGenerationAllowed(input: {
  siteId: string;
  ecosystemType: EcosystemType;
  masterSite: boolean;
  entitlement: PartnerEntitlement | null;
}) {
  if (input.masterSite) return;
  if (!input.entitlement) {
    throw new PartnerEcosystemGenerationError(
      "PARTNER_ENTITLEMENT_NOT_FOUND",
      `No partner entitlement exists for siteId ${input.siteId}.`,
      { siteId: input.siteId, ecosystemType: input.ecosystemType }
    );
  }
  if (!input.entitlement.includedEcosystems.includes(input.ecosystemType)) {
    throw new PartnerEcosystemGenerationError(
      "ECOSYSTEM_NOT_ENTITLED",
      `Partner ${input.entitlement.activationLeadId} is not entitled to ${input.ecosystemType}.`,
      { siteId: input.siteId, ecosystemType: input.ecosystemType }
    );
  }
}
