"use client";

import React, { useState } from "react";
import {
  User,
  Sparkles,
  Globe,
  Calendar,
  Phone,
  Eye,
  Smartphone,
  Monitor,
  CheckCircle2,
  AlertCircle,
  Clock,
  Plus,
  Trash2,
  Layers,
  Palette,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Info
} from "lucide-react";
import {
  PersonalBrandTemplateConfig,
  DEFAULT_PERSONAL_BRAND_CONFIG,
  PERSONAL_BRAND_LIMITS,
  validatePersonalBrandConfig,
  PersonalServiceItem,
  PersonalLinkItem,
  PersonalEventItem
} from "@/lib/ecosystem-contracts";
import {
  FONT_PRESETS,
  PALETTE_PRESETS,
  FontPreset,
  PalettePreset,
  getFontPresetMeta,
  getPalettePresetMeta
} from "@/lib/theme-presets";

type BlockKey = "profile" | "bio" | "services" | "links" | "events" | "contact";

export function PersonalBrandBlocksView() {
  const [config, setConfig] = useState<PersonalBrandTemplateConfig>(DEFAULT_PERSONAL_BRAND_CONFIG);
  const [previewDevice, setPreviewDevice] = useState<"mobile" | "desktop">("mobile");
  const [activeTab, setActiveTab] = useState<"blocks" | "theme" | "preview">("blocks");
  const [expandedSection, setExpandedSection] = useState<BlockKey | null>("profile");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Validación y cálculo de estados de los bloques
  const getBlockStatus = (key: BlockKey): { status: "ACTIVE" | "INACTIVE" | "INCOMPLETE"; label: string; badgeClass: string } => {
    const blocks = config.blocks;
    switch (key) {
      case "profile":
        if (!blocks.profileBlock.enabled) return { status: "INACTIVE", label: "Inactivo", badgeClass: "bg-slate-100 text-slate-500 border-slate-200" };
        if (!config.profile.fullName || !config.profile.headline) return { status: "INCOMPLETE", label: "Incompleto", badgeClass: "bg-amber-100 text-amber-800 border-amber-200" };
        return { status: "ACTIVE", label: "Activo", badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200" };

      case "bio":
        if (!blocks.bioBlock.enabled) return { status: "INACTIVE", label: "Inactivo", badgeClass: "bg-slate-100 text-slate-500 border-slate-200" };
        if (!blocks.bioBlock.quote && !blocks.bioBlock.experienceText) return { status: "INCOMPLETE", label: "Incompleto", badgeClass: "bg-amber-100 text-amber-800 border-amber-200" };
        return { status: "ACTIVE", label: "Activo", badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200" };

      case "services":
        if (!blocks.servicesBlock.enabled) return { status: "INACTIVE", label: "Inactivo", badgeClass: "bg-slate-100 text-slate-500 border-slate-200" };
        if (blocks.servicesBlock.items.length === 0) return { status: "INCOMPLETE", label: "Sin Servicios", badgeClass: "bg-amber-100 text-amber-800 border-amber-200" };
        return { status: "ACTIVE", label: `${blocks.servicesBlock.items.length}/${PERSONAL_BRAND_LIMITS.MAX_SERVICES} Activos`, badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200" };

      case "links":
        if (!blocks.linksBlock.enabled) return { status: "INACTIVE", label: "Inactivo", badgeClass: "bg-slate-100 text-slate-500 border-slate-200" };
        if (blocks.linksBlock.items.length === 0) return { status: "INCOMPLETE", label: "Sin Enlaces", badgeClass: "bg-amber-100 text-amber-800 border-amber-200" };
        return { status: "ACTIVE", label: `${blocks.linksBlock.items.length}/${PERSONAL_BRAND_LIMITS.MAX_LINKS} Activos`, badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200" };

      case "events":
        if (!blocks.eventsBlock.enabled) return { status: "INACTIVE", label: "Inactivo", badgeClass: "bg-slate-100 text-slate-500 border-slate-200" };
        if (blocks.eventsBlock.items.length === 0) return { status: "INCOMPLETE", label: "Sin Eventos", badgeClass: "bg-amber-100 text-amber-800 border-amber-200" };
        return { status: "ACTIVE", label: `${blocks.eventsBlock.items.length}/${PERSONAL_BRAND_LIMITS.MAX_EVENTS} Activos`, badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200" };

      case "contact":
        if (!blocks.contactBlock.enabled) return { status: "INACTIVE", label: "Inactivo", badgeClass: "bg-slate-100 text-slate-500 border-slate-200" };
        if (!blocks.contactBlock.whatsappNumber) return { status: "INCOMPLETE", label: "Incompleto", badgeClass: "bg-amber-100 text-amber-800 border-amber-200" };
        return { status: "ACTIVE", label: "Activo", badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200" };
    }
  };

  // Handlers para mutaciones
  const toggleBlock = (key: BlockKey) => {
    setConfig((prev) => {
      const next = { ...prev };
      if (key === "profile") next.blocks.profileBlock.enabled = !next.blocks.profileBlock.enabled;
      if (key === "bio") next.blocks.bioBlock.enabled = !next.blocks.bioBlock.enabled;
      if (key === "services") next.blocks.servicesBlock.enabled = !next.blocks.servicesBlock.enabled;
      if (key === "links") next.blocks.linksBlock.enabled = !next.blocks.linksBlock.enabled;
      if (key === "events") next.blocks.eventsBlock.enabled = !next.blocks.eventsBlock.enabled;
      if (key === "contact") next.blocks.contactBlock.enabled = !next.blocks.contactBlock.enabled;
      return { ...next };
    });
  };

  // Servicios Handlers
  const addService = () => {
    if (config.blocks.servicesBlock.items.length >= PERSONAL_BRAND_LIMITS.MAX_SERVICES) {
      showToast(`Límite alcanzado: máximo ${PERSONAL_BRAND_LIMITS.MAX_SERVICES} servicios permitidos.`);
      return;
    }
    const newItem: PersonalServiceItem = {
      id: `s-${Date.now()}`,
      title: "Nuevo Servicio o Proyecto",
      description: "Descripción breve del servicio o proyecto.",
      badge: "Destacado",
      ctaText: "Más Información",
      ctaUrl: "https://wa.me/573000000000"
    };
    setConfig((prev) => ({
      ...prev,
      blocks: {
        ...prev.blocks,
        servicesBlock: {
          ...prev.blocks.servicesBlock,
          items: [...prev.blocks.servicesBlock.items, newItem]
        }
      }
    }));
  };

  const removeService = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      blocks: {
        ...prev.blocks,
        servicesBlock: {
          ...prev.blocks.servicesBlock,
          items: prev.blocks.servicesBlock.items.filter((item) => item.id !== id)
        }
      }
    }));
  };

  // Enlaces Handlers
  const addLink = () => {
    if (config.blocks.linksBlock.items.length >= PERSONAL_BRAND_LIMITS.MAX_LINKS) {
      showToast(`Límite alcanzado: máximo ${PERSONAL_BRAND_LIMITS.MAX_LINKS} enlaces permitidos.`);
      return;
    }
    const newItem: PersonalLinkItem = {
      id: `l-${Date.now()}`,
      label: "Nuevo Enlace Oficial",
      url: "https://partnerhub.club",
      category: "RESOURCE",
      featured: false
    };
    setConfig((prev) => ({
      ...prev,
      blocks: {
        ...prev.blocks,
        linksBlock: {
          ...prev.blocks.linksBlock,
          items: [...prev.blocks.linksBlock.items, newItem]
        }
      }
    }));
  };

  const removeLink = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      blocks: {
        ...prev.blocks,
        linksBlock: {
          ...prev.blocks.linksBlock,
          items: prev.blocks.linksBlock.items.filter((item) => item.id !== id)
        }
      }
    }));
  };

  // Eventos Handlers
  const addEvent = () => {
    if (config.blocks.eventsBlock.items.length >= PERSONAL_BRAND_LIMITS.MAX_EVENTS) {
      showToast(`Límite alcanzado: máximo ${PERSONAL_BRAND_LIMITS.MAX_EVENTS} eventos permitidos.`);
      return;
    }
    const newItem: PersonalEventItem = {
      id: `e-${Date.now()}`,
      date: "Próximo Jueves · 8:00 PM",
      title: "Nuevo Webinar o Encuentro",
      location: "Virtual en Vivo",
      ctaText: "Reservar Cupo",
      ctaUrl: "https://wa.me/573000000000"
    };
    setConfig((prev) => ({
      ...prev,
      blocks: {
        ...prev.blocks,
        eventsBlock: {
          ...prev.blocks.eventsBlock,
          items: [...prev.blocks.eventsBlock.items, newItem]
        }
      }
    }));
  };

  const removeEvent = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      blocks: {
        ...prev.blocks,
        eventsBlock: {
          ...prev.blocks.eventsBlock,
          items: prev.blocks.eventsBlock.items.filter((item) => item.id !== id)
        }
      }
    }));
  };

  // Resolutores de tema para el Live Preview
  const currentFont = getFontPresetMeta(config.theme.fontPreset);
  const currentPalette = getPalettePresetMeta(config.theme.palettePreset);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-xl flex items-center gap-2 border border-slate-700 animate-fade-in">
          <Info className="h-4 w-4 text-cyan-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header y Control de Modo */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50/50 via-white to-slate-50 p-6 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200">
              <Layers className="h-3.5 w-3.5 text-emerald-600" />
              Ecosistema Marca Personal
            </span>
            <span className="text-xs font-mono font-bold text-slate-400">
              siteId: ganomaster-personal-brand
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Editor Modular de Bloques y Previsualización
          </h2>
          <p className="text-xs text-slate-600">
            Configura y activa los bloques permitidos para la plantilla de marca personal sin código libre.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 rounded-2xl bg-slate-200/80 p-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab("blocks")}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 transition ${
              activeTab === "blocks"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Bloques ({Object.keys(config.blocks).length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("theme")}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 transition ${
              activeTab === "theme"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Palette className="h-4 w-4 text-emerald-600" />
            <span>Tema PH-025</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("preview")}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 transition lg:hidden ${
              activeTab === "preview"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Eye className="h-4 w-4 text-cyan-600" />
            <span>Ver Preview</span>
          </button>
        </div>
      </div>

      {/* Grid Principal: Formulario de Bloques / Temas a la Izquierda y Live Preview a la Derecha */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* PANEL IZQUIERDO: Configuración y Bloques */}
        <div className={`space-y-4 lg:col-span-6 ${activeTab === "preview" ? "hidden lg:block" : ""}`}>
          {activeTab === "theme" ? (
            /* SELECTOR DE TEMAS PH-025 */
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6 animate-fade-in">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Palette className="h-5 w-5 text-emerald-600" />
                  Personalización de Tema Visual (PH-025)
                </h3>
                <p className="text-xs text-slate-500">
                  Selecciona la tipografía y paleta cromática para todo el Hub de Marca Personal.
                </p>
              </div>

              {/* Selector de Fuentes */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                  Tipografía ({FONT_PRESETS.length} Familias Disponibles)
                </label>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {FONT_PRESETS.map((preset) => {
                    const isSelected = config.theme.fontPreset === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() =>
                          setConfig((prev) => ({
                            ...prev,
                            theme: { ...prev.theme, fontPreset: preset.id }
                          }))
                        }
                        className={`rounded-2xl border p-3.5 text-left transition ${
                          isSelected
                            ? "border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20"
                            : "border-slate-200 bg-slate-50/40 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">{preset.name}</span>
                          {isSelected && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">{preset.fonts}</p>
                        <p className="text-xs font-medium text-slate-800 mt-2 italic" style={{ fontFamily: preset.fontFamilyTitle }}>
                          {preset.sampleText}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selector de Paletas */}
              <div className="space-y-3 border-t border-slate-100 pt-5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                  Paleta de Color ({PALETTE_PRESETS.length} Presets Armonizados)
                </label>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {PALETTE_PRESETS.map((palette) => {
                    const isSelected = config.theme.palettePreset === palette.id;
                    return (
                      <button
                        key={palette.id}
                        type="button"
                        onClick={() =>
                          setConfig((prev) => ({
                            ...prev,
                            theme: { ...prev.theme, palettePreset: palette.id }
                          }))
                        }
                        className={`rounded-2xl border p-3 text-left transition flex items-center justify-between ${
                          isSelected
                            ? "border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20"
                            : "border-slate-200 bg-slate-50/40 hover:border-slate-300"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="h-3.5 w-3.5 rounded-full border border-black/10" style={{ backgroundColor: palette.accentColor }} />
                            <span className="text-xs font-bold text-slate-900">{palette.name}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 block">{palette.badgeText}</span>
                        </div>
                        {isSelected && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* LISTA DE BLOQUES MODULARES */
            <div className="space-y-3 animate-fade-in">
              {/* BLOQUE 1: PERFIL */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between p-4 bg-slate-50/80 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-emerald-600" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">1. Bloque de Perfil & Avatar</h4>
                      <p className="text-[11px] text-slate-500">Foto, nombre, titular y ubicación</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${getBlockStatus("profile").badgeClass}`}>
                      {getBlockStatus("profile").label}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleBlock("profile")}
                      className={`text-[11px] font-bold px-2 py-1 rounded-lg transition ${
                        config.blocks.profileBlock.enabled ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {config.blocks.profileBlock.enabled ? "Activo" : "Inactivo"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpandedSection(expandedSection === "profile" ? null : "profile")}
                      className="p-1 text-slate-500 hover:text-slate-800"
                    >
                      {expandedSection === "profile" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {expandedSection === "profile" && (
                  <div className="p-4 space-y-3 text-xs border-t border-slate-100">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Nombre Completo</label>
                        <input
                          type="text"
                          value={config.profile.fullName}
                          onChange={(e) => setConfig((prev) => ({ ...prev, profile: { ...prev.profile, fullName: e.target.value } }))}
                          className="w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Nombre de Marca</label>
                        <input
                          type="text"
                          value={config.profile.brandName}
                          onChange={(e) => setConfig((prev) => ({ ...prev, profile: { ...prev.profile, brandName: e.target.value } }))}
                          className="w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Titular Profesional</label>
                      <input
                        type="text"
                        value={config.profile.headline}
                        onChange={(e) => setConfig((prev) => ({ ...prev, profile: { ...prev.profile, headline: e.target.value } }))}
                        className="w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Biografía Breve</label>
                      <textarea
                        rows={2}
                        value={config.profile.bio}
                        onChange={(e) => setConfig((prev) => ({ ...prev, profile: { ...prev.profile, bio: e.target.value } }))}
                        className="w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-900"
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Badge de Verificación</label>
                        <input
                          type="text"
                          value={config.profile.badge || ""}
                          onChange={(e) => setConfig((prev) => ({ ...prev, profile: { ...prev.profile, badge: e.target.value } }))}
                          className="w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Ubicación</label>
                        <input
                          type="text"
                          value={config.profile.location || ""}
                          onChange={(e) => setConfig((prev) => ({ ...prev, profile: { ...prev.profile, location: e.target.value } }))}
                          className="w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-[11px] text-slate-500 flex items-center gap-2">
                      <Info className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>El avatar y cover se almacenan en Cloudflare R2 y se asocian al siteId correspondiente.</span>
                    </div>
                  </div>
                )}
              </div>

              {/* BLOQUE 2: BIOGRAFÍA & CITA */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between p-4 bg-slate-50/80 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-4 w-4 text-emerald-600" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">2. Bloque de Manifiesto / Cita</h4>
                      <p className="text-[11px] text-slate-500">Cita inspiracional y trayectoria</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${getBlockStatus("bio").badgeClass}`}>
                      {getBlockStatus("bio").label}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleBlock("bio")}
                      className={`text-[11px] font-bold px-2 py-1 rounded-lg transition ${
                        config.blocks.bioBlock.enabled ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {config.blocks.bioBlock.enabled ? "Activo" : "Inactivo"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpandedSection(expandedSection === "bio" ? null : "bio")}
                      className="p-1 text-slate-500 hover:text-slate-800"
                    >
                      {expandedSection === "bio" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {expandedSection === "bio" && (
                  <div className="p-4 space-y-3 text-xs border-t border-slate-100">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Cita o Manifiesto</label>
                      <textarea
                        rows={2}
                        value={config.blocks.bioBlock.quote || ""}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            blocks: {
                              ...prev.blocks,
                              bioBlock: { ...prev.blocks.bioBlock, quote: e.target.value }
                            }
                          }))
                        }
                        className="w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Trayectoria / Experiencia</label>
                      <input
                        type="text"
                        value={config.blocks.bioBlock.experienceText || ""}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            blocks: {
                              ...prev.blocks,
                              bioBlock: { ...prev.blocks.bioBlock, experienceText: e.target.value }
                            }
                          }))
                        }
                        className="w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-900"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* BLOQUE 3: SERVICIOS / NEGOCIOS (MAX 4) */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between p-4 bg-slate-50/80 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <Layers className="h-4 w-4 text-emerald-600" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">3. Bloque de Servicios & Negocios</h4>
                      <p className="text-[11px] text-slate-500">Tarjetas de proyectos (Máximo 4)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${getBlockStatus("services").badgeClass}`}>
                      {getBlockStatus("services").label}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleBlock("services")}
                      className={`text-[11px] font-bold px-2 py-1 rounded-lg transition ${
                        config.blocks.servicesBlock.enabled ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {config.blocks.servicesBlock.enabled ? "Activo" : "Inactivo"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpandedSection(expandedSection === "services" ? null : "services")}
                      className="p-1 text-slate-500 hover:text-slate-800"
                    >
                      {expandedSection === "services" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {expandedSection === "services" && (
                  <div className="p-4 space-y-4 text-xs border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700 text-xs">
                        Items Configurados ({config.blocks.servicesBlock.items.length}/{PERSONAL_BRAND_LIMITS.MAX_SERVICES})
                      </span>
                      <button
                        type="button"
                        disabled={config.blocks.servicesBlock.items.length >= PERSONAL_BRAND_LIMITS.MAX_SERVICES}
                        onClick={addService}
                        className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50 transition"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Agregar Servicio</span>
                      </button>
                    </div>

                    <div className="space-y-3">
                      {config.blocks.servicesBlock.items.map((srv, idx) => (
                        <div key={srv.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800 text-xs">Servicio #{idx + 1}</span>
                            <button
                              type="button"
                              onClick={() => removeService(srv.id)}
                              className="text-slate-400 hover:text-rose-600 p-1"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <input
                              type="text"
                              value={srv.title}
                              placeholder="Título del Servicio"
                              onChange={(e) => {
                                const val = e.target.value;
                                setConfig((prev) => ({
                                  ...prev,
                                  blocks: {
                                    ...prev.blocks,
                                    servicesBlock: {
                                      ...prev.blocks.servicesBlock,
                                      items: prev.blocks.servicesBlock.items.map((s) => (s.id === srv.id ? { ...s, title: val } : s))
                                    }
                                  }
                                }));
                              }}
                              className="rounded-xl border border-slate-300 px-2.5 py-1 text-xs text-slate-900 bg-white"
                            />
                            <input
                              type="text"
                              value={srv.badge || ""}
                              placeholder="Badge (Ej. Cupos Limitados)"
                              onChange={(e) => {
                                const val = e.target.value;
                                setConfig((prev) => ({
                                  ...prev,
                                  blocks: {
                                    ...prev.blocks,
                                    servicesBlock: {
                                      ...prev.blocks.servicesBlock,
                                      items: prev.blocks.servicesBlock.items.map((s) => (s.id === srv.id ? { ...s, badge: val } : s))
                                    }
                                  }
                                }));
                              }}
                              className="rounded-xl border border-slate-300 px-2.5 py-1 text-xs text-slate-900 bg-white"
                            />
                          </div>
                          <textarea
                            rows={2}
                            value={srv.description}
                            placeholder="Descripción concisa"
                            onChange={(e) => {
                              const val = e.target.value;
                              setConfig((prev) => ({
                                ...prev,
                                blocks: {
                                  ...prev.blocks,
                                  servicesBlock: {
                                    ...prev.blocks.servicesBlock,
                                    items: prev.blocks.servicesBlock.items.map((s) => (s.id === srv.id ? { ...s, description: val } : s))
                                  }
                                }
                              }));
                            }}
                            className="w-full rounded-xl border border-slate-300 px-2.5 py-1 text-xs text-slate-900 bg-white"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* BLOQUE 4: ENLACES & CANALES (MAX 8) */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between p-4 bg-slate-50/80 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <Globe className="h-4 w-4 text-emerald-600" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">4. Bloque de Enlaces & Canales</h4>
                      <p className="text-[11px] text-slate-500">Botones a redes y recursos (Máximo 8)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${getBlockStatus("links").badgeClass}`}>
                      {getBlockStatus("links").label}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleBlock("links")}
                      className={`text-[11px] font-bold px-2 py-1 rounded-lg transition ${
                        config.blocks.linksBlock.enabled ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {config.blocks.linksBlock.enabled ? "Activo" : "Inactivo"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpandedSection(expandedSection === "links" ? null : "links")}
                      className="p-1 text-slate-500 hover:text-slate-800"
                    >
                      {expandedSection === "links" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {expandedSection === "links" && (
                  <div className="p-4 space-y-4 text-xs border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700 text-xs">
                        Enlaces Configurados ({config.blocks.linksBlock.items.length}/{PERSONAL_BRAND_LIMITS.MAX_LINKS})
                      </span>
                      <button
                        type="button"
                        disabled={config.blocks.linksBlock.items.length >= PERSONAL_BRAND_LIMITS.MAX_LINKS}
                        onClick={addLink}
                        className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50 transition"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Agregar Enlace</span>
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {config.blocks.linksBlock.items.map((link, idx) => (
                        <div key={link.id} className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 flex items-center gap-2">
                          <span className="font-mono text-[10px] text-slate-400">#{idx + 1}</span>
                          <input
                            type="text"
                            value={link.label}
                            placeholder="Etiqueta del enlace"
                            onChange={(e) => {
                              const val = e.target.value;
                              setConfig((prev) => ({
                                ...prev,
                                blocks: {
                                  ...prev.blocks,
                                  linksBlock: {
                                    ...prev.blocks.linksBlock,
                                    items: prev.blocks.linksBlock.items.map((l) => (l.id === link.id ? { ...l, label: val } : l))
                                  }
                                }
                              }));
                            }}
                            className="flex-1 rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-900 bg-white font-bold"
                          />
                          <input
                            type="text"
                            value={link.url}
                            placeholder="https://..."
                            onChange={(e) => {
                              const val = e.target.value;
                              setConfig((prev) => ({
                                ...prev,
                                blocks: {
                                  ...prev.blocks,
                                  linksBlock: {
                                    ...prev.blocks.linksBlock,
                                    items: prev.blocks.linksBlock.items.map((l) => (l.id === link.id ? { ...l, url: val } : l))
                                  }
                                }
                              }));
                            }}
                            className="flex-1 rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-900 bg-white font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => removeLink(link.id)}
                            className="text-slate-400 hover:text-rose-600 p-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* BLOQUE 5: EVENTOS & WEBINARS (MAX 6) */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between p-4 bg-slate-50/80 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-emerald-600" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">5. Bloque de Eventos & Agenda</h4>
                      <p className="text-[11px] text-slate-500">Sesiones y masterclasses (Máximo 6)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${getBlockStatus("events").badgeClass}`}>
                      {getBlockStatus("events").label}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleBlock("events")}
                      className={`text-[11px] font-bold px-2 py-1 rounded-lg transition ${
                        config.blocks.eventsBlock.enabled ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {config.blocks.eventsBlock.enabled ? "Activo" : "Inactivo"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpandedSection(expandedSection === "events" ? null : "events")}
                      className="p-1 text-slate-500 hover:text-slate-800"
                    >
                      {expandedSection === "events" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {expandedSection === "events" && (
                  <div className="p-4 space-y-4 text-xs border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700 text-xs">
                        Eventos Configurados ({config.blocks.eventsBlock.items.length}/{PERSONAL_BRAND_LIMITS.MAX_EVENTS})
                      </span>
                      <button
                        type="button"
                        disabled={config.blocks.eventsBlock.items.length >= PERSONAL_BRAND_LIMITS.MAX_EVENTS}
                        onClick={addEvent}
                        className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50 transition"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Agregar Evento</span>
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {config.blocks.eventsBlock.items.map((event, idx) => (
                        <div key={event.id} className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800 text-xs">Evento #{idx + 1}</span>
                            <button
                              type="button"
                              onClick={() => removeEvent(event.id)}
                              className="text-slate-400 hover:text-rose-600 p-1"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <input
                              type="text"
                              value={event.date}
                              placeholder="Fecha y Hora (Ej. Jueves 8:00 PM)"
                              onChange={(e) => {
                                const val = e.target.value;
                                setConfig((prev) => ({
                                  ...prev,
                                  blocks: {
                                    ...prev.blocks,
                                    eventsBlock: {
                                      ...prev.blocks.eventsBlock,
                                      items: prev.blocks.eventsBlock.items.map((ev) => (ev.id === event.id ? { ...ev, date: val } : ev))
                                    }
                                  }
                                }));
                              }}
                              className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-900 bg-white"
                            />
                            <input
                              type="text"
                              value={event.title}
                              placeholder="Título del evento"
                              onChange={(e) => {
                                const val = e.target.value;
                                setConfig((prev) => ({
                                  ...prev,
                                  blocks: {
                                    ...prev.blocks,
                                    eventsBlock: {
                                      ...prev.blocks.eventsBlock,
                                      items: prev.blocks.eventsBlock.items.map((ev) => (ev.id === event.id ? { ...ev, title: val } : ev))
                                    }
                                  }
                                }));
                              }}
                              className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-900 bg-white font-bold"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* BLOQUE 6: CONTACTO & WHATSAPP */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between p-4 bg-slate-50/80 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-emerald-600" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">6. Bloque de Contacto Directo</h4>
                      <p className="text-[11px] text-slate-500">WhatsApp oficial y correo</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${getBlockStatus("contact").badgeClass}`}>
                      {getBlockStatus("contact").label}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleBlock("contact")}
                      className={`text-[11px] font-bold px-2 py-1 rounded-lg transition ${
                        config.blocks.contactBlock.enabled ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {config.blocks.contactBlock.enabled ? "Activo" : "Inactivo"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpandedSection(expandedSection === "contact" ? null : "contact")}
                      className="p-1 text-slate-500 hover:text-slate-800"
                    >
                      {expandedSection === "contact" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {expandedSection === "contact" && (
                  <div className="p-4 space-y-3 text-xs border-t border-slate-100">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">WhatsApp Internacional (con indicativo)</label>
                        <input
                          type="text"
                          value={config.blocks.contactBlock.whatsappNumber}
                          placeholder="573000000000"
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              blocks: {
                                ...prev.blocks,
                                contactBlock: { ...prev.blocks.contactBlock, whatsappNumber: e.target.value }
                              }
                            }))
                          }
                          className="w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-900 font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">Email Profesional (opcional)</label>
                        <input
                          type="email"
                          value={config.blocks.contactBlock.email || ""}
                          placeholder="contacto@dominio.com"
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              blocks: {
                                ...prev.blocks,
                                contactBlock: { ...prev.blocks.contactBlock, email: e.target.value }
                              }
                            }))
                          }
                          className="w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Texto del Botón CTA</label>
                      <input
                        type="text"
                        value={config.blocks.contactBlock.ctaText}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            blocks: {
                              ...prev.blocks,
                              contactBlock: { ...prev.blocks.contactBlock, ctaText: e.target.value }
                            }
                          }))
                        }
                        className="w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-900 font-bold"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* PANEL DERECHO: Live Preview Reactivo */}
        <div className={`lg:col-span-6 space-y-3 ${activeTab !== "preview" ? "hidden lg:block" : ""}`}>
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-900">Previsualizador en Vivo</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                {currentFont.name} · {currentPalette.name}
              </span>
            </div>

            <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setPreviewDevice("mobile")}
                className={`p-1.5 rounded-lg transition ${previewDevice === "mobile" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-700"}`}
                title="Vista Móvil"
              >
                <Smartphone className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice("desktop")}
                className={`p-1.5 rounded-lg transition ${previewDevice === "desktop" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-700"}`}
                title="Vista Escritorio"
              >
                <Monitor className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Marco de Previsualización */}
          <div className="flex justify-center rounded-3xl border border-slate-200 bg-slate-100 p-4 min-h-[640px] max-h-[780px] overflow-y-auto">
            <div
              className={`w-full transition-all duration-300 rounded-3xl border border-slate-800/20 shadow-2xl overflow-hidden ${
                previewDevice === "mobile" ? "max-w-[380px]" : "max-w-[580px]"
              }`}
              style={{
                backgroundColor: currentPalette.baseColor,
                fontFamily: currentFont.fontFamilyBody,
                color: "#F8FAFC"
              }}
            >
              {/* Contenido del Hub */}
              <div className="p-4 space-y-5">
                {/* 1. Profile Block */}
                {config.blocks.profileBlock.enabled && (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center space-y-3 backdrop-blur-md">
                    <div className="relative mx-auto h-20 w-20">
                      <img
                        src={config.profile.avatarUrl}
                        alt="Avatar"
                        className="h-full w-full rounded-full object-cover border-2 border-white/20 shadow-lg"
                      />
                    </div>
                    {config.profile.badge && (
                      <span
                        className="inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border"
                        style={{
                          backgroundColor: `${currentPalette.accentColor}20`,
                          color: currentPalette.accentColor,
                          borderColor: `${currentPalette.accentColor}60`
                        }}
                      >
                        {config.profile.badge}
                      </span>
                    )}
                    <div>
                      <h3
                        className="text-base font-extrabold"
                        style={{ fontFamily: currentFont.fontFamilyTitle }}
                      >
                        {config.profile.fullName || config.profile.brandName}
                      </h3>
                      <p className="text-xs font-semibold" style={{ color: currentPalette.accentColor }}>
                        {config.profile.headline}
                      </p>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed max-w-[280px] mx-auto">
                      {config.profile.bio}
                    </p>
                  </div>
                )}

                {/* 2. Bio Block */}
                {config.blocks.bioBlock.enabled && (config.blocks.bioBlock.quote || config.blocks.bioBlock.experienceText) && (
                  <div
                    className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs italic space-y-1.5"
                    style={{ borderLeftColor: currentPalette.accentColor, borderLeftWidth: 3 }}
                  >
                    {config.blocks.bioBlock.quote && <p className="text-slate-200">&ldquo;{config.blocks.bioBlock.quote}&rdquo;</p>}
                    {config.blocks.bioBlock.experienceText && (
                      <p className="text-[10px] font-bold not-italic" style={{ color: currentPalette.accentColor }}>
                        {config.blocks.bioBlock.experienceText}
                      </p>
                    )}
                  </div>
                )}

                {/* 3. Services Block */}
                {config.blocks.servicesBlock.enabled && config.blocks.servicesBlock.items.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400" style={{ fontFamily: currentFont.fontFamilyTitle }}>
                      {config.blocks.servicesBlock.title}
                    </h4>
                    <div className="grid gap-2">
                      {config.blocks.servicesBlock.items.map((srv) => (
                        <div key={srv.id} className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <h5 className="text-xs font-bold text-white">{srv.title}</h5>
                            {srv.badge && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
                                {srv.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 leading-normal">{srv.description}</p>
                          <div
                            className="inline-flex items-center gap-1 text-[10px] font-bold pt-1"
                            style={{ color: currentPalette.accentColor }}
                          >
                            <span>{srv.ctaText || "Más Información"}</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Links Block */}
                {config.blocks.linksBlock.enabled && config.blocks.linksBlock.items.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400" style={{ fontFamily: currentFont.fontFamilyTitle }}>
                      {config.blocks.linksBlock.title}
                    </h4>
                    <div className="space-y-1.5">
                      {config.blocks.linksBlock.items.map((link) => (
                        <div
                          key={link.id}
                          className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-xs font-bold text-white shadow-sm hover:border-white/20 transition"
                        >
                          <div className="flex items-center gap-2">
                            <Globe className="h-3.5 w-3.5" style={{ color: currentPalette.accentColor }} />
                            <span>{link.label}</span>
                          </div>
                          <ExternalLink className="h-3 w-3 text-slate-400" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. Events Block */}
                {config.blocks.eventsBlock.enabled && config.blocks.eventsBlock.items.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400" style={{ fontFamily: currentFont.fontFamilyTitle }}>
                      {config.blocks.eventsBlock.title}
                    </h4>
                    <div className="space-y-1.5">
                      {config.blocks.eventsBlock.items.map((ev) => (
                        <div key={ev.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs">
                          <div>
                            <span className="text-[9px] font-bold uppercase tracking-wider block" style={{ color: currentPalette.accentColor }}>
                              {ev.date}
                            </span>
                            <h5 className="font-bold text-white text-[11px]">{ev.title}</h5>
                          </div>
                          <span
                            className="rounded-lg px-2 py-1 text-[10px] font-bold"
                            style={{ backgroundColor: currentPalette.accentColor, color: currentPalette.baseColor }}
                          >
                            {ev.ctaText || "Reservar"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 6. Contact Block */}
                {config.blocks.contactBlock.enabled && (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center space-y-2.5">
                    <h4 className="text-xs font-bold text-white" style={{ fontFamily: currentFont.fontFamilyTitle }}>
                      {config.blocks.contactBlock.title}
                    </h4>
                    <div
                      className="inline-flex items-center justify-center gap-2 w-full rounded-xl py-2.5 text-xs font-extrabold shadow-md"
                      style={{ backgroundColor: currentPalette.accentColor, color: currentPalette.baseColor }}
                    >
                      <Phone className="h-3.5 w-3.5" />
                      <span>{config.blocks.contactBlock.ctaText}</span>
                    </div>
                  </div>
                )}

                <div className="text-center text-[10px] text-slate-500 pt-2">
                  <span>© {new Date().getFullYear()} {config.profile.fullName || "Marca Personal"} · Hub Oficial</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
