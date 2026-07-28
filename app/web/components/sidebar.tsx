"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Layers,
  Sparkles,
  Settings,
  Flame,
  FileText,
  MousePointerClick,
  PlaySquare,
  Link2,
  Workflow,
  Sparkle
} from "lucide-react";

import { cn } from "@/lib/utils";
import { moduleNavigation } from "@/modules/catalog";

const iconMap: Record<string, any> = {
  "/dashboard": LayoutDashboard,
  "/partners": Users,
  "/plans": FileText,
  "/payments": CreditCard,
  "/master-site": Layers,
  "/landing-builder": MousePointerClick,
  "/vsl-builder": PlaySquare,
  "/creative-assets": Sparkles,
  "/campaigns": Flame,
  "/automations": Workflow,
  "/domains": Link2,
  "/settings": Settings
};

const groupedNavigation = moduleNavigation.reduce<
  Record<string, typeof moduleNavigation>
>((accumulator, item) => {
  if (!accumulator[item.group]) {
    accumulator[item.group] = [];
  }

  accumulator[item.group].push(item);
  return accumulator;
}, {});

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-[285px] shrink-0 border-r border-slate-200/80 bg-white/80 px-4 py-6 backdrop-blur-md xl:flex xl:flex-col">
      <div className="rounded-3xl bg-slate-950 px-5 py-4.5 text-white shadow-md">
        <div className="flex items-center gap-2">
          <Sparkle className="h-5 w-5 text-cyan-400" />
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-cyan-300">
            PartnerHub
          </p>
        </div>
        <h1 className="mt-2 text-lg font-bold leading-tight font-heading">
          SaaS operativo
        </h1>
        <p className="mt-1 text-xs leading-5 text-slate-400">
          Estructura modular para automatizar sitios, contenido y comisiones de socios.
        </p>
      </div>

      <nav className="mt-6 flex-1 space-y-6 overflow-y-auto pr-1">
        {Object.entries(groupedNavigation).map(([group, items]) => (
          <section key={group} className="space-y-1.5">
            <p className="px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              {group}
            </p>
            <div className="space-y-1">
              {items.map((item) => {
                const active = pathname === item.href;
                const Icon = iconMap[item.href] || Sparkle;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border px-3.5 py-2.5 transition-all duration-200",
                      active
                        ? "border-cyan-300/80 bg-cyan-50/80 text-cyan-950 font-semibold shadow-sm"
                        : "border-transparent text-slate-600 hover:bg-slate-100/70 hover:text-slate-950"
                    )}
                  >
                    <Icon className={cn("h-4.5 w-4.5 shrink-0", active ? "text-cyan-600" : "text-slate-400")} />
                    <div className="min-w-0">
                      <span className="block text-xs font-semibold tracking-tight">{item.name}</span>
                      <span className="block truncate text-[10px] text-slate-500">
                        {item.description}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </nav>
    </aside>
  );
}
