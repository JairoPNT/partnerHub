import "server-only";

import { z } from "zod";

import { activationLeadService } from "@/server/services/activationLeadService";
import { complimentaryEcosystemGrantService } from "@/server/services/complimentaryEcosystemGrantService";
import { buildPartnerEcosystemEntitlement } from "@/server/services/partnerEcosystemEntitlementCore";
import { partnerEcosystemTargetReader } from "@/server/services/partnerEcosystemTargetReader";
import { manualPaymentLedgerService } from "@/server/services/manualPaymentLedgerService";

export const partnerEcosystemEntitlementQuerySchema = z.object({
  activationLeadId: z.string().uuid().optional(),
  siteId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional()
}).strict().superRefine((value, context) => {
  if (Boolean(value.activationLeadId) === Boolean(value.siteId)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Provide exactly one of activationLeadId or siteId."
    });
  }
});

async function get(rawQuery: unknown) {
  const query = partnerEcosystemEntitlementQuerySchema.parse(rawQuery);
  const [leads, targets, paymentResult] = await Promise.all([
    activationLeadService.list({ includeArchived: true }),
    partnerEcosystemTargetReader.list(),
    manualPaymentLedgerService.list({ status: "CONFIRMED" })
  ]);
  const lead = query.activationLeadId
    ? leads.find((candidate) => candidate.id === query.activationLeadId)
    : leads.find((candidate) => candidate.siteId === query.siteId) ??
      leads.find((candidate) => candidate.id === targets.find((target) => target.siteId === query.siteId)?.ownerKey);
  if (!lead) return null;
  const complimentaryGrantEcosystems = await complimentaryEcosystemGrantService.listActiveEcosystems(lead.id);
  return buildPartnerEcosystemEntitlement({
    ...lead,
    complimentaryGrantEcosystems,
    additionalCommercialSnapshots: paymentResult.payments
      .filter((payment) => payment.activationLeadId === lead.id)
      .flatMap((payment) => payment.commercialSnapshot ? [payment.commercialSnapshot] : [])
  }, targets);
}

export const partnerEcosystemEntitlementService = { get };
