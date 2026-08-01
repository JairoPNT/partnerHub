"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  type LucideIcon,
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
  Sparkle,
  BarChart3
} from "lucide-react";

import { cn } from "@/lib/utils";
import { moduleNavigation } from "@/modules/catalog";

const iconMap: Record<string, LucideIcon> = {
  "/dashboard": LayoutDashboard,
  "/partners": Users,
  "/plans": FileText,
  "/payments": CreditCard,
  "/master-site": Layers,
  "/landing-builder": MousePointerClick,
  "/vsl-builder": PlaySquare,
  "/creative-assets": Sparkles,
  "/analytics": BarChart3,
  "/campaigns": Flame,
  "/automations": Workflow,
  "/domains": Link2,
  "/settings": Settings
};

const navigationGroupOrder = ["Core", "Operations", "Growth"] as const;

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
    <aside className="sticky top-0 h-screen hidden w-[285px] shrink-0 border-r border-slate-200/80 bg-white/80 px-4 py-6 backdrop-blur-md xl:flex xl:flex-col overflow-y-auto">
      <div className="rounded-3xl border border-slate-200/90 bg-gradient-to-br from-slate-50 via-cyan-50/40 to-slate-100/60 p-5 shadow-sm text-slate-900">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-600 text-white shadow-sm">
            <Sparkle className="h-4.5 w-4.5" />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-700">
              PartnerHub
            </p>
            <h1 className="text-sm font-extrabold leading-tight text-slate-900 font-heading">
              SaaS Operativo
            </h1>
          </div>
        </div>
      </div>

      <nav className="mt-6 flex-1 space-y-6 overflow-y-auto pr-1">
        {navigationGroupOrder.map((group) => {
          const items = groupedNavigation[group] || [];

          if (items.length === 0) {
            return null;
          }

          return (
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
          );
        })}
      </nav>
    </aside>
  );
}
