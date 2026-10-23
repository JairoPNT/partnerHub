"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, ExternalLink, RefreshCw, ShieldCheck } from "lucide-react";
import type { MasterSitesBusinessPartner, MasterSitesBusinessReadResponse } from "@/shared/master-sites-business-contract";
import { BusinessDeliveryHttpError, fetchBusinessRead, sendBusinessCommand } from "./master-sites-business-delivery-api";
import {
  buildBusinessCommands, businessContinuationAction, businessPollingDelay, createBusinessDeliveryState,
  reduceBusinessDeliveryState, safeBusinessPreviewUrl
} from "./master-sites-business-delivery-model";
import type { BusinessAction, BusinessCommand } from "./master-sites-business-delivery-model";

const STATUS: Record<MasterSitesBusinessPartner["status"], string> = {
  BLOCKED: "Bloqueado", TARGET_REQUIRED: "Falta destino", TARGET_PENDING: "Destino pendiente",
  READY: "Listo para publicar", QUEUED: "En cola", RUNNING: "Publicando",
  CURRENT: "Publicado y verificado", FAILED: "Falló la publicación"
};
const OUTCOME: Record<string, string> = {
  TARGET_READY: "Destino listo", TARGET_PENDING: "Destino pendiente", ENQUEUED: "En cola",
  ALREADY_CURRENT: "Ya publicado y verificado", ALREADY_SCHEDULED: "Ya programado",
  BLOCKED: "Bloqueado", RETRY_REQUIRED: "Requiere revisión"
};
const REASONS: Record<string, string> = {
  MASTER_TEMPLATE_UNAVAILABLE: "La plantilla Business no está disponible.",
  BUSINESS_NOT_ENTITLED: "Negocio no está habilitado para este partner.",
  PARTNER_DOMAIN_MISSING: "Falta el dominio asignado al partner.",
  PARTNER_WHATSAPP_MISSING: "Falta el WhatsApp autorizado.",
  JOB_ACTIVE: "Ya existe una publicación activa para este sitio."
};

function reasonLabel(reason: string): string {
  return REASONS[reason] ?? reason.replaceAll("_", " ").toLocaleLowerCase("es-CO");
}

function rowEligible(partner: MasterSitesBusinessPartner, action: BusinessAction, updateConfirmed: boolean): boolean {
  return Boolean(partner.reviewRevision && (action === "prepare"
    ? partner.canPrepareTarget
    : partner.canPublish && (partner.status !== "CURRENT" || updateConfirmed)));
}

function publicUrl(host: string | null): string {
  return host ? `https://${host}` : "URL pendiente";
}

