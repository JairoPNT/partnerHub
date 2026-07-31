"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, ImageIcon, RefreshCw, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";

interface HeroImageUploaderProps {
  label: string;
  variant: "hero-desktop" | "hero-mobile";
  siteId: string;
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
  helpText?: string;
}

export function HeroImageUploader({
  label,
  variant,
  siteId,
  value,
  onChange,
  disabled = false,
  helpText
}: HeroImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!siteId || !siteId.trim()) {
      setError("Por favor especifica o vincula el ID de sitio (siteId) antes de subir la imagen.");
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("siteId", siteId.trim().toLowerCase());
      formData.append("variant", variant);

      const res = await fetch("/api/internal/media/hero", {
        method: "POST",
        body: formData,
        credentials: "same-origin"
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "No se pudo subir la imagen del hero.");
      }

      if (json.url) {
        onChange(json.url);
        setSuccess("Imagen subida y optimizada a WebP correctamente en Cloudflare R2.");
        setTimeout(() => setSuccess(null), 4000);
      } else {
        throw new Error("No se recibio la URL de la imagen subida.");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          {label} *
        </label>
        {value && (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" /> Cargado en Cloudflare R2
          </span>
        )}
      </div>

      {/* Input de archivo oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        disabled={disabled || isUploading}
        className="hidden"
      />

      {/* Previsualización o Zona de Carga */}
      {value ? (
        <div className="relative group rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 flex flex-col sm:flex-row items-center gap-4">
          <div className="relative h-28 w-full sm:w-44 shrink-0 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-900">
            <img
              src={value}
              alt={label}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>

          <div className="space-y-1.5 flex-1 min-w-0 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate block">
                {value}
              </span>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || isUploading}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 px-3.5 py-1.5 text-xs font-bold text-white transition disabled:opacity-50"
              >
                {isUploading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5 text-cyan-400" />}
                <span>{isUploading ? "Subiendo..." : "Reemplazar Imagen"}</span>
              </button>

              <button
                type="button"
                onClick={() => onChange("")}
                disabled={disabled || isUploading}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 px-3 py-1.5 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-100 transition disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Quitar</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onClick={() => {
            if (!disabled && !isUploading) fileInputRef.current?.click();
          }}
          className={`cursor-pointer rounded-2xl border-2 border-dashed p-5 text-center transition flex flex-col items-center justify-center gap-2 ${
            isUploading
              ? "border-cyan-400 bg-cyan-50/40 dark:bg-cyan-950/20"
              : "border-slate-300 dark:border-slate-700 bg-slate-50/50 hover:bg-slate-100 dark:bg-slate-950/50 dark:hover:bg-slate-900/50"
          }`}
        >
          {isUploading ? (
            <>
              <RefreshCw className="h-7 w-7 animate-spin text-cyan-500" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Optimizando y subiendo imagen a Cloudflare R2...
              </span>
            </>
          ) : (
            <>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-100 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400">
                <ImageIcon className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  Haz clic para seleccionar imagen {variant === "hero-desktop" ? "para computador" : "para celular"}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                  Archivos JPG, PNG o WebP, maximo 12 MB. Se convertira automaticamente a WebP en R2.
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {helpText && <p className="text-[11px] text-slate-400">{helpText}</p>}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-50 p-2.5 text-xs font-semibold text-rose-700 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 p-2.5 text-xs font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
          <span>{success}</span>
        </div>
      )}
    </div>
  );
}
