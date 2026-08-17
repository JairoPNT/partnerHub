"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Copy,
  Check,
  CreditCard,
  Building2,
  ExternalLink,
  ShieldCheck,
  ArrowRight,
  AlertTriangle,
  RefreshCw
} from "lucide-react";
import { PAYMENT_CONFIG } from "@/lib/config/payment-methods";
import type { WompiIntentData } from "@/components/beta-landing/ActivationForm";

interface WompiWidgetResult {
  transaction?: {
    status?: "INITIAL" | "PENDING" | "APPROVED" | "DECLINED" | "ERROR";
  };
}

declare global {
  interface Window {
    WompiWidget?: new (options: {
      currency: string;
      amountInCents: number;
      reference: string;
      publicKey: string;
      signature: { integrity: string };
      redirectUrl?: string;
    }) => {
      open: (callback?: (result?: WompiWidgetResult) => void) => void;
    };
  }
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMethod?: string;
  userFormData?: {
    fullName: string;
    whatsapp: string;
    brandName: string;
  };
  wompiIntent?: WompiIntentData;
  onboardingPath?: string;
}

export function PaymentModal({
  isOpen,
  onClose,
  selectedMethod = "wompi",
  userFormData,
  wompiIntent,
  onboardingPath
}: PaymentModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"wompi" | "direct">(
    selectedMethod === "wompi" || wompiIntent ? "wompi" : "direct"
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [wompiStatus, setWompiStatus] = useState<"INITIAL" | "PENDING" | "APPROVED" | "DECLINED" | "ERROR">("INITIAL");

  useEffect(() => {
    if (selectedMethod === "wompi" || wompiIntent) {
      setActiveTab("wompi");
    } else {
      setActiveTab("direct");
    }
  }, [selectedMethod, wompiIntent]);

  useEffect(() => {
    if (isOpen && typeof window !== "undefined" && !document.getElementById("wompi-widget-script")) {
      const script = document.createElement("script");
      script.id = "wompi-widget-script";
      script.src = "https://checkout.wompi.co/widget.js";
      script.async = true;
      document.head.appendChild(script);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const formatAmountInCents = (cents: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0
    }).format(cents / 100);
  };

  const buildWompiCheckoutUrl = (intent: WompiIntentData, path?: string) => {
    const params = new URLSearchParams({
      "public-key": intent.publicKey,
      currency: intent.currency,
      "amount-in-cents": intent.amountInCents.toString(),
      reference: intent.reference,
      "signature:integrity": intent.signature.integrity
    });
    if (path && typeof window !== "undefined") {
      params.append("redirect-url", `${window.location.origin}${path}`);
    }
    return `https://checkout.wompi.co/p/?${params.toString()}`;
  };

  const openWompiWidget = () => {
    if (!wompiIntent) return;
    setWompiStatus("PENDING");

    if (typeof window !== "undefined" && window.WompiWidget) {
      try {
        const checkout = new window.WompiWidget({
          currency: wompiIntent.currency,
          amountInCents: wompiIntent.amountInCents,
          reference: wompiIntent.reference,
          publicKey: wompiIntent.publicKey,
          signature: {
            integrity: wompiIntent.signature.integrity
          },
          redirectUrl: onboardingPath && typeof window !== "undefined" ? `${window.location.origin}${onboardingPath}` : undefined
        });
        checkout.open((result?: WompiWidgetResult) => {
          if (result?.transaction?.status) {
            setWompiStatus(result.transaction.status);
          }
        });
      } catch {
        window.open(buildWompiCheckoutUrl(wompiIntent, onboardingPath), "_blank");
      }
    } else {
      window.open(buildWompiCheckoutUrl(wompiIntent, onboardingPath), "_blank");
    }
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
                    <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                      Pago seguro con Wompi Sandbox
                      <span className="rounded-full bg-cyan-600/10 px-2 py-0.5 text-[10px] font-bold text-cyan-700">
                        TEST MODE
                      </span>
                    </h4>
                    <p className="mt-1 text-sm text-slate-600">
                      Intención de pago registrada en Wompi Sandbox. Puedes usar tarjetas de prueba para validar la pasarela.
                    </p>
                  </div>
                </div>
              </div>

              {wompiIntent ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
                      Monto total de la oferta seleccionada
                    </p>
                    <p className="mt-1 text-3xl font-extrabold text-slate-900">
                      {formatAmountInCents(wompiIntent.amountInCents)}
                    </p>
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1 text-xs font-mono text-slate-700">
                      <span>Referencia: {wompiIntent.reference}</span>
                    </div>
                  </div>

                  {wompiStatus === "PENDING" && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800 flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin text-blue-600 shrink-0" />
                      <span>Procesando en Wompi Sandbox. Completa el pago en el widget o pasarela.</span>
                    </div>
                  )}

                  {wompiStatus === "APPROVED" && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 font-semibold flex items-center justify-center gap-2">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>¡Pago Aprobado en Wompi Sandbox! Tu transacción se ha registrado.</span>
                    </div>
                  )}

                  {wompiStatus === "DECLINED" && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-center justify-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                      <span>Transacción rechazada en la prueba. Reintenta o cambia a transferencia directa.</span>
                    </div>
                  )}

                  <div className="pt-2 flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <button
                      onClick={openWompiWidget}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg transition hover:from-cyan-500 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      <CreditCard className="h-5 w-5" />
                      Pagar con Wompi Sandbox
                    </button>

                    <button
                      onClick={() =>
                        copyToClipboard(
                          buildWompiCheckoutUrl(wompiIntent, onboardingPath),
                          "wompi-intent-link"
                        )
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-5 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      {copiedKey === "wompi-intent-link" ? (
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

                  {onboardingPath && (
                    <div className="pt-3 border-t border-slate-100">
                      <button
                        onClick={() => {
                          onClose();
                          router.push(onboardingPath);
                        }}
                        className="inline-flex items-center justify-center gap-2 text-sm font-bold text-cyan-700 hover:text-cyan-900 hover:underline"
                      >
                        <span>Continuar al Onboarding de Configuración</span>
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
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
              )}

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
