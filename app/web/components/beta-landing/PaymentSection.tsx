"use client";

import React, { useState } from "react";
import { Copy, Check, CreditCard, Building2, ExternalLink, ShieldCheck } from "lucide-react";
import { PAYMENT_CONFIG } from "@/lib/config/payment-methods";

export function PaymentSection() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  return (
    <section id="metodos-pago" className="bg-slate-50 py-16 sm:py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-cyan-900">
            <ShieldCheck className="h-4 w-4 text-cyan-600" />
            Métodos de Pago Habilitados
          </div>

          <h2 className="mt-4 font-heading text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Instrucciones para Completar tu Pago
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600">
            Selecciona el medio de pago de tu preferencia para la tarifa beta de{" "}
            <strong className="text-slate-900 font-bold">{PAYMENT_CONFIG.amount}</strong>.
          </p>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-2">
          
          {/* Card 1: Wompi / Credit Card */}
          <div className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
            <div>
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-600 text-white shadow-md">
                  <CreditCard className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-700">
                    Pago con Tarjeta
                  </span>
                  <h3 className="text-xl font-bold text-slate-900">Wompi (En línea)</h3>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <p className="text-sm text-slate-600 leading-relaxed">
                  Paga de forma rápida y segura con tarjeta de crédito o débito a través de la pasarela oficial de Wompi.
                </p>

                <div className="rounded-2xl border border-cyan-100 bg-cyan-50/60 p-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-900">
                    Nota de financiamiento
                  </span>
                  <p className="mt-1 text-xs text-cyan-950 leading-relaxed">
                    Si pagas con tarjeta de crédito por Wompi, puedes diferir la activación <strong className="font-semibold">hasta en 3 cuotas</strong> según las condiciones de tu banco.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 border-t border-slate-100 pt-6">
              <div className="flex flex-col gap-3 sm:flex-row">
                <a
                  href={PAYMENT_CONFIG.wompi.checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-5 py-3.5 text-sm font-bold text-white shadow-md hover:from-cyan-500 hover:to-blue-500 transition"
                >
                  Pagar por Wompi
                  <ExternalLink className="h-4 w-4" />
                </a>

                <button
                  onClick={() => copyToClipboard(PAYMENT_CONFIG.wompi.checkoutUrl, "wompi-section")}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-4 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  {copiedKey === "wompi-section" ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-600" /> Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" /> Copiar link
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: Direct Transfer & Bre-b */}
          <div className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
            <div>
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-md">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Transferencia Inmediata
                  </span>
                  <h3 className="text-xl font-bold text-slate-900">Bancolombia / Bre-b</h3>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {/* Bancolombia */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-500">
                        {PAYMENT_CONFIG.bancolombia.bank} ({PAYMENT_CONFIG.bancolombia.accountType})
                      </p>
                      <p className="text-lg font-bold text-slate-900 font-mono">
                        {PAYMENT_CONFIG.bancolombia.accountNumber}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        copyToClipboard(PAYMENT_CONFIG.bancolombia.accountNumber, "bancolombia-sec")
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                      {copiedKey === "bancolombia-sec" ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" /> Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" /> Copiar
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Bre-b keys */}
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Llaves Bre-b
                  </span>
                  {PAYMENT_CONFIG.breB.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-xs"
                    >
                      <div>
                        <span className="text-slate-500">{item.label}: </span>
                        <span className="font-bold text-slate-900 font-mono text-sm">
                          {item.value}
                        </span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(item.value, `breb-sec-${idx}`)}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        {copiedKey === `breb-sec-${idx}` ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 border-t border-slate-100 pt-6">
              <p className="text-center text-xs text-slate-500">
                Una vez realizada la transferencia, envía tu soporte de pago a tu contacto de PartnerHub.
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
