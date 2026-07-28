import Link from "next/link";
import { Bell, Search, User, Globe } from "lucide-react";

export function Topbar() {
  return (
    <header className="border-b border-slate-200/80 bg-white/80 px-4 py-3.5 backdrop-blur-md sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        {/* Left Search / Action Area */}
        <div className="relative hidden max-w-xs flex-1 sm:block">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar en el sistema..."
            className="w-full rounded-full border border-slate-200 bg-slate-50/70 py-1.5 pl-10 pr-4 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white focus:ring-2 focus:ring-cyan-400/20"
          />
        </div>

        {/* Right Info area */}
        <div className="flex items-center gap-4 ml-auto">
          <div className="hidden items-center gap-2 rounded-full border border-cyan-200/80 bg-cyan-50/80 px-3.5 py-1 text-[11px] font-semibold text-cyan-900 sm:flex">
            <Globe className="h-3.5 w-3.5 text-cyan-600" />
            <span>Multi-Tenant Sandbox</span>
          </div>

          <button className="relative rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-100/70 hover:text-slate-900 transition">
            <Bell className="h-4 w-4" />
            <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-cyan-500" />
          </button>

          <div className="h-6 w-px bg-slate-200" />

          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-cyan-600 to-blue-600 text-[11px] font-bold text-white shadow-sm font-heading">
              JS
            </div>
            <div className="hidden text-left xl:block">
              <p className="text-xs font-semibold text-slate-900">Jairo S.</p>
              <p className="text-[10px] text-slate-500">Administrador</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
