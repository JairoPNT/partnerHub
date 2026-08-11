"use client";

import Link from "next/link";
import Image from "next/image";
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
    <aside className="sticky top-0 h-screen hidden w-64 shrink-0 border-r border-ph-navy bg-ph-navy flex-col xl:flex overflow-hidden">
      
      {/* Brand & Logo */}
      <div className="px-6 py-8 flex items-center gap-3 shrink-0">
        <Image src="/logos/logo-blanco.png" alt="PartnerHub Logo" width={32} height={32} className="object-contain" />
        <span className="font-heading font-semibold text-white text-xl tracking-wide">
          Partner<span className="text-ph-blue">Hub</span>
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-2 space-y-6 overflow-y-auto custom-scrollbar">
        {navigationGroupOrder.map((group) => {
          const items = groupedNavigation[group] || [];
          if (items.length === 0) return null;

          return (
            <section key={group} className="space-y-1.5">
              <p className="px-4 text-[10px] font-bold uppercase tracking-wider text-white/40">
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
                        "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium text-sm group",
                        active
                          ? "bg-ph-blue text-white shadow-card"
                          : "text-white/70 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <Icon className={cn("h-5 w-5 shrink-0", active ? "opacity-90 text-white" : "opacity-70 group-hover:opacity-90")} />
                      <div className="min-w-0">
                        <span className="block truncate">{item.name}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </nav>

      {/* User Profile Footer */}
      <div className="p-4 mt-auto border-t border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/20">
            <Image 
              src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" 
              alt="User profile" 
              width={40} 
              height={40} 
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">Ana Martinez</p>
            <p className="text-xs text-white/60 truncate">Admin de marca</p>
          </div>
        </div>
      </div>

    </aside>
  );
}
