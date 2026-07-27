import Link from "next/link";
import { Bell, Search, User, Globe } from "lucide-react";
import { site } from "@/lib/site";

export function Topbar() {
  return (
    <header className="border-b border-stone-200/80 bg-white/60 px-4 py-4 backdrop-blur-md sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        {/* Left Search / Action Area */}
        <div className="relative hidden max-w-xs flex-1 sm:block">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Buscar en el sistema..."
            className="w-full rounded-full border border-stone-200/80 bg-stone-50/50 py-1.5 pl-10 pr-4 text-xs text-stone-700 outline-none transition placeholder:text-stone-400 focus:border-sand-300 focus:bg-white"
          />
        </div>

        {/* Right Info area */}
        <div className="flex items-center gap-4 ml-auto">
          <div className="hidden items-center gap-2 rounded-full border border-sand-200/60 bg-sand-50/50 px-3 py-1 text-[11px] font-medium text-sand-800 sm:flex">
            <Globe className="h-3.5 w-3.5 text-sand-600" />
            <span>Multi-Tenant Sandbox</span>
          </div>

          <button className="relative rounded-full border border-stone-200 p-2 text-stone-500 hover:bg-stone-50 hover:text-stone-900 transition">
            <Bell className="h-4 w-4" />
            <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-sand-500" />
          </button>

          <div className="h-6 w-px bg-stone-200" />

          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-900 text-[11px] font-bold text-white shadow-subtle">
              JS
            </div>
            <div className="hidden text-left xl:block">
              <p className="text-xs font-semibold text-stone-900">Jairo S.</p>
              <p className="text-[10px] text-stone-500">Administrador</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}


