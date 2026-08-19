import type { ComplimentaryEcosystemGrant } from "./complimentaryEcosystemGrantCore";
import type { EcosystemType } from "./partnerEcosystemEntitlementCore";

type EntitlementReadback = {
  commercialState: "KNOWN" | "UNKNOWN";
  includedEcosystems: EcosystemType[];
  regenerationRequired: boolean;
  regenerationReasons: string[];
  rootRedirectTarget: { ecosystemType: EcosystemType; publicHost: string } | null;
};

export function listComplimentaryGrantsByLead(
  records: ComplimentaryEcosystemGrant[],
  activationLeadId: string
) {
  return records
    .filter((record) => record.activationLeadId === activationLeadId)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

export function complimentaryGrantLifecycleStatus(
  grant: Pick<ComplimentaryEcosystemGrant, "effectiveDate" | "cutoffDate">,
  effectiveDate: string
) {
  if (grant.effectiveDate > effectiveDate) return "SCHEDULED" as const;
  if (grant.cutoffDate && grant.cutoffDate < effectiveDate) return "EXPIRED" as const;
  return "ACTIVE" as const;
}

export function buildComplimentaryGrantReadback(
  activationLeadId: string,
  grants: ComplimentaryEcosystemGrant[],
  entitlement: EntitlementReadback,
  effectiveDate: string
) {
  return {
    activationLeadId,
    effectiveDate,
    grants: grants.map((grant) => ({
      id: grant.id,
      ecosystemTypes: [...grant.ecosystemTypes],
      grantReason: grant.grantReason,
      effectiveDate: grant.effectiveDate,
      cutoffDate: grant.cutoffDate,
      notes: grant.notes,
      operator: {
        subject: grant.operatorSubject,
        email: grant.operatorEmail
      },
      regenerationRequired: grant.regenerationRequired,
      lifecycleStatus: complimentaryGrantLifecycleStatus(grant, effectiveDate),
      createdAt: grant.createdAt
    })),
    entitlement: {
      commercialState: entitlement.commercialState,
      includedEcosystems: [...entitlement.includedEcosystems],
      regenerationRequired: entitlement.regenerationRequired,
      regenerationReasons: [...entitlement.regenerationReasons],
      rootRedirectTarget: entitlement.rootRedirectTarget
        ? { ...entitlement.rootRedirectTarget }
        : null
    }
  };
}
