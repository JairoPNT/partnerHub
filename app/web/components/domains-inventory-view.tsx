"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Globe,
  RefreshCw,
  Search,
  AlertCircle,
  ShieldAlert,
  ExternalLink,
  Server,
  Tag
} from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { ModuleRecord } from "@/modules/catalog";

export type DomainInventoryItem = {
  id: string;
  kind: "MASTER" | "PARTNER_LEGACY" | "PARTNER_TARGET";
  hostname: string;
  siteId: string;
  ecosystemType: string;
  partner: { id: string; fullName: string; brandName: string } | null;
  assignmentState: "ASSIGNED";
  provisioningState: string;
  hostingState: string;
  dnsState: string;
  sslState: string;
  publicationState: string;
  verificationState: string;
  verifiedAt?: string;
  lastErrorCode?: string;
  updatedAt?: string;
};

type StateBadgeProps = {
  label: string;
  value: string;
};

function StateBadge({ label, value }: StateBadgeProps) {
  const normalized = (value || "UNKNOWN").toUpperCase();

  let colorClasses = "bg-slate-100 text-slate-700 border-slate-200";

  if (["READY", "RESOLVED", "VERIFIED", "PUBLISHED", "CREATED", "SUCCESS"].includes(normalized)) {
    colorClasses = "bg-emerald-50 text-emerald-700 border-emerald-200";
  } else if (["PENDING", "DNS_PENDING", "SSL_PENDING", "HOSTING_CREATED"].includes(normalized)) {
    colorClasses = "bg-amber-50 text-amber-700 border-amber-200";
  } else if (["FAILED", "VERIFY_FAILED", "ERROR"].includes(normalized)) {
    colorClasses = "bg-rose-50 text-rose-700 border-rose-200";
  } else if (["MANAGED_EXTERNALLY"].includes(normalized)) {
    colorClasses = "bg-sky-50 text-sky-700 border-sky-200";
  } else if (["LEGACY_NOT_TRACKED", "NOT_TRACKED", "NOT_CHECKED", "NOT_STARTED", "UNKNOWN"].includes(normalized)) {
    colorClasses = "bg-slate-50 text-slate-500 border-slate-200";
  }

  return (
    <div className="flex flex-col gap-0.5 min-w-[70px]">
      {label && <span className="text-[10px] font-medium tracking-wider text-slate-400 uppercase">{label}</span>}
      <span className={`inline-flex items-center justify-center px-1.5 py-0.5 text-[11px] font-mono font-medium rounded border ${colorClasses}`}>
        {value || "UNKNOWN"}
      </span>
    </div>
  );
}

function EcosystemBadge({ type }: { type: string }) {
  const normalized = (type || "").toUpperCase();
  if (normalized === "PRODUCT") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100/70 text-emerald-800 border border-emerald-200/80">
        Producto
      </span>
    );
  }
  if (normalized === "BUSINESS") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100/70 text-blue-800 border border-blue-200/80">
        Negocio VSL
      </span>
    );
  }
  if (normalized === "PERSONAL_BRAND") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-100/70 text-purple-800 border border-purple-200/80">
        Marca Personal
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
      {type}
    </span>
  );
}

function KindBadge({ kind }: { kind: DomainInventoryItem["kind"] }) {
  if (kind === "MASTER") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
        <Server className="w-3 h-3" />
        Master
      </span>
    );
  }
  if (kind === "PARTNER_TARGET") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-cyan-50 text-cyan-700 border border-cyan-200">
        <Tag className="w-3 h-3" />
        Target Subdominio
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
      <Globe className="w-3 h-3" />
      Partner Raíz (Legacy)
    </span>
  );
}

