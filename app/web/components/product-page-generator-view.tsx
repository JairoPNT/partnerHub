"use client";

import { useState, FormEvent, useEffect } from "react";
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileCode,
  User,
  Phone,
  Search,
  Image as ImageIcon,
  Copy,
  Check,
  RotateCcw,
  ArrowRight,
  Folder,
  UploadCloud,
  Edit3,
  PlusCircle,
  BarChart3,
  RefreshCw,
  AlertTriangle
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label, Input, Textarea, Select } from "@/components/ui/form";
import { Alert } from "@/components/ui/alert";
import { ModuleRecord } from "@/modules/catalog";

type ProductPageGeneratorViewProps = {
  record?: ModuleRecord;
};

type ViewMode = "create" | "edit";

interface FormState {
  siteId: string;
  brandName: string;
  firstName: string;
  fullName: string;
  role: string;
  whatsappNumber: string;
  displayPhone: string;
  siteTitle: string;
  metaDescription: string;
  heroDesktop: string;
  heroMobile: string;
  defaultMessage: string;
  measurementId: string;
  faviconUrl: string;
}

interface GenerationResult {
  siteId: string;
  generatedAt: string;
  outputDirectory: string;
  files: string[];
  requiresPublication?: boolean;
}

interface PublicationResult {
  siteId: string;
  publishedAt: string;
  remoteRoot: string;
  files: string[];
}

interface SiteListItem {
  siteId: string;
  configuration: any;
}

const SAMPLE_DATA: FormState = {
  siteId: "jenny-varela",
  brandName: "Jenny Varela",
  firstName: "Jenny",
  fullName: "Jenny Varela",
  role: "Distribuidora Autorizada · Gano Excel",
  whatsappNumber: "573188430283",
  displayPhone: "3188430283",
  siteTitle: "Jenny Varela — Bienestar y Vitalidad con Gano Excel",
  metaDescription: "Descubre cómo transformar tu día a día con café, cacao y suplementos enriquecidos con Ganoderma lucidum.",
  heroDesktop: "https://media.partnerhub.club/clientes/jenny-varela/producto/v1/hero-desktop.webp",
  heroMobile: "https://media.partnerhub.club/clientes/jenny-varela/producto/v1/hero-mobile.webp",
  defaultMessage: "Hola Jenny, vengo de tu página web. Me gustaría tener más información sobre el Ganoderma de Gano Excel.",
  measurementId: "G-7F24PBZPDM",
  faviconUrl: ""
};

const INITIAL_FORM: FormState = {
  siteId: "",
  brandName: "",
  firstName: "",
  fullName: "",
  role: "Distribuidor Autorizado · Gano Excel",
  whatsappNumber: "",
  displayPhone: "",
  siteTitle: "",
  metaDescription: "",
  heroDesktop: "",
  heroMobile: "",
  defaultMessage: "",
  measurementId: "",
  faviconUrl: ""
};

