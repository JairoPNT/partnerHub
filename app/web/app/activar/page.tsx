"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock3, Gift, ShieldCheck } from "lucide-react";
import { ActivationForm, FormDataState } from "@/components/beta-landing/ActivationForm";
import { PAYMENT_CONFIG } from "@/lib/config/payment-methods";

const includedItems = [
  "Pagina comercial de producto en dominio propio.",
  "Personalizacion basica con nombre, marca, WhatsApp, tienda, portada y estilo visual.",
  "Publicacion inicial y verificacion de enlaces principales.",
  "Gestion mensual para soporte y cambios menores dentro del alcance.",
];

export default function DirectActivationPage() {
  const handleFormSubmit = (_data: FormDataState) => {
    // ActivationForm handles the redirect to the resumable onboarding URL.
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/oferta-beta"
          className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-cyan-400 hover:text-cyan-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Ver oferta completa
        </Link>

        <div className="grid gap-8 py-10 lg:grid-cols-[1fr_0.9fr] lg:items-start">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-cyan-300">
              Activacion directa
            </div>
            <h1 className="mt-5 font-heading text-4xl font-extrabold tracking-tight sm:text-5xl">
              Diligencia tus datos para iniciar tu pagina PartnerHub
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
              Usa este enlace si ya hablaste con nosotros por WhatsApp, si vas a pagar por transferencia
              o si quieres empezar sin pasar por la pagina de venta.
            </p>

            <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
              <h2 className="text-lg font-bold">Que incluye</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {includedItems.map((item) => (
                  <div key={item} className="flex gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                    <p className="text-sm text-slate-200">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside className="rounded-3xl border border-cyan-400/20 bg-slate-900/80 p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-1 h-6 w-6 shrink-0 text-cyan-300" />
              <div>
                <h2 className="text-xl font-extrabold">Oferta actual</h2>
                <p className="mt-1 text-sm text-slate-400">Etapa MVP para empresarios fundadores.</p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-2xl bg-slate-950 p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Activacion inicial</p>
                <p className="mt-2 font-heading text-3xl font-extrabold">{PAYMENT_CONFIG.amount}</p>
              </div>
              <div className="rounded-2xl bg-slate-950 p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Gestion mensual</p>
                <p className="mt-2 text-2xl font-extrabold">{PAYMENT_CONFIG.monthlyFee}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 text-sm text-slate-200">
              <div className="flex gap-3">
                <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" />
                <span>Entrega estimada: {PAYMENT_CONFIG.deliveryWindow} despues de pago y datos minimos.</span>
              </div>
              <div className="flex gap-3">
                <Gift className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                <span>
                  Referidos: 1 mes de gestion por cada 2 referidos efectivos. Un referido efectivo
                  es un empresario pagado, validado y activo en PartnerHub.
                </span>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <ActivationForm onFormSubmit={handleFormSubmit} />
    </main>
  );
}
