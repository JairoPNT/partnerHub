"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  Link2,
  Clock,
  ArrowRight,
  TrendingUp,
  Mail,
  Share2,
  Calendar
} from "lucide-react";

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
        throw new Error("Error al obtener métricas del servidor.");
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
    <div className="flex-1 flex flex-col h-full animate-fade-in">
      
      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between pb-6">
        <div>
          <h1 className="text-2xl font-bold text-ph-navy font-heading">Resumen general</h1>
          <p className="text-sm text-gray-500 mt-1">Vista general del rendimiento de tu ecosistema de marca.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-all">
            <Calendar className="w-4 h-4 text-gray-400" />
            Últimos 30 días
          </button>
          <button onClick={fetchMetrics} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-all">
            Exportar
            <ArrowRight className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="pb-10 space-y-8">
        
        {/* 4 Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          
          <div className="bg-white rounded-2xl p-6 shadow-card border border-gray-100 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <span className="text-sm font-semibold text-gray-600">Total Leads</span>
              <div className="p-2 bg-ph-light rounded-lg">
                <Users className="w-5 h-5 text-ph-blue" />
              </div>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-ph-navy mb-2 font-heading">
                {isLoading ? "-" : metrics?.totalLeads ?? 0}
              </h2>
              <div className="flex items-center text-xs font-medium">
                <span className="text-ph-success flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  12.5%
                </span>
                <span className="text-gray-400 ml-1">vs. período anterior</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-card border border-gray-100 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <span className="text-sm font-semibold text-gray-600">Empresarios Activos</span>
              <div className="p-2 bg-ph-light rounded-lg">
                <Share2 className="w-5 h-5 text-ph-blue" />
              </div>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-ph-navy mb-2 font-heading">
                {isLoading ? "-" : metrics?.operationalActive ?? 0}
              </h2>
              <div className="flex items-center text-xs font-medium">
                <span className="text-ph-success flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  8.3%
                </span>
                <span className="text-gray-400 ml-1">vs. período anterior</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-card border border-gray-100 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <span className="text-sm font-semibold text-gray-600">Nuevas Solicitudes</span>
              <div className="p-2 bg-ph-light rounded-lg">
                <Clock className="w-5 h-5 text-ph-blue" />
              </div>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-ph-navy mb-2 font-heading">
                {isLoading ? "-" : metrics?.newLeads ?? 0}
              </h2>
              <div className="flex items-center text-xs font-medium">
                <span className="text-ph-success flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  15.7%
                </span>
                <span className="text-gray-400 ml-1">vs. período anterior</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-card border border-gray-100 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <span className="text-sm font-semibold text-gray-600">Sitios Vinculados</span>
              <div className="p-2 bg-ph-light rounded-lg">
                <Link2 className="w-5 h-5 text-ph-blue" />
              </div>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-ph-navy mb-2 font-heading">
                {isLoading ? "-" : metrics?.linkedSites ?? 0}
              </h2>
              <div className="flex items-center text-xs font-medium">
                <span className="text-ph-success flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  5.2%
                </span>
                <span className="text-gray-400 ml-1">vs. período anterior</span>
              </div>
            </div>
          </div>

        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Line Chart Mockup */}
          <div className="bg-white rounded-2xl p-6 shadow-card border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg text-ph-navy font-heading">Rendimiento general</h3>
              <button className="text-sm font-medium text-gray-500 bg-gray-50 px-3 py-1.5 rounded-md flex items-center gap-1 border border-gray-200">
                Interacciones
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-500">Interacciones totales</p>
              <h4 className="text-2xl font-bold text-ph-navy font-heading">245,780</h4>
              <span className="text-xs font-medium text-ph-success flex items-center gap-1 mt-1">
                <TrendingUp className="w-3 h-3" />
                18.6% vs. período anterior
              </span>
            </div>

            {/* SVG Chart Mock */}
            <div className="h-48 w-full mt-6 relative">
              <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-400 pb-6">
                <span>80K</span>
                <span>60K</span>
                <span>40K</span>
                <span>20K</span>
                <span>0</span>
              </div>
              <div className="absolute bottom-0 left-8 w-[calc(100%-2rem)] flex justify-between text-xs text-gray-400">
                <span>12 may.</span>
                <span>19 may.</span>
                <span>26 may.</span>
                <span>2 jun.</span>
                <span>9 jun.</span>
                <span>12 jun.</span>
              </div>
              
              <div className="absolute left-8 right-0 top-0 h-[calc(100%-1.5rem)] border-b border-gray-100 flex flex-col justify-between">
                <div className="w-full border-b border-gray-100 h-0"></div>
                <div className="w-full border-b border-gray-100 h-0"></div>
                <div className="w-full border-b border-gray-100 h-0"></div>
                <div className="w-full border-b border-gray-100 h-0"></div>
              </div>

              <svg className="absolute left-8 right-0 top-0 w-[calc(100%-2rem)] h-[calc(100%-1.5rem)] overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#00C2A8" stopOpacity="0.2"/>
                    <stop offset="100%" stopColor="#00C2A8" stopOpacity="0"/>
                  </linearGradient>
                </defs>
                <path d="M0,80 C10,75 20,85 30,60 C40,35 50,70 60,40 C70,10 80,50 90,20 C95,5 100,25 100,25" fill="none" stroke="#00C2A8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          {/* Donut Chart Mockup */}
          <div className="bg-white rounded-2xl p-6 shadow-card border border-gray-100">
            <h3 className="font-bold text-lg text-ph-navy font-heading mb-8">Distribución de interacciones</h3>
            <div className="flex flex-col sm:flex-row items-center justify-between h-56">
              
              <div className="relative w-48 h-48 sm:ml-4 shrink-0">
                <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                  <circle cx="18" cy="18" r="15.91549430918954" fill="transparent" stroke="#f3f4f6" strokeWidth="6"></circle>
                  <circle cx="18" cy="18" r="15.91549430918954" fill="transparent" stroke="#0086FE" strokeWidth="6" strokeDasharray="45.6 54.4" strokeDashoffset="0"></circle>
                  <circle cx="18" cy="18" r="15.91549430918954" fill="transparent" stroke="#0B1D3A" strokeWidth="6" strokeDasharray="28.7 71.3" strokeDashoffset="-45.6"></circle>
                  <circle cx="18" cy="18" r="15.91549430918954" fill="transparent" stroke="#00C2A8" strokeWidth="6" strokeDasharray="15.2 84.8" strokeDashoffset="-74.3"></circle>
                  <circle cx="18" cy="18" r="15.91549430918954" fill="transparent" stroke="#E6F2FF" strokeWidth="6" strokeDasharray="10.5 89.5" strokeDashoffset="-89.5"></circle>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-ph-navy">245k</span>
                  <span className="text-xs text-gray-500">Total</span>
                </div>
              </div>

              <div className="flex-1 w-full sm:ml-10 flex flex-col justify-center gap-4 mt-6 sm:mt-0">
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-ph-blue"></div>
                    <span className="text-gray-700">Web</span>
                  </div>
                  <span className="font-semibold text-ph-navy">45.6%</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-ph-navy"></div>
                    <span className="text-gray-700">Redes sociales</span>
                  </div>
                  <span className="font-semibold text-ph-navy">28.7%</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-ph-success"></div>
                    <span className="text-gray-700">Email</span>
                  </div>
                  <span className="font-semibold text-ph-navy">15.2%</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-ph-light"></div>
                    <span className="text-gray-700">Otros</span>
                  </div>
                  <span className="font-semibold text-ph-navy">10.5%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity Table */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-card border border-gray-100">
            <h3 className="font-bold text-lg text-ph-navy font-heading mb-4">Actividad reciente</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-400 border-b border-gray-100">
                  <tr>
                    <th className="pb-3 font-medium">Elemento</th>
                    <th className="pb-3 font-medium">Tipo</th>
                    <th className="pb-3 font-medium">Canal</th>
                    <th className="pb-3 font-medium">Estado</th>
                    <th className="pb-3 font-medium text-right">Actualizado</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="py-3.5 font-medium text-gray-800 flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-ph-light text-ph-blue flex items-center justify-center">
                        <Link2 className="w-3.5 h-3.5" />
                      </div>
                      Guía de producto Q2
                    </td>
                    <td className="py-3.5 text-gray-500">Activo web</td>
                    <td className="py-3.5 text-gray-500">Web</td>
                    <td className="py-3.5">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-[#E6F9F6] text-ph-success">
                        Publicado
                      </span>
                    </td>
                    <td className="py-3.5 text-right text-gray-400">Hace 2 horas</td>
                  </tr>
                  <tr className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="py-3.5 font-medium text-gray-800 flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-ph-light text-ph-blue flex items-center justify-center">
                        <Share2 className="w-3.5 h-3.5" />
                      </div>
                      Lanzamiento Verano
                    </td>
                    <td className="py-3.5 text-gray-500">Campaña</td>
                    <td className="py-3.5 text-gray-500">Email, Redes</td>
                    <td className="py-3.5">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-ph-light text-ph-blue">
                        Activa
                      </span>
                    </td>
                    <td className="py-3.5 text-right text-gray-400">Hace 5 horas</td>
                  </tr>
                  <tr className="hover:bg-gray-50/50">
                    <td className="py-3.5 font-medium text-gray-800 flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-[#E6F9F6] text-ph-success flex items-center justify-center">
                        <Mail className="w-3.5 h-3.5" />
                      </div>
                      Mensaje: Innovación
                    </td>
                    <td className="py-3.5 text-gray-500">Mensaje validado</td>
                    <td className="py-3.5 text-gray-500">Todos</td>
                    <td className="py-3.5">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-[#E6F9F6] text-ph-success">
                        Validado
                      </span>
                    </td>
                    <td className="py-3.5 text-right text-gray-400">Hace 1 día</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Channels */}
          <div className="lg:col-span-1 bg-white rounded-2xl p-6 shadow-card border border-gray-100">
            <h3 className="font-bold text-lg text-ph-navy font-heading mb-6">Top canales por rendimiento</h3>
            
            <div className="space-y-5">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">Sitio web</span>
                  <span className="font-bold text-ph-navy">98,760</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div className="bg-ph-blue h-2.5 rounded-full" style={{ width: '100%' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">LinkedIn</span>
                  <span className="font-bold text-ph-navy">72,480</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div className="bg-ph-blue h-2.5 rounded-full" style={{ width: '75%' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">Email</span>
                  <span className="font-bold text-ph-navy">38,920</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div className="bg-ph-blue h-2.5 rounded-full" style={{ width: '40%' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">Facebook</span>
                  <span className="font-bold text-ph-navy">22,410</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div className="bg-ph-blue h-2.5 rounded-full" style={{ width: '25%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