export function ProductPageGeneratorView({ record }: ProductPageGeneratorViewProps) {
  const [mode, setMode] = useState<ViewMode>("create");
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [copied, setCopied] = useState(false);

  // Estados de lista y edición de sitios
  const [siteList, setSiteList] = useState<SiteListItem[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [isLoadingSiteConfig, setIsLoadingSiteConfig] = useState(false);
  const [isOldPageWithoutConfig, setIsOldPageWithoutConfig] = useState(false);

  // Estados de publicación
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<PublicationResult | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  const fetchSiteList = async () => {
    setIsLoadingList(true);
    try {
      const res = await fetch("/api/internal/product-pages");
      if (res.ok) {
        const data = await res.json();
        setSiteList(data.sites || []);
      }
    } catch {
      // Ignorar fallos de red secundarios al listar
    } finally {
      setIsLoadingList(false);
    }
  };

  const fetchSiteConfig = async (siteId: string) => {
    if (!siteId) return;
    setIsLoadingSiteConfig(true);
    setErrorMessage(null);
    setIsOldPageWithoutConfig(false);
    setResult(null);
    setPublishResult(null);
    setPublishError(null);

    try {
      const res = await fetch(`/api/internal/product-pages/${siteId}`);
      if (res.status === 404) {
        setIsOldPageWithoutConfig(true);
        setForm((prev) => ({ ...INITIAL_FORM, siteId }));
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No se pudo cargar la configuración de la página.");
      }

      const cfg = data.configuration || {};
      const site = cfg.site || {};
      const dist = cfg.distributor || {};
      const hero = cfg.hero || {};
      const analytics = cfg.analytics || {};

      setForm({
        siteId: siteId,
        siteTitle: site.title || "",
        metaDescription: site.metaDescription || site.ogDescription || "",
        brandName: dist.brandName || "",
        firstName: dist.firstName || "",
        fullName: dist.fullName || "",
        role: dist.role || "Distribuidor Autorizado · Gano Excel",
        whatsappNumber: dist.whatsappNumber || "",
        displayPhone: dist.displayPhone || dist.phoneNumber || "",
        defaultMessage: dist.defaultMessage || "",
        heroDesktop: hero.desktop || "",
        heroMobile: hero.mobile || "",
        measurementId: typeof analytics === "string" ? analytics : (analytics.measurementId || ""),
        faviconUrl: site.faviconUrl || cfg.faviconUrl || ""
      });
    } catch (err: any) {
      setErrorMessage(err.message || "Error al cargar los datos de la página seleccionada.");
    } finally {
      setIsLoadingSiteConfig(false);
    }
  };

  const handleModeChange = (newMode: ViewMode) => {
    setMode(newMode);
    setErrorMessage(null);
    setFieldErrors({});
    setResult(null);
    setPublishResult(null);
    setPublishError(null);
    setIsOldPageWithoutConfig(false);

    if (newMode === "edit") {
      fetchSiteList();
    } else {
      setSelectedSiteId("");
      setForm(INITIAL_FORM);
    }
  };

  const handleSelectSiteChange = (siteId: string) => {
    setSelectedSiteId(siteId);
    if (siteId) {
      fetchSiteConfig(siteId);
    } else {
      setForm(INITIAL_FORM);
      setIsOldPageWithoutConfig(false);
    }
  };

  const handleInputChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const loadPreset = () => {
    setMode("create");
    setSelectedSiteId("");
    setIsOldPageWithoutConfig(false);
    setForm(SAMPLE_DATA);
    setErrorMessage(null);
    setFieldErrors({});
    setResult(null);
    setPublishResult(null);
    setPublishError(null);
  };

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setSelectedSiteId("");
    setIsOldPageWithoutConfig(false);
    setErrorMessage(null);
    setFieldErrors({});
    setResult(null);
    setPublishResult(null);
    setPublishError(null);
  };

  const validateFormClientSide = (): boolean => {
    const errors: Record<string, string[]> = {};
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    const measurementIdRegex = /^G-[A-Z0-9]+$/i;

    if (!form.siteId.trim()) {
      errors.siteId = ["El ID de sitio es requerido."];
    } else if (!slugRegex.test(form.siteId.trim())) {
      errors.siteId = ["El ID de sitio debe ser un slug en minúsculas (ej. jenny-varela)."];
    }

    if (!form.brandName.trim()) {
      errors.brandName = ["El nombre de marca es requerido."];
    }

    if (!form.firstName.trim()) {
      errors.firstName = ["El nombre de pila es requerido."];
    }

    if (!form.fullName.trim()) {
      errors.fullName = ["El nombre completo es requerido."];
    }

    const cleanWa = form.whatsappNumber.replace(/\D/g, "");
    if (!cleanWa || cleanWa.length < 10 || cleanWa.length > 15) {
      errors.whatsappNumber = ["El número de WhatsApp internacional debe tener entre 10 y 15 dígitos."];
    }

    if (!form.siteTitle.trim()) {
      errors.siteTitle = ["El título SEO es requerido."];
    }

    if (!form.heroDesktop.trim()) {
      errors.heroDesktop = ["La URL de Hero Desktop es requerida."];
    } else if (!form.heroDesktop.startsWith("https://")) {
      errors.heroDesktop = ["La URL de Hero Desktop debe usar HTTPS."];
    }

    if (!form.heroMobile.trim()) {
      errors.heroMobile = ["La URL de Hero Mobile es requerida."];
    } else if (!form.heroMobile.startsWith("https://")) {
      errors.heroMobile = ["La URL de Hero Mobile debe usar HTTPS."];
    }

    if (form.measurementId.trim() && !measurementIdRegex.test(form.measurementId.trim())) {
      errors.measurementId = ["El Measurement ID debe tener el formato G-XXXXXXXX (ej. G-7F24PBZPDM)."];
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setResult(null);
    setPublishResult(null);
    setPublishError(null);

    if (!validateFormClientSide()) {
      setErrorMessage("Por favor corrige los errores resaltados antes de continuar.");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      site: {
        id: form.siteId.trim(),
        title: form.siteTitle.trim(),
        appName: form.siteId.trim().replaceAll("-", "_"),
        ogTitle: form.siteTitle.trim(),
        ogDescription: form.metaDescription.trim() || undefined,
        metaDescription: form.metaDescription.trim() || undefined,
        faviconUrl: form.faviconUrl.trim() || undefined
      },
      distributor: {
        brandName: form.brandName.trim(),
        firstName: form.firstName.trim(),
        fullName: form.fullName.trim(),
        role: form.role.trim() || "Distribuidor Autorizado · Gano Excel",
        whatsappNumber: form.whatsappNumber.replace(/\D/g, ""),
        phoneNumber: form.displayPhone.trim() || form.whatsappNumber.replace(/\D/g, ""),
        displayPhone: form.displayPhone.trim() || form.whatsappNumber.replace(/\D/g, ""),
        defaultMessage: form.defaultMessage.trim() || undefined
      },
      hero: {
        desktop: form.heroDesktop.trim(),
        mobile: form.heroMobile.trim()
      },
      analytics: form.measurementId.trim()
        ? { measurementId: form.measurementId.trim().toUpperCase() }
        : undefined
    };

    try {
      const endpoint = mode === "edit"
        ? `/api/internal/product-pages/${encodeURIComponent(form.siteId.trim())}`
        : "/api/internal/product-pages/generate";

      const method = mode === "edit" ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.issues && data.issues.fieldErrors) {
          const parsedErrors: Record<string, string[]> = {};
          const fieldMap: Record<string, keyof FormState> = {
            "site.id": "siteId",
            "site.title": "siteTitle",
            "site.metaDescription": "metaDescription",
            "distributor.brandName": "brandName",
            "distributor.firstName": "firstName",
            "distributor.fullName": "fullName",
            "distributor.role": "role",
            "distributor.whatsappNumber": "whatsappNumber",
            "distributor.displayPhone": "displayPhone",
            "distributor.defaultMessage": "defaultMessage",
            "hero.desktop": "heroDesktop",
            "hero.mobile": "heroMobile",
            "analytics.measurementId": "measurementId"
          };

          Object.entries(data.issues.fieldErrors).forEach(([path, msgs]) => {
            const mappedKey = fieldMap[path] || path;
            parsedErrors[mappedKey] = msgs as string[];
          });

          setFieldErrors(parsedErrors);
        }
        throw new Error(data.error || `Error al ${mode === "edit" ? "actualizar" : "generar"} la página de producto.`);
      }

      setResult({
        ...data,
        requiresPublication: mode === "edit" ? true : data.requiresPublication
      } as GenerationResult);

      if (mode === "edit") {
        setIsOldPageWithoutConfig(false);
        fetchSiteList();
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Ocurrió un error inesperado durante la operación.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublish = async () => {
    if (!result || !result.siteId) return;

    setIsPublishing(true);
    setPublishError(null);
    setPublishResult(null);

    try {
      const response = await fetch("/api/internal/product-pages/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ siteId: result.siteId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al publicar la página de producto.");
      }

      setPublishResult(data as PublicationResult);
    } catch (err: any) {
      setPublishError(err.message || "Ocurrió un error inesperado durante la publicación.");
    } finally {
      setIsPublishing(false);
    }
  };

  const copyManifest = () => {
    if (!result) return;
    const summary = `Sitio: ${result.siteId}\nFecha: ${result.generatedAt}\nDirectorio: ${result.outputDirectory}\nArchivos:\n${result.files.map(f => `- ${f}`).join("\n")}`;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Header del módulo */}
      <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-900">
              {record?.group || "Operations"}
            </span>
            <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
              Generador Interno
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Toggles Modo Crear / Modo Editar */}
            <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-100/70 p-1">
              <button
                type="button"
                onClick={() => handleModeChange("create")}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  mode === "create"
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <PlusCircle className="h-3.5 w-3.5" />
                Nueva Página
              </button>
              <button
                type="button"
                onClick={() => handleModeChange("edit")}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  mode === "edit"
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Edit3 className="h-3.5 w-3.5" />
                Editar Existente
              </button>
            </div>

            {mode === "create" && (
              <Button variant="outline" size="sm" onClick={loadPreset} leftIcon={<Sparkles className="h-4 w-4 text-cyan-600" />}>
                Cargar Ejemplo (Jenny Varela)
              </Button>
            )}

            <Button variant="ghost" size="sm" onClick={resetForm} leftIcon={<RotateCcw className="h-4 w-4" />}>
              Limpiar
            </Button>
          </div>
        </div>

        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
          {mode === "create" ? "Generador de Página de Producto" : "Edición de Página de Producto"}
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
          {mode === "create"
            ? "Genera un paquete estático completo preconfigurado (`index.html`, `styles.css`, `app.js`, `config.js`) listo para desplegar y publicar por cliente."
            : "Consulta la configuración de una página existente, edita sus datos, regenera el paquete estático y publícalo de forma independiente."}
        </p>
      </section>

      {/* Selector de Sitio en Modo Edición */}
      {mode === "edit" && (
        <Card className="border-cyan-200/80 bg-cyan-50/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Search className="h-5 w-5 text-cyan-600" />
                <CardTitle>Seleccionar Página Existente</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchSiteList}
                isLoading={isLoadingList}
                leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
              >
                Actualizar Lista
              </Button>
            </div>
            <CardDescription>
              Selecciona el slug del sitio que deseas consultar y editar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-w-md">
              <Label htmlFor="siteSelector">Página de Producto Registrada</Label>
              <Select
                id="siteSelector"
                value={selectedSiteId}
                onChange={(e) => handleSelectSiteChange(e.target.value)}
                disabled={isLoadingList || isLoadingSiteConfig}
                className="mt-1.5"
              >
                <option value="">-- Selecciona una página --</option>
                {siteList.map((item) => (
                  <option key={item.siteId} value={item.siteId}>
                    {item.siteId} {item.configuration?.distributor?.brandName ? `(${item.configuration.distributor.brandName})` : ""}
                  </option>
                ))}
              </Select>

              {isLoadingSiteConfig && (
                <p className="mt-2 text-xs text-cyan-800 flex items-center gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Cargando configuración de `{selectedSiteId}`...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerta para páginas antiguas sin configuración guardada */}
      {isOldPageWithoutConfig && (
        <Alert variant="warning" title="Configuración de versión anterior" icon={<AlertTriangle className="h-5 w-5 text-amber-600" />}>
          Esta página fue generada antes de activar la edición. Regénérala una vez para habilitar modificaciones futuras.
        </Alert>
      )}

      {/* Alerta de Error Principal */}
      {errorMessage && (
        <Alert variant="error" title="Error en la Operación" icon={<AlertCircle className="h-5 w-5 text-rose-600" />}>
          {errorMessage}
        </Alert>
      )}

      {/* Pantalla de Éxito / Estado de Revisión de Generación */}
      {result && (
        <Card className="border-emerald-200 bg-emerald-50/30 p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">
                    {result.requiresPublication
                      ? "¡Paquete Regenerado — Pendiente de Publicación!"
                      : "¡Página Generada con Éxito!"}
                  </h2>
                  <Badge variant="success">{result.siteId}</Badge>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Generado el: {new Date(result.generatedAt).toLocaleString("es-CO")}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copyManifest}
                leftIcon={copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              >
                {copied ? "¡Copiado!" : "Copiar Resumen"}
              </Button>

              {/* Botón de Publicación: ejecuta POST /api/internal/product-pages/publish */}
              <Button
                variant="primary"
                size="sm"
                onClick={handlePublish}
                isLoading={isPublishing}
                leftIcon={<UploadCloud className="h-4 w-4 text-cyan-300" />}
              >
                Publicar página
              </Button>
            </div>
          </div>

          {result.requiresPublication && (
            <Alert variant="info" title="Estado de Revisión" icon={<RefreshCw className="h-4 w-4 text-blue-600" />}>
              La página ha sido actualizada y regenerada localmente. Haz clic en <strong>"Publicar página"</strong> para sincronizar los cambios con la infraestructura de Hostinger.
            </Alert>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-subtle">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                <Folder className="h-4 w-4 text-cyan-600" />
                Directorio de Salida
              </div>
              <code className="block break-all rounded-xl bg-slate-950 px-4 py-3 font-mono text-xs text-cyan-200">
                {result.outputDirectory}
              </code>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-subtle">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                <FileCode className="h-4 w-4 text-cyan-600" />
                Archivos Generados ({result.files.length})
              </div>
              <ul className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-700">
                {result.files.map((file) => (
                  <li key={file} className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">{file}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Mensaje de Error de Publicación */}
          {publishError && (
            <Alert variant="error" title="Error de Publicación" icon={<AlertCircle className="h-5 w-5 text-rose-600" />}>
              {publishError}
            </Alert>
          )}

          {/* Mensaje de Éxito de Publicación */}
          {publishResult && (
            <Alert variant="success" title="¡Página Publicada Correctamente!" icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}>
              <div className="space-y-1">
                <p className="font-medium text-slate-800">
                  La página de producto para <strong className="text-emerald-950">{publishResult.siteId}</strong> ha sido publicada exitosamente.
                </p>
                <p className="text-xs text-slate-600">
                  <strong>Publicada el:</strong> {new Date(publishResult.publishedAt).toLocaleString("es-CO")}
                </p>
                {publishResult.remoteRoot && (
                  <p className="text-xs text-slate-500 font-mono">
                    Ruta remota: {publishResult.remoteRoot}
                  </p>
                )}
              </div>
            </Alert>
          )}
        </Card>
      )}

      {/* Formulario principal */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Bloque 1: Identificación del Sitio y Distribuidor */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-cyan-600" />
              <CardTitle>Identificación del Sitio y Distribuidor</CardTitle>
            </div>
            <CardDescription>
              Datos principales de identidad del partner y slug único de sitio.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-5 md:grid-cols-2">
            <div>
              <Label htmlFor="siteId">ID de sitio (Slug) *</Label>
              <Input
                id="siteId"
                placeholder="ej. jenny-varela"
                value={form.siteId}
                disabled={mode === "edit"}
                onChange={(e) => handleInputChange("siteId", e.target.value)}
                className={fieldErrors.siteId ? "border-rose-400 focus:border-rose-500" : ""}
              />
              {fieldErrors.siteId ? (
                <p className="mt-1 text-xs text-rose-600">{fieldErrors.siteId[0]}</p>
              ) : (
                <p className="mt-1 text-[11px] text-slate-400">
                  {mode === "edit"
                    ? "El identificador del sitio es fijo durante la edición."
                    : "Slug minúsculo sin espacios (ej. `jenny-varela`)."}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="brandName">Nombre de Marca *</Label>
              <Input
                id="brandName"
                placeholder="ej. Jenny Varela"
                value={form.brandName}
                onChange={(e) => handleInputChange("brandName", e.target.value)}
                className={fieldErrors.brandName ? "border-rose-400 focus:border-rose-500" : ""}
              />
              {fieldErrors.brandName && (
                <p className="mt-1 text-xs text-rose-600">{fieldErrors.brandName[0]}</p>
              )}
            </div>

            <div>
              <Label htmlFor="firstName">Nombre (Pila) *</Label>
              <Input
                id="firstName"
                placeholder="ej. Jenny"
                value={form.firstName}
                onChange={(e) => handleInputChange("firstName", e.target.value)}
                className={fieldErrors.firstName ? "border-rose-400 focus:border-rose-500" : ""}
              />
              {fieldErrors.firstName && (
                <p className="mt-1 text-xs text-rose-600">{fieldErrors.firstName[0]}</p>
              )}
            </div>

            <div>
              <Label htmlFor="fullName">Nombre Completo *</Label>
              <Input
                id="fullName"
                placeholder="ej. Jenny Varela"
                value={form.fullName}
                onChange={(e) => handleInputChange("fullName", e.target.value)}
                className={fieldErrors.fullName ? "border-rose-400 focus:border-rose-500" : ""}
              />
              {fieldErrors.fullName && (
                <p className="mt-1 text-xs text-rose-600">{fieldErrors.fullName[0]}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="role">Rol o Cargo Visible</Label>
              <Input
                id="role"
                placeholder="ej. Distribuidora Autorizada · Gano Excel"
                value={form.role}
                onChange={(e) => handleInputChange("role", e.target.value)}
              />
              <p className="mt-1 text-[11px] text-slate-400">Cargo mostrado en perfil de contacto y footer.</p>
            </div>
          </CardContent>
        </Card>

        {/* Bloque 2: Contacto y WhatsApp */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-cyan-600" />
              <CardTitle>Contacto y Conversión por WhatsApp</CardTitle>
            </div>
            <CardDescription>
              Teléfonos de contacto directo y mensaje automático configurado.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-5 md:grid-cols-2">
            <div>
              <Label htmlFor="whatsappNumber">WhatsApp Internacional *</Label>
              <Input
                id="whatsappNumber"
                placeholder="ej. 573188430283"
                value={form.whatsappNumber}
                onChange={(e) => handleInputChange("whatsappNumber", e.target.value)}
                className={fieldErrors.whatsappNumber ? "border-rose-400 focus:border-rose-500" : ""}
              />
              {fieldErrors.whatsappNumber ? (
                <p className="mt-1 text-xs text-rose-600">{fieldErrors.whatsappNumber[0]}</p>
              ) : (
                <p className="mt-1 text-[11px] text-slate-400">Incluir código de país sin símbolos (ej. 573188430283).</p>
              )}
            </div>

            <div>
              <Label htmlFor="displayPhone">Teléfono Visible / Llamada Directa</Label>
              <Input
                id="displayPhone"
                placeholder="ej. 3188430283"
                value={form.displayPhone}
                onChange={(e) => handleInputChange("displayPhone", e.target.value)}
              />
              <p className="mt-1 text-[11px] text-slate-400">Formato nacional mostrado en texto de llamado tel:.</p>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="defaultMessage">Mensaje Predeterminado de WhatsApp</Label>
              <Textarea
                id="defaultMessage"
                rows={2}
                placeholder="ej. Hola Jenny, vengo de tu página web. Me gustaría tener más información..."
                value={form.defaultMessage}
                onChange={(e) => handleInputChange("defaultMessage", e.target.value)}
              />
              <p className="mt-1 text-[11px] text-slate-400">Texto inicial prellenado al abrir la conversación.</p>
            </div>
          </CardContent>
        </Card>

        {/* Bloque 3: Configuración SEO */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-cyan-600" />
              <CardTitle>Configuración SEO y Metadatos</CardTitle>
            </div>
            <CardDescription>
              Títulos e información para motores de búsqueda y previsualización social.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <div>
              <Label htmlFor="siteTitle">Título SEO (&lt;title&gt;) *</Label>
              <Input
                id="siteTitle"
                placeholder="ej. Jenny Varela — Bienestar y Vitalidad con Gano Excel"
                value={form.siteTitle}
                onChange={(e) => handleInputChange("siteTitle", e.target.value)}
                className={fieldErrors.siteTitle ? "border-rose-400 focus:border-rose-500" : ""}
              />
              {fieldErrors.siteTitle && (
                <p className="mt-1 text-xs text-rose-600">{fieldErrors.siteTitle[0]}</p>
              )}
            </div>

            <div>
              <Label htmlFor="metaDescription">Meta Descripción</Label>
              <Textarea
                id="metaDescription"
                rows={2}
                placeholder="ej. Descubre cómo transformar tu día a día con café, cacao y suplementos enriquecidos..."
                value={form.metaDescription}
                onChange={(e) => handleInputChange("metaDescription", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="faviconUrl">URL del Favicon (Opcional - si se omite, se generará uno automático)</Label>
              <Input
                id="faviconUrl"
                placeholder="https://ejemplo.com/favicon.png"
                value={form.faviconUrl}
                onChange={(e) => handleInputChange("faviconUrl", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Bloque 4: Multimedia y Heroes en R2 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-cyan-600" />
              <CardTitle>Recursos Multimedia (Hero en Cloudflare R2)</CardTitle>
            </div>
            <CardDescription>
              URLs absolutas HTTPS a las imágenes de héroe alojadas en Cloudflare R2 / media.partnerhub.club.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <div>
              <Label htmlFor="heroDesktop">URL HTTPS Hero Desktop *</Label>
              <Input
                id="heroDesktop"
                placeholder="https://media.partnerhub.club/clientes/jenny-varela/producto/v1/hero-desktop.webp"
                value={form.heroDesktop}
                onChange={(e) => handleInputChange("heroDesktop", e.target.value)}
                className={fieldErrors.heroDesktop ? "border-rose-400 focus:border-rose-500" : ""}
              />
              {fieldErrors.heroDesktop && (
                <p className="mt-1 text-xs text-rose-600">{fieldErrors.heroDesktop[0]}</p>
              )}
            </div>

            <div>
              <Label htmlFor="heroMobile">URL HTTPS Hero Mobile *</Label>
              <Input
                id="heroMobile"
                placeholder="https://media.partnerhub.club/clientes/jenny-varela/producto/v1/hero-mobile.webp"
                value={form.heroMobile}
                onChange={(e) => handleInputChange("heroMobile", e.target.value)}
                className={fieldErrors.heroMobile ? "border-rose-400 focus:border-rose-500" : ""}
              />
              {fieldErrors.heroMobile && (
                <p className="mt-1 text-xs text-rose-600">{fieldErrors.heroMobile[0]}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Bloque 5: Analítica de Google Analytics */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-cyan-600" />
              <CardTitle>Analítica y Métricas</CardTitle>
            </div>
            <CardDescription>
              Configura el seguimiento de visitas y eventos de conversión en Google Analytics.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="measurementId">Measurement ID de Google Analytics (Opcional)</Label>
              <Input
                id="measurementId"
                placeholder="ej. G-7F24PBZPDM"
                value={form.measurementId}
                onChange={(e) => handleInputChange("measurementId", e.target.value)}
                className={fieldErrors.measurementId ? "border-rose-400 focus:border-rose-500 font-mono" : "font-mono"}
              />
              {fieldErrors.measurementId ? (
                <p className="mt-1 text-xs text-rose-600">{fieldErrors.measurementId[0]}</p>
              ) : (
                <p className="mt-1 text-[11px] text-slate-400">
                  Formato esperado: `G-XXXXXXXX`. El Measurement ID es público y se utiliza únicamente para recopilar analítica del sitio; no requiere claves privadas ni contraseñas.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Botón de Envío del Formulario */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="submit"
            size="lg"
            isLoading={isSubmitting}
            rightIcon={<ArrowRight className="h-4 w-4" />}
          >
            {mode === "edit" ? "Guardar y Regenerar Paquete" : "Generar Paquete de Producto"}
          </Button>
        </div>
      </form>
    </div>
  );
}
