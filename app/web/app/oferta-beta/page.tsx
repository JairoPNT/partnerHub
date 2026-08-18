"use client";

import React, { useState } from "react";
import { HeroSection } from "@/components/beta-landing/HeroSection";
import { ProblemSection } from "@/components/beta-landing/ProblemSection";
import { SolutionSection } from "@/components/beta-landing/SolutionSection";
import { ActiveDemosSection } from "@/components/beta-landing/ActiveDemosSection";
import { IncludesSection } from "@/components/beta-landing/IncludesSection";
import { BetaOfferSection } from "@/components/beta-landing/BetaOfferSection";

import { ActivationForm, FormDataState, WompiIntentData } from "@/components/beta-landing/ActivationForm";
import { PaymentModal } from "@/components/beta-landing/PaymentModal";
import { parseWompiReturnParams, type WompiReturnContext } from "@/components/beta-landing/wompiCheckoutFlow";
import { FaqSection } from "@/components/beta-landing/FaqSection";
import Link from "next/link";
import { FinalCtaSection } from "@/components/beta-landing/FinalCtaSection";
import { Sparkles } from "lucide-react";
import { PAYMENT_CONFIG } from "@/lib/config/payment-methods";

export default function OfertaBetaPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submittedData, setSubmittedData] = useState<FormDataState | undefined>(undefined);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"wompi" | "direct">("wompi");
  const [onboardingPath, setOnboardingPath] = useState<string | undefined>(undefined);
  const [wompiIntent, setWompiIntent] = useState<WompiIntentData | undefined>(undefined);
  const [returnContext, setReturnContext] = useState<WompiReturnContext | undefined>(undefined);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const searchStr = window.location.search;
    if (!searchStr) return;

    const params = parseWompiReturnParams(searchStr);
    if (params) {
      setReturnContext(params);
      setSelectedPaymentMethod("wompi");
      setIsModalOpen(true);
    }
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleFormSubmit = (
    data: FormDataState,
    onboardingPath?: string,
    _leadId?: string,
    wompiIntent?: WompiIntentData
  ) => {
    setSubmittedData(data);
    setSelectedPaymentMethod(data.paymentMethod);
    setOnboardingPath(onboardingPath);
    setWompiIntent(wompiIntent);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-cyan-500 selection:text-white">
      {/* Top Notification Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-cyan-950 px-4 py-2.5 text-center text-xs font-medium text-white sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
          <span>
            <strong>Oferta Beta Fundadora:</strong> activación inicial por {PAYMENT_CONFIG.amount} + gestión mensual de {PAYMENT_CONFIG.monthlyFee}.
          </span>
        </div>
      </div>

      {/* Main Navigation Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white font-bold text-lg shadow-md">
              P
            </div>
            <div>
              <span className="font-heading text-lg font-bold tracking-tight text-slate-900">
                PartnerHub
              </span>
              <span className="ml-2 rounded-md bg-cyan-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-900">
                Beta
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => scrollToSection("demos")}
              className="hidden text-xs font-semibold text-slate-600 hover:text-slate-900 sm:block"
            >
              Muestras Activas
            </button>
            <Link
              href="/activar"
              className="hidden text-xs font-semibold text-slate-600 hover:text-slate-900 sm:block"
            >
              Formulario Directo
            </Link>
            <button
              onClick={() => scrollToSection("registro")}
              className="rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:from-cyan-500 hover:to-blue-500 transition"
            >
              Activar Ecosistema
            </button>
          </div>
        </div>
      </header>

      {/* Page Sections */}
      <main>
        <HeroSection
          onActivateClick={() => scrollToSection("registro")}
          onDemosClick={() => scrollToSection("demos")}
        />
        <ProblemSection />
        <SolutionSection />
        <ActiveDemosSection />
        <IncludesSection />
        <BetaOfferSection onActivateClick={() => scrollToSection("registro")} />
        <ActivationForm onFormSubmit={handleFormSubmit} />
        <FaqSection />
        <FinalCtaSection onActivateClick={() => scrollToSection("registro")} />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-50 py-8 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-6xl px-4 space-y-2">
          <p className="font-semibold text-slate-700">
            PartnerHub / Franquicia Digital — Ecosistema de Producto (Fase Beta Fundadora)
          </p>
          <p>
            Oferta de entrada sujeta a etapa de validación del MVP. Los nombres de dominio de demostración (jairopinto.pro, yennygarcia.pro, claudiacalero.pro, blancastella.pro) son muestras activas del servicio.
          </p>
          <p className="text-[11px] text-slate-400">
            © 2026 PartnerHub. Todos los derechos reservados.
          </p>
        </div>
      </footer>

      {/* Interactive Payment Instructions Modal */}
      <PaymentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedMethod={selectedPaymentMethod}
        userFormData={
          submittedData
            ? {
                fullName: submittedData.fullName,
                whatsapp: submittedData.whatsapp,
                brandName: submittedData.brandName,
              }
            : undefined
        }
        wompiIntent={wompiIntent}
        returnContext={returnContext}
        onboardingPath={onboardingPath}
      />
    </div>
  );
}
