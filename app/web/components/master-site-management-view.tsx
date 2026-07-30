"use client";

import React, { useState, useEffect, FormEvent } from "react";
import {
  Globe,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  CheckSquare,
  Square,
  Play,
  Layers,
  FileCode,
  Check,
  X,
  AlertTriangle,
  Clock,
  User,
  Phone,
  Search,
  Image as ImageIcon,
  BarChart3,
  ArrowRight,
  Folder,
  UploadCloud,
  FileCode2,
  Copy
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label, Input, Textarea, Select } from "@/components/ui/form";
import { Alert } from "@/components/ui/alert";
import { ModuleRecord } from "@/modules/catalog";

import { HeroImageUploader } from "@/components/ui/hero-image-uploader";

type MasterSiteManagementViewProps = {
  record?: ModuleRecord;
};

export interface MasterFormState {
  brandName: string;
  firstName: string;
  fullName: string;
  role: string;
  whatsappNumber: string;
  displayPhone: string;
  purchaseUrl: string;
  siteTitle: string;
  metaDescription: string;
  heroDesktop: string;
  heroMobile: string;
  defaultMessage: string;
  measurementId: string;
  faviconUrl: string;
}

export interface ClientSiteItem {
  siteId: string;
  domain?: string;
  publicationState?: "NOT_STARTED" | "GENERATED" | "PUBLISHED";
  lastPublishedAt?: string;
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

const INITIAL_MASTER_FORM: MasterFormState = {
  brandName: "Gano Excel Master",
  firstName: "Gano",
  fullName: "Gano Excel Master Template",
  role: "Plantilla Maestra Oficial · Gano Excel",
  whatsappNumber: "573188430283",
  displayPhone: "3188430283",
  purchaseUrl: "https://wompi.co",
  siteTitle: "Gano Excel — Bienestar y Vitalidad con Ganoderma Lucidum",
  metaDescription: "Descubre la línea oficial de productos enriquecidos con Ganoderma Lucidum de Gano Excel.",
  heroDesktop: "",
  heroMobile: "",
  defaultMessage: "Hola, me gustaría más información sobre la oportunidad y productos Gano Excel.",
  measurementId: "G-7F24PBZPDM",
  faviconUrl: ""
};

export function MasterSiteManagementView({ record }: MasterSiteManagementViewProps) {
  // Configuración fija del sitio maestro
  const MASTER_SITE_ID = "ganomaster";
  const MASTER_DOMAIN = "ganomaster.pro";

  // Estados del formulario y operación del master
  const [form, setForm] = useState<MasterFormState>(INITIAL_MASTER_FORM);
  const [isLoadingMasterConfig, setIsLoadingMasterConfig] = useState(true);
  const [isGeneratingMaster, setIsGeneratingMaster] = useState(false);
  const [isPublishingMaster, setIsPublishingMaster] = useState(false);

  // Estados de generación y publicación del master
  const [publicationState, setPublicationState] = useState<"NOT_STARTED" | "GENERATED" | "PUBLISHED">("PUBLISHED");
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [generationOutput, setGenerationOutput] = useState<any | null>(null);
  const [copiedManifest, setCopiedManifest] = useState(false);

  // Mensajes y alertas
  const [masterSuccessMessage, setMasterSuccessMessage] = useState<string | null>(null);
  const [masterErrorMessage, setMasterErrorMessage] = useState<string | null>(null);

  // Aprobación del equipo
  const [isApproved, setIsApproved] = useState(false);

  // Replicación en clientes
  const [clientSites, setClientSites] = useState<ClientSiteItem[]>([]);
  const [isLoadingClientSites, setIsLoadingClientSites] = useState(true);
  const [selectedSiteIds, setSelectedSiteIds] = useState<string[]>([]);
  const [confirmingReplication, setConfirmingReplication] = useState(false);
  const [isReplicating, setIsReplicating] = useState(false);
  const [replicationOutput, setReplicationOutput] = useState<ReplicationResponse | null>(null);
  const [replicationErrorMessage, setReplicationErrorMessage] = useState<string | null>(null);

  // Carga inicial de la configuración guardada de ganomaster
  const fetchMasterConfig = async () => {
    setIsLoadingMasterConfig(true);
    try {
      const res = await fetch(`/api/internal/product-pages/${MASTER_SITE_ID}`);
      if (res.ok) {
        const data = await res.json();
        const cfg = data.configuration || {};
        const site = cfg.site || {};
        const dist = cfg.distributor || {};
        const hero = cfg.hero || {};
        const analytics = cfg.analytics || {};

        const sanitizeHeroUrl = (url: string | undefined): string => {
          if (!url || typeof url !== "string") return "";
          if (url.toLowerCase().includes("jenny")) return "";
          return url.trim();
        };

        setForm({
          brandName: dist.brandName || INITIAL_MASTER_FORM.brandName,
          firstName: dist.firstName || INITIAL_MASTER_FORM.firstName,
          fullName: dist.fullName || INITIAL_MASTER_FORM.fullName,
          role: dist.role || INITIAL_MASTER_FORM.role,
          whatsappNumber: dist.whatsappNumber || INITIAL_MASTER_FORM.whatsappNumber,
          displayPhone: dist.displayPhone || dist.phoneNumber || INITIAL_MASTER_FORM.displayPhone,
          purchaseUrl: dist.purchaseUrl || INITIAL_MASTER_FORM.purchaseUrl,
          siteTitle: site.title || INITIAL_MASTER_FORM.siteTitle,
          metaDescription: site.metaDescription || site.ogDescription || INITIAL_MASTER_FORM.metaDescription,
          heroDesktop: sanitizeHeroUrl(hero.desktop),
          heroMobile: sanitizeHeroUrl(hero.mobile),
          defaultMessage: dist.defaultMessage || INITIAL_MASTER_FORM.defaultMessage,
          measurementId: typeof analytics === "string" ? analytics : (analytics.measurementId || INITIAL_MASTER_FORM.measurementId),
          faviconUrl: site.faviconUrl || cfg.faviconUrl || ""
        });

        if (cfg.updatedAt) setPublishedAt(cfg.updatedAt);
        if (cfg.generatedAt) setGeneratedAt(cfg.generatedAt);
      }
    } catch {
      // Usar valores iniciales si no hay archivo guardado previo
    } finally {
      setIsLoadingMasterConfig(false);
    }
  };

  // Carga de sitios clientes receptores (excluyendo ganomaster)
  const fetchClientSites = async () => {
    setIsLoadingClientSites(true);
    setReplicationErrorMessage(null);

    try {
      const pagesRes = await fetch("/api/internal/product-pages");
      let pageSites: { siteId: string; configuration: any }[] = [];
      if (pagesRes.ok) {
        const data = await pagesRes.json();
        pageSites = data.sites || [];
      }

      const leadsRes = await fetch("/api/internal/activation-leads");
      let leads: any[] = [];
      if (leadsRes.ok) {
        const data = await leadsRes.json();
        leads = data.leads || [];
      }

      // Exclusión obligatoria de ganomaster y ganomaster.pro
      const filtered: ClientSiteItem[] = pageSites
        .filter((item) => {
          const sId = item.siteId?.toLowerCase();
          const dom = item.configuration?.site?.domain || item.configuration?.domain;
          return sId !== MASTER_SITE_ID && dom !== MASTER_DOMAIN;
        })
        .map((item) => {
          const lead = leads.find((l) => l.siteId === item.siteId);
          const domain = item.configuration?.site?.domain || item.configuration?.domain || lead?.onboardingData?.domain;
          const publicationState = lead?.publicationState || "PUBLISHED";
          const lastPublishedAt = lead?.updatedAt || item.configuration?.updatedAt || lead?.createdAt;

          return {
            siteId: item.siteId,
            domain,
            publicationState,
            lastPublishedAt,
            configuration: item.configuration
          };
        });

      setClientSites(filtered);
      setSelectedSiteIds(filtered.map((s) => s.siteId));
    } catch (err) {
      setReplicationErrorMessage((err as Error).message || "No se pudo cargar la lista de clientes.");
    } finally {
      setIsLoadingClientSites(false);
    }
  };

  useEffect(() => {
    fetchMasterConfig();
    fetchClientSites();
  }, []);

  const handleInputChange = (field: keyof MasterFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // 1. Generar Vista Previa Local (POST /api/internal/product-pages/generate) con payload fijo ganomaster / ganomaster.pro
  const handleGenerateMaster = async (e: FormEvent) => {
    e.preventDefault();
    setIsGeneratingMaster(true);
    setMasterSuccessMessage(null);
    setMasterErrorMessage(null);
    setGenerationOutput(null);

    const payload = {
      site: {
        id: MASTER_SITE_ID,
        domain: MASTER_DOMAIN,
        title: form.siteTitle.trim(),
        appName: "ganomaster",
        ogTitle: form.siteTitle.trim(),
        ogDescription: form.metaDescription.trim() || undefined,
        metaDescription: form.metaDescription.trim() || undefined,
        faviconUrl: form.faviconUrl.trim() || undefined
      },
      distributor: {
        brandName: form.brandName.trim(),
        firstName: form.firstName.trim(),
        fullName: form.fullName.trim(),
        role: form.role.trim() || "Plantilla Maestra Oficial · Gano Excel",
        whatsappNumber: form.whatsappNumber.replace(/\D/g, ""),
        phoneNumber: form.displayPhone.trim() || form.whatsappNumber.replace(/\D/g, ""),
        displayPhone: form.displayPhone.trim() || form.whatsappNumber.replace(/\D/g, ""),
        purchaseUrl: form.purchaseUrl.trim() || undefined,
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
      const response = await fetch("/api/internal/product-pages/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudo generar el paquete local de ganomaster.");
      }

      setGenerationOutput(data);
      const now = new Date().toISOString();
      setGeneratedAt(now);
      setPublicationState("GENERATED");
      setMasterSuccessMessage("Vista previa local generada. Haz clic en 'Publicar en ganomaster.pro' para desplegar los cambios en vivo.");
    } catch (err: any) {
      setMasterErrorMessage(err.message || "Error al generar la plantilla maestra.");
    } finally {
      setIsGeneratingMaster(false);
    }
  };

  // 2. Publicar en ganomaster.pro (POST /api/internal/product-pages/publish)
  const handlePublishMaster = async () => {
    setIsPublishingMaster(true);
    setMasterSuccessMessage(null);
    setMasterErrorMessage(null);

    try {
      const response = await fetch("/api/internal/product-pages/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId: MASTER_SITE_ID })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudo publicar en ganomaster.pro.");
      }

      const now = new Date().toISOString();
      setPublishedAt(now);
      setPublicationState("PUBLISHED");
      setMasterSuccessMessage("Vista previa publicada. Revisa ganomaster.pro antes de replicar.");
    } catch (err: any) {
      setMasterErrorMessage(err.message || "Error al publicar en ganomaster.pro.");
    } finally {
      setIsPublishingMaster(false);
    }
  };

  // 3. Control de selección de clientes receptores
  const handleToggleSelectAll = () => {
    if (selectedSiteIds.length === clientSites.length) {
      setSelectedSiteIds([]);
    } else {
      setSelectedSiteIds(clientSites.map((s) => s.siteId));
    }
  };

  const handleToggleSite = (siteId: string) => {
    setSelectedSiteIds((prev) =>
      prev.includes(siteId) ? prev.filter((id) => id !== siteId) : [...prev, siteId]
    );
  };

  // 4. Replicar Cambios Aprobados (POST /api/internal/product-pages/replicate)
  const handleExecuteReplication = async () => {
    if (!isApproved || selectedSiteIds.length === 0) return;

    setIsReplicating(true);
    setReplicationErrorMessage(null);
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
      setConfirmingReplication(false);
      fetchClientSites();
    } catch (err) {
      setReplicationErrorMessage((err as Error).message || "Ocurrió un error durante la replicación.");
    } finally {
      setIsReplicating(false);
    }
  };

