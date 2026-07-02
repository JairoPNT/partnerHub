import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="max-w-xl rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sand-700">
          PartnerHub
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-stone-950">
          Page not found
        </h1>
        <p className="mt-3 text-sm leading-6 text-stone-600">
          The requested module or route does not exist in the current scaffold.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800"
        >
          Back home
        </Link>
      </div>
    </main>
  );
}

