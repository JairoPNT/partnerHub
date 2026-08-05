"use client";

import React from "react";
import { Sparkles, Check, ArrowRight, Clock, ShieldCheck, Zap } from "lucide-react";
import { PAYMENT_CONFIG } from "@/lib/config/payment-methods";

interface BetaOfferSectionProps {
  onActivateClick: () => void;
}

export function BetaOfferSection({ onActivateClick }: BetaOfferSectionProps) {
  return (
    <section id="oferta" className="bg-gradient-to-b from-slate-900 via-sky-950 to-slate-950 py-16 text-white sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-fuchsia-300">
            <Zap className="h-4 w-4" />
            Oferta Especial para Empresarios Fundadores
          </div>

          <h2 className="mt-4 font-heading text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            Resumen de la Oferta Beta
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-base text-slate-300 sm:text-lg">
            Estamos en la fase inicial de validación del proyecto. Por eso abrimos un precio de entrada exclusivo para los empresarios que activen su ecosistema en esta etapa fundadora.
          </p>
        </div>

        {/* Offer Box */}
        <div className="mx-auto mt-12 max-w-4xl rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-md sm:p-10">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
            
            {/* Left Pricing Details */}
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 text-xs font-semibold text-cyan-300">
                <Clock className="h-3.5 w-3.5" />
                Válido durante etapa de validación MVP
              </div>

              <div className="mt-6">
                <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                  Inversión Inicial Promocional
                </span>
                <div className="mt-1 flex items-baseline gap-3">
                  <span className="font-heading text-4xl font-extrabold text-white sm:text-5xl">
                    {PAYMENT_CONFIG.amount}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Pago único de activación para el primer Ecosistema de Producto.
                </p>
              </div>

              <div className="mt-6 space-y-3.5 border-t border-slate-800 pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 mt-0.5">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                  <p className="text-sm text-slate-200">
                    <strong className="text-white">Entrega guiada:</strong> configuración, generación y publicación inicial después de validar el pago.
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 mt-0.5">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                  <p className="text-sm text-slate-200">
                    <strong className="text-white">Gestión mensual:</strong> {PAYMENT_CONFIG.monthlyFee} para mantener publicación, soporte y cambios menores dentro del alcance.
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 mt-0.5">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                  <p className="text-sm text-slate-200">
                    <strong className="text-white">Flexibilidad de pago:</strong> Opción de diferir hasta en 3 cuotas si pagas con tarjeta de crédito por Wompi.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Summary Card & CTA */}
            <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-cyan-950/60 to-slate-900 p-6 text-center lg:col-span-5">
              <div className="inline-block rounded-full bg-fuchsia-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-fuchsia-300">
                Entrada MVP
              </div>

              <p className="mt-4 text-xs text-slate-300">
                Al activar hoy aseguras el precio de entrada fundador durante la etapa de validación del MVP.
              </p>

              <button
                onClick={onActivateClick}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-4 text-base font-bold text-white shadow-lg transition hover:from-cyan-400 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                Activar mi ecosistema
                <ArrowRight className="h-5 w-5" />
              </button>

              <p className="mt-3 text-[11px] text-slate-400">
                Precio de entrada aplicable durante validación del MVP. Los precios pueden actualizarse en la segunda etapa.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
