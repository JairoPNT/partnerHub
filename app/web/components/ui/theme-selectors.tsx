"use client";

import { Check, Type, Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FONT_PRESETS,
  PALETTE_PRESETS,
  FontPreset,
  PalettePreset
} from "@/lib/theme-presets";

interface FontSelectorProps {
  value: FontPreset | string;
  onChange: (preset: FontPreset) => void;
  disabled?: boolean;
}

export function FontSelector({ value, onChange, disabled }: FontSelectorProps) {
  const selected = value || "executive";

  return (
    <div className="space-y-3">
      {/* Importación de Google Fonts para la previsualización real en el Dashboard */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..900;1,6..96,400..900&family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700&family=DM+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Lora:ital,wght@0,400;0,600;1,400&family=Manrope:wght@400;600;700&family=Montserrat:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Outfit:wght@400;600;700&family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=Poppins:wght@400;600;700&family=Space+Grotesk:wght@400;600&display=swap"
      />

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
          <Type className="h-4 w-4 text-cyan-600" />
          Preset Tipográfico
        </label>
        <span className="text-[11px] font-medium text-slate-500">
          Vista previa interactiva en vivo
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {FONT_PRESETS.map((preset) => {
          const isSelected = selected === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(preset.id)}
              className={cn(
                "relative flex flex-col text-left p-3.5 rounded-2xl border transition-all duration-200 focus:outline-none group",
                isSelected
                  ? "border-cyan-500 bg-cyan-50/60 ring-2 ring-cyan-500/20 shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span
                  className="text-xs font-bold text-slate-900 group-hover:text-cyan-900 transition-colors"
                  style={{ fontFamily: preset.fontFamilyTitle }}
                >
                  {preset.name}
                </span>
                {isSelected && (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-600 text-white shrink-0">
                    <Check className="h-3 w-3" />
                  </div>
                )}
              </div>

              <p className="text-[11px] font-medium text-cyan-700 mb-2">
                {preset.fonts}
              </p>

              <div className="mt-auto pt-2 border-t border-slate-100/80 w-full">
                {/* Muestra Tipográfica Real con las fuentes del preset */}
                <p
                  className="text-sm font-semibold text-slate-900 truncate leading-snug"
                  style={{ fontFamily: preset.fontFamilyTitle }}
                >
                  &ldquo;{preset.sampleText}&rdquo;
                </p>
                <p
                  className="text-[11px] text-slate-600 mt-1 line-clamp-1"
                  style={{ fontFamily: preset.fontFamilyBody }}
                >
                  {preset.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface PaletteSelectorProps {
  value: PalettePreset | string;
  onChange: (preset: PalettePreset) => void;
  disabled?: boolean;
}

export function PaletteSelector({ value, onChange, disabled }: PaletteSelectorProps) {
  const selected = value || "cobalt-cyan";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
          <Palette className="h-4 w-4 text-cyan-600" />
          Paleta de Color
        </label>
        <span className="text-[11px] font-medium text-slate-500">
          Colores de marca y acentos
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {PALETTE_PRESETS.map((preset) => {
          const isSelected = selected === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(preset.id)}
              className={cn(
                "relative flex flex-col p-3 rounded-2xl border text-left transition-all duration-200 focus:outline-none",
                isSelected
                  ? "border-cyan-500 bg-cyan-50/60 ring-2 ring-cyan-500/20 shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <span className="text-xs font-bold text-slate-900 truncate">
                  {preset.name}
                </span>
                {isSelected && (
                  <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-white">
                    <Check className="h-2.5 w-2.5" />
                  </div>
                )}
              </div>

              {/* Visual Preview Swatches: Base + Accent */}
              <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-100/70 mb-2 border border-slate-200/60">
                <div
                  className="h-6 flex-1 rounded-lg shadow-inner"
                  style={{ backgroundColor: preset.baseColor }}
                  title={`Color base: ${preset.baseColor}`}
                />
                <div
                  className="h-6 flex-1 rounded-lg shadow-inner"
                  style={{ backgroundColor: preset.accentColor }}
                  title={`Color acento: ${preset.accentColor}`}
                />
              </div>

              <span className="text-[10px] font-semibold text-slate-500 truncate">
                {preset.badgeText}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
