"use client";

import React, { useState } from "react";
import { HelpCircle, ChevronDown } from "lucide-react";
import { PAYMENT_CONFIG } from "@/lib/config/payment-methods";

export function FaqSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: "¿El Ecosistema de Producto garantiza ventas o prospectos?",
      a: "No. El Ecosistema de Producto es una herramienta digital de presentación clara y profesional para elevar el valor percibido de tu producto. No es una promesa de ingresos automáticos ni garantiza ventas. La difusión del enlace y la atención comercial siguen estando bajo responsabilidad del empresario.",
    },
    {
      q: "¿Incluye CRM, VSL o Motor de Prospectos?",
      a: "No. Esta oferta beta aplica exclusivamente al Ecosistema de Producto. No incluye sistema CRM, secuencias automáticas de correo, embudos de video VSL ni herramientas de prospección automatizada.",
    },
    {
      q: "¿Cuándo empieza a cobrarse la gestión mensual de " + PAYMENT_CONFIG.monthlyFee + "?",
      a: "La inversión inicial (" + PAYMENT_CONFIG.amount + ") activa la configuración y publicación del Ecosistema de Producto. La gestión mensual de " + PAYMENT_CONFIG.monthlyFee + " se paga de forma anticipada para mantener el sitio publicado, con soporte y cambios menores dentro del alcance.",
    },
    {
      q: "¿Es obligatoria la gestión mensual después de la activación?",
      a: "Sí, la gestión mensual de " + PAYMENT_CONFIG.monthlyFee + " es requerida para mantener tu ecosistema publicado, hospedado en la nube y con soporte técnico activo.",
    },
    {
      q: "¿Este precio de " + PAYMENT_CONFIG.amount + " es definitivo o permanente?",
      a: "Es un precio de entrada exclusivo por encontrarnos en etapa de validación beta del MVP. Cuando el proyecto pase a su segunda etapa y la herramienta evolucione, los valores podrán actualizarse para nuevas cohortes.",
    },
    {
      q: "¿Cómo funciona el pago con tarjeta a cuotas?",
      a: "Al pagar con tarjeta de crédito mediante Wompi, puedes seleccionar diferir el valor de la activación hasta en 3 cuotas según las políticas y condiciones de tu entidad bancaria.",
    },
  ];

  return (
    <section className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-cyan-900">
            <HelpCircle className="h-4 w-4 text-cyan-600" />
            Preguntas Frecuentes
          </div>

          <h2 className="mt-4 font-heading text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Aclaraciones Comerciales y Condiciones
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-base text-slate-600">
            Transparencia total sobre lo que recibes al activar tu Ecosistema de Producto.
          </p>
        </div>

        {/* FAQ Accordion List */}
        <div className="mt-12 space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/50 transition"
              >
                <button
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="flex w-full items-center justify-between p-5 text-left font-bold text-slate-900 hover:bg-slate-100/80"
                >
                  <span className="text-base sm:text-lg">{faq.q}</span>
                  <ChevronDown
                    className={`h-5 w-5 text-slate-500 transition-transform ${
                      isOpen ? "rotate-180 text-cyan-600" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="border-t border-slate-200/80 bg-white p-5 text-sm leading-relaxed text-slate-600">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
