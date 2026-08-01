"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  Check,
  Copy,
  ShieldCheck,
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
  CheckCircle2,
  Edit3,
  Camera,
  Sparkles
} from "lucide-react";
import { EntrepreneurPhotoUploader } from "@/components/ui/entrepreneur-photo-uploader";

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
    sourcePhotos?: string[];
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
  const [sourcePhotos, setSourcePhotos] = useState<string[]>([]);
  const [logoMode, setLogoMode] = useState<"TYPOGRAPHY" | "IMAGE">("TYPOGRAPHY");
  const [logoUrl, setLogoUrl] = useState("");
  const [analyticsMeasurementId, setAnalyticsMeasurementId] = useState("");
  const [imageUseConsent, setImageUseConsent] = useState(false);
  const [agreementAccepted, setAgreementAccepted] = useState(false);

  // Status / Feedback & Thank You Page State
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
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
        setSourcePhotos(ob.sourcePhotos || []);
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
    setSaveError(null);

    if (sourcePhotos.length < 2) {
      setSaveError("Por favor sube al menos 2 fotografías tuyas de negocio antes de confirmar.");
      setIsSaving(false);
      return;
    }

    // Prepare payload sanitizing empty strings to undefined so Zod validation doesn't fail
    const payload: Record<string, unknown> = {};

    if (country.trim()) payload.country = country.trim();
    if (whatsapp.trim()) payload.whatsapp = whatsapp.trim();
    if (phone.trim()) payload.phone = phone.trim();
    if (purchaseUrl.trim()) payload.purchaseUrl = purchaseUrl.trim();
    payload.sourcePhotos = sourcePhotos;
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
      setIsSubmitted(true);
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
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
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <RefreshCw className="h-10 w-10 animate-spin text-cyan-400" />
          <p className="text-sm font-semibold text-slate-300">Cargando tu formulario de onboarding...</p>
        </div>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md rounded-3xl border border-rose-900/40 bg-slate-900 p-8 text-center shadow-2xl space-y-4">
          <AlertCircle className="h-12 w-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold text-white">Enlace de Onboarding Inválido</h2>
          <p className="text-xs text-slate-400">
            {error || "El enlace de onboarding no es válido o ha expirado."}
          </p>
          <Link
            href="/oferta-beta"
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-6 py-3 text-xs font-bold text-white hover:bg-cyan-500 transition"
          >
            Volver a la Oferta Beta
          </Link>
        </div>
      </div>
    );
  }

  const currentUrl = typeof window !== "undefined" ? window.location.href : "";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-cyan-500 selection:text-white font-sans">
      {/* Top Bar Navigation */}
      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500 font-black text-slate-950 shadow-lg shadow-cyan-500/20 text-lg">
              P
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white tracking-tight">PartnerHub</span>
                <span className="rounded-full bg-cyan-950 border border-cyan-800 px-2 py-0.5 text-[10px] font-bold text-cyan-400 uppercase tracking-widest">
                  Onboarding Público
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Empresario: <strong className="text-slate-200">{lead.fullName}</strong> ({lead.brandName})
              </p>
            </div>
          </div>

          <button
            onClick={() => copyToClipboard(currentUrl, "top-url")}
            className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-300 transition hover:border-slate-700 hover:text-white"
          >
            {copiedKey === "top-url" ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-400">¡Enlace Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-slate-400" />
                <span>Copiar Enlace Reanudable</span>
              </>
            )}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 space-y-10">
        {/* IF SUBMITTED: THANK YOU PAGE VIEW */}
        {isSubmitted ? (
          <section className="rounded-3xl border border-emerald-500/30 bg-slate-900/90 p-8 sm:p-12 shadow-2xl space-y-8 animate-fadeIn">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 ring-8 ring-emerald-500/10 shadow-2xl">
                <CheckCircle2 className="h-10 w-10 animate-bounce" />
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                ¡Gracias, {lead.fullName}!
              </h1>
              <p className="text-sm sm:text-base text-slate-300 max-w-2xl">
                Tus datos de onboarding y fotografías de negocios han sido guardadas y confirmadas con éxito.
              </p>
            </div>

            {/* Resumen de Confirmación */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-2">
                <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
                  <Globe className="h-4 w-4" />
                  Dominio Vinculado
                </div>
                <p className="text-base font-bold text-white font-mono">
                  {lead.siteId ? `${lead.siteId}.pro` : lead.brandName.toLowerCase().replaceAll(" ", "") + ".pro"}
                </p>
                <p className="text-[11px] text-slate-400">País de operación: {country || "Colombia"}</p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-2">
                <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
                  <Phone className="h-4 w-4" />
                  Contacto WhatsApp
                </div>
                <p className="text-base font-bold text-white font-mono">{whatsapp || lead.whatsapp}</p>
                <p className="text-[11px] text-slate-400">Atención directa a clientes</p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-2">
                <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
                  <Camera className="h-4 w-4" />
                  Fotos de Negocio
                </div>
                <p className="text-base font-bold text-white font-mono">{sourcePhotos.length} fotos recibidas</p>
                <p className="text-[11px] text-slate-400">Listas para producción de Hero</p>
              </div>
            </div>

            {/* Galería de fotos confirmadas */}
            {sourcePhotos.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-cyan-400" />
                  Fotografías Recibidas para Producción ({sourcePhotos.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {sourcePhotos.map((url, idx) => (
                    <div key={idx} className="aspect-square rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden">
                      <img src={url} alt={`Foto cargada ${idx + 1}`} className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Próximos pasos */}
            <div className="rounded-2xl border border-cyan-900/50 bg-cyan-950/20 p-6 space-y-3">
              <h3 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                ¿Cuáles son los siguientes pasos?
              </h3>
              <ul className="text-xs text-slate-300 space-y-2 leading-relaxed list-disc list-inside">
                <li>Nuestro equipo procesará tus fotos para crear las imágenes de Hero profesionales para tu sitio web.</li>
                <li>Validaremos la configuración técnica y vinculación de tu dominio de producto.</li>
                <li>Una vez publicada la página, recibirás la confirmación directa a tu WhatsApp <strong>{whatsapp || lead.whatsapp}</strong>.</li>
              </ul>
            </div>

            {/* Botones de Acción */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsSubmitted(false)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-5 py-3 text-xs font-bold text-slate-300 hover:text-white hover:border-slate-700 transition"
              >
                <Edit3 className="h-4 w-4" />
                Modificar Mis Datos
              </button>

              <Link
                href="/oferta-beta"
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-6 py-3 text-xs font-bold text-white hover:bg-cyan-500 transition shadow-lg shadow-cyan-900/30"
              >
                Volver a la Página Principal
              </Link>
            </div>
          </section>
        ) : (
          /* FORM VIEW */
          <>
            {/* SECTION 1: SUMMARY HEADER */}
            <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 shadow-2xl backdrop-blur-md">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-800/60 bg-emerald-950/60 px-3 py-1 text-xs font-semibold text-emerald-400">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Solicitud de Onboarding Verificada
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    Onboarding de Empresario: {lead.fullName}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-400">
                    Marca comercial: <strong className="text-cyan-400">{lead.brandName}</strong> · Estado:{" "}
                    <span className="font-semibold text-slate-200">{lead.status}</span>
                  </p>
                </div>

                <button
                  onClick={scrollToOnboardingForm}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-6 py-3.5 text-xs font-bold text-white shadow-lg transition hover:bg-cyan-500"
                >
                  <span>Ir al Formulario</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </section>

            {/* SECTION 2: RESUMABLE ONBOARDING FORM */}
            <section id="formulario-onboarding" className="rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-10 shadow-2xl space-y-8">
              <div>
                <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-widest">
                  <FileCheck className="h-4 w-4" />
                  Formulario de Onboarding Resumible
                </div>
                <h2 className="mt-1 text-xl sm:text-2xl font-bold text-white">
                  Completa o Actualiza tu Información de Marca
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Puedes guardar tus avances en cualquier momento. Tu información es confidencial y será usada para personalizar tu página de producto.
                </p>
              </div>

              {saveError && (
                <div className="flex items-center gap-3 rounded-2xl border border-rose-800/80 bg-rose-950/60 p-4 text-xs font-semibold text-rose-300">
                  <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
                  <span>{saveError}</span>
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-8">
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

                {/* Block 3: Fotografías del Empresario para Generar Imágenes de Hero */}
                <div className="space-y-4 pt-4 border-t border-slate-800">
                  <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-cyan-400">
                    <Camera className="h-4 w-4" />
                    3. Fotografías Personales de Negocio (2 a 5 Fotos)
                  </h3>

                  <EntrepreneurPhotoUploader
                    token={token}
                    photos={sourcePhotos}
                    onChange={setSourcePhotos}
                    disabled={isSaving}
                  />

                  {/* Logo Mode Selection */}
                  <div className="pt-4 border-t border-slate-800/80">
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

                    {logoMode === "IMAGE" && (
                      <div className="mt-3">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                          URL Directa de tu Logotipo (PNG/SVG)
                        </label>
                        <input
                          type="url"
                          value={logoUrl}
                          onChange={(e) => setLogoUrl(e.target.value)}
                          placeholder="https://ejemplo.com/logotipo.png"
                          className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 py-3 px-4 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Block 4: Google Analytics 4 */}
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

                {/* Block 5: Consent & Agreements */}
                <div className="space-y-4 pt-4 border-t border-slate-800">
                  <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-cyan-400">
                    <FileCheck className="h-4 w-4" />
                    5. Acuerdos y Permisos Legales
                  </h3>

                  <div className="space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                      <input
                        type="checkbox"
                        checked={imageUseConsent}
                        onChange={(e) => setImageUseConsent(e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-slate-700 text-cyan-500 focus:ring-cyan-500"
                      />
                      <span className="text-xs text-slate-300 leading-relaxed">
                        Autorizo a PartnerHub a adaptar y publicar las fotografías de negocios, logotipos, imágenes y marcas suministradas para el diseño y mantenimiento de mi página de producto.
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
          </>
        )}
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
