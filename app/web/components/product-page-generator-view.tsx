"use client";

import { useState, FormEvent, useEffect } from "react";
import {
  CheckCircle2,
  AlertCircle,
  FileCode,
  User,
  Phone,
  Search,
  ImageIcon,
  Copy,
  Check,
  RotateCcw,
  ArrowRight,
  Folder,
  UploadCloud,
  BarChart3,
  RefreshCw,
  AlertTriangle,
  Globe,
  Link2,
  Users,
  Sparkles
} from "lucide-react";

import { FontSelector, PaletteSelector } from "@/components/ui/theme-selectors";
import { FontPreset, PalettePreset } from "@/lib/theme-presets";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label, Input, Textarea } from "@/components/ui/form";
import { Alert } from "@/components/ui/alert";
import { HeroImageUploader } from "@/components/ui/hero-image-uploader";
import { ModuleRecord } from "@/modules/catalog";
import {
  VerificationBadge,
  VerifyNowButton,
  FailedChecksDetails,
  DeliveryGuardAlert,
  ProductPageVerificationResult,
  ProductPageVerificationCheck,
  ProductPageSiteSummary
} from "@/components/ui/verification-status-panel";

type ProductPageGeneratorViewProps = {
  record?: ModuleRecord;
};

const ADMIN_APP_ORIGIN = "https://app.partnerhub.club";
const GENERATION_RESULT_ID = "product-page-generation-result";
const INTERNAL_PREVIEW_HOSTS = new Set(["0.0.0.0", "127.0.0.1", "::", "localhost"]);

function getPublicBrowserOrigin() {
  if (typeof window === "undefined") return ADMIN_APP_ORIGIN;

  return INTERNAL_PREVIEW_HOSTS.has(window.location.hostname.toLowerCase())
    ? ADMIN_APP_ORIGIN
    : window.location.origin;
}

function getSafePreviewUrl(siteId?: string, previewUrl?: string) {
  if (siteId) {
    return new URL(`/api/internal/product-pages/preview/${siteId}/`, getPublicBrowserOrigin()).toString();
  }

  if (!previewUrl) return undefined;

  const fallbackOrigin = getPublicBrowserOrigin();

  try {
    const url = new URL(previewUrl, fallbackOrigin);

    if (INTERNAL_PREVIEW_HOSTS.has(url.hostname.toLowerCase())) {
      return `${ADMIN_APP_ORIGIN}${url.pathname}${url.search}${url.hash}`;
    }

    return url.toString();
  } catch {
    return undefined;
  }
}

export interface ActivationLeadRecord {
  id: string;
  fullName: string;
  whatsapp: string;
  email: string | null;
  brandName: string;
  mainProduct?: string;
  paymentMethod: "wompi" | "direct";
  status: "NEW" | "CONTACTED" | "PAID" | "CONVERTED" | "CANCELLED";
  siteId: string | null;
  publicationState?: "NOT_STARTED" | "GENERATED" | "PUBLISHED" | "VERIFIED" | "VERIFY_FAILED" | string;
  lastVerification?: ProductPageVerificationResult | null;
  onboardingData?: {
    domain?: string;
    country?: string;
    whatsapp?: string;
    phone?: string;
    purchaseUrl?: string;
    heroDesktopUrl?: string;
    heroMobileUrl?: string;
    logoMode?: "TYPOGRAPHY" | "IMAGE";
    logoUrl?: string;
    faviconUrl?: string;
    seoTitle?: string;
    metaDescription?: string;
    defaultMessage?: string;
    analyticsMeasurementId?: string;
    fontPreset?: FontPreset;
    palettePreset?: PalettePreset;
  };
  createdAt: string;
}

interface FormState {
  siteId: string;
  domain: string;
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
  fontPreset: FontPreset;
  palettePreset: PalettePreset;
}

interface GenerationResult {
  siteId: string;
  generatedAt: string;
  outputDirectory: string;
  previewUrl?: string;
  files: string[];
  requiresPublication?: boolean;
}

interface PublicationResult {
  siteId: string;
  publishedAt: string;
  remoteRoot: string;
  files: string[];
  domain?: string;
  verifiedAt?: string;
  publicationState?: "VERIFIED" | "VERIFY_FAILED" | string;
  verificationStatus?: "VERIFIED" | "VERIFY_FAILED" | string;
  checks?: ProductPageVerificationCheck[];
}

const INITIAL_FORM: FormState = {
  siteId: "",
  domain: "",
  brandName: "",
  firstName: "",
  fullName: "",
  role: "Distribuidor Autorizado · Gano Excel",
  whatsappNumber: "",
  displayPhone: "",
  purchaseUrl: "",
  siteTitle: "",
  metaDescription: "",
  heroDesktop: "https://media.partnerhub.club/comunes/producto/v1/hero-desktop.webp",
  heroMobile: "https://media.partnerhub.club/comunes/producto/v1/hero-mobile.webp",
  defaultMessage: "",
  measurementId: "",
  faviconUrl: "",
  fontPreset: "executive",
  palettePreset: "cobalt-cyan"
};