export function MasterSitesBusinessDeliveryView() {
  const [state, dispatch] = useReducer(reduceBusinessDeliveryState, undefined, createBusinessDeliveryState);
  const [submitting, setSubmitting] = useState(false);
  const [repeating, setRepeating] = useState<string | null>(null);
  const mounted = useRef(false);
  const refreshRef = useRef<(() => void) | null>(null);
  const revalidateRef = useRef<(() => void) | null>(null);
  const invalidateReadsRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    mounted.current = true;
    let sequence = 0;
    let controller: AbortController | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let lastRead: MasterSitesBusinessReadResponse | null = null;
    const load = async (manual: boolean, failures = 0) => {
      if (timer) clearTimeout(timer);
      controller?.abort();
      const current = ++sequence;
      controller = new AbortController();
      if (manual) dispatch({ type: "loading", clear: true });
      dispatch({ type: "readStarted", requestId: current });
      try {
        const data = await fetchBusinessRead(fetch, controller.signal);
        if (!mounted.current || current !== sequence) return;
        lastRead = data;
        dispatch({ type: "read", data, requestId: current });
        const delay = businessPollingDelay(data, 0);
        if (delay !== null) timer = setTimeout(() => void load(false), delay);
      } catch (error) {
        if (!mounted.current || current !== sequence || controller.signal.aborted) return;
        const http = error instanceof BusinessDeliveryHttpError ? error : null;
        dispatch({ type: "error", error: http?.message ?? "No se pudo conectar. Actualiza e inténtalo de nuevo.",
          access: http?.status === 401 ? "unauthorized" : http?.status === 403 ? "forbidden" : "unknown" });
        if (http?.status === 401 || http?.status === 403) return;
        const delay = businessPollingDelay(lastRead, failures + 1);
        if (delay !== null) timer = setTimeout(() => void load(false, failures + 1), delay);
      }
    };
    refreshRef.current = () => void load(true);
    revalidateRef.current = () => void load(false);
    invalidateReadsRef.current = () => {
      sequence++;
      controller?.abort();
      controller = null;
      if (timer) clearTimeout(timer);
      timer = null;
      lastRead = null;
    };
    void load(true);
    return () => {
      mounted.current = false;
      sequence++;
      controller?.abort();
      if (timer) clearTimeout(timer);
      refreshRef.current = null;
      revalidateRef.current = null;
      invalidateReadsRef.current = null;
    };
  }, []);

  const selected = state.selectedIds.map((id) => state.data?.partners.find((partner) => partner.activationLeadId === id)).filter((partner): partner is MasterSitesBusinessPartner => Boolean(partner));
  const canReview = (action: BusinessAction) => Boolean(state.data?.template.available && !state.loading && !state.needsRefresh && !submitting && selected.length
    && selected.every((partner) => {
      const result = state.results[partner.activationLeadId];
      return (!result || (result.status === "success" && result.command.action !== action))
        && rowEligible(partner, action, state.updateConfirmedIds.includes(partner.activationLeadId));
    }));
  const previewUrl = state.data?.template.previewUrl ? safeBusinessPreviewUrl(state.data.template.previewUrl, window.location.origin) : null;

  const execute = async () => {
    if (!state.review || !canReview(state.review.action)) return;
    const commands = buildBusinessCommands(state, state.review.action, () => crypto.randomUUID());
    if (commands.length !== state.review.ids.length) return;
    dispatch({ type: "closeReview" });
    setSubmitting(true);
    let conflict = false;
    for (const command of commands) {
      try {
        const result = await sendBusinessCommand(command);
        if (!mounted.current) return;
        dispatch({ type: "result", command, result });
      } catch (error) {
        if (!mounted.current) return;
        if (error instanceof BusinessDeliveryHttpError) {
          if (error.status === 401 || error.status === 403) {
            invalidateReadsRef.current?.();
            dispatch({ type: "error", error: error.message, access: error.status === 401 ? "unauthorized" : "forbidden" });
            conflict = true;
            break;
          }
          dispatch({ type: "failed", command, error: error.message });
          if (error.status === 409) {
            invalidateReadsRef.current?.();
            dispatch({ type: "conflict", id: command.body.activationLeadId });
            conflict = true;
            break;
          }
        } else {
          // A lost response is not cancellation: retain the exact body for an explicit idempotent retry.
          dispatch({ type: "uncertain", command });
        }
      }
    }
    if (!mounted.current) return;
    setSubmitting(false);
    if (!conflict) refreshRef.current?.();
  };

  const retryUncertain = async (id: string, command: BusinessCommand) => {
    if (submitting || repeating) return;
    setRepeating(id);
    try {
      const result = await sendBusinessCommand(command);
      if (mounted.current) {
        dispatch({ type: "result", command, result });
        refreshRef.current?.();
      }
    } catch (error) {
      if (!mounted.current) return;
      if (error instanceof BusinessDeliveryHttpError) {
        if (error.status === 409 || error.status === 401 || error.status === 403) invalidateReadsRef.current?.();
        dispatch({ type: "failed", command, error: error.message });
        if (error.status === 409) dispatch({ type: "conflict", id });
        if (error.status === 401 || error.status === 403) dispatch({ type: "error", error: error.message, access: error.status === 401 ? "unauthorized" : "forbidden" });
      } else dispatch({ type: "uncertain", command });
    } finally {
      if (mounted.current) setRepeating(null);
    }
  };

  return (
    <div className="space-y-6 text-slate-900">
      <section className="rounded-3xl border border-indigo-200 bg-white p-5 shadow-sm sm:p-7" aria-labelledby="business-template-title">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <h2 id="business-template-title" className="text-lg font-bold text-slate-950">Plantilla Business aprobada</h2>
            <p className="max-w-2xl text-sm leading-6 text-slate-600">Una plantilla para entregar Negocio a partners seleccionados. Preparar destino y generar/publicar son operaciones independientes y manuales.</p>
          </div>
          <button type="button" onClick={() => refreshRef.current?.()} disabled={state.loading || submitting}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50">
            <RefreshCw className="h-4 w-4" />Actualizar estado
          </button>
        </div>
        {state.loading && <p role="status" className="mt-5 text-sm text-slate-600">Cargando plantilla y partners de Negocio…</p>}
        {state.error && <div role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900"><AlertCircle className="mr-2 inline h-4 w-4" />{state.error}</div>}
        {state.data && <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-5 text-sm">
          <span className="rounded-full bg-indigo-100 px-3 py-1 font-semibold text-indigo-900">{state.data.template.available ? "Disponible" : "No disponible"}</span>
          <span className="break-all text-slate-600">Versión: <code className="font-semibold text-slate-900">{state.data.template.revision?.slice(0, 12) ?? "Sin revisión"}</code></span>
          {previewUrl && <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-indigo-700 underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600">Abrir vista previa<ExternalLink className="h-4 w-4" /></a>}
          {!previewUrl && <span className="text-slate-600">Vista previa no disponible</span>}
          {state.data.template.blockedReasons.map((reason) => <span key={reason} className="text-rose-800">{reasonLabel(reason)}</span>)}
        </div>}
      </section>

      {state.data && <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7" aria-labelledby="business-partners-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h2 id="business-partners-title" className="text-lg font-bold">Partners de Negocio</h2><p className="mt-1 text-sm text-slate-600">Selecciona de forma explícita hasta 10 partners. Ninguno se selecciona al abrir.</p></div>
          <span className="text-sm font-semibold text-slate-700" aria-live="polite">{selected.length} de 10 seleccionados</span>
        </div>
        {state.data.partners.length === 0 ? <p className="mt-5 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">Aún no hay partners Business para revisar.</p>
          : <div className="mt-5 divide-y divide-slate-200 border-y border-slate-200">
            {state.data.partners.map((partner) => {
              const checked = state.selectedIds.includes(partner.activationLeadId);
              const result = state.results[partner.activationLeadId];
              return <div key={partner.activationLeadId} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                <div className="min-w-0">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input type="checkbox" checked={checked} disabled={submitting || Boolean(result?.status === "uncertain") || Boolean(result?.status === "success" && (result.command.action === "publish" || !partner.canPublish))}
                      onChange={() => { dispatch({ type: "toggle", id: partner.activationLeadId }); revalidateRef.current?.(); }}
                      className="mt-1 h-5 w-5 shrink-0 rounded border-slate-400 text-indigo-600 focus:ring-indigo-600 disabled:cursor-not-allowed" />
                    <span className="min-w-0"><span className="block break-words font-semibold text-slate-950">{partner.displayName || "Partner sin nombre"}</span>
                      <span className="block break-all text-sm text-slate-600">{publicUrl(partner.publicHost)}</span></span>
                  </label>
                  {partner.status === "CURRENT" && checked && <label className="ml-8 mt-3 flex items-start gap-2 text-sm font-medium text-amber-900">
                    <input type="checkbox" checked={state.updateConfirmedIds.includes(partner.activationLeadId)} disabled={submitting}
                      onChange={(event) => dispatch({ type: "confirmUpdate", id: partner.activationLeadId, checked: event.target.checked })}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-amber-600 text-amber-700 focus:ring-amber-700" />
                    Confirmo actualizar este sitio ya publicado</label>}
                  {partner.blockedReasons.length > 0 && <ul className="ml-8 mt-2 list-disc space-y-1 text-sm text-rose-800">{partner.blockedReasons.map((reason) => <li key={reason}>{reasonLabel(reason)}</li>)}</ul>}
                  {partner.currentJob?.lastErrorCode && <p className="ml-8 mt-2 text-sm text-rose-800">Último fallo: {reasonLabel(partner.currentJob.lastErrorCode)}</p>}
                </div>
                <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${partner.status === "CURRENT" ? "bg-emerald-100 text-emerald-900" : partner.status === "BLOCKED" || partner.status === "FAILED" ? "bg-rose-100 text-rose-900" : "bg-slate-100 text-slate-800"}`}>{STATUS[partner.status]}</span>
              </div>;
            })}
          </div>}
        {state.selectionError && <p role="alert" className="mt-4 text-sm font-semibold text-rose-800">{state.selectionError}</p>}
        {state.needsRefresh && <p role="alert" className="mt-4 text-sm font-semibold text-amber-900">Los datos de revisión cambiaron. Actualiza el estado antes de una nueva confirmación.</p>}
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" disabled={!canReview("prepare")} onClick={() => dispatch({ type: "review", action: "prepare" })}
            className="min-h-11 rounded-xl border border-indigo-300 px-4 text-sm font-semibold text-indigo-900 hover:bg-indigo-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50">Preparar destino seleccionado</button>
          <button type="button" disabled={!canReview("publish")} onClick={() => dispatch({ type: "review", action: "publish" })}
            className="min-h-11 rounded-xl bg-indigo-700 px-4 text-sm font-semibold text-white hover:bg-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">Generar y publicar seleccionados</button>
        </div>
        {selected.length > 0 && !canReview("prepare") && !canReview("publish") && !state.needsRefresh && <p className="mt-3 text-sm text-slate-600">La selección incluye filas sin una acción disponible. Revisa sus bloqueos o la confirmación de actualización.</p>}
      </section>}

      {state.review && state.data && <section className="rounded-3xl border border-indigo-300 bg-indigo-50 p-5 sm:p-7" aria-labelledby="business-review-title">
        <h2 id="business-review-title" className="text-lg font-bold text-indigo-950">Confirmar {state.review.action === "prepare" ? "preparación de destino" : "generación y publicación"}</h2>
        <p className="mt-2 text-sm text-indigo-900">Plantilla Business · versión <code className="break-all font-semibold">{state.review.templateRevision}</code>. Se enviará un comando individual por partner.</p>
        <ul className="mt-4 space-y-2">{selected.map((partner) => <li key={partner.activationLeadId} className="rounded-xl bg-white p-3 text-sm"><strong className="block break-words">{partner.displayName}</strong><span className="break-all text-slate-600">{publicUrl(partner.publicHost)}</span>{partner.status === "CURRENT" && <span className="mt-1 block font-semibold text-amber-900">Actualización explícita de sitio actual</span>}</li>)}</ul>
        <div className="mt-5 flex flex-wrap gap-3"><button type="button" disabled={submitting} onClick={() => void execute()} className="min-h-11 rounded-xl bg-indigo-700 px-4 text-sm font-semibold text-white hover:bg-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-700 disabled:opacity-50">Confirmar {state.review.action === "prepare" ? "preparación" : "publicación"}</button>
          <button type="button" onClick={() => dispatch({ type: "closeReview" })} className="min-h-11 rounded-xl border border-indigo-300 px-4 text-sm font-semibold text-indigo-900 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600">Cancelar</button></div>
      </section>}
      {submitting && <p role="status" className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm font-semibold text-indigo-950"><Clock3 className="mr-2 inline h-4 w-4" />Procesando cada partner. No cierres esta vista hasta revisar los resultados.</p>}
      {Object.keys(state.results).length > 0 && <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7" aria-labelledby="business-results-title" aria-live="polite">
        <h2 id="business-results-title" className="text-lg font-bold">Resultados por partner</h2>
        <div className="mt-4 space-y-3">{Object.entries(state.results).map(([id, item]) => {
          const partner = state.data?.partners.find((row) => row.activationLeadId === id);
          return <div key={id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
            <div className="flex flex-wrap items-center gap-2 font-semibold">{item.status === "success" ? <CheckCircle2 className="h-4 w-4 text-emerald-700" /> : <AlertCircle className="h-4 w-4 text-rose-700" />}
              <span className="break-words">{partner?.displayName ?? "Partner"}</span><span>·</span><span>{item.result ? OUTCOME[item.result.outcome] : item.status === "uncertain" ? "Respuesta no recibida" : "No completado"}</span></div>
            {state.data && <p className="mt-1 break-all text-slate-600">{publicUrl(item.result?.publicHost ?? partner?.publicHost ?? null)}</p>}
            {item.error && <p className="mt-2 text-rose-800">{item.error}</p>}
            {item.result?.blockedReasons.map((reason) => <p key={reason} className="mt-1 text-rose-800">{reasonLabel(reason)}</p>)}
            {item.status === "uncertain" && <button type="button" disabled={Boolean(repeating) || submitting || state.access === "forbidden" || state.access === "unauthorized"} onClick={() => void retryUncertain(id, item.command)} className="mt-3 min-h-11 rounded-xl border border-amber-400 px-4 font-semibold text-amber-950 hover:bg-amber-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-700 disabled:opacity-50">Reintentar solo esta solicitud</button>}
            {item.status === "failed" && !state.needsRefresh && <button type="button" onClick={() => dispatch({ type: "clearResult", id })} className="mt-3 min-h-11 rounded-xl border border-slate-300 px-4 font-semibold hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600">Volver a seleccionar tras revisión</button>}
            {businessContinuationAction(state, id) && <button type="button" disabled={submitting || Boolean(repeating)} onClick={() => dispatch({ type: "continue", id })} className="mt-3 min-h-11 rounded-xl border border-indigo-300 px-4 font-semibold text-indigo-900 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 disabled:opacity-50">{item.command.action === "prepare" ? "Habilitar nueva preparación" : partner?.status === "CURRENT" ? "Habilitar actualización" : "Habilitar nueva publicación"}</button>}
          </div>;
        })}</div>
      </section>}
      {Object.keys(state.history).length > 0 && <section className="rounded-3xl border border-slate-200 bg-white p-5 text-sm sm:p-7" aria-label="Operaciones anteriores">
        <h2 className="font-semibold text-slate-900">Operaciones anteriores</h2>
        <ul className="mt-2 space-y-1 text-slate-600">{Object.entries(state.history).flatMap(([id, items]) => items.map((item, index) => <li key={`${id}-${index}`}>
          {state.data?.partners.find((row) => row.activationLeadId === id)?.displayName ?? "Partner"}: {item.result ? OUTCOME[item.result.outcome] : item.status === "failed" ? "No completado" : "Respuesta no recibida"}
        </li>))}</ul>
      </section>}
      <p className="flex items-start gap-2 text-xs leading-5 text-slate-600"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />"En cola" no significa publicado. El estado "Publicado y verificado" proviene únicamente de la revisión del servidor.</p>
    </div>
  );
}