  const copyManifest = () => {
    if (!generationOutput) return;
    const summary = `Sitio: ${generationOutput.siteId}\nFecha: ${generationOutput.generatedAt}\nDirectorio: ${generationOutput.outputDirectory}\nArchivos:\n${generationOutput.files.map((f: string) => `- ${f}`).join("\n")}`;
    navigator.clipboard.writeText(summary);
    setCopiedManifest(true);
    setTimeout(() => setCopiedManifest(false), 2000);
  };

  const getPublicationBadge = (pubState?: "NOT_STARTED" | "GENERATED" | "PUBLISHED") => {
    switch (pubState) {
      case "PUBLISHED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            PUBLISHED
          </span>
        );
      case "GENERATED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-cyan-100 dark:bg-cyan-950/60 px-2.5 py-1 text-xs font-bold text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800">
            <RefreshCw className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
            GENERATED
          </span>
        );
      case "NOT_STARTED":
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950/60 px-2.5 py-1 text-xs font-bold text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            NOT_STARTED
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 animate-fade-in text-slate-900 dark:text-slate-100">
      {/* HEADER DEL MÓDULO */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-cyan-100 dark:bg-cyan-950 px-3 py-1 text-xs font-bold uppercase tracking-wider text-cyan-900 dark:text-cyan-300">
              {record?.group || "Operaciones"}
            </span>
            <span className="rounded-full border border-slate-200 dark:border-slate-800 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Editor de Plantilla Maestra
            </span>
          </div>

          <a
            href="https://ganomaster.pro"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 px-4 py-2 text-xs font-bold text-white shadow transition"
          >
            <Globe className="h-4 w-4" />
            <span>Abrir ganomaster.pro</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          Editor de Plantilla Maestra (`ganomaster.pro`)
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
          Edita la configuración de la plantilla maestra con identificador fijo <code className="font-mono font-bold text-cyan-600 dark:text-cyan-400">ganomaster</code> y dominio <code className="font-mono font-bold text-cyan-600 dark:text-cyan-400">ganomaster.pro</code>. Genera la vista previa y publícala antes de replicar a los clientes.
        </p>
      </section>

      {/* DASHBOARD DE ESTADO DEL MASTER */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <Globe className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Estado Actual de ganomaster.pro
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Información técnica y fechas de actualización de la plantilla maestra
              </p>
            </div>
          </div>

          <div>{getPublicationBadge(publicationState)}</div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 text-xs">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950 space-y-1">
            <span className="text-slate-400 font-bold text-[10px] uppercase block">Dominio Fijo</span>
            <a
              href="https://ganomaster.pro"
              target="_blank"
              rel="noopener noreferrer"
              className="font-extrabold font-mono text-cyan-600 dark:text-cyan-400 text-sm hover:underline inline-flex items-center gap-1"
            >
              {MASTER_DOMAIN}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950 space-y-1">
            <span className="text-slate-400 font-bold text-[10px] uppercase block">siteId Fijo</span>
            <span className="font-extrabold font-mono text-slate-900 dark:text-white text-sm">
              {MASTER_SITE_ID}
            </span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950 space-y-1">
            <span className="text-slate-400 font-bold text-[10px] uppercase block">Fecha de Generación</span>
            <span className="font-bold text-slate-700 dark:text-slate-300 text-xs">
              {generatedAt ? new Date(generatedAt).toLocaleString("es-CO") : "No generada aún"}
            </span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950 space-y-1">
            <span className="text-slate-400 font-bold text-[10px] uppercase block">Última Publicación</span>
            <span className="font-bold text-slate-700 dark:text-slate-300 text-xs">
              {publishedAt ? new Date(publishedAt).toLocaleString("es-CO") : "Publicación inicial activa"}
            </span>
          </div>
        </div>
      </section>

      {/* NOTIFICACIONES Y ALERTAS DEL MASTER */}
      {masterSuccessMessage && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{masterSuccessMessage}</span>
          </div>
          <button onClick={() => setMasterSuccessMessage(null)} className="text-emerald-800 dark:text-emerald-300">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {masterErrorMessage && (
        <Alert variant="error" title="Error en la Operación" icon={<AlertCircle className="h-5 w-5 text-rose-600" />}>
          {masterErrorMessage}
        </Alert>
      )}

      {/* RESUMEN DE ARCHIVOS GENERADOS */}
      {generationOutput && (
        <Card className="border-cyan-200 bg-cyan-50/30 dark:border-cyan-800 dark:bg-cyan-950/20 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                Paquete Local de ganomaster Generado
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Directorio: <code className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{generationOutput.outputDirectory}</code>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copyManifest}
                leftIcon={copiedManifest ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              >
                {copiedManifest ? "¡Copiado!" : "Copiar Resumen"}
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={handlePublishMaster}
                isLoading={isPublishingMaster}
                leftIcon={<UploadCloud className="h-4 w-4 text-cyan-300" />}
              >
                Publicar en ganomaster.pro
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* FORMULARIO EDITABLE DE CONFIGURACIÓN DEL MASTER */}
      <form onSubmit={handleGenerateMaster} className="space-y-6">
        {/* Bloque 1: Identificación y Marca */}
        <Card className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                1. Identificación y Datos de Marca (`ganomaster`)
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
              Configuración de la marca maestra oficial y nombres de presentación.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-5 md:grid-cols-2">
            <div>
              <Label htmlFor="brandName">Nombre de Marca *</Label>
              <Input
                id="brandName"
                required
                placeholder="ej. Gano Excel Master"
                value={form.brandName}
                onChange={(e) => handleInputChange("brandName", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="firstName">Nombre (Pila) *</Label>
              <Input
                id="firstName"
                required
                placeholder="ej. Gano"
                value={form.firstName}
                onChange={(e) => handleInputChange("firstName", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="fullName">Nombre Completo *</Label>
              <Input
                id="fullName"
                required
                placeholder="ej. Gano Excel Master Template"
                value={form.fullName}
                onChange={(e) => handleInputChange("fullName", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="role">Rol o Cargo Visible</Label>
              <Input
                id="role"
                placeholder="ej. Plantilla Maestra Oficial · Gano Excel"
                value={form.role}
                onChange={(e) => handleInputChange("role", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Bloque 2: Contacto y Pasarela */}
        <Card className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                2. Contacto, WhatsApp y URL de Compra
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
              Datos de contacto oficial y pasarela de pago para la plantilla maestra.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-5 md:grid-cols-2">
            <div>
              <Label htmlFor="whatsappNumber">WhatsApp Internacional *</Label>
              <Input
                id="whatsappNumber"
                required
                placeholder="ej. 573188430283"
                value={form.whatsappNumber}
                onChange={(e) => handleInputChange("whatsappNumber", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="displayPhone">Teléfono Visible / Llamada Directa</Label>
              <Input
                id="displayPhone"
                placeholder="ej. 3188430283"
                value={form.displayPhone}
                onChange={(e) => handleInputChange("displayPhone", e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="purchaseUrl">URL de Compra / Pasarela (Checkout)</Label>
              <Input
                id="purchaseUrl"
                placeholder="ej. https://wompi.co"
                value={form.purchaseUrl}
                onChange={(e) => handleInputChange("purchaseUrl", e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="defaultMessage">Mensaje Predeterminado de WhatsApp</Label>
              <Textarea
                id="defaultMessage"
                rows={2}
                placeholder="ej. Hola, me gustaría tener más información..."
                value={form.defaultMessage}
                onChange={(e) => handleInputChange("defaultMessage", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Bloque 3: SEO y Favicon */}
        <Card className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                3. Configuración SEO y Favicon
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
              Metadatos para la versión maestra ganomaster.pro.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <div>
              <Label htmlFor="siteTitle">Título SEO (&lt;title&gt;) *</Label>
              <Input
                id="siteTitle"
                required
                placeholder="ej. Gano Excel — Bienestar y Vitalidad con Ganoderma Lucidum"
                value={form.siteTitle}
                onChange={(e) => handleInputChange("siteTitle", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="metaDescription">Meta Descripción</Label>
              <Textarea
                id="metaDescription"
                rows={2}
                placeholder="ej. Descubre la línea oficial de productos enriquecidos..."
                value={form.metaDescription}
                onChange={(e) => handleInputChange("metaDescription", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="faviconUrl">URL del Favicon (Opcional - automático si se omite)</Label>
              <Input
                id="faviconUrl"
                placeholder="https://ejemplo.com/favicon.png"
                value={form.faviconUrl}
                onChange={(e) => handleInputChange("faviconUrl", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Bloque 4: Multimedia y Héroes en R2 */}
        <Card className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                4. Recursos Multimedia (Imágenes Hero en Cloudflare R2)
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
              Selecciona los archivos de imagen para Hero Desktop y Hero Mobile. Se subirán y optimizarán automáticamente a R2.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <HeroImageUploader
              label="Hero Desktop (Pantallas Grandes)"
              variant="hero-desktop"
              siteId={MASTER_SITE_ID}
              value={form.heroDesktop}
              onChange={(url) => handleInputChange("heroDesktop", url)}
              helpText="Imagen de héroe optimizada para computadores y pantallas de escritorio."
            />

            <HeroImageUploader
              label="Hero Mobile (Dispositivos Móviles)"
              variant="hero-mobile"
              siteId={MASTER_SITE_ID}
              value={form.heroMobile}
              onChange={(url) => handleInputChange("heroMobile", url)}
              helpText="Imagen de héroe optimizada para smartphones y tablets."
            />
          </CardContent>
        </Card>

        {/* Bloque 5: Analítica */}
        <Card className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                5. Google Analytics
              </CardTitle>
            </div>
          </CardHeader>

          <CardContent>
            <div>
              <Label htmlFor="measurementId">Measurement ID de Google Analytics</Label>
              <Input
                id="measurementId"
                placeholder="ej. G-7F24PBZPDM"
                value={form.measurementId}
                onChange={(e) => handleInputChange("measurementId", e.target.value)}
                className="font-mono"
              />
            </div>
          </CardContent>
        </Card>

        {/* BOTONES DE ACCIÓN PRINCIPALES DEL MASTER */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          <Button
            type="submit"
            size="lg"
            isLoading={isGeneratingMaster}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Generar vista previa
          </Button>

          <Button
            type="button"
            size="lg"
            variant="primary"
            onClick={handlePublishMaster}
            isLoading={isPublishingMaster}
            leftIcon={<UploadCloud className="h-4 w-4 text-cyan-300" />}
          >
            Publicar en ganomaster.pro
          </Button>
        </div>
      </form>

      {/* SECCIÓN 5: APROBACIÓN DEL EQUIPO */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <ShieldCheck className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Aprobación del Equipo
          </h2>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-950 space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isApproved}
              onChange={(e) => setIsApproved(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
            />
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-900 dark:text-white select-none">
                He revisado y aprobado la versión actual de ganomaster.pro
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                La replicación masiva en clientes estará habilitada únicamente cuando la versión publicada en <code className="font-mono">ganomaster.pro</code> esté totalmente aprobada.
              </p>
            </div>
          </label>

          {!isApproved && (
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-xs font-semibold pt-1">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>La replicación masiva está deshabilitada hasta que apruebes la versión publicada en ganomaster.pro.</span>
            </div>
          )}
        </div>
      </section>

      {/* SECCIÓN 6: REPLICAR CAMBIOS APROBADOS */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <Layers className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Replicar Cambios Aprobados a Sitios Clientes
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Selecciona únicamente los sitios de clientes/empresarios receptores. El sitio ganomaster está excluido permanentemente.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleToggleSelectAll}
              disabled={clientSites.length === 0}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition disabled:opacity-50"
            >
              {selectedSiteIds.length === clientSites.length && clientSites.length > 0 ? (
                <CheckSquare className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
              ) : (
                <Square className="h-4 w-4 text-slate-400" />
              )}
              <span>Todos los clientes ({clientSites.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setConfirmingReplication(true)}
              disabled={!isApproved || selectedSiteIds.length === 0 || isReplicating}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 px-5 py-2 text-xs font-bold text-white shadow transition disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
              <span>Replicar cambios aprobados ({selectedSiteIds.length})</span>
            </button>
          </div>
        </div>

        {/* DIÁLOGO DE CONFIRMACIÓN */}
        {confirmingReplication && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-700/60 dark:bg-amber-950/40 space-y-3 animate-in fade-in">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  Confirmación de Replicación Masiva en Clientes
                </h4>
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  Estás a punto de replicar la plantilla maestra aprobada <strong>ganomaster.pro</strong> en{" "}
                  <strong>{selectedSiteIds.length} cliente(s) seleccionado(s)</strong>:
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

        {/* ALERTA DE ERROR EN REPLICACIÓN */}
        {replicationErrorMessage && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm font-semibold text-rose-900 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{replicationErrorMessage}</span>
            </div>
            <button onClick={() => setReplicationErrorMessage(null)} className="text-rose-800 dark:text-rose-300">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* TABLA DE SITIOS CLIENTES */}
        {isLoadingClientSites ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400 space-y-3">
            <RefreshCw className="h-8 w-8 animate-spin text-cyan-500" />
            <p className="text-sm font-medium">Cargando sitios clientes...</p>
          </div>
        ) : clientSites.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FileCode2 className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              No hay sitios clientes disponibles
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Aún no existen configuraciones de páginas de clientes para recibir la replicación.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                <tr>
                  <th className="py-3 px-4 w-10">Selección</th>
                  <th className="py-3 px-4">Site ID Cliente</th>
                  <th className="py-3 px-4">Dominio</th>
                  <th className="py-3 px-4">Estado de Publicación</th>
                  <th className="py-3 px-4">Última Publicación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {clientSites.map((site) => {
                  const isChecked = selectedSiteIds.includes(site.siteId);

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

                      <td className="py-3.5 px-4 font-mono text-xs">
                        {site.domain ? (
                          <a
                            href={`https://${site.domain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-600 dark:text-cyan-400 font-bold hover:underline inline-flex items-center gap-1"
                          >
                            <Globe className="h-3.5 w-3.5" />
                            {site.domain}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-slate-400 italic">Sin dominio</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {getPublicationBadge(site.publicationState)}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 text-[11px]">
                        {site.lastPublishedAt
                          ? new Date(site.lastPublishedAt).toLocaleString("es-CO")
                          : "No disponible"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* RESULTADO INDIVIDUAL DE REPLICACIÓN */}
      {replicationOutput && (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              Resultado Individual de Replicación ({replicationOutput.count} clientes)
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
                    {resItem.error ? (
                      <span className="rounded bg-rose-100 dark:bg-rose-950/60 px-2 py-0.5 text-[11px] font-bold text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                        Error en Replicación
                      </span>
                    ) : (
                      <span className="rounded bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                        Replicado Exitosamente
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                    Origen: <code className="font-mono font-bold">ganomaster.pro</code>
                  </p>
                </div>

                {resItem.error ? (
                  <div className="text-rose-600 dark:text-rose-400 text-xs font-semibold">
                    {resItem.error}
                  </div>
                ) : (
                  <div className="flex items-center gap-4 text-slate-600 dark:text-slate-400 text-[11px]">
                    <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                      <Check className="h-3.5 w-3.5" /> HTML Generado
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-cyan-600 dark:text-cyan-400">
                      <Check className="h-3.5 w-3.5" /> Sitio Publicado
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
