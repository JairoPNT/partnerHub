"use client";

import React, { useState, useEffect } from "react";
import {
  Globe,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  CheckSquare,
  Square,
  Play,
  Layers,
  FileCode2,
  Check,
  X,
  AlertTriangle,
  Clock
} from "lucide-react";
import { ModuleRecord } from "@/modules/catalog";

type MasterSiteManagementViewProps = {
  record?: ModuleRecord;
};

export interface ProductPageSiteItem {
  siteId: string;
  domain?: string;
  publicationState?: "NOT_STARTED" | "GENERATED" | "PUBLISHED";
  lastPublishedAt?: string;
  configuration?: any;
}

export interface ReplicationResultItem {
  siteId: string;
  generated?: any;
  published?: any;
  error?: string;
}

export interface ReplicationResponse {
  replicatedAt: string;
  count: number;
  results: ReplicationResultItem[];
}

export function MasterSiteManagementView({ record }: MasterSiteManagementViewProps) {
  // 1. Estado del Master (ganomaster.pro)
  const [masterState, setMasterState] = useState<{
    siteId: string;
    domain: string;
    publicationState: "NOT_STARTED" | "GENERATED" | "PUBLISHED";
    lastPublishedAt: string | null;
  }>({
    siteId: "ganomaster",
    domain: "ganomaster.pro",
    publicationState: "PUBLISHED",
    lastPublishedAt: null
  });

  const [isPublishingMaster, setIsPublishingMaster] = useState(false);
  const [masterSuccessMessage, setMasterSuccessMessage] = useState<string | null>(null);
  const [masterErrorMessage, setMasterErrorMessage] = useState<string | null>(null);

  // 2. Revisión y Aprobación
  const [isApproved, setIsApproved] = useState(false);

  // 3. Replicación de Sitios Receptores
  const [sites, setSites] = useState<ProductPageSiteItem[]>([]);
  const [isLoadingSites, setIsLoadingSites] = useState(true);
  const [selectedSiteIds, setSelectedSiteIds] = useState<string[]>([]);
  const [confirmingReplication, setConfirmingReplication] = useState(false);
  const [isReplicating, setIsReplicating] = useState(false);
  const [replicationOutput, setReplicationOutput] = useState<ReplicationResponse | null>(null);
  const [replicationErrorMessage, setReplicationErrorMessage] = useState<string | null>(null);

  // Carga de la lista de sitios desde GET /api/internal/product-pages y GET /api/internal/activation-leads
  const fetchSitesAndLeads = async () => {
    setIsLoadingSites(true);
    setReplicationErrorMessage(null);

    try {
      // 1. Obtener sitios configurados
      const pagesRes = await fetch("/api/internal/product-pages");
      let pageSites: { siteId: string; configuration: any }[] = [];
      if (pagesRes.ok) {
        const data = await pagesRes.json();
        pageSites = data.sites || [];
      }

      // 2. Obtener leads para complementar publicación y dominios
      const leadsRes = await fetch("/api/internal/activation-leads");
      let leads: any[] = [];
      if (leadsRes.ok) {
        const data = await leadsRes.json();
        leads = data.leads || [];
      }

      // 3. Mapear y filtrar excluyendo ganomaster / ganomaster.pro
      const filtered: ProductPageSiteItem[] = pageSites
        .filter((item) => {
          const sId = item.siteId?.toLowerCase();
          const dom = item.configuration?.site?.domain || item.configuration?.domain;
          return sId !== "ganomaster" && dom !== "ganomaster.pro";
        })
        .map((item) => {
          const lead = leads.find((l) => l.siteId === item.siteId);
          const domain = item.configuration?.site?.domain || item.configuration?.domain || lead?.onboardingData?.domain;
          const publicationState = lead?.publicationState || "PUBLISHED";
          const lastPublishedAt = lead?.updatedAt || item.configuration?.updatedAt || lead?.createdAt;

          return {
            siteId: item.siteId,
            domain,
            publicationState,
            lastPublishedAt,
            configuration: item.configuration
          };
        });

      setSites(filtered);
      // Seleccionar por defecto todos los sitios filtrados
      setSelectedSiteIds(filtered.map((s) => s.siteId));

      // Buscar si existe metadata guardada del master para obtener última fecha
      const masterConfigRes = await fetch("/api/internal/product-pages/ganomaster");
      if (masterConfigRes.ok) {
        const masterData = await masterConfigRes.json();
        if (masterData?.configuration) {
          setMasterState((prev) => ({
            ...prev,
            lastPublishedAt: masterData.configuration.updatedAt || masterData.configuration.generatedAt || prev.lastPublishedAt
          }));
        }
      }
    } catch (err) {
      setReplicationErrorMessage((err as Error).message || "No se pudo cargar el listado de sitios.");
    } finally {
      setIsLoadingSites(false);
    }
  };

  useEffect(() => {
    fetchSitesAndLeads();
  }, []);

  // 1. Ejecutar actualización de vista previa del master via POST /api/internal/product-pages/master/preview
  const handleUpdateMasterPreview = async () => {
    setIsPublishingMaster(true);
    setMasterSuccessMessage(null);
    setMasterErrorMessage(null);

    try {
      const res = await fetch("/api/internal/product-pages/master/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "No se pudo actualizar la vista previa del master.");
      }

      const publishedTime = new Date().toISOString();
      setMasterState((prev) => ({
        ...prev,
        publicationState: "PUBLISHED",
        lastPublishedAt: publishedTime
      }));

      setMasterSuccessMessage("Vista previa publicada. Revisa ganomaster.pro antes de replicar.");
    } catch (err) {
      setMasterErrorMessage((err as Error).message || "Error al actualizar la vista previa del master.");
    } finally {
      setIsPublishingMaster(false);
    }
  };

  // 2. Control de selección de sitios
  const handleToggleSelectAll = () => {
    if (selectedSiteIds.length === sites.length) {
      setSelectedSiteIds([]);
    } else {
      setSelectedSiteIds(sites.map((s) => s.siteId));
    }
  };

  const handleToggleSite = (siteId: string) => {
    setSelectedSiteIds((prev) =>
      prev.includes(siteId) ? prev.filter((id) => id !== siteId) : [...prev, siteId]
    );
  };

  // 3. Ejecutar replicación de cambios aprobados via POST /api/internal/product-pages/replicate
  const handleExecuteReplication = async () => {
    if (!isApproved || selectedSiteIds.length === 0) return;

    setIsReplicating(true);
    setReplicationErrorMessage(null);
    setReplicationOutput(null);

    try {
      const res = await fetch("/api/internal/product-pages/replicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmation: "REPLICATE_TEMPLATE",
          siteIds: selectedSiteIds
        })
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Error al replicar los cambios de la plantilla.");
      }

      setReplicationOutput(json);
      setConfirmingReplication(false);
      // Recargar lista para actualizar fechas y estados
      fetchSitesAndLeads();
    } catch (err) {
      setReplicationErrorMessage((err as Error).message || "Ocurrió un error durante la replicación.");
    } finally {
      setIsReplicating(false);
    }
  };

  const getPublicationBadge = (pubState?: "NOT_STARTED" | "GENERATED" | "PUBLISHED") => {
    switch (pubState) {
      case "PUBLISHED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            PUBLISHED
          </span>
        );
      case "GENERATED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-cyan-100 dark:bg-cyan-950/60 px-2.5 py-0.5 text-xs font-bold text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800">
            <RefreshCw className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
            GENERATED
          </span>
        );
      case "NOT_STARTED":
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950/60 px-2.5 py-0.5 text-xs font-bold text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            NOT_STARTED
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 animate-fade-in text-slate-900 dark:text-slate-100">
      {/* HEADER DEL MÓDULO */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-cyan-100 dark:bg-cyan-950 px-3 py-1 text-xs font-bold uppercase tracking-wider text-cyan-900 dark:text-cyan-300">
              {record?.group || "Operaciones"}
            </span>
            <span className="rounded-full border border-slate-200 dark:border-slate-800 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Plantilla Maestra
            </span>
          </div>

          <a
            href="https://ganomaster.pro"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 px-4 py-2 text-xs font-bold text-white shadow transition"
          >
            <Globe className="h-4 w-4" />
            <span>Abrir ganomaster.pro</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          Gestión de Plantilla Maestra (Master Site)
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
          Administra la plantilla oficial <strong>ganomaster.pro</strong> como entorno de vista previa previa a la aprobación y replicación masiva en los sitios de empresarios.
        </p>
      </section>

      {/* SECCIÓN 1 Y 2: ESTADO DEL MASTER Y ACTUALIZAR VISTA PREVIA */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <Globe className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Estado Oficial de la Plantilla Maestra
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Visualización de estado y publicación de vista previa en ganomaster.pro
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleUpdateMasterPreview}
            disabled={isPublishingMaster}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-cyan-600 dark:hover:bg-cyan-500 px-5 py-2.5 text-xs font-bold text-white shadow transition disabled:opacity-50"
          >
            {isPublishingMaster ? (
              <RefreshCw className="h-4 w-4 animate-spin text-cyan-400" />
            ) : (
              <RefreshCw className="h-4 w-4 text-cyan-400" />
            )}
            <span>{isPublishingMaster ? "Actualizando Vista Previa..." : "Actualizar vista previa del master"}</span>
          </button>
        </div>

        {/* Notificaciones del Master */}
        {masterSuccessMessage && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{masterSuccessMessage}</span>
            </div>
            <button onClick={() => setMasterSuccessMessage(null)} className="text-emerald-800 dark:text-emerald-300">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {masterErrorMessage && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm font-semibold text-rose-900 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{masterErrorMessage}</span>
            </div>
            <button onClick={() => setMasterErrorMessage(null)} className="text-rose-800 dark:text-rose-300">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Tarjetas de Propiedades del Master */}
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 text-xs">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950 space-y-1">
            <span className="text-slate-400 font-bold text-[10px] uppercase block">Dominio Oficial</span>
            <a
              href="https://ganomaster.pro"
              target="_blank"
              rel="noopener noreferrer"
              className="font-extrabold font-mono text-cyan-600 dark:text-cyan-400 text-sm hover:underline inline-flex items-center gap-1"
            >
              {masterState.domain}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950 space-y-1">
            <span className="text-slate-400 font-bold text-[10px] uppercase block">Identificador siteId</span>
            <span className="font-extrabold font-mono text-slate-900 dark:text-white text-sm">
              {masterState.siteId}
            </span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950 space-y-1">
            <span className="text-slate-400 font-bold text-[10px] uppercase block">Estado de Publicación</span>
            <div>{getPublicationBadge(masterState.publicationState)}</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950 space-y-1">
            <span className="text-slate-400 font-bold text-[10px] uppercase block">Última Publicación</span>
            <span className="font-bold text-slate-700 dark:text-slate-300 text-xs">
              {masterState.lastPublishedAt
                ? new Date(masterState.lastPublishedAt).toLocaleString("es-CO")
                : "Recientemente actualizada"}
            </span>
          </div>
        </div>
      </section>

      {/* SECCIÓN 3: REVISIÓN Y APROBACIÓN */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <ShieldCheck className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Revisión del Equipo y Control de Seguridad
          </h2>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-950 space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isApproved}
              onChange={(e) => setIsApproved(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
            />
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-900 dark:text-white select-none">
                He revisado y aprobado la versión actual de ganomaster.pro
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Al marcar esta casilla confirmas que la plantilla en <code className="font-mono">ganomaster.pro</code> es visual y operativamente correcta para ser replicada masivamente.
              </p>
            </div>
          </label>

          {!isApproved && (
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-xs font-semibold pt-1">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>La opción de replicación masiva permanecerá deshabilitada hasta que apruebes la plantilla.</span>
            </div>
          )}
        </div>
      </section>

      {/* SECCIÓN 4: REPLICACIÓN */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <Layers className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Replicar Cambios Aprobados a Sitios Empresarios
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Selecciona los sitios destino. El sitio maestro ganomaster.pro está excluido automáticamente.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleToggleSelectAll}
              disabled={sites.length === 0}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition disabled:opacity-50"
            >
              {selectedSiteIds.length === sites.length && sites.length > 0 ? (
                <CheckSquare className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
              ) : (
                <Square className="h-4 w-4 text-slate-400" />
              )}
              <span>Todos los sitios ({sites.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setConfirmingReplication(true)}
              disabled={!isApproved || selectedSiteIds.length === 0 || isReplicating}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 px-5 py-2 text-xs font-bold text-white shadow transition disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
              <span>Replicar cambios aprobados ({selectedSiteIds.length})</span>
            </button>
          </div>
        </div>

        {/* DIÁLOGO DE CONFIRMACIÓN */}
        {confirmingReplication && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-700/60 dark:bg-amber-950/40 space-y-3 animate-in fade-in">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  Confirmación de Replicación Masiva Aprobada
                </h4>
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  Estás a punto de replicar los cambios aprobados de <strong>ganomaster.pro</strong> en{" "}
                  <strong>{selectedSiteIds.length} sitio(s) de empresarios</strong>:
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-200 dark:border-amber-800">
                  {selectedSiteIds.map((id) => (
                    <span
                      key={id}
                      className="font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200 rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5"
                    >
                      {id}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleExecuteReplication}
                disabled={isReplicating}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-500 px-4 py-2 text-xs font-bold text-white shadow transition disabled:opacity-50"
              >
                {isReplicating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                <span>{isReplicating ? "Replicando..." : "Sí, Confirmar Replicación"}</span>
              </button>

              <button
                type="button"
                onClick={() => setConfirmingReplication(false)}
                disabled={isReplicating}
                className="rounded-xl border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* ALERTA DE ERROR EN REPLICACIÓN */}
        {replicationErrorMessage && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm font-semibold text-rose-900 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{replicationErrorMessage}</span>
            </div>
            <button onClick={() => setReplicationErrorMessage(null)} className="text-rose-800 dark:text-rose-300">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* TABLA DE SITIOS DISPONIBLES */}
        {isLoadingSites ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400 space-y-3">
            <RefreshCw className="h-8 w-8 animate-spin text-cyan-500" />
            <p className="text-sm font-medium">Cargando sitios receptores disponibles...</p>
          </div>
        ) : sites.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FileCode2 className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              No hay sitios de empresarios disponibles
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Aún no existen configuraciones de páginas de producto guardadas para replicar.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                <tr>
                  <th className="py-3 px-4 w-10">Selección</th>
                  <th className="py-3 px-4">Site ID</th>
                  <th className="py-3 px-4">Dominio</th>
                  <th className="py-3 px-4">Estado de Publicación</th>
                  <th className="py-3 px-4">Fecha de Última Publicación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {sites.map((site) => {
                  const isChecked = selectedSiteIds.includes(site.siteId);

                  return (
                    <tr
                      key={site.siteId}
                      onClick={() => handleToggleSite(site.siteId)}
                      className={`cursor-pointer transition ${
                        isChecked
                          ? "bg-cyan-50/40 dark:bg-cyan-950/20 hover:bg-cyan-50/70"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSite(site.siteId)}
                          className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                        />
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        {site.siteId}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-xs">
                        {site.domain ? (
                          <a
                            href={`https://${site.domain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-600 dark:text-cyan-400 font-bold hover:underline inline-flex items-center gap-1"
                          >
                            <Globe className="h-3.5 w-3.5" />
                            {site.domain}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-slate-400 italic">Sin dominio</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {getPublicationBadge(site.publicationState)}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 text-[11px]">
                        {site.lastPublishedAt
                          ? new Date(site.lastPublishedAt).toLocaleString("es-CO")
                          : "No disponible"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* RESULTADO INDIVIDUAL DE REPLICACIÓN */}
      {replicationOutput && (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              Resultado Individual de Replicación ({replicationOutput.count} sitios)
            </h3>
            <span className="text-xs font-mono text-slate-400">
              {new Date(replicationOutput.replicatedAt).toLocaleString("es-CO")}
            </span>
          </div>

          <div className="space-y-3">
            {replicationOutput.results.map((resItem) => (
              <div
                key={resItem.siteId}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950 flex flex-wrap items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                      {resItem.siteId}
                    </span>
                    {resItem.error ? (
                      <span className="rounded bg-rose-100 dark:bg-rose-950/60 px-2 py-0.5 text-[11px] font-bold text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                        Error en Replicación
                      </span>
                    ) : (
                      <span className="rounded bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                        Replicado Exitosamente
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                    Plantilla de origen: <code className="font-mono font-bold">ganomaster.pro</code>
                  </p>
                </div>

                {resItem.error ? (
                  <div className="text-rose-600 dark:text-rose-400 text-xs font-semibold">
                    {resItem.error}
                  </div>
                ) : (
                  <div className="flex items-center gap-4 text-slate-600 dark:text-slate-400 text-[11px]">
                    <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                      <Check className="h-3.5 w-3.5" /> HTML Generado
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-cyan-600 dark:text-cyan-400">
                      <Check className="h-3.5 w-3.5" /> Sitio Publicado
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
