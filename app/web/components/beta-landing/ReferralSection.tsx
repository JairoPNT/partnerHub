"use client";

import React from "react";
import { Users, Gift, CheckCircle2, Award } from "lucide-react";

export function ReferralSection() {
  return (
    <section className="bg-slate-50 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg sm:p-10">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
            
            <div className="lg:col-span-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-cyan-900">
                <Gift className="h-4 w-4 text-cyan-600" />
                Programa de Referidos Fundadores
              </div>

              <h2 className="mt-4 font-heading text-2xl font-extrabold text-slate-900 sm:text-3xl">
                Gana meses adicionales de gestión bonificada
              </h2>

              <p className="mt-3 text-base text-slate-600">
                Por cada 2 empresarios nuevos que refieras y activen su Ecosistema de Producto, recibes <strong className="text-slate-900 font-bold">1 mes adicional de gestión bonificada</strong>.
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-cyan-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-slate-900 text-sm">2 Referidos Activados</h4>
                    <p className="text-xs text-slate-600">Obtén 1 mes de gestión totalmente bonificado.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                  <Award className="h-5 w-5 shrink-0 text-fuchsia-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-slate-900 text-sm">Hasta 12 Meses Acumulables</h4>
                    <p className="text-xs text-slate-600">Con 24 referidos activados recibes 1 año completo bonificado.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-cyan-100 bg-gradient-to-br from-cyan-50 to-sky-50 p-6 text-center lg:col-span-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-600 text-white shadow-md">
                <Users className="h-7 w-7" />
              </div>
              <h3 className="mt-4 font-bold text-slate-900">¿Cómo funciona?</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                En el formulario de registro tus invitados ingresan tu nombre en el campo <span className="font-semibold text-slate-800 font-mono">"Persona que refirió"</span> y el beneficio se acredita al confirmarse su pago.
              </p>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
