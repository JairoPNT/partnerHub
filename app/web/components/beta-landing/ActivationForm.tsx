"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, User, Phone, Mail, Tag, UserCheck, AlertCircle, CreditCard, Building2 } from "lucide-react";
import { PAYMENT_CONFIG } from "@/lib/config/payment-methods";
import { getActivationOfferCatalog } from "@/server/services/activationOfferCatalog";

export interface WompiIntentData {
  intentId: string;
  reference: string;
  amountInCents: number;
  currency: string;
  publicKey: string;
  signature: {
    integrity: string;
  };
  activationLeadId?: string;
  idempotent?: boolean;
}

export interface FormDataState {
  fullName: string;
  whatsapp: string;
  email: string;
  brandName: string;
  mainProduct?: string;
  referrerCode: string;
  referrerName: string;
  paymentMethod: "wompi" | "direct";
  termsAccepted: boolean;
  offerCode: string;
}

interface ActivationFormProps {
  onFormSubmit: (
    data: FormDataState,
    onboardingPath?: string,
    leadId?: string,
    wompiIntent?: WompiIntentData
  ) => void;
}

export function ActivationForm({ onFormSubmit }: ActivationFormProps) {
  const router = useRouter();
  const offers = getActivationOfferCatalog();

  const [formData, setFormData] = useState<FormDataState>({
    fullName: "",
    whatsapp: "",
    email: "",
    brandName: "",
    referrerCode: "",
    referrerName: "",
    paymentMethod: "wompi",
    termsAccepted: false,
    offerCode: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdLeadId, setCreatedLeadId] = useState<string | null>(null);
  const [createdOnboardingPath, setCreatedOnboardingPath] = useState<string | null>(null);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.fullName.trim()) newErrors.fullName = "Ingresa tu nombre completo";
    if (!formData.whatsapp.trim()) newErrors.whatsapp = "Ingresa tu número de WhatsApp";
    if (!formData.email.trim() || !formData.email.includes("@"))
      newErrors.email = "Ingresa un correo electrónico válido";
    if (!formData.brandName.trim()) newErrors.brandName = "Ingresa el nombre de tu marca o negocio";
    if (!formData.offerCode) newErrors.offerCode = "Selecciona una oferta para continuar";
    if (!formData.termsAccepted)
      newErrors.termsAccepted = "Debes aceptar los términos y condiciones de la oferta beta";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const requestWompiIntent = async (leadId: string, offerCode: string, onboardingPath?: string) => {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const intentRes = await fetch("/api/public/payments/wompi/intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          activationLeadId: leadId,
          offerCode
        })
      });

      const intentJson = await intentRes.json();

      if (!intentRes.ok) {
        throw new Error(intentJson.error || "No pudimos generar la intención de pago con Wompi Sandbox.");
      }

      onFormSubmit(formData, onboardingPath, leadId, { ...intentJson, activationLeadId: leadId });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al conectar con la pasarela de Wompi Sandbox.";
      setSubmitError(`Tu solicitud quedó registrada, pero ocurrió un inconveniente con Wompi Sandbox: ${msg}`);
      // Do NOT call onFormSubmit without a valid Wompi intent!
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validate()) {
      return;
    }

    if (createdLeadId && formData.paymentMethod === "wompi") {
      await requestWompiIntent(createdLeadId, formData.offerCode, createdOnboardingPath || undefined);
      return;
    }

    setIsSubmitting(true);

    const selectedOffer = offers.find(o => o.offerCode === formData.offerCode);

    const payload = {
      fullName: formData.fullName.trim(),
      whatsapp: formData.whatsapp.trim(),
      email: formData.email.trim(),
      brandName: formData.brandName.trim(),
      referrerCode: formData.referrerCode.trim() ? formData.referrerCode.trim().toUpperCase() : null,
      referrerName:
        formData.referrerCode.trim() && formData.referrerName.trim()
          ? formData.referrerName.trim()
          : null,
      paymentMethod: formData.paymentMethod,
      termsAccepted: formData.termsAccepted,
      offerCode: formData.offerCode,
      ...(selectedOffer && selectedOffer.ecosystemTypes.length === 1 ? { ecosystemType: selectedOffer.ecosystemTypes[0] } : {})
    };

    try {
      const response = await fetch("/api/public/activation-leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || "No pudimos registrar tu solicitud. Verifica los datos e inténtalo nuevamente.");
      }

      setCreatedLeadId(json.leadId);
      setCreatedOnboardingPath(json.onboardingPath);

      if (formData.paymentMethod === "wompi") {
        await requestWompiIntent(json.leadId, formData.offerCode, json.onboardingPath);
      } else {
        onFormSubmit(formData, json.onboardingPath, json.leadId);
        if (json.onboardingPath) {
          router.push(json.onboardingPath);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "No pudimos registrar tu solicitud. Verifica los datos e inténtalo nuevamente.";
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="registro" className="bg-slate-900 py-16 text-white sm:py-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-cyan-300">
            Formulario de Activación
          </div>

          <h2 className="mt-4 font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
            Activa tu Ecosistema de Producto
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-base text-slate-300">
            Ingresa tus datos para registrar tu cupo beta de <strong className="text-white">{PAYMENT_CONFIG.amount}</strong> y recibir las instrucciones de pago.
          </p>
        </div>

        {/* Form Container */}
        <div className="mt-10 rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-2xl sm:p-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Submit Error Banner */}
            {submitError && (
              <div className="flex flex-col gap-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs text-rose-300">
                <div className="flex items-center gap-3 font-semibold">
                  <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
                  <span>{submitError}</span>
                </div>
                {createdLeadId && formData.paymentMethod === "wompi" && (
                  <div className="pt-1">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => requestWompiIntent(createdLeadId, formData.offerCode, createdOnboardingPath || undefined)}
                      className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-rose-500 transition disabled:opacity-50"
                    >
                      Reintentar Conexión Wompi Sandbox
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Nombre completo <span className="text-rose-400">*</span>
                </label>
                <div className="relative mt-2">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    disabled={isSubmitting}
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="Ej. Carlos Mendoza"
                    className={`w-full rounded-xl border bg-slate-900/80 py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 ${
                      errors.fullName
                        ? "border-rose-500 focus:ring-rose-500"
                        : "border-slate-800 focus:border-cyan-500 focus:ring-cyan-500"
                    }`}
                  />
                </div>
                {errors.fullName && (
                  <p className="mt-1 text-xs text-rose-400">{errors.fullName}</p>
                )}
              </div>

              {/* WhatsApp */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  WhatsApp de contacto <span className="text-rose-400">*</span>
                </label>
                <div className="relative mt-2">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                    <Phone className="h-4 w-4" />
                  </div>
                  <input
                    type="tel"
                    disabled={isSubmitting}
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    placeholder="Ej. +57 300 123 4567"
                    className={`w-full rounded-xl border bg-slate-900/80 py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 ${
                      errors.whatsapp
                        ? "border-rose-500 focus:ring-rose-500"
                        : "border-slate-800 focus:border-cyan-500 focus:ring-cyan-500"
                    }`}
                  />
                </div>
                {errors.whatsapp && (
                  <p className="mt-1 text-xs text-rose-400">{errors.whatsapp}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Correo electrónico <span className="text-rose-400">*</span>
                </label>
                <div className="relative mt-2">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    disabled={isSubmitting}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="carlos@mimarca.com"
                    className={`w-full rounded-xl border bg-slate-900/80 py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 ${
                      errors.email
                        ? "border-rose-500 focus:ring-rose-500"
                        : "border-slate-800 focus:border-cyan-500 focus:ring-cyan-500"
                    }`}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-xs text-rose-400">{errors.email}</p>
                )}
              </div>

              {/* Brand Name */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Marca o Nombre Comercial <span className="text-rose-400">*</span>
                </label>
                <div className="relative mt-2">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                    <Tag className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    disabled={isSubmitting}
                    value={formData.brandName}
                    onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                    placeholder="Ej. Salud Vital / Modas Carisma"
                    className={`w-full rounded-xl border bg-slate-900/80 py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 ${
                      errors.brandName
                        ? "border-rose-500 focus:ring-rose-500"
                        : "border-slate-800 focus:border-cyan-500 focus:ring-cyan-500"
                    }`}
                  />
                </div>
                {errors.brandName && (
                  <p className="mt-1 text-xs text-rose-400">{errors.brandName}</p>
                )}
              </div>

            </div>

            {/* Offer Selection */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-3">
                Selecciona tu Oferta <span className="text-rose-400">*</span>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                {offers.map((offer) => {
                  const formatPrice = (amount: number) => {
                    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount);
                  };
                  let label = "";
                  let desc = "";
                  switch(offer.offerCode) {
                    case "PRODUCT_ONLY":
                      label = "Ecosistema de Producto";
                      desc = "Ideal para venta de productos físicos o digitales.";
                      break;
                    case "BUSINESS_ONLY":
                      label = "Ecosistema de Negocio";
                      desc = "Ideal para empresas de servicios y corporativos.";
                      break;
                    case "PERSONAL_BRAND_ONLY":
                      label = "Marca Personal";
                      desc = "Ideal para consultores, coaches y figuras públicas.";
                      break;
                    case "PLAN_360":
                      label = "Plan 360 (Todos los Ecosistemas)";
                      desc = "Incluye Producto, Negocio y Marca Personal.";
                      break;
                  }

                  return (
                    <label
                      key={offer.offerCode}
                      onClick={() => !isSubmitting && setFormData({ ...formData, offerCode: offer.offerCode })}
                      className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
                        formData.offerCode === offer.offerCode
                          ? "border-cyan-500 bg-cyan-950/40 ring-1 ring-cyan-500"
                          : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                      }`}
                    >
                      <input
                        type="radio"
                        name="offerCode"
                        disabled={isSubmitting}
                        checked={formData.offerCode === offer.offerCode}
                        onChange={() => {}}
                        className="mt-1 text-cyan-500 focus:ring-cyan-500"
                      />
                      <div>
                        <div className="flex items-center gap-2 font-semibold text-white text-sm">
                          {label}
                        </div>
                        <div className="mt-1 font-bold text-cyan-400">
                          {formatPrice(offer.amountCop)}
                        </div>
                        <p className="mt-1 text-xs text-slate-400">
                          {desc}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
              {errors.offerCode && (
                <p className="mt-2 text-xs text-rose-400">{errors.offerCode}</p>
              )}
            </div>

            {/* Referrer Code */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Código del empresario que te invitó (Opcional)
              </label>
              <div className="relative mt-2">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                  <UserCheck className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  disabled={isSubmitting}
                  value={formData.referrerCode}
                  onChange={(e) => setFormData({ ...formData, referrerCode: e.target.value })}
                  placeholder="Ej. 7417984"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/80 py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono uppercase"
                />
              </div>
              <p className="mt-1.5 text-xs text-slate-400">
                Si alguien te invitó, escribe su código para asociar correctamente el referido.
              </p>
            </div>

            {formData.referrerCode.trim() && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Nombre del empresario que te invito (Opcional)
                </label>
                <div className="relative mt-2">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    disabled={isSubmitting}
                    value={formData.referrerName}
                    onChange={(e) => setFormData({ ...formData, referrerName: e.target.value })}
                    placeholder="Ej. Laura Martinez"
                    className="w-full rounded-xl border border-slate-800 bg-slate-900/80 py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <p className="mt-1.5 text-xs text-slate-400">
                  Si el codigo todavia no existe en PartnerHub, este nombre permite crear el invitador provisional sin detener tu registro.
                </p>
              </div>
            )}

            {/* Payment Method Selection */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-3">
                Método de Pago Preferido <span className="text-rose-400">*</span>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                
                <label
                  onClick={() => !isSubmitting && setFormData({ ...formData, paymentMethod: "wompi" })}
                  className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
                    formData.paymentMethod === "wompi"
                      ? "border-cyan-500 bg-cyan-950/40 ring-1 ring-cyan-500"
                      : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    disabled={isSubmitting}
                    checked={formData.paymentMethod === "wompi"}
                    onChange={() => {}}
                    className="mt-1 text-cyan-500 focus:ring-cyan-500"
                  />
                  <div>
                    <div className="flex items-center gap-2 font-semibold text-white text-sm">
                      <CreditCard className="h-4 w-4 text-cyan-400" />
                      Tarjeta de Crédito / Débito (Wompi)
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      Pago en línea seguro. Permite diferir la activación hasta en 3 cuotas.
                    </p>
                  </div>
                </label>

                <label
                  onClick={() => !isSubmitting && setFormData({ ...formData, paymentMethod: "direct" })}
                  className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
                    formData.paymentMethod === "direct"
                      ? "border-cyan-500 bg-cyan-950/40 ring-1 ring-cyan-500"
                      : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    disabled={isSubmitting}
                    checked={formData.paymentMethod === "direct"}
                    onChange={() => {}}
                    className="mt-1 text-cyan-500 focus:ring-cyan-500"
                  />
                  <div>
                    <div className="flex items-center gap-2 font-semibold text-white text-sm">
                      <Building2 className="h-4 w-4 text-cyan-400" />
                      Transferencia Directa / Bre-b
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      Bancolombia o llaves Bre-b inmediatas.
                    </p>
                  </div>
                </label>

              </div>
            </div>

            {/* Acceptance Checkbox */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={isSubmitting}
                  checked={formData.termsAccepted}
                  onChange={(e) => setFormData({ ...formData, termsAccepted: e.target.checked })}
                  className="mt-1 h-4 w-4 rounded border-slate-700 text-cyan-500 focus:ring-cyan-500"
                />
                <span className="text-xs text-slate-300 leading-relaxed">
                  Entiendo que accedo a una <strong className="text-white">oferta beta fundadora</strong> de activación para mi Ecosistema. La gestión mensual regular ({PAYMENT_CONFIG.monthlyFee}) es necesaria para mantener el sitio publicado, con soporte y cambios menores dentro del alcance. Reconozco que este servicio no garantiza ventas ni ingresos y no incluye VSL, CRM ni pauta publicitaria.
                </span>
              </label>
              {errors.termsAccepted && (
                <p className="mt-2 text-xs text-rose-400">{errors.termsAccepted}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-sky-600 py-4 text-base font-bold text-white shadow-lg transition hover:from-cyan-400 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <svg className="h-5 w-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Registrando solicitud...</span>
                </>
              ) : (
                <>
                  <span>Continuar a Instrucciones de Pago</span>
                  <Send className="h-5 w-5" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
