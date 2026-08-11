import Link from "next/link";
import { Bell, Search, User, Globe } from "lucide-react";

export function Topbar() {
  return (
    <header className="border-b border-gray-200/80 bg-white/80 px-4 py-3.5 backdrop-blur-md sm:px-6 lg:px-8 shrink-0">
      <div className="flex items-center justify-between gap-4">
        {/* Left Search / Action Area */}
        <div className="relative hidden max-w-xs flex-1 sm:block">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar en el ecosistema..."
            className="w-full rounded-full border border-gray-200 bg-gray-50/70 py-1.5 pl-10 pr-4 text-xs text-ph-navy outline-none transition placeholder:text-gray-400 focus:border-ph-blue focus:bg-white focus:ring-2 focus:ring-ph-blue/20"
          />
        </div>

        {/* Right Info area */}
        <div className="flex items-center gap-4 ml-auto">
          <div className="hidden items-center gap-2 rounded-full border border-ph-light bg-ph-light/50 px-3.5 py-1 text-[11px] font-semibold text-ph-blue sm:flex">
            <Globe className="h-3.5 w-3.5 text-ph-blue" />
            <span>Red Activa</span>
          </div>

          <button className="relative rounded-full border border-gray-200 p-2 text-gray-500 hover:bg-gray-100 hover:text-ph-navy transition">
            <Bell className="h-4 w-4" />
            <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-ph-blue" />
          </button>
        </div>
      </div>
    </header>
  );
}
