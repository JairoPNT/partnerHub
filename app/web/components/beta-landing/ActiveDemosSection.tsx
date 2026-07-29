"use client";

import React from "react";
import { ExternalLink, Star, Compass, ShieldCheck, AlertCircle } from "lucide-react";

export function ActiveDemosSection() {
  const demos = [
    {
      domain: "jairopinto.pro",
      url: "https://jairopinto.pro",
      title: "Jairo Pinto — Ecosistema Principal",
      subtitle: "Prueba Principal del Servicio",
      isPrimary: true,
      tag: "Prueba Principal",
    },
    {
      domain: "yennygarcia.pro",
      url: "https://yennygarcia.pro",
      title: "Yenny García",
      subtitle: "Muestra activa en producción",
      isPrimary: false,
      tag: "Muestra Activa",
    },
    {
      domain: "claudiacalero.pro",
      url: "https://claudiacalero.pro",
      title: "Claudia Calero",
      subtitle: "Muestra activa en producción",
      isPrimary: false,
      tag: "Muestra Activa",
    },
    {
      domain: "blancastella.pro",
      url: "https://blancastella.pro",
      title: "Blanca Stella",
      subtitle: "Muestra activa en producción",
      isPrimary: false,
      tag: "Muestra Activa",
    },
  ];

  return (
    <section id="demos" className="bg-slate-50 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-cyan-900">
            <Compass className="h-4 w-4 text-cyan-600" />
            Evidencia Real
          </div>

          <h2 className="mt-4 font-heading text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Muestras activas del Ecosistema de Producto
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600 sm:text-lg">
            Explora ejemplos reales funcionando en vivo para que puedas visualizar la experiencia que recibirá tu cliente al activar tu ecosistema.
          </p>
        </div>

        {/* Demo Cards Grid */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {demos.map((demo) => (
            <div
              key={demo.domain}
              className={`relative flex flex-col justify-between rounded-3xl border p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl ${
                demo.isPrimary
                  ? "border-cyan-300 bg-gradient-to-b from-white via-cyan-50/40 to-sky-50/60 shadow-lg ring-2 ring-cyan-500/20"
                  : "border-slate-200 bg-white shadow-sm hover:border-slate-300"
              }`}
            >
              <div>
                {/* Header Tag */}
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                      demo.isPrimary
                        ? "bg-cyan-600 text-white"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {demo.isPrimary && <Star className="h-3 w-3 fill-current" />}
                    {demo.tag}
                  </span>
                </div>

                {/* Domain Title */}
                <h3 className="mt-4 text-xl font-extrabold text-slate-900">
                  {demo.domain}
                </h3>
                <p className="mt-1 text-xs text-slate-500">{demo.title}</p>
                <p className="mt-3 text-xs text-slate-600">{demo.subtitle}</p>
              </div>

              {/* Action Link */}
              <div className="mt-6 border-t border-slate-100 pt-4">
                <a
                  href={demo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                    demo.isPrimary
                      ? "bg-cyan-600 text-white hover:bg-cyan-700 shadow-md"
                      : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  Abrir demo en vivo
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Operational disclaimer */}
        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
          <p className="flex items-center justify-center gap-2 text-xs text-slate-500">
            <AlertCircle className="h-4 w-4 shrink-0 text-slate-400" />
            <span>
              <strong className="font-semibold text-slate-700">Nota informativa:</strong> Cada demo se presenta como muestra visual del tipo de experiencia digital que se construye. No constituye una garantía de ingresos o resultados comerciales.
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
