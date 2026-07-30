"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Link2,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Building2,
  BarChart3,
} from "lucide-react";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export interface DashboardMetricsData {
  source: string;
  generatedAt: string;
  totalLeads: number;
  operationalActive: number;
  newLeads: number;
  contactedLeads: number;
  paidLeads: number;
  convertedLeads: number;
  cancelledLeads: number;
  linkedSites: number;
  unsupportedMetrics: string[];
}

export function AdminDashboardPrototype() {
  const [metrics, setMetrics] = useState<DashboardMetricsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchMetrics = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/internal/dashboard/metrics");
      if (!res.ok) {
        throw new Error("Error al obtener las métricas reales del servidor.");
      }
      const data: DashboardMetricsData = await res.json();
      setMetrics(data);
    } catch (err) {
      setErrorMessage((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  return (
    <div className="space-y-8 animate-fade-in text-slate-900">
      {/* Title Section */}
      <section className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Dashboard Operativo Principal
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Resumen técnico y consolidado de métricas reales de empresarios y activación de sitios.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {metrics?.generatedAt && (
            <span className="text-xs text-slate-400 font-mono hidden sm:inline">
              Actualizado: {new Date(metrics.generatedAt).toLocaleTimeString("es-CO")}
            </span>
          )}
          <button
            onClick={fetchMetrics}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Actualizar Métricas</span>
          </button>
        </div>
      </section>

      {/* Error Message Banner */}
      {errorMessage && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm font-semibold text-rose-900">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={fetchMetrics} className="inline-flex items-center gap-1 text-xs font-bold underline">
            <RefreshCw className="h-3.5 w-3.5" /> Reintentar
          </button>
        </div>
      )}

      {/* REAL NUMERIC KPI CARDS */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Solicitudes */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Leads Registrados
            </span>
            <Users className="h-4 w-4 text-cyan-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-900 font-heading">
              {isLoading ? "-" : metrics?.totalLeads ?? 0}
            </div>
            <p className="mt-1 text-[11px] text-slate-500 font-medium">
              Solicitudes totales registradas
            </p>
          </CardContent>
        </Card>

        {/* Empresarios Activos */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Empresarios Activos
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-emerald-600 font-heading">
              {isLoading ? "-" : metrics?.operationalActive ?? 0}
            </div>
            <p className="mt-1 text-[11px] text-slate-500 font-medium">
              Pagados o Convertidos
            </p>
          </CardContent>
        </Card>

        {/* Sitios Vinculados */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Sitios Web Vinculados
            </span>
            <Link2 className="h-4 w-4 text-cyan-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-900 font-heading">
              {isLoading ? "-" : metrics?.linkedSites ?? 0}
            </div>
            <p className="mt-1 text-[11px] text-slate-500 font-medium">
              Páginas con siteId asignado
            </p>
          </CardContent>
        </Card>

        {/* Nuevos Leads Pendientes */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Nuevas Solicitudes
            </span>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-amber-600 font-heading">
              {isLoading ? "-" : metrics?.newLeads ?? 0}
            </div>
            <p className="mt-1 text-[11px] text-slate-500 font-medium">
              Pendientes de primer contacto
            </p>
          </CardContent>
        </Card>
      </section>

      {/* DETAILED STATUS BREAKDOWN & UNSUPPORTED METRICS */}
      <section className="grid gap-6 md:grid-cols-2">
        {/* Real Status Distribution */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-cyan-600" />
              Desglose Real por Estado Operativo
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Conteo actualizado en tiempo real consumiendo <code className="font-mono font-bold">GET /api/internal/dashboard/metrics</code>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl border border-amber-200 bg-amber-50/60">
              <span className="text-xs font-bold text-amber-900 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                NUEVO (Pendiente de contacto)
              </span>
              <span className="font-mono text-sm font-extrabold text-amber-950">
                {isLoading ? "-" : metrics?.newLeads ?? 0}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border border-blue-200 bg-blue-50/60">
              <span className="text-xs font-bold text-blue-900 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                CONTACTADO (Onboarding iniciado)
              </span>
              <span className="font-mono text-sm font-extrabold text-blue-950">
                {isLoading ? "-" : metrics?.contactedLeads ?? 0}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-200 bg-emerald-50/60">
              <span className="text-xs font-bold text-emerald-900 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                PAGADO (Pago confirmado)
              </span>
              <span className="font-mono text-sm font-extrabold text-emerald-950">
                {isLoading ? "-" : metrics?.paidLeads ?? 0}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border border-green-200 bg-green-50/60">
              <span className="text-xs font-bold text-green-900 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-600" />
                CONVERTIDO (Sitio web operativo)
              </span>
              <span className="font-mono text-sm font-extrabold text-green-950">
                {isLoading ? "-" : metrics?.convertedLeads ?? 0}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border border-rose-200 bg-rose-50/60">
              <span className="text-xs font-bold text-rose-900 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                CANCELADO
              </span>
              <span className="font-mono text-sm font-extrabold text-rose-950">
                {isLoading ? "-" : metrics?.cancelledLeads ?? 0}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Unsupported Metrics & Partner Link */}
        <Card className="border-slate-200 bg-slate-50/70 shadow-sm flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-slate-400" />
              Métricas No Disponibles
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Estado de métricas financieras y telemetría de conversión externa.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Revenue Total (USD)</span>
                <span className="text-amber-700 font-mono text-xs">No disponible</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Requiere integración con pasarela de pago para conciliar transacciones reales.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Tasa de Conversión VSL / Cobertura SSL</span>
                <span className="text-amber-700 font-mono text-xs">No disponible</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Requiere integración de telemetría web externa y analítica GA4.
              </p>
            </div>
          </CardContent>

          {/* LINK TO PARTNERS MODULE */}
          <div className="p-6 pt-0">
            <div className="rounded-2xl border border-cyan-200 bg-cyan-50/80 p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-cyan-900">
                <Building2 className="h-4 w-4 text-cyan-600" />
                <span>Operación Detallada de Empresarios</span>
              </div>
              <p className="text-xs text-slate-600">
                Acceda a la gestión completa en Partners para buscar, filtrar por estado, auditar datos de onboarding y vincular <code className="font-mono font-bold">siteId</code>.
              </p>
              <Link
                href="/partners"
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition"
              >
                <span>Ver Operación de Empresarios en /partners</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
