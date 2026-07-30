import "server-only";

import { activationLeadService } from "@/server/services/activationLeadService";

export const dashboardMetricsService = {
  async get() {
    const leads = await activationLeadService.list();
    const linkedSiteIds = new Set(leads.map((lead) => lead.siteId).filter(Boolean));
    const count = (status: string) => leads.filter((lead) => lead.status === status).length;

    return {
      source: "activation-leads",
      generatedAt: new Date().toISOString(),
      totalLeads: leads.length,
      operationalActive: count("PAID") + count("CONVERTED"),
      newLeads: count("NEW"),
      contactedLeads: count("CONTACTED"),
      paidLeads: count("PAID"),
      convertedLeads: count("CONVERTED"),
      cancelledLeads: count("CANCELLED"),
      linkedSites: linkedSiteIds.size,
      unsupportedMetrics: ["revenue", "vslConversion", "sslCoverage"]
    };
  }
};
