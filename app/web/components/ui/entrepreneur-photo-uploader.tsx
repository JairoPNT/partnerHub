"use client";

import { useState, useRef, ChangeEvent } from "react";
import { UploadCloud, Trash2, CheckCircle2, AlertCircle, RefreshCw, Plus } from "lucide-react";

interface EntrepreneurPhotoUploaderProps {
  token: string;
  photos: string[];
  onChange: (photos: string[]) => void;
  disabled?: boolean;
}

export function EntrepreneurPhotoUploader({
  token,
  photos = [],
  onChange,
  disabled
}: EntrepreneurPhotoUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const minPhotos = 2;
  const maxPhotos = 5;

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = maxPhotos - photos.length;
    if (remainingSlots <= 0) {
      setUploadError(`Ya has alcanzado el límite máximo de ${maxPhotos} fotografías.`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    setIsUploading(true);
    setUploadError(null);

    const newUploadedUrls: string[] = [];

    for (const file of filesToUpload) {
      if (!file.type.startsWith("image/")) {
        setUploadError(`El archivo "${file.name}" no es una imagen válida.`);
        continue;
      }

      if (file.size > 12 * 1024 * 1024) {
        setUploadError(`La imagen "${file.name}" supera el peso máximo permitido (12 MB).`);
        continue;
      }

      try {
        const formData = new FormData();
        formData.append("token", token);
        formData.append("file", file);

        const response = await fetch("/api/public/onboarding/upload", {
          method: "POST",
          body: formData
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || `Error al subir ${file.name}`);
        }

        if (data.url) {
          newUploadedUrls.push(data.url);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error al subir la imagen.";
        setUploadError(msg);
      }
    }

    if (newUploadedUrls.length > 0) {
      onChange([...photos, ...newUploadedUrls]);
    }

    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemovePhoto = (indexToRemove: number) => {
    const updated = photos.filter((_, idx) => idx !== indexToRemove);
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      {/* Botón e instrucción de carga */}
      <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 p-6 text-center transition hover:border-cyan-500/50">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/heic,image/heif"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || isUploading || photos.length >= maxPhotos}
        />

        <div className="flex flex-col items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-950/80 text-cyan-400 ring-1 ring-cyan-500/30">
            {isUploading ? (
              <RefreshCw className="h-6 w-6 animate-spin" />
            ) : (
              <UploadCloud className="h-6 w-6" />
            )}
          </div>

          <div>
            <h4 className="text-sm font-bold text-white">
              Subir Fotos de Negocio ({photos.length}/{maxPhotos})
            </h4>
            <p className="mt-1 text-xs text-slate-400 max-w-md mx-auto">
              Selecciona entre <strong>2 y 5 fotografías tuyas</strong> de buena calidad con postura de negocios (preferiblemente de medio cuerpo desde la cintura).
            </p>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading || photos.length >= maxPhotos}
            className="mt-2 inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-900/30"
          >
            {isUploading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Subiendo Fotos...</span>
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                <span>
                  {photos.length === 0
                    ? "Seleccionar Fotos desde Computador o Celular"
                    : "Agregar Más Fotos"}
                </span>
              </>
            )}
          </button>

          <p className="text-[11px] text-slate-500">
            Formatos aceptados: JPG, PNG, WEBP o HEIC (Máx. 12 MB por foto)
          </p>
        </div>
      </div>

      {uploadError && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-800/60 bg-rose-950/40 p-3 text-xs text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Estado del contador */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold text-slate-400">
          {photos.length < minPhotos ? (
            <span className="text-amber-400 flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 inline" />
              Se requieren al menos {minPhotos} fotos (tienes {photos.length})
            </span>
          ) : (
            <span className="text-emerald-400 flex items-center gap-1.5 font-bold">
              <CheckCircle2 className="h-3.5 w-3.5 inline" />
              ¡Perfecto! {photos.length} fotos cargadas correctamente
            </span>
          )}
        </span>
        <span className="text-xs text-slate-500 font-mono">
          {photos.length} / {maxPhotos}
        </span>
      </div>

      {/* Grid de miniaturas cargadas */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-2">
          {photos.map((url, index) => (
            <div
              key={index}
              className="relative group aspect-square rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-md"
            >
              <img
                src={url}
                alt={`Foto de negocio ${index + 1}`}
                className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-2">
                <span className="text-[10px] font-bold text-white bg-slate-900/80 px-2 py-0.5 rounded-md">
                  #{index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemovePhoto(index)}
                  disabled={disabled}
                  className="rounded-lg bg-rose-600/90 p-1.5 text-white transition hover:bg-rose-500"
                  title="Eliminar foto"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
