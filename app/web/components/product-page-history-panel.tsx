"use client";

import React, { useState, useEffect } from "react";
import {
  Clock,
  RefreshCw,
  AlertCircle,
  FileCode,
  Globe,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export interface HistoryEventCheck {
  name: string;
  status: "PASS" | "FAIL";
  expected?: unknown;
  actual?: unknown;
  message?: string;
}

export interface HistoryEvent {
  id: string;
  siteId: string;
  type: "GENERATED" | "PUBLISHED" | "VERIFIED" | "VERIFY_FAILED";
  occurredAt: string;
  domain: string | null;
  outputDirectory?: string;
  remoteRoot?: string;
  fileCount?: number;
  verificationStatus?: "VERIFIED" | "VERIFY_FAILED";
  failedChecks?: HistoryEventCheck[];
  message: string;
}

export interface ProductPageHistoryPanelProps {
  siteId: string;
  title?: string;
  compact?: boolean;
}

export function ProductPageHistoryPanel({
  siteId,
  title = "Historial Operativo",
  compact = false
}: ProductPageHistoryPanelProps) {
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>({});

  const fetchHistory = async () => {
    if (!siteId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/internal/product-pages/${siteId}/history`);
      if (!res.ok) {
        throw new Error("No se pudo cargar el historial operativo.");
      }
      const data = await res.json();
      const eventsList: HistoryEvent[] = data.events || [];
      setEvents(eventsList.slice(0, 5));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido al cargar historial.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [siteId]);

  const toggleExpand = (eventId: string) => {
    setExpandedEvents((prev) => ({
      ...prev,
      [eventId]: !prev[eventId]
    }));
  };

  const getBadgeStyle = (type: HistoryEvent["type"]) => {
    switch (type) {
      case "GENERATED":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "PUBLISHED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "VERIFIED":
        return "bg-emerald-600 text-white border-emerald-700";
      case "VERIFY_FAILED":
        return "bg-rose-100 text-rose-800 border-rose-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const getBadgeLabel = (type: HistoryEvent["type"]) => {
    switch (type) {
      case "GENERATED":
        return "GENERATED";
      case "PUBLISHED":
        return "PUBLISHED";
      case "VERIFIED":
        return "VERIFIED";
      case "VERIFY_FAILED":
        return "VERIFY_FAILED";
      default:
        return type;
    }
  };

  if (!siteId) return null;

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-4 border-b border-slate-100">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-slate-500" />
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                {title}
              </CardTitle>
              {!compact && (
                <CardDescription className="text-xs text-slate-500">
                  Bitácora de las últimas acciones de generación, publicación y verificación para {siteId}.
                </CardDescription>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchHistory}
            isLoading={isLoading}
            leftIcon={<RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />}
            className="text-xs font-bold"
          >
            Actualizar historial
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        {isLoading && events.length === 0 ? (
          <div className="space-y-3 py-4 animate-pulse">
            <div className="h-10 bg-slate-100 rounded-xl w-full" />
            <div className="h-10 bg-slate-100 rounded-xl w-full" />
            <div className="h-10 bg-slate-100 rounded-xl w-full" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-6 text-center text-xs text-rose-600 space-y-2">
            <AlertCircle className="h-8 w-8 text-rose-500" />
            <p className="font-semibold">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchHistory} className="mt-2 text-xs">
              Reintentar
            </Button>
          </div>
        ) : events.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 italic">
            Aún no hay eventos operativos para este sitio.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {events.map((event) => {
              const isExpanded = !!expandedEvents[event.id];
              const hasFailedChecks = event.failedChecks && event.failedChecks.length > 0;

              return (
                <div key={event.id} className="py-3 first:pt-0 last:pb-0 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${getBadgeStyle(event.type)}`}>
                        {getBadgeLabel(event.type)}
                      </span>
                      <span className="text-slate-400 font-mono text-[11px]">
                        {new Date(event.occurredAt).toLocaleString("es-CO")}
                      </span>
                    </div>
                    {event.domain && (
                      <span className="font-mono text-cyan-600 font-semibold flex items-center gap-1">
                        <Globe className="h-3.5 w-3.5" />
                        {event.domain}
                      </span>
                    )}
                  </div>

                  <p className="text-xs font-semibold text-slate-700 leading-normal">
                    {event.message}
                  </p>

                  {(event.fileCount !== undefined || event.remoteRoot || event.outputDirectory || hasFailedChecks) && (
                    <div className="text-[11px] space-y-1">
                      {event.fileCount !== undefined && (
                        <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                          <FileCode className="h-3.5 w-3.5 text-slate-400" />
                          <span>Archivos procesados: <strong>{event.fileCount}</strong></span>
                        </div>
                      )}

                      {event.outputDirectory && (
                        <div className="text-slate-500 truncate font-mono">
                          Directorio local: <span className="text-slate-700 bg-slate-50 px-1 rounded">{event.outputDirectory}</span>
                        </div>
                      )}

                      {event.remoteRoot && (
                        <div className="text-slate-500 truncate font-mono">
                          Ruta remota: <span className="text-slate-700 bg-slate-50 px-1 rounded">{event.remoteRoot}</span>
                        </div>
                      )}

                      {hasFailedChecks && (
                        <div className="pt-1.5">
                          <button
                            type="button"
                            onClick={() => toggleExpand(event.id)}
                            className="flex items-center gap-1 text-rose-700 hover:text-rose-800 font-bold"
                          >
                            <span>Detalle de verificaciones fallidas ({event.failedChecks?.length})</span>
                            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </button>

                          {isExpanded && (
                            <div className="mt-2 space-y-2 border-l-2 border-rose-200 pl-3">
                              {event.failedChecks?.map((check, idx) => (
                                <div key={idx} className="bg-rose-50/50 p-2 rounded-xl border border-rose-100 space-y-1">
                                  <div className="flex items-center justify-between font-bold text-slate-800">
                                    <span>{check.name}</span>
                                    <span className="text-[9px] bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded font-mono">FAIL</span>
                                  </div>
                                  {check.message && (
                                    <p className="text-slate-600 text-[10px] leading-normal">{check.message}</p>
                                  )}
                                  {(check.expected !== undefined || check.actual !== undefined) && (
                                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono pt-1">
                                      <div className="bg-white/80 p-1.5 rounded border border-slate-200">
                                        <span className="text-slate-400 text-[8px] uppercase font-sans font-bold block">Esperado:</span>
                                        <span className="text-emerald-700 break-all">
                                          {typeof check.expected === "object" ? JSON.stringify(check.expected) : String(check.expected ?? "N/A")}
                                        </span>
                                      </div>
                                      <div className="bg-white/80 p-1.5 rounded border border-slate-200">
                                        <span className="text-slate-400 text-[8px] uppercase font-sans font-bold block">Encontrado:</span>
                                        <span className="text-rose-700 break-all">
                                          {typeof check.actual === "object" ? JSON.stringify(check.actual) : String(check.actual ?? "N/A")}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
