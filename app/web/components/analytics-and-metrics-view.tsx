"use client";

import { useState, useEffect, FormEvent } from "react";
import {
  BarChart3,
  Search,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Save,
  Check,
  Building2,
  Globe,
  Clock,
  ShieldCheck,
  FileText,
  Lock,
  Sparkles,
  RefreshCw,
  Tag
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label, Input, Textarea } from "@/components/ui/form";
import { Alert } from "@/components/ui/alert";
import { ModuleRecord } from "@/modules/catalog";

type AnalyticsAndMetricsViewProps = {
  record?: ModuleRecord;
};

export interface PartnerLead {
  id: string;
  fullName: string;
  whatsapp: string;
  email: string | null;
  brandName: string;
  status: "NEW" | "CONTACTED" | "PAID" | "CONVERTED" | "CANCELLED";
  siteId: string | null;
  publicationState?: "NOT_STARTED" | "GENERATED" | "PUBLISHED" | "VERIFIED" | "VERIFY_FAILED" | string;
  createdAt: string;
  onboardingData?: {
    domain?: string;
    analyticsMeasurementId?: string;
    operatorNotes?: string;
    analyticsVerified?: boolean;
    metaPixelId?: string;
    googleAdsConversionId?: string;
    [key: string]: unknown;
  };
}

const MEASUREMENT_ID_REGEX = /^G-[A-Z0-9]+$/i;
const META_PIXEL_ID_REGEX = /^\d{5,32}$/;

