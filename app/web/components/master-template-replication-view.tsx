"use client";

import React, { useState, useEffect } from "react";
import {
  Layers,
  Copy,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Globe,
  CheckSquare,
  Square,
  AlertTriangle,
  Play,
  FileCode2,
  Check,
  X
} from "lucide-react";

export interface ProductPageSite {
  siteId: string;
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

export function MasterTemplateReplicationView() {
  const [sites, setSites] = useState<ProductPageSite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Selected siteIds for replication
  const [selectedSiteIds, setSelectedSiteIds] = useState<string[]>([]);
  const [confirmingReplication, setConfirmingReplication] = useState(false);
  const [isReplicating, setIsReplicating] = useState(false);
  const [replicationOutput, setReplicationOutput] = useState<ReplicationResponse | null>(null);

  const fetchSites = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/internal/product-pages");
      if (!res.ok) {
        throw new Error("No se pudo cargar la lista de páginas de producto.");
      }
      const data = await res.json();
      const siteList: ProductPageSite[] = data.sites || [];
      setSites(siteList);
      // Default: select all loaded sites
      setSelectedSiteIds(siteList.map((s) => s.siteId));
    } catch (err) {
      setErrorMessage((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSites();
  }, []);

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

  const handleExecuteReplication = async () => {
    if (selectedSiteIds.length === 0) return;

    setIsReplicating(true);
    setErrorMessage(null);
    setSuccessMessage(null);
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
        throw new Error(json.error || "Error al realizar la replicación de la plantilla.");
      }

      setReplicationOutput(json);
      setSuccessMessage(
        `Replicación completada exitosamente. Se procesaron ${json.count} sitio(s) con la plantilla ganomaster.pro.`
      );
      setConfirmingReplication(false);
    } catch (err) {
      setErrorMessage((err as Error).message);
    } finally {
      setIsReplicating(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in text-slate-900 dark:text-slate-100">
      {/* SECTION HEADER & MASTER TEMPLATE PREVIEW */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-cyan-100 dark:bg-cyan-950 px-3 py-1 text-xs font-bold uppercase tracking-wider text-cyan-900 dark:text-cyan-300">
                Plantilla Maestra
              </span>
              <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                ganomaster.pro
              </span>
            </div>
            <h2 className="text-2xl font-bold font-heading text-slate-900 dark:text-white">
              Replicación de Plantilla Maestra
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-2xl">
              Genera y publica automáticamente actualizaciones masivas en las páginas de producto de los empresarios a partir de la estructura oficial de ganomaster.pro.
            </p>
          </div>

          <a
            href="https://ganomaster.pro"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            <Globe className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            <span>Ver Vista Previa (ganomaster.pro)</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        {/* Master Template Spec Cards */}
        <div className="grid gap-4 sm:grid-cols-3 text-xs">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950 space-y-1">
            <span className="text-slate-400 font-bold text-[10px] uppercase block">Origen Oficial</span>
            <span className="font-extrabold text-slate-900 dark:text-white text-sm">ganomaster.pro</span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Layout VSL + pasarela de pago directa</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950 space-y-1">
            <span className="text-slate-400 font-bold text-[10px] uppercase block">Generación HTML</span>
            <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">Motor Automático</span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Genera bundle HTML/CSS estático</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950 space-y-1">
            <span className="text-slate-400 font-bold text-[10px] uppercase block">Publicación</span>
            <span className="font-extrabold text-cyan-600 dark:text-cyan-400 text-sm">Publicación Inmediata</span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Publica en repositorio de destino</p>
          </div>
        </div>
      </section>

      {/* Notifications */}
      {successMessage && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-500" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-800 dark:text-emerald-300 hover:opacity-80">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm font-semibold text-rose-900 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-500" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={fetchSites} className="inline-flex items-center gap-1 text-xs font-bold underline">
            <RefreshCw className="h-3.5 w-3.5" /> Reintentar
          </button>
        </div>
      )}

      {/* SELECTION AND REPLICATION CONTROLS */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <Layers className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Selección de Alcance para Replicación
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Selecciona individualmente los sitios o activa "Todos los sitios" ({sites.length} disponibles).
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Toggle All Checkbox Button */}
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
              disabled={selectedSiteIds.length === 0 || isReplicating}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 px-5 py-2 text-xs font-bold text-white shadow transition disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
              <span>Replicar Plantilla ({selectedSiteIds.length})</span>
            </button>
          </div>
        </div>

        {/* CONFIRMATION DIALOG / BANNER */}
        {confirmingReplication && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-700/60 dark:bg-amber-950/40 space-y-3 animate-in fade-in">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  Confirmación de Replicación Masiva
                </h4>
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  Estás a punto de replicar la plantilla maestra <strong>ganomaster.pro</strong> en{" "}
                  <strong>{selectedSiteIds.length} sitio(s) seleccionado(s)</strong>:
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

        {/* TABLE OF PRODUCT PAGE SITES */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400 space-y-3">
            <RefreshCw className="h-8 w-8 animate-spin text-cyan-500" />
            <p className="text-sm font-medium">Cargando páginas de producto para replicación...</p>
          </div>
        ) : sites.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FileCode2 className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              No hay sitios de producto guardados
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Aún no existen configuraciones de páginas de producto guardadas en el directorio de fuentes del servidor.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                <tr>
                  <th className="py-3 px-4 w-10">Selección</th>
                  <th className="py-3 px-4">Identificador del Sitio (siteId)</th>
                  <th className="py-3 px-4">Plantilla / Título</th>
                  <th className="py-3 px-4">Estado de Selección</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {sites.map((site) => {
                  const isChecked = selectedSiteIds.includes(site.siteId);
                  const title = site.configuration?.brandName || site.configuration?.title || site.siteId;

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

                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                        {title}
                      </td>

                      <td className="py-3.5 px-4">
                        {isChecked ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-cyan-700 dark:text-cyan-300">
                            <CheckCircle2 className="h-3.5 w-3.5 text-cyan-500" />
                            Incluido en Replicación
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Excluido</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* INDIVIDUAL REPLICATION OUTPUT RESULTS */}
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
                    <span className="rounded bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      Replicado Exitosamente
                    </span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                    Basado en la plantilla maestra <code className="font-mono font-bold">ganomaster.pro</code>
                  </p>
                </div>

                <div className="flex items-center gap-4 text-slate-600 dark:text-slate-400 text-[11px]">
                  <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                    <Check className="h-3.5 w-3.5" /> HTML Generado
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-cyan-600 dark:text-cyan-400">
                    <Check className="h-3.5 w-3.5" /> Sitio Publicado
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
