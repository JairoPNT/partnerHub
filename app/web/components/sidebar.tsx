"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { moduleNavigation } from "@/modules/catalog";

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
    <aside className="hidden w-[300px] shrink-0 border-r border-stone-200 bg-white/80 px-4 py-6 backdrop-blur xl:flex xl:flex-col">
      <div className="rounded-3xl bg-stone-950 px-5 py-4 text-white shadow-glow">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-300">
          PartnerHub
        </p>
        <h1 className="mt-3 text-xl font-semibold leading-tight">
          SaaS operativo para multinivel
        </h1>
        <p className="mt-2 text-sm leading-6 text-stone-300">
          Estructura modular para escalar sitios, contenido, automatizaciones y
          cobros.
        </p>
      </div>

      <nav className="mt-6 space-y-6 overflow-y-auto pr-2">
        {Object.entries(groupedNavigation).map(([group, items]) => (
          <section key={group}>
            <p className="px-3 text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
              {group}
            </p>
            <div className="mt-2 space-y-1">
              {items.map((item) => {
                const active = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "block rounded-2xl border px-4 py-3 transition",
                      active
                        ? "border-sand-300 bg-sand-100 text-stone-950 shadow-sm"
                        : "border-transparent text-stone-700 hover:border-stone-200 hover:bg-stone-100"
                    )}
                  >
                    <span className="block text-sm font-semibold">{item.name}</span>
                    <span className="mt-1 block text-xs leading-5 text-stone-500">
                      {item.description}
                    </span>
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