export function DomainsInventoryView({ record }: { record?: ModuleRecord }) {
  const [domains, setDomains] = useState<DomainInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedKind, setSelectedKind] = useState<string>("ALL");
  const [selectedEcosystem, setSelectedEcosystem] = useState<string>("ALL");

  const loadDomains = async () => {
    setLoading(true);
    setErrorStatus(null);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/internal/domains", {
        headers: { Accept: "application/json" }
      });

      if (response.status === 401) {
        setErrorStatus(401);
        setErrorMessage("Sesión no autorizada o expirada en Cloudflare Access. Por favor inicia sesión como administrador.");
        setDomains([]);
        return;
      }

      if (!response.ok) {
        setErrorStatus(response.status);
        setErrorMessage("No se pudo cargar el inventario de dominios.");
        setDomains([]);
        return;
      }

      const data = await response.json();
      setDomains(Array.isArray(data.domains) ? data.domains : []);
    } catch {
      setErrorStatus(500);
      setErrorMessage("Error de conexión al obtener el inventario de dominios.");
      setDomains([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDomains();
  }, []);

  const masterDomains = useMemo(() => {
    return domains.filter((d) => d.kind === "MASTER");
  }, [domains]);

  const partnerDomains = useMemo(() => {
    return domains.filter((d) => d.kind !== "MASTER");
  }, [domains]);

  const filteredPartnerDomains = useMemo(() => {
    return partnerDomains.filter((item) => {
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        item.hostname.toLowerCase().includes(query) ||
        item.siteId.toLowerCase().includes(query) ||
        (item.partner?.fullName && item.partner.fullName.toLowerCase().includes(query)) ||
        (item.partner?.brandName && item.partner.brandName.toLowerCase().includes(query));

      const matchesKind =
        selectedKind === "ALL" ||
        item.kind === selectedKind;

      const matchesEcosystem =
        selectedEcosystem === "ALL" ||
        item.ecosystemType.toUpperCase() === selectedEcosystem;

      return matchesSearch && matchesKind && matchesEcosystem;
    });
  }, [partnerDomains, searchQuery, selectedKind, selectedEcosystem]);

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Inventario de Dominios
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              Solo Lectura
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {record?.description || "Control, estado técnico y asignaciones de dominios maestros y de empresarios."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadDomains}
            disabled={loading}
            className="flex items-center gap-1.5 text-slate-700 bg-white hover:bg-slate-50 border-slate-200 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Cloudflare Access 401 Alert */}
      {errorStatus === 401 && (
        <Alert variant="error" className="border-rose-200 bg-rose-50/70 text-rose-900">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
          <div>
            <h3 className="font-semibold text-sm">Acceso No Autorizado (401)</h3>
            <p className="text-xs text-rose-700 mt-0.5">{errorMessage}</p>
          </div>
        </Alert>
      )}

      {/* Generic Error Alert */}
      {errorStatus && errorStatus !== 401 && (
        <Alert variant="error" className="border-rose-200 bg-rose-50/70 text-rose-900">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <div>
            <h3 className="font-semibold text-sm">Error de Carga</h3>
            <p className="text-xs text-rose-700 mt-0.5">{errorMessage}</p>
          </div>
        </Alert>
      )}

      {/* Master Domains Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-2">
            <Server className="w-4 h-4 text-indigo-600" />
            Dominios Maestros de la Plataforma
          </h2>
          <span className="text-xs text-slate-500 font-mono">
            {masterDomains.length} dominios
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {loading && masterDomains.length === 0 ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <Card key={idx} className="p-4 bg-slate-50/50 border-slate-200 animate-pulse h-36">
                <div className="h-full w-full" />
              </Card>
            ))
          ) : (
            masterDomains.map((master) => (
              <Card key={master.id} className="border-slate-200/90 shadow-sm bg-white hover:border-slate-300 transition-colors">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 overflow-hidden">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <KindBadge kind={master.kind} />
                        <EcosystemBadge type={master.ecosystemType} />
                      </div>
                      <a
                        href={`https://${master.hostname}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-base font-bold text-slate-900 hover:text-indigo-600 inline-flex items-center gap-1.5 truncate group"
                      >
                        <span className="truncate">{master.hostname}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 shrink-0" />
                      </a>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-2 space-y-3">
                  <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-slate-100">
                    <StateBadge label="Prov" value={master.provisioningState} />
                    <StateBadge label="Host" value={master.hostingState} />
                    <StateBadge label="DNS" value={master.dnsState} />
                    <StateBadge label="SSL" value={master.sslState} />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span className="font-mono text-slate-400">siteId: {master.siteId}</span>
                    <StateBadge label="Verif" value={master.verificationState} />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>

      {/* Partner Domains Inventory Section */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-2">
              <Globe className="w-4 h-4 text-cyan-600" />
              Inventario de Dominios por Partner
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Dominios raíz (Legacy) y subdominios aprovisionados por cada empresario.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Total registrados: <strong>{partnerDomains.length}</strong></span>
            <span>•</span>
            <span>Mostrando: <strong>{filteredPartnerDomains.length}</strong></span>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-slate-50/80 p-3 rounded-xl border border-slate-200">
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Buscar por dominio, partner o siteId..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm bg-white border-slate-200 focus:border-cyan-500"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={selectedKind}
              onChange={(e) => setSelectedKind(e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="ALL">Todos los tipos (Legacy y Target)</option>
              <option value="PARTNER_TARGET">Solo Subdominios (Target)</option>
              <option value="PARTNER_LEGACY">Solo Dominios Raíz (Legacy)</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={selectedEcosystem}
              onChange={(e) => setSelectedEcosystem(e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="ALL">Todos los Ecosistemas</option>
              <option value="PRODUCT">Producto</option>
              <option value="BUSINESS">Negocio VSL</option>
              <option value="PERSONAL_BRAND">Marca Personal</option>
            </select>
          </div>
        </div>

        {/* Domains Table / List */}
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
          {loading && partnerDomains.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-sm space-y-3">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-slate-400" />
              <p>Cargando inventario de dominios...</p>
            </div>
          ) : filteredPartnerDomains.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-sm space-y-2">
              <Globe className="w-8 h-8 mx-auto text-slate-300" />
              <p className="font-medium text-slate-700">No se encontraron dominios coincidentes</p>
              <p className="text-xs text-slate-400">
                {partnerDomains.length === 0
                  ? "Aún no hay dominios de partners registrados en el sistema."
                  : "Prueba ajustando los filtros de búsqueda."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                    <th className="py-3 px-4">Dominio / Hostname</th>
                    <th className="py-3 px-4">Partner</th>
                    <th className="py-3 px-4">Ecosistema / Tipo</th>
                    <th className="py-3 px-4 text-center">Asignación</th>
                    <th className="py-3 px-4 text-center">Aprovisionamiento</th>
                    <th className="py-3 px-4 text-center">Hosting</th>
                    <th className="py-3 px-4 text-center">DNS</th>
                    <th className="py-3 px-4 text-center">SSL</th>
                    <th className="py-3 px-4 text-center">Publicación</th>
                    <th className="py-3 px-4 text-center">Verificación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-normal">
                  {filteredPartnerDomains.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Hostname & siteId */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <a
                            href={`https://${item.hostname}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-slate-900 hover:text-cyan-600 inline-flex items-center gap-1 group font-mono text-[13px]"
                          >
                            <span>{item.hostname}</span>
                            <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-cyan-600 shrink-0" />
                          </a>
                          <div className="text-[11px] font-mono text-slate-400">
                            siteId: {item.siteId}
                          </div>
                          {item.lastErrorCode && (
                            <div className="text-[10px] font-mono text-rose-600 flex items-center gap-1 mt-0.5">
                              <AlertCircle className="w-3 h-3 shrink-0" />
                              Error: {item.lastErrorCode}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Partner */}
                      <td className="py-3 px-4">
                        {item.partner ? (
                          <div className="space-y-0.5">
                            <div className="font-medium text-slate-900">{item.partner.fullName}</div>
                            {item.partner.brandName && (
                              <div className="text-[11px] text-slate-500">{item.partner.brandName}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Sin partner vinculado</span>
                        )}
                      </td>

                      {/* Ecosystem & Kind */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <EcosystemBadge type={item.ecosystemType} />
                          <KindBadge kind={item.kind} />
                        </div>
                      </td>

                      {/* 7 Independent Technical States */}
                      <td className="py-3 px-3 text-center">
                        <StateBadge label="" value={item.assignmentState} />
                      </td>
                      <td className="py-3 px-3 text-center">
                        <StateBadge label="" value={item.provisioningState} />
                      </td>
                      <td className="py-3 px-3 text-center">
                        <StateBadge label="" value={item.hostingState} />
                      </td>
                      <td className="py-3 px-3 text-center">
                        <StateBadge label="" value={item.dnsState} />
                      </td>
                      <td className="py-3 px-3 text-center">
                        <StateBadge label="" value={item.sslState} />
                      </td>
                      <td className="py-3 px-3 text-center">
                        <StateBadge label="" value={item.publicationState} />
                      </td>
                      <td className="py-3 px-3 text-center">
                        <StateBadge label="" value={item.verificationState} />
                        {item.verifiedAt && (
                          <div className="text-[9px] font-mono text-slate-400 mt-0.5">
                            {new Date(item.verifiedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
