import Link from "next/link";

import { site } from "@/lib/site";

export function Topbar() {
  return (
    <header className="border-b border-stone-200 bg-white/80 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sand-700">
            {site.founder}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-stone-950">
            {site.name}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden rounded-full border border-sand-200 bg-sand-50 px-3 py-1 text-xs font-medium text-sand-800 sm:inline-flex">
            Architecture scaffold
          </span>
          <Link
            href="/dashboard"
            className="rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-800"
          >
            Open dashboard
          </Link>
        </div>
      </div>
    </header>
  );
}

