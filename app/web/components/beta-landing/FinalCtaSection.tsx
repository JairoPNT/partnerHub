"use client";

import React from "react";
import { ArrowRight, Sparkles, ShieldCheck } from "lucide-react";
import { PAYMENT_CONFIG } from "@/lib/config/payment-methods";

interface FinalCtaSectionProps {
  onActivateClick: () => void;
}

export function FinalCtaSection({ onActivateClick }: FinalCtaSectionProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-sky-950 to-cyan-950 py-16 text-white sm:py-24">
      <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
        
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-cyan-300">
          <Sparkles className="h-4 w-4" />
          Fase Beta Fundadora
        </div>

        <h2 className="mt-6 font-heading text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
          Presenta tus productos con la calidad que merece tu negocio
        </h2>

        <p className="mx-auto mt-4 max-w-2xl text-base text-slate-300 sm:text-lg">
          Aprovecha el precio de entrada de <strong className="text-white">{PAYMENT_CONFIG.amount}</strong> y los <strong className="text-cyan-300 font-semibold">{PAYMENT_CONFIG.bonusSavings} de beneficio</strong> en gestión bonificada por sumarte hoy.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <button
            onClick={onActivateClick}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 px-9 py-4.5 text-lg font-extrabold text-slate-950 shadow-2xl transition hover:scale-[1.03] focus:outline-none focus:ring-2 focus:ring-cyan-300 sm:w-auto"
          >
            Activar mi ecosistema ahora
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-cyan-400" />
            Configuración y puesta en marcha guiada
          </span>
          <span>•</span>
          <span>Pago seguro con Bancolombia, Bre-b o Wompi</span>
          <span>•</span>
          <span>Mensualidad regular de {PAYMENT_CONFIG.monthlyFee} desde el mes 3</span>
        </div>

      </div>
    </section>
  );
}
