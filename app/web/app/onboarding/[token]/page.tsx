"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  Check,
  Copy,
  ExternalLink,
  ShieldCheck,
  Building2,
  CreditCard,
  MessageCircle,
  Save,
  Clock,
  Globe,
  Phone,
  Link as LinkIcon,
  Image as ImageIcon,
  Type,
  FileCheck,
  BarChart3,
  AlertCircle,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { PAYMENT_CONFIG } from "@/lib/config/payment-methods";

interface LeadData {
  id: string;
  fullName: string;
  whatsapp: string;
  email: string;
  brandName: string;
  referrerCode: string | null;
  paymentMethod: "wompi" | "direct";
  termsAccepted: boolean;
  status: string;
  siteId: string | null;
  createdAt: string;
  updatedAt: string;
  onboardingData?: {
    country?: string;
    whatsapp?: string;
    phone?: string;
    purchaseUrl?: string;
    heroDesktopUrl?: string;
    heroMobileUrl?: string;
    logoMode?: "TYPOGRAPHY" | "IMAGE";
    logoUrl?: string;
    faviconUrl?: string;
    analyticsMeasurementId?: string;
    imageUseConsent?: boolean;
    agreementAccepted?: boolean;
  };
}

interface PageProps {
  params: Promise<{ token: string }>;
}

