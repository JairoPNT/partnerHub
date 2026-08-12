import "server-only";

import { activationLeadService } from "@/server/services/activationLeadService";
import {
  buildDashboardFinancialMetrics,
  type DashboardMetricsPeriodInput
} from "@/server/services/dashboardFinancialMetricsCore";
import { manualPaymentLedgerService } from "@/server/services/manualPaymentLedgerService";

export const dashboardMetricsService = {
  async get(period: DashboardMetricsPeriodInput = {}) {
    const [leads, ledger] = await Promise.all([
      activationLeadService.list(),
      manualPaymentLedgerService.list()
    ]);
    const linkedSiteIds = new Set(leads.map((lead) => lead.siteId).filter(Boolean));
    const count = (status: string) => leads.filter((lead) => lead.status === status).length;
    const financial = buildDashboardFinancialMetrics(ledger.payments, leads, period);

    return {
      source: "activation-leads-and-manual-payment-ledger",
      generatedAt: new Date().toISOString(),
      totalLeads: leads.length,
      operationalActive: count("PAID") + count("CONVERTED"),
      newLeads: count("NEW"),
      contactedLeads: count("CONTACTED"),
      paidLeads: count("PAID"),
      convertedLeads: count("CONVERTED"),
      cancelledLeads: count("CANCELLED"),
      linkedSites: linkedSiteIds.size,
      financial,
      unsupportedMetrics: ["vslConversion", "sslCoverage"]
    };
  }
};
