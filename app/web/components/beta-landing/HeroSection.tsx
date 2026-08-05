"use client";

import React from "react";
import { Sparkles, ArrowRight, ShieldCheck, CheckCircle2, Gift } from "lucide-react";
import { PAYMENT_CONFIG } from "@/lib/config/payment-methods";

interface HeroSectionProps {
  onActivateClick: () => void;
  onDemosClick: () => void;
}

export function HeroSection({ onActivateClick, onDemosClick }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-sky-50/70 via-white to-slate-50 pb-16 pt-12 sm:pb-24 sm:pt-20">
      {/* Subtle background glow highlights */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-cyan-200/40 via-sky-200/30 to-fuchsia-200/20 blur-3xl" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Top Badge */}
        <div className="flex justify-center text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50/80 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-cyan-900 shadow-sm">
            <Sparkles className="h-4 w-4 text-cyan-600" />
            Lanzamiento Beta Fundador — PartnerHub
          </div>
        </div>

        {/* Headline */}
        <div className="mt-8 text-center">
          <h1 className="mx-auto max-w-4xl font-heading text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl lg:leading-[1.15]">
            Activa hoy tu Ecosistema de Producto con{" "}
            <span className="bg-gradient-to-r from-cyan-600 via-blue-600 to-fuchsia-600 bg-clip-text text-transparent">
              precio fundador
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600 sm:text-xl">
            Una presencia digital organizada, personalizada y lista para compartir tus productos por WhatsApp, sin depender de imágenes, audios o mensajes dispersos.
          </p>
        </div>

        {/* Value Highlights Box */}
        <div className="mx-auto mt-10 max-w-2xl rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-xl backdrop-blur-md sm:p-8">
          <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50/80 to-cyan-50/40 p-6 text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Inversión Inicial Beta
            </span>
            <p className="mt-2 font-heading text-4xl font-extrabold text-slate-900 sm:text-5xl">
              {PAYMENT_CONFIG.amount}
            </p>
            <p className="mt-2 text-xs font-medium text-slate-600">
              Activa tu Ecosistema de Producto en etapa MVP con configuración inicial guiada.
            </p>
          </div>

          {/* Guarantee / Referral Note */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4 text-xs font-medium text-slate-600 border-t border-slate-100 pt-4">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-cyan-600 shrink-0" />
              Gestión regular de {PAYMENT_CONFIG.monthlyFee}
            </span>
            <span className="flex items-center gap-1.5 text-fuchsia-700 font-semibold">
              <Gift className="h-4 w-4 text-fuchsia-600 shrink-0" />
              {PAYMENT_CONFIG.referralCredit}
            </span>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <button
            onClick={onActivateClick}
            className="group flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-cyan-600 via-blue-600 to-sky-700 px-8 py-4 text-base font-bold text-white shadow-xl shadow-cyan-600/20 transition hover:scale-[1.02] sm:w-auto"
          >
            <span>Quiero activar mi ecosistema</span>
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </button>

          <button
            onClick={onDemosClick}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-7 py-4 text-base font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 sm:w-auto"
          >
            <span>Ver muestras activas</span>
          </button>
        </div>

        {/* Trust Badges */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs font-medium text-slate-500">
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-cyan-600" />
            Sin contratos de permanencia
          </span>
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-cyan-600" />
            Configuración inicial asistida
          </span>
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-cyan-600" />
            Soporte técnico directo por WhatsApp
          </span>
        </div>
      </div>
    </section>
  );
}
