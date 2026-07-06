import { notFound } from "next/navigation";

import { ModulePage } from "@/components/module-page";
import { AdminDashboardPrototype } from "@/components/dashboard-view";
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

  return <ModulePage module={record} />;
}

