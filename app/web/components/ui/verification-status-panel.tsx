"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";

export type ProductPageVerificationCheck = {
  name: string;
  status: "PASS" | "FAIL";
  expected?: unknown;
  actual?: unknown;
  message?: string;
};

export type ProductPageVerificationResult = {
  siteId: string;
  domain: string | null;
  verifiedAt: string;
  status: "VERIFIED" | "VERIFY_FAILED";
  checks: ProductPageVerificationCheck[];
};

export interface ProductPageSiteSummary {
  siteId: string;
  configuration?: {
    brandName?: string;
    title?: string;
    domain?: string;
    site?: { domain?: string };
    [key: string]: unknown;
  } | null;
  lastVerification?: ProductPageVerificationResult | null;
}

// Mapa de nombres de checks a descripciones legibles
const CHECK_NAME_LABELS: Record<string, string> = {
  homepage_reachable: "Acceso al Dominio Principal",
  config_reachable: "Acceso a config.js",
  config_parseable: "Lectura de Configuración JS",
  site_id_matches: "Coincidencia de Site ID",
  site_domain_matches: "Coincidencia de Dominio",
  brand_name_matches: "Nombre de Marca",
  full_name_matches: "Nombre Completo del Empresario",
  whatsapp_number_matches: "Número de WhatsApp",
  purchase_url_matches: "URL de Compra / Pasarela",
  hero_desktop_matches: "Imagen Hero Desktop",
  hero_mobile_matches: "Imagen Hero Mobile",
  no_static_comprar_fallback: "Sin Enlace Estático #comprar",
  product_buy_button_present: "Botón .product-btn-buy Presente",
  config_script_present: "Script config.js en HTML",
  app_script_present: "Script app.js en HTML",
  site_domain_configured: "Dominio Configurado",
  saved_configuration_exists: "Configuración Guardada Existente"
};

export function getCheckLabel(name: string): string {
  return CHECK_NAME_LABELS[name] || name;
}

export interface VerificationBadgeProps {
  status?: "VERIFIED" | "VERIFY_FAILED" | "PUBLISHED" | "GENERATED" | "NOT_STARTED" | string | null;
  className?: string;
  size?: "sm" | "md";
}

export function VerificationBadge({ status, className = "", size = "sm" }: VerificationBadgeProps) {
  const isMd = size === "md";
  const baseClasses = `inline-flex items-center gap-1.5 rounded-full font-bold transition-all ${
    isMd ? "px-3 py-1 text-xs" : "px-2.5 py-0.5 text-[11px]"
  } ${className}`;

  switch (status) {
    case "VERIFIED":
      return (
        <span className={`${baseClasses} bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-700`}>
          <CheckCircle2 className={`${isMd ? "h-4 w-4" : "h-3.5 w-3.5"} text-emerald-600 dark:text-emerald-400`} />
          Publicado y verificado
        </span>
      );

    case "VERIFY_FAILED":
      return (
        <span className={`${baseClasses} bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-700`}>
          <AlertCircle className={`${isMd ? "h-4 w-4" : "h-3.5 w-3.5"} text-rose-600 dark:text-rose-400`} />
          Verificación fallida
        </span>
      );

    case "PUBLISHED":
    case "GENERATED":
      return (
        <span className={`${baseClasses} bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-700`}>
          <AlertTriangle className={`${isMd ? "h-4 w-4" : "h-3.5 w-3.5"} text-amber-600 dark:text-amber-400`} />
          Pendiente de verificación
        </span>
      );

    case "NOT_STARTED":
    default:
      return (
        <span className={`${baseClasses} bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700`}>
          <Clock className={`${isMd ? "h-4 w-4" : "h-3.5 w-3.5"} text-slate-500`} />
          Sin iniciar
        </span>
      );
  }
}

export interface VerifyNowButtonProps {
  siteId: string;
  onVerified?: (result: ProductPageVerificationResult) => void;
  onError?: (error: string) => void;
  size?: "sm" | "md";
  variant?: "outline" | "ghost" | "primary" | "secondary";
  className?: string;
  iconOnly?: boolean;
}

