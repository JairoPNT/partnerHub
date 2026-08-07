import { notFound } from "next/navigation";

import { ModulePage } from "@/components/module-page";
import { AdminDashboardPrototype } from "@/components/dashboard-view";
import { ProductPageGeneratorView } from "@/components/product-page-generator-view";
import { PartnersReferralsView } from "@/components/partners-referrals-view";
import { MasterSiteManagementView } from "@/components/master-site-management-view";
import { AnalyticsAndMetricsView } from "@/components/analytics-and-metrics-view";
import { DomainsInventoryView } from "@/components/domains-inventory-view";
import { getModule, moduleCatalog } from "@/modules/catalog";

type ModuleRouteProps = {
  params: Promise<{
    module: string;
  }>;
};

export function generateStaticParams() {
  return moduleCatalog.map((module) => ({
    module: module.slug
  }));
}

export default async function ModuleRoute({ params }: ModuleRouteProps) {
  const { module: moduleSlug } = await params;
  const record = getModule(moduleSlug);

  if (!record) {
    notFound();
  }

  if (moduleSlug === "dashboard") {
    return <AdminDashboardPrototype />;
  }

  if (moduleSlug === "landing-builder") {
    return <ProductPageGeneratorView record={record} />;
  }

  if (moduleSlug === "partners") {
    return <PartnersReferralsView record={record} />;
  }

  if (moduleSlug === "master-site") {
    return <MasterSiteManagementView record={record} />;
  }

  if (moduleSlug === "analytics") {
    return <AnalyticsAndMetricsView record={record} />;
  }

  if (moduleSlug === "domains") {
    return <DomainsInventoryView record={record} />;
  }

  return <ModulePage module={record} />;
}