export function AnalyticsAndMetricsView({ record }: AnalyticsAndMetricsViewProps) {
  const [leads, setLeads] = useState<PartnerLead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<PartnerLead | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Form states
  const [measurementId, setMeasurementId] = useState("");
  const [metaPixelId, setMetaPixelId] = useState("");
  const [operatorNotes, setOperatorNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isMarkingVerified, setIsMarkingVerified] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/internal/activation-leads");
      if (response.ok) {
        const data = await response.json();
        const leadList: PartnerLead[] = data.leads || [];
        setLeads(leadList);

        // Re-select lead if currently selected
        if (selectedLead) {
          const refreshed = leadList.find((l) => l.id === selectedLead.id);
          if (refreshed) {
            setSelectedLead(refreshed);
          }
        }
      }
    } catch {
      // Ignorar fallos de red secundarios
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleSelectLead = (lead: PartnerLead) => {
    setSelectedLead(lead);
    setSuccessMessage(null);
    setErrorMessage(null);
    setFieldError(null);

    const existingId =
      lead.onboardingData?.analyticsMeasurementId || "";
    setMeasurementId(existingId);
    
    const existingMetaId =
      lead.onboardingData?.metaPixelId || "";
    setMetaPixelId(existingMetaId);
    
    setOperatorNotes(lead.onboardingData?.operatorNotes || "");
  };

  const filteredLeads = leads.filter((lead) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      lead.fullName.toLowerCase().includes(q) ||
      lead.brandName.toLowerCase().includes(q) ||
      (lead.siteId && lead.siteId.toLowerCase().includes(q)) ||
      (lead.onboardingData?.domain && lead.onboardingData.domain.toLowerCase().includes(q))
    );
  });

  const getAnalyticsStatus = (lead: PartnerLead) => {
    const id = lead.onboardingData?.analyticsMeasurementId;
    const isVerified =
      lead.onboardingData?.analyticsVerified || lead.publicationState === "VERIFIED";
    const isPublished = lead.publicationState === "PUBLISHED" || isVerified;

    if (isVerified) {
      return { label: "Verificado", variant: "bg-emerald-100 text-emerald-800 border-emerald-300" };
    }
    if (isPublished && id) {
      return { label: "Publicado", variant: "bg-cyan-100 text-cyan-800 border-cyan-300" };
    }
    if (id) {
      return { label: "Configurado", variant: "bg-blue-100 text-blue-800 border-blue-300" };
    }
    return { label: "Pendiente", variant: "bg-amber-100 text-amber-800 border-amber-300" };
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;

    setFieldError(null);
    setSuccessMessage(null);
    setErrorMessage(null);

    const trimmedId = measurementId.trim().toUpperCase();
    if (trimmedId && !MEASUREMENT_ID_REGEX.test(trimmedId)) {
      setFieldError("El ID de medición debe tener el formato G-XXXXXXXXXX (ej. G-7F24PBZPDM).");
      return;
    }
    
    const trimmedMetaId = metaPixelId.trim();
    if (trimmedMetaId && !META_PIXEL_ID_REGEX.test(trimmedMetaId)) {
      setFieldError("El Pixel ID de Meta debe contener únicamente entre 5 y 32 números. No pegues scripts de código.");
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        onboardingData: {
          ...selectedLead.onboardingData,
          analyticsMeasurementId: trimmedId || undefined,
          metaPixelId: trimmedMetaId || undefined,
          operatorNotes: operatorNotes.trim() || undefined
        }
      };

      const res = await fetch(`/api/internal/activation-leads/${selectedLead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "No se pudo guardar la configuración de analítica.");
      }

      const updatedLead = await res.json();
      setSuccessMessage("Configuración de Google Analytics 4 guardada correctamente.");
      setSelectedLead(updatedLead);
      setLeads((prev) => prev.map((l) => (l.id === updatedLead.id ? updatedLead : l)));
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Error al guardar la configuración.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkVerified = async () => {
    if (!selectedLead) return;

    setIsMarkingVerified(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const payload = {
        onboardingData: {
          ...selectedLead.onboardingData,
          analyticsVerified: true
        }
      };

      const res = await fetch(`/api/internal/activation-leads/${selectedLead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error("No se pudo marcar la integración como verificada.");
      }

      const updatedLead = await res.json();
      setSuccessMessage("Analítica marcada manualmente como verificada.");
      setSelectedLead(updatedLead);
      setLeads((prev) => prev.map((l) => (l.id === updatedLead.id ? updatedLead : l)));
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Error al verificar la integración.");
    } finally {
      setIsMarkingVerified(false);
    }
  };

  // Evaluation of Checklist Steps for current selected lead
  const hasMeasurementId = Boolean(selectedLead?.onboardingData?.analyticsMeasurementId);
  const isPagePublished =
    selectedLead?.publicationState === "PUBLISHED" || selectedLead?.publicationState === "VERIFIED";
  const isVerified =
    Boolean(selectedLead?.onboardingData?.analyticsVerified) ||
    selectedLead?.publicationState === "VERIFIED";

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-cyan-600 text-white shadow-sm">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight font-heading">
                {record?.name || "Analítica y Métricas"}
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Configuración centralizada de medición e integraciones analíticas por empresario
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLeads}
            disabled={isLoading}
            className="rounded-xl border-slate-200 text-xs font-semibold"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin text-cyan-600" : ""}`} />
            Actualizar
          </Button>
          <a
            href="https://analytics.google.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800"
          >
            Google Analytics
            <ExternalLink className="h-3.5 w-3.5 text-cyan-400" />
          </a>
        </div>
      </div>

      {/* Grid Principal: Lista + Detalle */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Columna Izquierda: Buscador y Selector de Empresario */}
        <Card className="lg:col-span-4 rounded-3xl border-slate-200/80 shadow-sm bg-white overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-5">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-cyan-600" />
              Seleccionar Empresario
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Busca por nombre, marca o siteId para configurar su analítica
            </CardDescription>

            <div className="relative mt-3">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Buscar empresario o dominio..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs rounded-xl border-slate-200 bg-white shadow-none focus-visible:ring-cyan-500"
              />
            </div>
          </CardHeader>

          <CardContent className="p-0 max-h-[560px] overflow-y-auto divide-y divide-slate-100">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-slate-400">
                <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-cyan-600" />
                Cargando empresarios...
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No se encontraron empresarios con el criterio ingresado.
              </div>
            ) : (
              filteredLeads.map((lead) => {
                const isSelected = selectedLead?.id === lead.id;
                const statusInfo = getAnalyticsStatus(lead);

                return (
                  <button
                    key={lead.id}
                    type="button"
                    onClick={() => handleSelectLead(lead)}
                    className={`w-full text-left p-4 transition-all duration-150 flex items-center justify-between hover:bg-slate-50/80 ${
                      isSelected ? "bg-cyan-50/60 border-l-4 border-l-cyan-600" : ""
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {lead.brandName}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {lead.fullName}
                      </p>
                      {lead.siteId && (
                        <span className="inline-block text-[10px] font-mono text-cyan-700 bg-cyan-100/60 px-1.5 py-0.5 rounded mt-1">
                          {lead.siteId}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col items-end shrink-0">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusInfo.variant}`}
                      >
                        {statusInfo.label}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Columna Derecha: Panel de Configuración del Empresario Seleccionado */}
        <div className="lg:col-span-8 space-y-6">
          {!selectedLead ? (
            <Card className="rounded-3xl border-dashed border-2 border-slate-200 p-12 text-center bg-slate-50/50">
              <BarChart3 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-700">Ningún empresario seleccionado</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Selecciona un empresario de la lista lateral para administrar su Measurement ID de GA4 y verificar su estado de medición.
              </p>
            </Card>
          ) : (
            <>
              {/* Card 1: Ficha del Empresario Seleccionado */}
              <Card className="rounded-3xl border-slate-200/80 shadow-sm bg-white overflow-hidden">
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/50">
                          Empresario Registrado
                        </span>
                        {selectedLead.siteId && (
                          <span className="text-[10px] font-mono text-slate-300">
                            ID: {selectedLead.siteId}
                          </span>
                        )}
                      </div>
                      <h2 className="text-lg font-extrabold text-white">
                        {selectedLead.brandName}
                      </h2>
                      <p className="text-xs text-slate-300">
                        {selectedLead.fullName} · {selectedLead.email || selectedLead.whatsapp}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-semibold text-slate-300 bg-slate-800 px-3 py-1 rounded-xl border border-slate-700">
                        Comercial: {selectedLead.status}
                      </span>
                      <span
                        className={`text-[11px] font-bold px-3 py-1 rounded-xl border ${getAnalyticsStatus(selectedLead).variant}`}
                      >
                        Analytics: {getAnalyticsStatus(selectedLead).label}
                      </span>
                    </div>
                  </div>

                  {/* Info Row: Dominio & Publicación */}
                  <div className="mt-4 pt-4 border-t border-slate-700/60 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-cyan-400 shrink-0" />
                      <span className="font-medium text-slate-400">Dominio:</span>
                      <span className="font-semibold text-white font-mono truncate">
                        {selectedLead.onboardingData?.domain || "No asignado"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-cyan-400 shrink-0" />
                      <span className="font-medium text-slate-400 font-sans">Estado Sitio:</span>
                      <span className="font-semibold text-white">
                        {selectedLead.publicationState || "NOT_STARTED"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Content: Form GA4 & Operators Notes */}
                <CardContent className="p-6 space-y-6">
                  {successMessage && (
                    <Alert className="rounded-2xl border-emerald-200 bg-emerald-50 text-emerald-900 text-xs">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 mr-2" />
                      {successMessage}
                    </Alert>
                  )}

                  {errorMessage && (
                    <Alert className="rounded-2xl border-rose-200 bg-rose-50 text-rose-900 text-xs">
                      <AlertCircle className="h-4 w-4 text-rose-600 mr-2" />
                      {errorMessage}
                    </Alert>
                  )}

                  <form onSubmit={handleSave} className="space-y-5">
                    {/* Campo GA4 Measurement ID */}
                    <div className="rounded-2xl border border-cyan-100 bg-cyan-50/40 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="measurementId" className="text-xs font-bold text-slate-900 flex items-center gap-2">
                          <Tag className="h-4 w-4 text-cyan-600" />
                          ID de Medición Google Analytics 4 (GA4)
                        </Label>
                        <span className="text-[11px] font-mono text-cyan-700">Format: G-XXXXXXXXXX</span>
                      </div>

                      <Input
                        id="measurementId"
                        type="text"
                        placeholder="Ej. G-7F24PBZPDM"
                        value={measurementId}
                        onChange={(e) => {
                          setMeasurementId(e.target.value);
                          setFieldError(null);
                        }}
                        className={`text-xs font-mono uppercase bg-white rounded-xl border-slate-200 ${
                          fieldError ? "border-rose-500 ring-1 ring-rose-500" : "focus-visible:ring-cyan-500"
                        }`}
                      />

                      {fieldError && (
                        <p className="text-[11px] font-medium text-rose-600 flex items-center gap-1">
                          <AlertCircle className="h-3.5 w-3.5" />
                          {fieldError}
                        </p>
                      )}

                      <p className="text-[11px] text-slate-500">
                        Este código se inyecta en <code className="text-cyan-800 bg-cyan-100 px-1 py-0.5 rounded">integrations.analytics.measurementId</code> al generar la landing del empresario.
                      </p>
                    </div>

                    {/* Campo Meta Pixel */}
                    <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="metaPixelId" className="text-xs font-bold text-slate-900 flex items-center gap-2">
                          <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                          </svg>
                          Pixel ID de Meta (Facebook/Instagram)
                        </Label>
                        <Badge variant="neutral" className={`text-[10px] font-bold ${metaPixelId ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-amber-100 text-amber-800 border-amber-200'}`}>
                          {metaPixelId ? "Configurado" : "Pendiente"}
                        </Badge>
                      </div>

                      <Input
                        id="metaPixelId"
                        type="text"
                        placeholder="Ej. 123456789012345"
                        value={metaPixelId}
                        onChange={(e) => {
                          setMetaPixelId(e.target.value);
                          setFieldError(null);
                        }}
                        className={`text-xs font-mono bg-white rounded-xl border-slate-200 ${
                          fieldError && fieldError.includes("Meta") ? "border-rose-500 ring-1 ring-rose-500" : "focus-visible:ring-blue-500"
                        }`}
                      />

                      <p className="text-[11px] text-slate-500">
                        Pega únicamente el Pixel ID numérico (Dataset ID). No pegues scripts ni código. Esta modificación requiere regeneración para reflejarse en la página de producto.
                      </p>
                      
                      <a
                        href="https://business.facebook.com/events_manager2"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-semibold text-blue-600 hover:underline flex items-center gap-1 w-max"
                      >
                        Buscar ID en Events Manager <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>

                    {/* Notas Internas del Operador */}
                    <div className="space-y-2">
                      <Label htmlFor="operatorNotes" className="text-xs font-bold text-slate-800 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-slate-500" />
                        Notas Internas del Operador
                      </Label>
                      <Textarea
                        id="operatorNotes"
                        placeholder="Ej. Propiedad GA4 creada en cuenta propia. Eventos de clic a WhatsApp y formulario verificados."
                        value={operatorNotes}
                        onChange={(e) => setOperatorNotes(e.target.value)}
                        rows={3}
                        className="text-xs rounded-2xl border-slate-200 bg-white focus-visible:ring-cyan-500"
                      />
                    </div>

                    {/* Acciones */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <Button
                        type="submit"
                        disabled={isSaving}
                        className="rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold px-5"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {isSaving ? "Guardando..." : "Guardar configuración"}
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        disabled={isMarkingVerified || isVerified}
                        onClick={handleMarkVerified}
                        className="rounded-xl border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs font-semibold"
                      >
                        <ShieldCheck className="h-4 w-4 mr-1.5 text-emerald-600" />
                        {isVerified
                          ? "Marcado como Verificado"
                          : isMarkingVerified
                          ? "Verificando..."
                          : "Marcar como verificado"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* Card 2: Checklist Operativo GA4 */}
              <Card className="rounded-3xl border-slate-200/80 shadow-sm bg-white p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <CheckCircle2 className="h-4.5 w-4.5 text-cyan-600" />
                      Checklist Operativo de Instalación GA4
                    </h3>
                    <p className="text-xs text-slate-500">
                      Pasos secuenciales para asegurar la trazabilidad de analítica
                    </p>
                  </div>
                  <Badge variant="neutral" className="rounded-lg text-[10px] font-bold text-slate-500 border border-slate-300">
                    Proceso Antigravity MVP
                  </Badge>
                </div>

                <div className="space-y-2.5">
                  {/* Paso 1 */}
                  <div className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-slate-50/60">
                    <div className="flex items-center gap-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-100 text-cyan-800 font-bold text-xs">
                        1
                      </div>
                      <span className="text-xs font-semibold text-slate-800">
                        Crear propiedad GA4 para el empresario
                      </span>
                    </div>
                    <a
                      href="https://analytics.google.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-cyan-600 hover:underline flex items-center gap-1"
                    >
                      Abrir GA4
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>

                  {/* Paso 2 */}
                  <div className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-slate-50/60">
                    <div className="flex items-center gap-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-100 text-cyan-800 font-bold text-xs">
                        2
                      </div>
                      <span className="text-xs font-semibold text-slate-800">
                        Crear flujo web apuntando al dominio del cliente
                      </span>
                    </div>
                    <a
                      href="https://analytics.google.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-cyan-600 hover:underline flex items-center gap-1"
                    >
                      Flujos Web
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>

                  {/* Paso 3 */}
                  <div className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-slate-50/60">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-6 w-6 items-center justify-center rounded-full font-bold text-xs ${
                        hasMeasurementId ? "bg-emerald-500 text-white" : "bg-cyan-100 text-cyan-800"
                      }`}>
                        {hasMeasurementId ? <Check className="h-3.5 w-3.5" /> : "3"}
                      </div>
                      <span className="text-xs font-semibold text-slate-800">
                        Copiar ID de medición (<code className="text-slate-600">G-XXXXXXXXXX</code>)
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">
                      {hasMeasurementId ? "Copiado" : "Pendiente"}
                    </Badge>
                  </div>

                  {/* Paso 4 */}
                  <div className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-slate-50/60">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-6 w-6 items-center justify-center rounded-full font-bold text-xs ${
                        hasMeasurementId ? "bg-emerald-500 text-white" : "bg-cyan-100 text-cyan-800"
                      }`}>
                        {hasMeasurementId ? <Check className="h-3.5 w-3.5" /> : "4"}
                      </div>
                      <span className="text-xs font-semibold text-slate-800">
                        Guardar ID en PartnerHub
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">
                      {hasMeasurementId ? "Guardado" : "Pendiente"}
                    </Badge>
                  </div>

                  {/* Paso 5 */}
                  <div className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-slate-50/60">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-6 w-6 items-center justify-center rounded-full font-bold text-xs ${
                        isPagePublished ? "bg-emerald-500 text-white" : "bg-cyan-100 text-cyan-800"
                      }`}>
                        {isPagePublished ? <Check className="h-3.5 w-3.5" /> : "5"}
                      </div>
                      <span className="text-xs font-semibold text-slate-800">
                        Publicar la página de producto
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">
                      {isPagePublished ? "Publicado" : "Pendiente de publicación"}
                    </Badge>
                  </div>

                  {/* Paso 6 */}
                  <div className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-slate-50/60">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-6 w-6 items-center justify-center rounded-full font-bold text-xs ${
                        isVerified ? "bg-emerald-500 text-white" : "bg-cyan-100 text-cyan-800"
                      }`}>
                        {isVerified ? <Check className="h-3.5 w-3.5" /> : "6"}
                      </div>
                      <span className="text-xs font-semibold text-slate-800">
                        Verificar recepción de eventos en tiempo real en GA4
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">
                      {isVerified ? "Verificado" : "Pendiente de verificación"}
                    </Badge>
                  </div>
                </div>
              </Card>

              {/* Card 3: Secciones Futuras (Meta Pixel & Google Ads - Próximamente) */}
              <Card className="rounded-3xl border-slate-200/80 shadow-sm bg-slate-50/50 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Sparkles className="h-4.5 w-4.5 text-purple-600" />
                      Próximas Integraciones de Publicidad (Post-MVP)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Estructura preparada en contrato backend para futuras fases
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {/* Google Ads */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-white opacity-70 relative">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-900">Google Ads Conversions</span>
                      <Badge variant="neutral" className="text-[9px] font-bold text-purple-700 bg-purple-50 border-purple-200">
                        Próximamente
                      </Badge>
                    </div>
                    <Input
                      disabled
                      placeholder="Conversion ID (No disponible en MVP)"
                      className="text-xs rounded-xl bg-slate-50 border-slate-200 cursor-not-allowed"
                    />
                    <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      Habilitado para atribución de compras directas en v2.0
                    </p>
                  </div>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