export default function PublicOnboardingPage({ params }: PageProps) {
  const { token } = use(params);

  const [lead, setLead] = useState<LeadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [country, setCountry] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [phone, setPhone] = useState("");
  const [purchaseUrl, setPurchaseUrl] = useState("");
  const [heroDesktopUrl, setHeroDesktopUrl] = useState("");
  const [heroMobileUrl, setHeroMobileUrl] = useState("");
  const [logoMode, setLogoMode] = useState<"TYPOGRAPHY" | "IMAGE">("TYPOGRAPHY");
  const [logoUrl, setLogoUrl] = useState("");
  const [analyticsMeasurementId, setAnalyticsMeasurementId] = useState("");
  const [imageUseConsent, setImageUseConsent] = useState(false);
  const [agreementAccepted, setAgreementAccepted] = useState(false);

  // Status / Feedback
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    async function loadLead() {
      try {
        setLoading(true);
        const res = await fetch(`/api/public/onboarding/${token}`);
        if (!res.ok) {
          throw new Error("No encontramos la solicitud de onboarding o el enlace ha expirado.");
        }
        const data: LeadData = await res.json();
        setLead(data);

        // Pre-fill onboarding fields if available
        const ob = data.onboardingData || {};
        setCountry(ob.country || "Colombia");
        setWhatsapp(ob.whatsapp || data.whatsapp || "");
        setPhone(ob.phone || data.whatsapp || "");
        setPurchaseUrl(ob.purchaseUrl || "");
        setHeroDesktopUrl(ob.heroDesktopUrl || "");
        setHeroMobileUrl(ob.heroMobileUrl || "");
        setLogoMode(ob.logoMode || "TYPOGRAPHY");
        setLogoUrl(ob.logoUrl || "");
        setAnalyticsMeasurementId(ob.analyticsMeasurementId || "");
        setImageUseConsent(ob.imageUseConsent || false);
        setAgreementAccepted(ob.agreementAccepted || false);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }

    loadLead();
  }, [token]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(null);
    setSaveError(null);

    // Prepare payload sanitizing empty strings to undefined so Zod validation doesn't fail
    const payload: Record<string, unknown> = {};

    if (country.trim()) payload.country = country.trim();
    if (whatsapp.trim()) payload.whatsapp = whatsapp.trim();
    if (phone.trim()) payload.phone = phone.trim();
    if (purchaseUrl.trim()) payload.purchaseUrl = purchaseUrl.trim();
    if (heroDesktopUrl.trim()) payload.heroDesktopUrl = heroDesktopUrl.trim();
    if (heroMobileUrl.trim()) payload.heroMobileUrl = heroMobileUrl.trim();
    payload.logoMode = logoMode;
    if (logoUrl.trim()) payload.logoUrl = logoUrl.trim();
    if (analyticsMeasurementId.trim())
      payload.analyticsMeasurementId = analyticsMeasurementId.trim().toUpperCase();
    payload.imageUseConsent = imageUseConsent;
    payload.agreementAccepted = agreementAccepted;

    try {
      const res = await fetch(`/api/public/onboarding/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "No pudimos guardar los datos de onboarding.");
      }

      setLead(json);
      setSaveSuccess("¡Avance guardado con éxito! Puedes cerrar esta página y continuar cuando quieras.");
      setTimeout(() => setSaveSuccess(null), 5000);
    } catch (err) {
      setSaveError((err as Error).message || "Ocurrió un error al guardar.");
    } finally {
      setIsSaving(false);
    }
  };

  const scrollToOnboardingForm = () => {
    const el = document.getElementById("formulario-onboarding");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-10 w-10 animate-spin text-cyan-400" />
          <p className="text-sm font-medium text-slate-300">Cargando datos de tu solicitud...</p>
        </div>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-white">
        <div className="max-w-md w-full rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center shadow-2xl">
          <AlertCircle className="mx-auto h-12 w-12 text-rose-500" />
          <h2 className="mt-4 text-xl font-bold">Enlace no encontrado</h2>
          <p className="mt-2 text-sm text-slate-400">
            {error || "El enlace de onboarding no es válido o ha expirado."}
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <a
              href="https://wa.me/573188430283"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500 transition"
            >
              <MessageCircle className="h-4 w-4" />
              Contactar a Soporte por WhatsApp
            </a>
            <Link
              href="/oferta-beta"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-700 transition"
            >
              Volver a la Oferta Beta
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentUrl = typeof window !== "undefined" ? window.location.href : "";
  const whatsappReceiptMessage = encodeURIComponent(
    `Hola PartnerHub, adjunto mi comprobante de pago para la marca ${lead.brandName} (ID de Solicitud: ${lead.id}).`
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-cyan-500 selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 font-bold text-white shadow-md">
              P
            </div>
            <div>
              <span className="font-heading text-lg font-bold tracking-tight text-white">
                PartnerHub
              </span>
              <span className="ml-2 rounded-md bg-cyan-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-300 border border-cyan-500/30">
                Onboarding Público
              </span>
            </div>
          </div>

          <button
            onClick={() => copyToClipboard(currentUrl, "share-link")}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition"
          >
            {copiedKey === "share-link" ? (
              <>
                <Check className="h-4 w-4 text-emerald-400" />
                Enlace Copiado
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 text-slate-400" />
                Copiar Enlace Reanudable
              </>
            )}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-12 space-y-12">
        {/* SECTION 1: THANK YOU & CONFIRMATION HEADER */}
        <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/90 p-6 sm:p-10 shadow-2xl relative">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-slate-800">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-400">
                <ShieldCheck className="h-4 w-4" />
                Solicitud Recibida Correctamente
              </div>

              <h1 className="mt-4 font-heading text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                ¡Gracias, {lead.fullName}!
              </h1>

              <p className="mt-2 text-base text-slate-300">
                Registramos tu marca{" "}
                <strong className="text-cyan-400 font-semibold">{lead.brandName}</strong> en nuestro sistema de activación beta de PartnerHub.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-xs space-y-1.5 shrink-0">
              <div className="flex items-center justify-between gap-4 text-slate-400">
                <span>ID de Registro:</span>
                <span className="font-mono text-white font-bold">{lead.id.slice(0, 8)}...</span>
              </div>
              <div className="flex items-center justify-between gap-4 text-slate-400">
                <span>Estado:</span>
                <span className="rounded bg-cyan-500/20 px-2 py-0.5 font-bold text-cyan-300 uppercase text-[10px]">
                  {lead.status}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 text-slate-400">
                <span>Método de Pago:</span>
                <span className="font-semibold text-white">
                  {lead.paymentMethod === "direct" ? "Transferencia Directa" : "Wompi Tarjeta"}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Details & Validation instructions */}
          <div className="mt-8">
            {lead.paymentMethod === "direct" ? (
              <div className="space-y-6">
                <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-amber-200">
                  <div className="flex items-start gap-3.5">
                    <AlertCircle className="h-6 w-6 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-amber-300 text-sm">
                        Validación de Pago por WhatsApp Requerida
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed text-amber-200/90">
                        Para confirmar tu cupo e iniciar el proceso de montaje en 24 horas, realiza la transferencia por <strong className="text-white">{PAYMENT_CONFIG.amount}</strong> y envía una foto o captura del comprobante a nuestro canal de WhatsApp.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {/* Bancolombia */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Building2 className="h-5 w-5 text-cyan-400" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                          {PAYMENT_CONFIG.bancolombia.bank} ({PAYMENT_CONFIG.bancolombia.accountType})
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          copyToClipboard(PAYMENT_CONFIG.bancolombia.accountNumber, "bancolombia-bank")
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                      >
                        {copiedKey === "bancolombia-bank" ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                            Copiado
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5 text-slate-400" />
                            Copiar
                          </>
                        )}
                      </button>
                    </div>
                    <p className="font-mono text-xl font-extrabold text-white tracking-wider">
                      {PAYMENT_CONFIG.bancolombia.accountNumber}
                    </p>
                  </div>

                  {/* Bre-b Keys */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <CreditCard className="h-5 w-5 text-cyan-400" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                          Llaves Bre-b (Inmediato)
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {PAYMENT_CONFIG.breB.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">{item.label}:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-white">{item.value}</span>
                            <button
                              onClick={() => copyToClipboard(item.value, `breb-ob-${idx}`)}
                              className="text-slate-500 hover:text-cyan-400"
                              title="Copiar llave"
                            >
                              {copiedKey === `breb-ob-${idx}` ? (
                                <Check className="h-3.5 w-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <a
                    href={`https://wa.me/573188430283?text=${whatsappReceiptMessage}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 px-6 py-4 text-sm font-bold text-white shadow-lg transition"
                  >
                    <MessageCircle className="h-5 w-5" />
                    <span>Enviar Comprobante por WhatsApp</span>
                  </a>

                  <button
                    onClick={scrollToOnboardingForm}
                    className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-4 text-sm font-bold text-white shadow-lg hover:from-cyan-400 hover:to-blue-500 transition"
                  >
                    <span>Continuar al Formulario de Onboarding</span>
                    <ArrowRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/40 p-5">
                  <div className="flex items-start gap-3.5">
                    <CreditCard className="h-6 w-6 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-white text-sm">
                        Pago en Línea con Wompi ({PAYMENT_CONFIG.amount})
                      </h3>
                      <p className="mt-1 text-xs text-slate-300">
                        Si aún no has completado la transacción en Wompi, puedes ir directamente al checkout seguro. Si ya pagaste, la transacción queda confirmada.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <a
                    href={PAYMENT_CONFIG.wompi.checkoutUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 px-6 py-4 text-sm font-bold text-white shadow-lg transition"
                  >
                    <span>Ir al Checkout de Wompi</span>
                    <ExternalLink className="h-5 w-5" />
                  </a>

                  <button
                    onClick={scrollToOnboardingForm}
                    className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-6 py-4 text-sm font-bold text-white transition"
                  >
                    <span>Continuar al Formulario de Onboarding</span>
                    <ArrowRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* SECTION 2: RESUMABLE ONBOARDING FORM */}
        <section id="formulario-onboarding" className="rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-10 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-6 flex-wrap gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-cyan-300">
                <FileCheck className="h-3.5 w-3.5" />
                Paso 2: Información de tu Marca
              </div>

              <h2 className="mt-3 font-heading text-2xl font-bold text-white sm:text-3xl">
                Formulario de Onboarding Resumible
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Puedes completar los campos gradualmente. Haz clic en{" "}
                <strong className="text-white">"Guardar avance parcial"</strong> cuando lo desees para reanudar luego.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-800 border border-slate-700 px-4 py-2.5 text-xs font-bold text-cyan-300 hover:bg-slate-700 hover:text-white transition disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 text-cyan-400" />
                  <span>Guardar avance parcial</span>
                </>
              )}
            </button>
          </div>

          {/* Toast banners */}
          {saveSuccess && (
            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-xs font-semibold text-emerald-300">
              <Check className="h-5 w-5 shrink-0 text-emerald-400" />
              <span>{saveSuccess}</span>
            </div>
          )}

          {saveError && (
            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs font-semibold text-rose-300">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
              <span>{saveError}</span>
            </div>
          )}

          <form onSubmit={handleSave} className="mt-8 space-y-8">
            {/* Block 1: Contact & Country */}
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-cyan-400">
                <Globe className="h-4 w-4" />
                1. País de Operación y Canales de Contacto
              </h3>

              <div className="grid gap-6 md:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    País de Operación
                  </label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="Ej. Colombia / México / EE. UU."
                    className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 py-3 px-4 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    WhatsApp Visible en la Página
                  </label>
                  <input
                    type="text"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="Ej. +57 300 123 4567"
                    className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 py-3 px-4 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Teléfono Directo de Llamadas
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ej. +57 300 123 4567"
                    className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 py-3 px-4 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>
            </div>

            {/* Block 2: Purchase / Checkout URL */}
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-cyan-400">
                <LinkIcon className="h-4 w-4" />
                2. Enlace Final de Compra / Checkout
              </h3>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  URL Completa de Compra o Pasarela Externa (Opcional)
                </label>
                <input
                  type="url"
                  value={purchaseUrl}
                  onChange={(e) => setPurchaseUrl(e.target.value)}
                  placeholder="https://micompra.com/checkout/producto"
                  className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 py-3 px-4 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <p className="mt-1.5 text-xs text-slate-400">
                  Si ya tienes una pasarela activa (Hotmart, Stripe, Wompi, etc.), ingresa el enlace directo al cual redirigirá el botón de compra principal.
                </p>
              </div>
            </div>

            {/* Block 3: Brand Assets & Visual Mode */}
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-cyan-400">
                <ImageIcon className="h-4 w-4" />
                3. Identidad Visual e Imágenes (Hero y Logotipo)
              </h3>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    URL Imagen Hero Desktop (Horizontal)
                  </label>
                  <input
                    type="url"
                    value={heroDesktopUrl}
                    onChange={(e) => setHeroDesktopUrl(e.target.value)}
                    placeholder="https://ejemplo.com/hero-desktop.jpg"
                    className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 py-3 px-4 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    URL Imagen Hero Mobile (Vertical)
                  </label>
                  <input
                    type="url"
                    value={heroMobileUrl}
                    onChange={(e) => setHeroMobileUrl(e.target.value)}
                    placeholder="https://ejemplo.com/hero-mobile.jpg"
                    className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 py-3 px-4 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              {/* Logo Mode Selection */}
              <div className="pt-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Formato de Logotipo Preferido
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setLogoMode("TYPOGRAPHY")}
                    className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
                      logoMode === "TYPOGRAPHY"
                        ? "border-cyan-500 bg-cyan-950/40 ring-1 ring-cyan-500"
                        : "border-slate-800 bg-slate-950 hover:border-slate-700"
                    }`}
                  >
                    <Type className="h-5 w-5 text-cyan-400 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-white">Texto Tipográfico Estilizado</p>
                      <p className="text-xs text-slate-400">Usaremos el nombre de tu marca con tipografía elegante.</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLogoMode("IMAGE")}
                    className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
                      logoMode === "IMAGE"
                        ? "border-cyan-500 bg-cyan-950/40 ring-1 ring-cyan-500"
                        : "border-slate-800 bg-slate-950 hover:border-slate-700"
                    }`}
                  >
                    <ImageIcon className="h-5 w-5 text-cyan-400 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-white">Imagen de Logotipo Oficial</p>
                      <p className="text-xs text-slate-400">Suministrarás una URL directa a tu logotipo en PNG/SVG.</p>
                    </div>
                  </button>
                </div>
              </div>

              {logoMode === "IMAGE" && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    URL de la Imagen de tu Logotipo (PNG transparente preferido)
                  </label>
                  <input
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://ejemplo.com/mi-logo.png"
                    className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 py-3 px-4 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              )}
            </div>

            {/* Block 4: Analytics */}
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-cyan-400">
                <BarChart3 className="h-4 w-4" />
                4. Configuración de Analytics (Técnica)
              </h3>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  ID de Medición Google Analytics 4 (Opcional)
                </label>
                <input
                  type="text"
                  value={analyticsMeasurementId}
                  onChange={(e) => setAnalyticsMeasurementId(e.target.value)}
                  placeholder="G-XXXXXXXXXX"
                  className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 py-3 px-4 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono uppercase"
                />
              </div>
            </div>

            {/* Block 5: Legal Consents & Agreements */}
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-cyan-400">
                <FileCheck className="h-4 w-4" />
                5. Acuerdos y Permisos Legales
              </h3>

              <div className="space-y-3 pt-1">
                <label className="flex items-start gap-3 cursor-pointer rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <input
                    type="checkbox"
                    checked={imageUseConsent}
                    onChange={(e) => setImageUseConsent(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-700 text-cyan-500 focus:ring-cyan-500"
                  />
                  <span className="text-xs text-slate-300 leading-relaxed">
                    Autorizo a PartnerHub a adaptar y publicar el material visual, logotipos, imágenes y marcas suministradas para el diseño y mantenimiento de mi página de producto.
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <input
                    type="checkbox"
                    checked={agreementAccepted}
                    onChange={(e) => setAgreementAccepted(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-700 text-cyan-500 focus:ring-cyan-500"
                  />
                  <span className="text-xs text-slate-300 leading-relaxed">
                    Acepto los términos del acuerdo de servicio de PartnerHub y entiendo que la entrega de mi página se realizará tras la validación de la información requerida.
                  </span>
                </label>
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Clock className="h-4 w-4 text-cyan-400" />
                <span>Reanuda este formulario cuando lo necesites compartiendo o guardando tu enlace.</span>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-sky-600 py-4 px-8 text-sm font-bold text-white shadow-xl transition hover:from-cyan-400 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span>Guardando datos...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    <span>Guardar y Confirmar Datos de Onboarding</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-8 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-5xl px-4 space-y-2">
          <p className="font-semibold text-slate-400">
            PartnerHub — Proceso de Onboarding de Empresario
          </p>
          <p>
            Tus datos de onboarding se guardan directamente en tu cuenta y son vinculados a tu dominio de producto.
          </p>
          <p className="text-[11px] text-slate-600">
            © 2026 PartnerHub. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
