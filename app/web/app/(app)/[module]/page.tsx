import { notFound } from "next/navigation";

import { ModulePage } from "@/components/module-page";
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

  return <ModulePage module={record} />;
}
