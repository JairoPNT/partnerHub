import { ModuleRecord } from "@/modules/catalog";

type ModulePageProps = {
  module: ModuleRecord;
};

export function ModulePage({ module }: ModulePageProps) {
  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-sand-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sand-800">
            {module.group}
          </span>
          <span className="rounded-full border border-stone-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-stone-600">
            {module.status}
          </span>
        </div>

        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
          {module.name}
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-stone-600">
          {module.description}
        </p>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-stone-500">
          {module.intent}
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <Card title="Focus inicial" items={module.focus} />
        <Card title="Outputs del scaffold" items={module.outputs} />
        <Card title="No construir todavia" items={module.notYet} />
      </section>
    </div>
  );
}

function Card({ title, items }: { title: string; items: string[] }) {
  return (
    <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">
        {title}
      </h2>
      <ul className="mt-5 space-y-3">
        {items.map((item) => (
          <li
            key={item}
            className="rounded-2xl bg-stone-50 px-4 py-3 text-sm leading-6 text-stone-700"
          >
            {item}
          </li>
        ))}
      </ul>
    </article>
  );
}