const FONT_PRESET_VALUES: FontPreset[] = [
  "executive",
  "modern",
  "editorial",
  "friendly",
  "premium",
  "minimal",
  "serif-chic",
  "romantic-serif",
  "luxury-serif"
];
const PALETTE_PRESET_VALUES: PalettePreset[] = [
  "cobalt-cyan",
  "emerald-slate",
  "coffee-gold",
  "rose-graphite",
  "indigo-lime",
  "teal-navy",
  "wine-blush",
  "forest-mint",
  "charcoal-amber",
  "sky-stone"
];

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function pickFirst(...values: Array<string | undefined | null>) {
  return values.find((value) => typeof value === "string" && value.trim())?.trim() ?? "";
}

function fontPresetValue(value: unknown): FontPreset | undefined {
  return typeof value === "string" && FONT_PRESET_VALUES.includes(value as FontPreset)
    ? (value as FontPreset)
    : undefined;
}

function palettePresetValue(value: unknown): PalettePreset | undefined {
  return typeof value === "string" && PALETTE_PRESET_VALUES.includes(value as PalettePreset)
    ? (value as PalettePreset)
    : undefined;
}

function summarizeValidationErrors(errors: Record<string, string[]>) {
  const labels: Record<string, string> = {
    siteId: "ID de sitio",
    domain: "Dominio",
    brandName: "Nombre de marca",
    firstName: "Nombre de pila",
    fullName: "Nombre completo",
    whatsappNumber: "WhatsApp",
    siteTitle: "Titulo SEO",
    heroDesktop: "Hero para computador",
    heroMobile: "Hero para celular",
    measurementId: "Google Analytics"
  };

  const summary = Object.keys(errors).map((field) => labels[field] || field);
  return summary.length
    ? `Por favor corrige estos campos antes de continuar: ${summary.join(", ")}.`
    : "Por favor corrige los errores resaltados antes de continuar.";
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function suggestSiteId(lead: ActivationLeadRecord): string {
  const base = lead.brandName || lead.fullName || "sitio";
  return slugify(base);
}

export function ProductPageGeneratorView({ record }: ProductPageGeneratorViewProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [copied, setCopied] = useState(false);

  // Estados de empresarios
  const [leads, setLeads] = useState<ActivationLeadRecord[]>([]);
  const [productPages, setProductPages] = useState<ProductPageSiteSummary[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(true);
  const [selectedLead, setSelectedLead] = useState<ActivationLeadRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLinkingSiteId, setIsLinkingSiteId] = useState(false);

  // Estados de publicación
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishStep, setPublishStep] = useState<"IDLE" | "SFTP" | "VERIFYING">("IDLE");
  const [publishResult, setPublishResult] = useState<PublicationResult | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const safePreviewUrl = getSafePreviewUrl(result?.siteId, result?.previewUrl);

  const fetchLeads = async () => {
    setIsLoadingLeads(true);
    try {
      const [leadsRes, pagesRes] = await Promise.all([
        fetch("/api/internal/activation-leads"),
        fetch("/api/internal/product-pages")
      ]);

      let leadList: ActivationLeadRecord[] = [];
      let pageSites: ProductPageSiteSummary[] = [];

      if (leadsRes.ok) {
        const data = await leadsRes.json();
        leadList = data.leads || [];
      }

      if (pagesRes.ok) {
        const pData = await pagesRes.json();
        pageSites = pData.sites || [];
      }

      setProductPages(pageSites);

      const merged = leadList.map((lead) => {
        const matchedSite = pageSites.find((s) => s.siteId === lead.siteId);
        const lastVerification = matchedSite?.lastVerification || null;
        let effectiveState = lead.publicationState;
        if (lastVerification?.status) {
          effectiveState = lastVerification.status;
        }
        return {
          ...lead,
          publicationState: effectiveState,
          lastVerification
        };
      });

      setLeads(merged);
    } catch {
      // Ignorar fallos de red secundarios al listar
    } finally {
      setIsLoadingLeads(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleLeadVerificationUpdated = (siteId: string, verifResult: ProductPageVerificationResult) => {
    setLeads((prev) =>
      prev.map((l) => {
        if (l.siteId === siteId) {
          return {
            ...l,
            publicationState: verifResult.status,
            lastVerification: verifResult
          };
        }
        return l;
      })
    );

    if (selectedLead && selectedLead.siteId === siteId) {
      setSelectedLead((prev) =>
        prev
          ? {
              ...prev,
              publicationState: verifResult.status,
              lastVerification: verifResult
            }
          : null
      );
    }
  };

  // Filtrar exclusivamente empresarios/clientes (excluyendo ganomaster)
  const clientLeads = leads.filter(
    (lead) => lead.siteId !== "ganomaster" && lead.onboardingData?.domain !== "ganomaster.pro"
  );

  // Ordenar empresarios: PAID y CONTACTED primero
  const sortedLeads = [...clientLeads].sort((a, b) => {
    const priorityOrder: Record<string, number> = {
      PAID: 1,
      CONTACTED: 2,
      NEW: 3,
      CONVERTED: 4,
      CANCELLED: 5
    };
    const pA = priorityOrder[a.status] || 99;
    const pB = priorityOrder[b.status] || 99;
    if (pA !== pB) return pA - pB;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const filteredLeads = sortedLeads.filter((lead) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      lead.fullName.toLowerCase().includes(q) ||
      lead.brandName.toLowerCase().includes(q) ||
      lead.whatsapp.toLowerCase().includes(q) ||
      (lead.siteId && lead.siteId.toLowerCase().includes(q)) ||
      (lead.onboardingData?.domain && lead.onboardingData.domain.toLowerCase().includes(q))
    );
  });

  const handleSelectLead = (lead: ActivationLeadRecord) => {
    setSelectedLead(lead);
    setErrorMessage(null);
    setSuccessMessage(null);
    setFieldErrors({});
    setResult(null);
    setPublishResult(null);
    setPublishError(null);

    const suggestedSlug = suggestSiteId(lead);
    const effectiveSiteId = lead.siteId || suggestedSlug;
    const savedConfig = productPages.find((page) => page.siteId === effectiveSiteId)?.configuration ?? null;
    const savedSite = objectValue(savedConfig?.site);
    const savedDistributor = objectValue(savedConfig?.distributor);
    const savedHero = objectValue(savedConfig?.hero);
    const savedAnalytics = objectValue(savedConfig?.analytics);
    const savedIntegrations = objectValue(savedConfig?.integrations);
    const savedAnalyticsIntegration = objectValue(savedIntegrations.analytics);
    const savedTheme = objectValue(savedConfig?.theme);
    const domain = pickFirst(stringValue(savedSite.domain), lead.onboardingData?.domain);
    const firstName = pickFirst(stringValue(savedDistributor.firstName), lead.fullName?.trim().split(" ")[0]);
    const brandName = pickFirst(stringValue(savedDistributor.brandName), lead.brandName);
    const fullName = pickFirst(stringValue(savedDistributor.fullName), lead.fullName);

    setForm({
      siteId: effectiveSiteId,
      domain: domain,
      brandName,
      fullName,
      firstName,
      role: "Distribuidor Autorizado · Gano Excel",
      whatsappNumber: pickFirst(stringValue(savedDistributor.whatsappNumber), lead.onboardingData?.whatsapp, lead.whatsapp),
      displayPhone: pickFirst(
        stringValue(savedDistributor.displayPhone),
        stringValue(savedDistributor.phoneNumber),
        lead.onboardingData?.phone,
        lead.whatsapp
      ),
      purchaseUrl: pickFirst(stringValue(savedDistributor.purchaseUrl), lead.onboardingData?.purchaseUrl),
      siteTitle: pickFirst(stringValue(savedSite.title), lead.onboardingData?.seoTitle, brandName ? `${brandName} - Bienestar y Vitalidad con Gano Excel` : ""),
      metaDescription: pickFirst(stringValue(savedSite.metaDescription), stringValue(savedSite.ogDescription), lead.onboardingData?.metaDescription, brandName
        ? `Descubre como transformar tu dia a dia con cafe, cacao y suplementos enriquecidos con Ganoderma lucidum por ${brandName}.`
        : ""),
      heroDesktop: pickFirst(stringValue(savedHero.desktop), lead.onboardingData?.heroDesktopUrl, "https://media.partnerhub.club/comunes/producto/v1/hero-desktop.webp"),
      heroMobile: pickFirst(stringValue(savedHero.mobile), lead.onboardingData?.heroMobileUrl, "https://media.partnerhub.club/comunes/producto/v1/hero-mobile.webp"),
      defaultMessage: pickFirst(
        stringValue(savedDistributor.defaultMessage),
        lead.onboardingData?.defaultMessage,
        firstName ? `Hola ${firstName}, vengo de tu pagina web. Me gustaria tener mas informacion sobre el Ganoderma de Gano Excel.` : ""
      ),
      measurementId: pickFirst(
        stringValue(savedAnalytics.measurementId),
        stringValue(savedAnalyticsIntegration.measurementId),
        lead.onboardingData?.analyticsMeasurementId
      ),
      faviconUrl: pickFirst(stringValue(savedSite.faviconUrl), lead.onboardingData?.faviconUrl),
      fontPreset: fontPresetValue(savedTheme.fontPreset) || lead.onboardingData?.fontPreset || "executive",
      palettePreset: palettePresetValue(savedTheme.palettePreset) || lead.onboardingData?.palettePreset || "cobalt-cyan"
    });
  };

  const handleLinkSiteIdToLead = async () => {
    if (!selectedLead || !form.siteId.trim()) return;

    setIsLinkingSiteId(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/internal/activation-leads/${selectedLead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId: form.siteId.trim().toLowerCase() })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "No se pudo vincular el siteId al empresario.");
      }

      const updatedLead = json.lead || json;
      setSelectedLead(updatedLead);
      setLeads((prev) => prev.map((l) => (l.id === updatedLead.id ? updatedLead : l)));
      setSuccessMessage(`Sitio "${updatedLead.siteId}" vinculado correctamente a ${updatedLead.brandName}.`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      setErrorMessage((err as Error).message);
    } finally {
      setIsLinkingSiteId(false);
    }
  };

  const handleInputChange = (field: keyof FormState, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const resetForm = () => {
    setSelectedLead(null);
    setForm(INITIAL_FORM);
    setErrorMessage(null);
    setSuccessMessage(null);
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
      errors.siteId = ["El ID de sitio (slug) es requerido."];
    } else if (!slugRegex.test(form.siteId.trim())) {
      errors.siteId = ["El ID de sitio debe ser un slug en minúsculas (ej. john-smith)."];
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

    if (form.heroDesktop.trim() && !form.heroDesktop.startsWith("https://")) {
      errors.heroDesktop = ["La URL de Hero Desktop debe usar HTTPS."];
    }

    if (form.heroMobile.trim() && !form.heroMobile.startsWith("https://")) {
      errors.heroMobile = ["La URL de Hero Mobile debe usar HTTPS."];
    }

    if (form.measurementId.trim() && !measurementIdRegex.test(form.measurementId.trim())) {
      errors.measurementId = ["El Measurement ID debe tener el formato G-XXXXXXXX (ej. G-7F24PBZPDM)."];
    }

    if (form.purchaseUrl.trim()) {
      try {
        const purchaseUrl = new URL(form.purchaseUrl.trim());

        if (purchaseUrl.protocol !== "https:") {
          errors.purchaseUrl = ["La URL de compra debe usar HTTPS."];
        } else if (purchaseUrl.hostname.toLowerCase() === "colombia.ganoexcel.com") {
          errors.purchaseUrl = ["Usa la URL exacta de compra del empresario. No uses colombia.ganoexcel.com."];
        }
      } catch {
        errors.purchaseUrl = ["La URL de compra debe ser una URL valida."];
      }
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setErrorMessage(summarizeValidationErrors(errors));
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setResult(null);
    setPublishResult(null);
    setPublishError(null);

    if (!validateFormClientSide()) return;

    setIsSubmitting(true);

    const payload = {
      site: {
        id: form.siteId.trim(),
        domain: form.domain.trim().toLowerCase() || undefined,
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
        purchaseUrl: form.purchaseUrl.trim() || undefined,
        defaultMessage: form.defaultMessage.trim() || undefined
      },
      hero: {
        desktop: form.heroDesktop.trim() || "https://media.partnerhub.club/comunes/producto/v1/hero-desktop.webp",
        mobile: form.heroMobile.trim() || "https://media.partnerhub.club/comunes/producto/v1/hero-mobile.webp"
      },
      analytics: form.measurementId.trim()
        ? { measurementId: form.measurementId.trim().toUpperCase() }
        : undefined,
      integrations: {
        analytics: form.measurementId.trim()
          ? { provider: "GA4", measurementId: form.measurementId.trim().toUpperCase() }
          : undefined
      },
      theme: {
        fontPreset: form.fontPreset || "executive",
        palettePreset: form.palettePreset || "cobalt-cyan"
      }
    };

    try {
      const response = await fetch("/api/internal/product-pages/generate", {
        method: "POST",
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
            "distributor.purchaseUrl": "purchaseUrl",
            "distributor.defaultMessage": "defaultMessage",
            "hero.desktop": "heroDesktop",
            "hero.mobile": "heroMobile",
            "analytics.measurementId": "measurementId"
          };

          Object.entries(data.issues.fieldErrors).forEach(([path, msgs]) => {
            const mappedKey = fieldMap[path] || path;
            parsedErrors[mappedKey] = msgs as string[];
          });

          if (Array.isArray(data.issues.details)) {
            data.issues.details.forEach((issue: { path?: Array<string | number>; message?: string }) => {
              const path = issue.path?.join(".");
              const mappedKey = path ? fieldMap[path] || path : null;

              if (mappedKey && issue.message) {
                parsedErrors[mappedKey] = [issue.message];
              }
            });
          }

          setFieldErrors(parsedErrors);
        }
        throw new Error(data.error || "Error al generar la página de producto.");
      }

      setResult(data as GenerationResult);

      // Actualizar publicationState a GENERATED localmente
      if (selectedLead) {
        const updated = { ...selectedLead, publicationState: "GENERATED" as const, lastVerification: null };
        setSelectedLead(updated);
        setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      }

      // Desplazamiento automático al resultado para abrir preview o publicar sin perder contexto.
      if (typeof window !== "undefined") {
        window.setTimeout(() => {
          document.getElementById(GENERATION_RESULT_ID)?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 0);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Ocurrió un error inesperado durante la generación.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublish = async () => {
    const targetSiteId = result?.siteId || form.siteId.trim();
    if (!targetSiteId) return;

    setIsPublishing(true);
    setPublishStep("SFTP");
    setPublishError(null);
    setPublishResult(null);

    // Cambiar estado visual de espera a "Verificando dominio..." tras 1.5s
    const stepTimer = setTimeout(() => {
      setPublishStep("VERIFYING");
    }, 1500);

    try {
      const response = await fetch("/api/internal/product-pages/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ siteId: targetSiteId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al publicar la página de producto.");
      }

      setPublishResult(data as PublicationResult);

      const finalState = data.publicationState || (data.verificationStatus === "VERIFIED" ? "VERIFIED" : "VERIFY_FAILED");

      // Actualizar publicationState y lastVerification localmente
      if (selectedLead) {
        const updatedLead: ActivationLeadRecord = {
          ...selectedLead,
          publicationState: finalState,
          lastVerification: {
            siteId: targetSiteId,
            domain: data.domain || selectedLead.onboardingData?.domain || null,
            verifiedAt: data.verifiedAt || new Date().toISOString(),
            status: data.verificationStatus || (finalState === "VERIFIED" ? "VERIFIED" : "VERIFY_FAILED"),
            checks: data.checks || []
          }
        };
        setSelectedLead(updatedLead);
        setLeads((prev) => prev.map((l) => (l.id === updatedLead.id ? updatedLead : l)));
      }
    } catch (err: unknown) {
      setPublishError(err instanceof Error ? err.message : "Ocurrió un error inesperado durante la publicación.");
    } finally {
      clearTimeout(stepTimer);
      setIsPublishing(false);
      setPublishStep("IDLE");
    }
  };

  const copyManifest = () => {
    if (!result) return;
    const summary = `Sitio: ${result.siteId}\nFecha: ${result.generatedAt}\nDirectorio: ${result.outputDirectory}\nArchivos:\n${result.files.map((f) => `- ${f}`).join("\n")}`;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getPublicationBadge = (pubState?: string | null) => {
    return <VerificationBadge status={pubState} />;
  };

  return (
    <div className="space-y-8 text-slate-900">
      {/* Header del módulo */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-cyan-900">
              {record?.group || "Operaciones"}
            </span>
            <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-600">
              Generación y Publicación de Páginas
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={resetForm} leftIcon={<RotateCcw className="h-4 w-4" />}>
              Limpiar Selección
            </Button>
          </div>
        </div>

        <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Generador de Páginas de Producto
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Selecciona un empresario registrado para precargar sus datos de onboarding, configurar su identificador de sitio, generar el paquete de archivos estáticos y publicarlo en su dominio oficial.
        </p>
      </section>

      {/* BUSCADOR DE EMPRESARIOS */}
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-200 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-cyan-600" />
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Buscador de Empresarios Registrados
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Priorizados por estado comercial (PAID / CONTACTED primero). Selecciona para cargar datos de onboarding.
                </CardDescription>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={fetchLeads}
              isLoading={isLoadingLeads}
              leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
            >
              Actualizar Lista
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-4">
          {/* Barra de Búsqueda */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, marca, WhatsApp, siteId o dominio..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-10 pr-4 py-2 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* Lista de Empresarios */}
          {isLoadingLeads ? (
            <div className="flex items-center justify-center p-8 text-slate-400 space-y-2">
              <RefreshCw className="h-6 w-6 animate-spin text-cyan-500" />
              <span className="text-xs font-medium ml-2">Cargando empresarios...</span>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No se encontraron empresarios con el criterio ingresado.
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {filteredLeads.map((lead) => {
                const isSelected = selectedLead?.id === lead.id;
                const domain = lead.onboardingData?.domain;

                return (
                  <div
                    key={lead.id}
                    onClick={() => handleSelectLead(lead)}
                    className={`cursor-pointer rounded-2xl border p-3.5 transition flex flex-wrap items-center justify-between gap-3 text-xs ${
                      isSelected
                        ? "border-cyan-500 bg-cyan-50/50 ring-1 ring-cyan-500"
                        : "border-slate-200 bg-white hover:bg-slate-50:bg-slate-900"
                    }`}
                  >
                    <div className="space-y-1 min-w-[200px]">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          {lead.brandName}
                        </span>
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                            lead.status === "PAID"
                              ? "bg-emerald-100 text-emerald-800"
                              : lead.status === "CONTACTED"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {lead.status}
                        </span>
                      </div>
                      <p className="text-slate-500 text-[11px]">
                        Empresario: <strong>{lead.fullName}</strong> — WA: {lead.whatsapp}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
                      {/* siteId */}
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 font-sans">siteId:</span>
                        {lead.siteId ? (
                          <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                            {lead.siteId}
                          </span>
                        ) : (
                          <span className="text-amber-600 font-semibold italic font-sans">Sin vincular</span>
                        )}
                      </div>

                      {/* Dominio */}
                      <div className="flex items-center gap-1">
                        <Globe className="h-3.5 w-3.5 text-cyan-600" />
                        {domain ? (
                          <span className="font-bold text-cyan-600">{domain}</span>
                        ) : (
                          <span className="text-slate-400 italic font-sans">Sin dominio</span>
                        )}
                      </div>

                      {/* Estado de Publicación y Verificación */}
                      <div className="flex items-center gap-2">
                        {getPublicationBadge(lead.publicationState)}
                        {lead.siteId && (
                          <VerifyNowButton
                            siteId={lead.siteId}
                            onVerified={(res) => handleLeadVerificationUpdated(lead.siteId!, res)}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* NOTIFICACIONES Y ALERTAS */}
      {successMessage && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        </div>
      )}

      {errorMessage && (
        <Alert variant="error" title="Error en la Operación" icon={<AlertCircle className="h-5 w-5 text-rose-600" />}>
          {errorMessage}
        </Alert>
      )}

      {/* RESUMEN DEL EMPRESARIO SELECCIONADO Y BOTÓN VINCULAR SITEID */}
      {selectedLead && (
        <Card className="border-cyan-300 bg-cyan-50/30 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">
                  {selectedLead.brandName} ({selectedLead.fullName})
                </h3>
                {getPublicationBadge(selectedLead.publicationState)}
              </div>
              <p className="text-xs text-slate-600 flex flex-wrap items-center gap-2">
                <span>Estado Comercial: <strong>{selectedLead.status}</strong></span>
                <span>•</span>
                <span>Dominio: <strong>{selectedLead.onboardingData?.domain || "No configurado"}</strong></span>
                {selectedLead.lastVerification?.verifiedAt && (
                  <>
                    <span>•</span>
                    <span>Verificado: <strong>{new Date(selectedLead.lastVerification.verifiedAt).toLocaleString("es-CO")}</strong></span>
                  </>
                )}
              </p>
            </div>

            {/* Acciones de vinculación y verificación */}
            <div className="flex flex-wrap items-center gap-2">
              {selectedLead.siteId && (
                <VerifyNowButton
                  siteId={selectedLead.siteId}
                  onVerified={(res) => handleLeadVerificationUpdated(selectedLead.siteId!, res)}
                />
              )}

              {!selectedLead.siteId ? (
                <div className="flex items-center gap-2 rounded-xl bg-amber-100 p-2 border border-amber-300 text-xs">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span className="text-amber-900 font-semibold">
                    Sin siteId vinculado. Sugerido: <code className="font-mono font-bold">{form.siteId}</code>
                  </span>
                  <button
                    type="button"
                    onClick={handleLinkSiteIdToLead}
                    disabled={isLinkingSiteId}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 px-3 py-1 text-xs font-bold text-white shadow transition disabled:opacity-50"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    <span>{isLinkingSiteId ? "Vinculando..." : "Confirmar Vinculación"}</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-100 p-2 border border-emerald-300 text-xs">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="text-emerald-900 font-bold">
                    Sitio Vinculado: <code className="font-mono">{selectedLead.siteId}</code>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Guarda de entrega y desglose de checks fallidos para el lead seleccionado */}
          <DeliveryGuardAlert status={selectedLead.publicationState} />
          {selectedLead.lastVerification?.checks && (
            <FailedChecksDetails checks={selectedLead.lastVerification.checks} />
          )}
        </Card>
      )}

      {/* PANTALLA DE ÉXITO DE GENERACIÓN / PUBLICACIÓN */}
      {result && (
        <Card id={GENERATION_RESULT_ID} className="border-emerald-200 bg-emerald-50/30 p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">
                    ¡Paquete Generado Exitosamente!
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

              {safePreviewUrl && (
                <a
                  href={safePreviewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-3 text-xs font-bold text-cyan-700 transition hover:bg-cyan-100"
                >
                  <Globe className="h-4 w-4" />
                  Abrir vista previa
                </a>
              )}

              {/* Botón de Publicación con estados de verificación */}
              <Button
                variant={publishResult?.publicationState === "VERIFY_FAILED" ? "secondary" : "primary"}
                size="sm"
                onClick={handlePublish}
                isLoading={isPublishing}
                leftIcon={<UploadCloud className="h-4 w-4 text-cyan-300" />}
              >
                {isPublishing
                  ? publishStep === "VERIFYING"
                    ? "Verificando dominio..."
                    : "Publicando..."
                  : publishResult
                  ? publishResult.publicationState === "VERIFIED"
                    ? "Publicado y verificado"
                    : "Publicado, pero requiere revisión"
                  : "Publicar página"}
              </Button>
            </div>
          </div>

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

          {/* Mensaje de Resultado de Publicación y Verificación */}
          {publishResult && (
            <div className="space-y-4">
              <Alert
                variant={publishResult.publicationState === "VERIFIED" ? "success" : "warning"}
                title={
                  publishResult.publicationState === "VERIFIED"
                    ? "¡Página Publicada y Verificada!"
                    : "Página Publicada — Requiere Revisión"
                }
                icon={
                  publishResult.publicationState === "VERIFIED" ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                  )
                }
              >
                <div className="space-y-1 text-xs">
                  <p className="font-medium text-slate-800">
                    La página de producto para <strong className="text-slate-950">{publishResult.siteId}</strong> fue procesada.
                  </p>
                  {publishResult.publishedAt && (
                    <p className="text-slate-600">
                      <strong>Publicada el:</strong> {new Date(publishResult.publishedAt).toLocaleString("es-CO")}
                    </p>
                  )}
                  {publishResult.verifiedAt && (
                    <p className="text-slate-600">
                      <strong>Verificada el:</strong> {new Date(publishResult.verifiedAt).toLocaleString("es-CO")}
                    </p>
                  )}
                  {publishResult.remoteRoot && (
                    <p className="text-slate-500 font-mono">
                      Ruta remota: {publishResult.remoteRoot}
                    </p>
                  )}
                </div>
              </Alert>

              <DeliveryGuardAlert status={publishResult.publicationState} />

              {publishResult.checks && (
                <FailedChecksDetails checks={publishResult.checks} />
              )}
            </div>
          )}
        </Card>
      )}

      {/* FORMULARIO PRINCIPAL DE GENERACIÓN */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Bloque 1: Identificación del Sitio y Distribuidor */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-cyan-600" />
              <CardTitle className="text-base font-bold text-slate-900">
                Identificación del Sitio y Distribuidor
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-500">
              Datos principales de identidad del partner, slug único de sitio y dominio de publicación.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-5 md:grid-cols-2">
            <div>
              <Label htmlFor="siteId">ID de sitio / siteId (Slug) *</Label>
              <Input
                id="siteId"
                placeholder="ej. john-smith"
                value={form.siteId}
                onChange={(e) => handleInputChange("siteId", e.target.value)}
                disabled={Boolean(selectedLead?.siteId)}
                className={fieldErrors.siteId ? "border-rose-400 focus:border-rose-500 font-mono" : "font-mono"}
              />
              {fieldErrors.siteId ? (
                <p className="mt-1 text-xs text-rose-600">{fieldErrors.siteId[0]}</p>
              ) : (
                <p className="mt-1 text-[11px] text-slate-400">
                  {selectedLead?.siteId ? (
                    "ID tecnico bloqueado despues de vincular el sitio."
                  ) : (
                    <>Slug minusculo sin espacios (ej. <code className="font-mono">john-smith</code>).</>
                  )}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="domain">Dominio de Publicación (Hostinger)</Label>
              <Input
                id="domain"
                placeholder="ej. johnsmith.pro"
                value={form.domain}
                onChange={(e) => handleInputChange("domain", e.target.value)}
                className="font-mono"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Hostinger remoto: <code className="font-mono">/home/u658137804/domains/&#123;domain&#125;/public_html</code>
              </p>
            </div>

            <div>
              <Label htmlFor="brandName">Nombre de Marca *</Label>
              <Input
                id="brandName"
                placeholder="ej. John Smith"
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
                placeholder="ej. John"
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
                placeholder="ej. John Smith"
                value={form.fullName}
                onChange={(e) => handleInputChange("fullName", e.target.value)}
                className={fieldErrors.fullName ? "border-rose-400 focus:border-rose-500" : ""}
              />
              {fieldErrors.fullName && (
                <p className="mt-1 text-xs text-rose-600">{fieldErrors.fullName[0]}</p>
              )}
            </div>

            <div>
              <Label htmlFor="role">Rol o Cargo Visible</Label>
              <Input
                id="role"
                placeholder="ej. Distribuidor Autorizado · Gano Excel"
                value={form.role}
                onChange={(e) => handleInputChange("role", e.target.value)}
              />
              <p className="mt-1 text-[11px] text-slate-400">Cargo mostrado en perfil de contacto y footer.</p>
            </div>
          </CardContent>
        </Card>

        {/* Bloque 2: Contacto, Conversión y Pasarela de Pago */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-cyan-600" />
              <CardTitle className="text-base font-bold text-slate-900">
                Contacto, WhatsApp y Pasarela de Pago
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-500">
              Teléfonos de contacto directo, mensaje automático de WhatsApp y enlace a pasarela de compra.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-5 md:grid-cols-2">
            <div>
              <Label htmlFor="whatsappNumber">WhatsApp Internacional *</Label>
              <Input
                id="whatsappNumber"
                placeholder="ej. 573001112233"
                value={form.whatsappNumber}
                onChange={(e) => handleInputChange("whatsappNumber", e.target.value)}
                className={fieldErrors.whatsappNumber ? "border-rose-400 focus:border-rose-500" : ""}
              />
              {fieldErrors.whatsappNumber ? (
                <p className="mt-1 text-xs text-rose-600">{fieldErrors.whatsappNumber[0]}</p>
              ) : (
                <p className="mt-1 text-[11px] text-slate-400">Incluir código de país sin símbolos (ej. 573001112233).</p>
              )}
            </div>

            <div>
              <Label htmlFor="displayPhone">Teléfono Visible / Llamada Directa</Label>
              <Input
                id="displayPhone"
                placeholder="ej. 3001112233"
                value={form.displayPhone}
                onChange={(e) => handleInputChange("displayPhone", e.target.value)}
              />
              <p className="mt-1 text-[11px] text-slate-400">Formato nacional mostrado en texto de llamado tel:.</p>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="purchaseUrl">URL de Compra / Pasarela (Checkout)</Label>
              <Input
                id="purchaseUrl"
                placeholder="ej. https://wompi.co/l/o-123456"
                value={form.purchaseUrl}
                onChange={(e) => handleInputChange("purchaseUrl", e.target.value)}
                className={fieldErrors.purchaseUrl ? "border-rose-400 focus:border-rose-500" : ""}
              />
              {fieldErrors.purchaseUrl ? (
                <p className="mt-1 text-xs text-rose-600">{fieldErrors.purchaseUrl[0]}</p>
              ) : (
                <p className="mt-1 text-[11px] text-slate-400">Enlace directo a pasarela Wompi o checkout de pago.</p>
              )}
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="defaultMessage">Mensaje Predeterminado de WhatsApp</Label>
              <Textarea
                id="defaultMessage"
                rows={2}
                placeholder="ej. Hola John, vengo de tu página web. Me gustaría tener más información..."
                value={form.defaultMessage}
                onChange={(e) => handleInputChange("defaultMessage", e.target.value)}
              />
              <p className="mt-1 text-[11px] text-slate-400">Texto inicial prellenado al abrir la conversación.</p>
            </div>
          </CardContent>
        </Card>

        {/* Bloque 3: Configuración SEO */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-cyan-600" />
              <CardTitle className="text-base font-bold text-slate-900">
                Configuración SEO y Metadatos
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-500">
              Títulos e información para motores de búsqueda y previsualización social.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <div>
              <Label htmlFor="siteTitle">Título SEO (&lt;title&gt;) *</Label>
              <Input
                id="siteTitle"
                placeholder="ej. John Smith — Bienestar y Vitalidad con Gano Excel"
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
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-cyan-600" />
              <CardTitle className="text-base font-bold text-slate-900">
                Recursos Multimedia (Imágenes Hero en Cloudflare R2)
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-500">
              Selecciona las imágenes de portada. Se subirán y optimizarán automáticamente a R2.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <HeroImageUploader
              label="Hero Desktop (Pantallas Grandes)"
              variant="hero-desktop"
              siteId={form.siteId}
              value={form.heroDesktop}
              onChange={(url) => handleInputChange("heroDesktop", url)}
              helpText="Imagen de portada optimizada para computadores y monitores de escritorio."
            />

            <HeroImageUploader
              label="Hero Mobile (Dispositivos Móviles)"
              variant="hero-mobile"
              siteId={form.siteId}
              value={form.heroMobile}
              onChange={(url) => handleInputChange("heroMobile", url)}
              helpText="Imagen de portada optimizada para teléfonos móviles y tablets."
            />
          </CardContent>
        </Card>

        {/* Bloque 5: Analítica de Google Analytics */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-cyan-600" />
              <CardTitle className="text-base font-bold text-slate-900">
                Analítica y Métricas
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-500">
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
                  Formato esperado: `G-XXXXXXXX`. Se utiliza únicamente para recopilar analítica del sitio.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Bloque 6: Personalización Visual y Tema (PH-025) */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-cyan-600" />
              <CardTitle className="text-base font-bold text-slate-900">
                Personalización Visual y Tema (PH-025)
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-500">
              Selecciona el estilo tipográfico y la paleta de colores exclusiva para esta página de producto.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <FontSelector
              value={form.fontPreset}
              onChange={(preset) => handleInputChange("fontPreset", preset)}
            />

            <PaletteSelector
              value={form.palettePreset}
              onChange={(preset) => handleInputChange("palettePreset", preset)}
            />
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
            Generar Paquete de Producto
          </Button>
        </div>
      </form>
    </div>
  );
}