export function VerifyNowButton({
  siteId,
  onVerified,
  onError,
  size = "sm",
  variant = "outline",
  className = "",
  iconOnly = false
}: VerifyNowButtonProps) {
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!siteId) return;
    setIsVerifying(true);
    try {
      const res = await fetch("/api/internal/product-pages/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo verificar el sitio.");
      }

      if (onVerified) {
        onVerified(data as ProductPageVerificationResult);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al conectar con la verificación.";
      if (onError) onError(msg);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleVerify}
      isLoading={isVerifying}
      leftIcon={<RefreshCw className={`h-3.5 w-3.5 ${isVerifying ? "animate-spin" : ""}`} />}
      className={`font-semibold ${iconOnly ? "h-9 w-9 justify-center px-0" : ""} ${className}`}
      title="Verificar sitio"
      aria-label="Verificar sitio"
    >
      {iconOnly ? "" : isVerifying ? "Verificando..." : "Verificar ahora"}
    </Button>
  );
}

export interface FailedChecksDetailsProps {
  checks: ProductPageVerificationCheck[];
  className?: string;
  defaultExpanded?: boolean;
}

export function FailedChecksDetails({
  checks,
  className = "",
  defaultExpanded = true
}: FailedChecksDetailsProps) {
  const failedChecks = checks.filter((c) => c.status === "FAIL");
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (failedChecks.length === 0) return null;

  return (
    <div className={`rounded-xl border border-rose-200 bg-rose-50/90 dark:border-rose-900/60 dark:bg-rose-950/40 p-3.5 space-y-2.5 text-xs text-slate-900 dark:text-slate-100 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-rose-800 dark:text-rose-300">
          <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>Detalle de Verificaciones Fallidas ({failedChecks.length})</span>
        </div>
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-rose-700 dark:text-rose-400 hover:opacity-80 p-1 rounded transition"
        >
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-2 pt-1 border-t border-rose-200/80 dark:border-rose-900/40">
          {failedChecks.map((check) => (
            <div
              key={check.name}
              className="rounded-lg bg-white/90 dark:bg-slate-900/90 p-2.5 border border-rose-200 dark:border-rose-800 space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {getCheckLabel(check.name)}
                </span>
                <span className="font-mono text-[10px] text-rose-600 font-semibold bg-rose-100 dark:bg-rose-950 px-1.5 py-0.5 rounded">
                  {check.name}
                </span>
              </div>

              {check.message && (
                <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-normal">
                  {check.message}
                </p>
              )}

              {(check.expected !== undefined || check.actual !== undefined) && (
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1">
                  <div className="bg-slate-50 dark:bg-slate-800/80 p-1.5 rounded border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-400 text-[9px] uppercase font-sans font-bold block">
                      Esperado:
                    </span>
                    <span className="text-emerald-700 dark:text-emerald-400 break-all">
                      {typeof check.expected === "object"
                        ? JSON.stringify(check.expected)
                        : String(check.expected ?? "N/A")}
                    </span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/80 p-1.5 rounded border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-400 text-[9px] uppercase font-sans font-bold block">
                      Encontrado:
                    </span>
                    <span className="text-rose-700 dark:text-rose-400 break-all">
                      {typeof check.actual === "object"
                        ? JSON.stringify(check.actual)
                        : String(check.actual ?? "N/A")}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export interface DeliveryGuardAlertProps {
  status?: string | null;
  className?: string;
}

export function DeliveryGuardAlert({ status, className = "" }: DeliveryGuardAlertProps) {
  if (status !== "VERIFY_FAILED") return null;

  return (
    <div className={`rounded-xl border border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/60 p-3 text-xs text-rose-900 dark:text-rose-200 flex items-center gap-2.5 font-bold shadow-subtle ${className}`}>
      <ShieldAlert className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
      <span>Página no lista para entrega al empresario — verificación fallida</span>
    </div>
  );
}
