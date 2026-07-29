"use client";

import React from "react";
import { Check, Smartphone, Compass, Share2, MessageCircle } from "lucide-react";

export function SolutionSection() {
  return (
    <section className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-cyan-900">
              La Solución
            </div>

            <h2 className="mt-4 font-heading text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Tu Ecosistema de Producto listo para compartir
            </h2>

            <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
              Una estructura web moderna que reúne lo más importante de tu producto o servicio en un solo enlace profesional. Tu prospecto entiende en segundos qué ofreces y cómo contactarte.
            </p>

            <ul className="mt-8 space-y-4">
              <li className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-white mt-0.5">
                  <Check className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">Presentación Clara y Organizada</h4>
                  <p className="text-sm text-slate-600">Imágenes, beneficios y llamados a la acción en una sola pantalla navegable.</p>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-white mt-0.5">
                  <Check className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">100% Optimizado para WhatsApp</h4>
                  <p className="text-sm text-slate-600">Pensado para compartirse directamente en chats y estados con carga ultrarrápida.</p>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-white mt-0.5">
                  <Check className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">Sin complicaciones tecnológicas</h4>
                  <p className="text-sm text-slate-600">Nosotros nos encargamos del diseño, publicación y configuración de tu ruta de contacto.</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Visual Showcase Card */}
          <div className="relative rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 via-sky-50/30 to-cyan-50/50 p-6 shadow-xl sm:p-8">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase">Experiencia del visitante</p>
                  <p className="font-bold text-slate-900">tu-marca.pro</p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <div className="h-4 w-3/4 rounded bg-slate-200 animate-pulse" />
                <div className="h-3 w-full rounded bg-slate-100" />
                <div className="h-3 w-5/6 rounded bg-slate-100" />

                <div className="mt-4 rounded-xl border border-dashed border-cyan-300 bg-cyan-50/50 p-4 text-center">
                  <p className="text-xs font-semibold text-cyan-900">
                    Botón de Acción Directo a tu WhatsApp o Destino Acordado
                  </p>
                  <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm">
                    <MessageCircle className="h-4 w-4" />
                    Hablar con un Asesor
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <Share2 className="h-4 w-4 text-cyan-600" /> Fácil de compartir
              </span>
              <span className="flex items-center gap-1.5">
                <Compass className="h-4 w-4 text-cyan-600" /> Dominio personalizable
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
