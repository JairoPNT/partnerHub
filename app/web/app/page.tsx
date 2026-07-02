import Link from "next/link";

import { site } from "@/lib/site";
import { moduleCatalog } from "@/modules/catalog";

const spotlight = moduleCatalog.slice(0, 6);

export default function HomePage() {
  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="glass-panel rounded-[2rem] p-6 sm:p-8">
          <div className="inline-flex rounded-full border border-sand-200 bg-sand-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-sand-800">
            PartnerHub architecture
          </div>

          <div className="mt-6 grid gap-10 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
            <div>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-stone-950 sm:text-6xl">
                {site.subtitle}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-stone-600 sm:text-lg">
                {site.description}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/dashboard"
                  className="rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800"
                >
                  Open dashboard
                </Link>
                <a
                  href="#modules"
                  className="rounded-full border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-700 transition hover:border-stone-400 hover:bg-white"
                >
                  Explore modules
                </a>
              </div>
            </div>

            <div className="rounded-[1.75rem] bg-stone-950 p-6 text-white shadow-glow">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
                Stack
              </p>
              <ul className="mt-5 space-y-3">
                {site.stack.map((item) => (
                  <li
                    key={item}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </header>

        <section id="modules" className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {spotlight.map((module) => (
            <article
              key={module.slug}
              className="rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-stone-950">
                  {module.name}
                </h2>
                <span className="rounded-full bg-sand-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sand-800">
                  {module.status}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-stone-600">
                {module.description}
              </p>
              <Link
                href={`/${module.slug}`}
                className="mt-4 inline-flex text-sm font-semibold text-stone-950 underline decoration-sand-500 underline-offset-4"
              >
                Open module
              </Link>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

