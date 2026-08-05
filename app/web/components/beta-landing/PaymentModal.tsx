"use client";

import React, { useState } from "react";
import {
  X,
  Copy,
  Check,
  CreditCard,
  Building2,
  ExternalLink,
  ShieldCheck,
  Zap,
  QrCode,
} from "lucide-react";
import { PAYMENT_CONFIG } from "@/lib/config/payment-methods";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMethod?: string;
  userFormData?: {
    fullName: string;
    whatsapp: string;
    brandName: string;
  };
}

export function PaymentModal({
  isOpen,
  onClose,
  selectedMethod = "wompi",
  userFormData,
}: PaymentModalProps) {
  const [activeTab, setActiveTab] = useState<"wompi" | "direct">(
    selectedMethod === "wompi" ? "wompi" : "direct"
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm transition-all animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-slate-900 via-sky-950 to-cyan-950 p-6 text-white sm:p-8">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-slate-300 transition hover:bg-white/20 hover:text-white"
            aria-label="Cerrar modal"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-cyan-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            Activación Beta Confirmada
          </div>

          <h3 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            Instrucciones de Pago
          </h3>
          <p className="mt-1 text-sm text-slate-300">
            {userFormData?.fullName ? `Hola ${userFormData.fullName}, ` : ""}
            completa tu pago de{" "}
            <span className="font-bold text-white">{PAYMENT_CONFIG.amount}</span> para activar tu Ecosistema de Producto.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-300">
            <span className="rounded-md bg-white/10 px-2.5 py-1">
              Entrega estimada: {PAYMENT_CONFIG.deliveryWindow}
            </span>
            <span className="rounded-md bg-cyan-500/20 text-cyan-200 px-2.5 py-1 font-medium">
              Gestión mensual: {PAYMENT_CONFIG.monthlyFee}
            </span>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-50 p-2">
          <button
            onClick={() => setActiveTab("wompi")}
            className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition ${
              activeTab === "wompi"
                ? "bg-white text-cyan-950 shadow-sm ring-1 ring-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <CreditCard className="h-4 w-4 text-cyan-600" />
            Tarjeta (Wompi)
          </button>
          <button
            onClick={() => setActiveTab("direct")}
            className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition ${
              activeTab === "direct"
                ? "bg-white text-cyan-950 shadow-sm ring-1 ring-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Building2 className="h-4 w-4 text-cyan-600" />
            Transferencia / Bre-b
          </button>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8">
          {activeTab === "wompi" ? (
            <div className="space-y-6">
              <div className="rounded-2xl border border-cyan-100 bg-cyan-50/50 p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-600 text-white shadow-md">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">
                      Pago seguro en línea con Wompi
                    </h4>
                    <p className="mt-1 text-sm text-slate-600">
                      Acepta tarjetas de crédito y débito. Puedes diferir tu activación{" "}
                      <span className="font-semibold text-cyan-800">hasta en 3 cuotas</span> según las condiciones de tu banco.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
                <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  Monto total a pagar
                </p>
                <p className="mt-1 text-3xl font-extrabold text-slate-900">
                  {PAYMENT_CONFIG.amount}
                </p>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <a
                    href={PAYMENT_CONFIG.wompi.checkoutUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg transition hover:from-cyan-500 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
                  >
                    Ir al checkout seguro de Wompi
                    <ExternalLink className="h-4 w-4" />
                  </a>

                  <button
                    onClick={() =>
                      copyToClipboard(PAYMENT_CONFIG.wompi.checkoutUrl, "wompi-link")
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-5 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    {copiedKey === "wompi-link" ? (
                      <>
                        <Check className="h-4 w-4 text-emerald-600" />
                        Link copiado
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copiar link
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-xs text-amber-900">
                <span className="font-semibold">Nota sobre cuotas:</span> Con tarjeta de crédito por Wompi puedes seleccionar las cuotas directamente en la pasarela de tu banco. La activación inicia después de confirmar el pago.
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Bancolombia */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-500">
                        {PAYMENT_CONFIG.bancolombia.bank} ({PAYMENT_CONFIG.bancolombia.accountType})
                      </p>
                      <p className="text-lg font-bold text-slate-900 tracking-wide">
                        {PAYMENT_CONFIG.bancolombia.accountNumber}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        PAYMENT_CONFIG.bancolombia.accountNumber,
                        "bancolombia"
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                  >
                    {copiedKey === "bancolombia" ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copiar
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Bre-b keys */}
              <div>
                <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Llaves Bre-b (Transferencia inmediata)
                </h4>
                <div className="space-y-2.5">
                  {PAYMENT_CONFIG.breB.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm"
                    >
                      <div>
                        <p className="text-xs text-slate-500">{item.label}</p>
                        <p className="font-mono text-base font-bold text-slate-900">
                          {item.value}
                        </p>
                      </div>
                      <button
                        onClick={() => copyToClipboard(item.value, `breb-${idx}`)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        {copiedKey === `breb-${idx}` ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                            Copiado
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            Copiar
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-slate-100 p-4 text-xs text-slate-600">
                <span className="font-semibold text-slate-800">Siguiente paso:</span> Una vez realizada la transferencia de {PAYMENT_CONFIG.amount}, envía el comprobante por WhatsApp al equipo de PartnerHub para iniciar tu configuración en {PAYMENT_CONFIG.deliveryWindow}.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-slate-50 p-4 text-center sm:px-8">
          <button
            onClick={onClose}
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 sm:w-auto sm:px-8"
          >
            Entendido / Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
