"use client";

import React from "react";
import { AlertCircle, ImageOff, MessageSquareX, FileQuestion, ArrowDown } from "lucide-react";

export function ProblemSection() {
  return (
    <section className="bg-slate-900 py-16 text-white sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-rose-300">
            <AlertCircle className="h-4 w-4" />
            El problema habitual al presentar productos
          </div>

          <h2 className="mt-6 font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
            ¿Tu prospecto recibe tu producto así?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-slate-300 sm:text-lg">
            Muchos empresarios tienen productos excelentes, pero al explicarlos por WhatsApp terminan enviando información fragmentada que genera confusión.
          </p>
        </div>

        {/* Grid of issues */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-800/60 p-6 backdrop-blur-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400">
              <ImageOff className="h-6 w-6" />
            </div>
            <h3 className="mt-4 font-semibold text-white">
              Imágenes y audios sueltos
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Múltiples fotos en la galería, notas de voz explicativas y textos largos que el prospecto casi nunca lee por completo.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-800/60 p-6 backdrop-blur-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
              <FileQuestion className="h-6 w-6" />
            </div>
            <h3 className="mt-4 font-semibold text-white">
              PDFs y enlaces dispersos
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Catálogos pesados que no cargan bien en el celular o enlaces a distintos sitios donde el cliente se pierde fácilmente.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-800/60 p-6 backdrop-blur-sm sm:col-span-2 lg:col-span-1">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400">
              <MessageSquareX className="h-6 w-6" />
            </div>
            <h3 className="mt-4 font-semibold text-white">
              Explicaciones manuales repetitivas
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Dependencia total de responder las mismas preguntas una y otra vez, perdiendo tiempo y oportunidades de cierre.
            </p>
          </div>
        </div>

        {/* Transition callout */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-400">
            Existe una forma más ordenada y profesional de hacerlo
            <ArrowDown className="h-4 w-4 animate-bounce" />
          </div>
        </div>
      </div>
    </section>
  );
}
