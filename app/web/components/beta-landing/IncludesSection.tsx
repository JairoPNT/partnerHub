"use client";

import React from "react";
import { CheckCircle2, Layout, Globe, Sliders, MessageSquare, ShieldCheck, Headphones } from "lucide-react";

export function IncludesSection() {
  const items = [
    {
      icon: Layout,
      title: "Estructura de Presentación",
      desc: "Diseño optimizado para resaltar los beneficios principales, fotos y propuesta de valor de tu producto.",
    },
    {
      icon: Globe,
      title: "Publicación del Ecosistema",
      desc: "Montaje técnico completo de tu página en la nube para que esté disponible 24/7 sin caídas.",
    },
    {
      icon: Sliders,
      title: "Configuración Básica Inicial",
      desc: "Ajuste de colores de marca, textos principales, encabezados e imágenes de tu producto.",
    },
    {
      icon: MessageSquare,
      title: "Ruta Directa a WhatsApp",
      desc: "Conexión directa del botón principal a tu número de WhatsApp con un mensaje preconfigurado.",
    },
    {
      icon: ShieldCheck,
      title: "1.er Mes de Administración Incluido",
      desc: "Gestión técnica y puesta en marcha cubierta durante todo tu primer mes de implementación.",
    },
    {
      icon: Headphones,
      title: "Mantenimiento y Soporte en Alcance",
      desc: "Soporte para asegurar disponibilidad del servicio dentro del alcance contratado.",
    },
  ];

  return (
    <section className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-cyan-900">
            Alcance del Servicio
          </div>

          <h2 className="mt-4 font-heading text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            ¿Qué incluye tu Ecosistema de Producto?
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600 sm:text-lg">
            Todo lo necesario para que entregues una experiencia profesional a tus prospectos sin complicaciones.
          </p>
        </div>

        {/* Features grid */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-6 transition-all hover:bg-white hover:shadow-md"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-600 text-white shadow-md">
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{item.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
