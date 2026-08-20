import React, { useState, useEffect } from "react";
import {
  Users,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  AlertCircle,

  Link2,
  ExternalLink,
  MessageCircle,
  X,
  Check,
  Edit3,
  Globe,
  Mail,
  FileCheck,
  AlertTriangle,
  Archive,
  Trash2,
  AlertOctagon,
  UserPlus,
  Copy,
  Save,
  Sparkles,
  Lock,
  Gift,
  Image as ImageIcon
} from "lucide-react";
import { FontSelector, PaletteSelector } from "@/components/ui/theme-selectors";
import { FontPreset, PalettePreset } from "@/lib/theme-presets";
import { HeroImageUploader } from "@/components/ui/hero-image-uploader";
import { VerificationBadge,
  VerifyNowButton,
  FailedChecksDetails,
  DeliveryGuardAlert,
  ProductPageVerificationResult,
  ProductPageSiteSummary
} from "@/components/ui/verification-status-panel";
import { ModalPortal } from "@/components/ui/modal-portal";
import {
  validateComplimentaryGrantForm,
  buildComplimentaryGrantPayload,
  ECOSYSTEM_NAMES,
  LIFECYCLE_STATUS_LABELS,
  type ComplimentaryGrantFormState,
  type ComplimentaryGrantResult,
  type ComplimentaryGrantReadback
} from "@/components/complimentaryGrantHelpers";

export type ActivationLeadStatus = "NEW" | "CONTACTED" | "PAID" | "CONVERTED" | "CANCELLED";
export type EcosystemType = "PRODUCT" | "BUSINESS" | "PERSONAL_BRAND";

export interface ReferralCodeRecord {
  siteId: string;
  code: string;
  displayName: string;
  assignedAt: string;
}

export interface ReferralRecord {
  id: string;
  referredSiteId: string;
  referrerCode: string;
  referrerSiteId: string | null;
  status: "PENDING" | "VALIDATED" | "QUALIFIED" | "REJECTED" | "CANCELLED";
  createdAt: string;
  validatedAt?: string;
  qualifiedAt?: string;
  referrerName?: string;
}

export interface OnboardingData {
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
  sourcePhotos?: string[];
  operatorNotes?: string;
  analyticsVerified?: boolean;
  imageUseConsent?: boolean;
  agreementAccepted?: boolean;
}

const isValidHttpsUrl = (value: unknown): value is string => {
  if (typeof value !== "string") return false;

  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
};

export interface ActivationLeadRecord {
  id: string;
  fullName: string;
  whatsapp: string;
  email: string | null;
  brandName: string;
  mainProduct?: string;
  ecosystemType?: EcosystemType;
  referrerCode: string | null;
  paymentMethod: "wompi" | "direct";
  termsAccepted: boolean;
  status: ActivationLeadStatus;
  siteId: string | null;
  publicationState?: string;
  lastVerification?: ProductPageVerificationResult | null;
  createdAt: string;
  updatedAt: string;
  onboardingData?: OnboardingData;
  onboardingUpdatedAt?: string;
}

interface DeliveryDraft {
  subject: string;
  emailText: string;
  whatsappMessage: string;
  recipientEmail: string | null;
  siteUrl: string | null;
  whatsappUrl: string | null;
  mailtoUrl: string | null;
  emailDelivery: {
    attempted: boolean;
    status: "NOT_REQUESTED" | "NO_EMAIL" | "SMTP_NOT_CONFIGURED" | "SENT" | "FAILED";
    message: string;
    sentAt?: string;
  };
}

export function EntrepreneurOperationsView() {
  const [leads, setLeads] = useState<ActivationLeadRecord[]>([]);
  const [referralCodes, setReferralCodes] = useState<ReferralCodeRecord[]>([]);
  const [referralsList, setReferralsList] = useState<ReferralRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [paymentFilter, setPaymentFilter] = useState<string>("ALL");

  // Selected lead for detail modal/drawer
  const [selectedLead, setSelectedLead] = useState<ActivationLeadRecord | null>(null);
  const [deliveryDraft, setDeliveryDraft] = useState<DeliveryDraft | null>(null);
  const [isPreparingDelivery, setIsPreparingDelivery] = useState(false);

  // Edit action states inside modal
  const [_editingStatus, setEditingStatus] = useState<ActivationLeadStatus | "">("");
  const [editingSiteId, setEditingSiteId] = useState<string>("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isEditingFields, setIsEditingFields] = useState(false);
  const [isSubmittingPatch, setIsSubmittingPatch] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Referral code operations inside modal
  const [isAssigningCode, setIsAssigningCode] = useState(false);
  const [codeAssignInput, setCodeAssignInput] = useState("");
  const [codeAssignError, setCodeAssignError] = useState<string | null>(null);
  const [codeAssignSuccess, setCodeAssignSuccess] = useState<string | null>(null);
  const [isEditingCode, setIsEditingCode] = useState(false);
  const [copiedOwnCode, setCopiedOwnCode] = useState(false);

  // Editable fields form inside modal
  const [editForm, setEditForm] = useState({
    fullName: "",
    whatsapp: "",
    email: "",
    brandName: "",
    mainProduct: "",
    domain: "",
    paymentMethod: "direct" as "wompi" | "direct",
    country: "",
    phone: "",
    purchaseUrl: "",
    heroDesktopUrl: "",
    heroMobileUrl: "",
    logoMode: "TYPOGRAPHY" as "TYPOGRAPHY" | "IMAGE",
    logoUrl: "",
    seoTitle: "",
    metaDescription: "",
    defaultMessage: "",
    analyticsMeasurementId: "",
    fontPreset: "executive" as FontPreset,
    palettePreset: "cobalt-cyan" as PalettePreset
  });

  // Create Paid Lead Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreatingLead, setIsCreatingLead] = useState(false);
  const [createdLeadResult, setCreatedLeadResult] = useState<{
    lead: ActivationLeadRecord;
    onboardingToken: string;
    onboardingPath: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Complimentary Grant Modal State
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [grantForm, setGrantForm] = useState<ComplimentaryGrantFormState>({
    ecosystemTypes: ["PRODUCT"],
    grantReason: "",
    effectiveDate: new Date().toISOString().slice(0, 10),
    cutoffDate: "",
    notes: ""
  });
  const [isSubmittingGrant, setIsSubmittingGrant] = useState(false);
  const [grantError, setGrantError] = useState<string | null>(null);
  const [grantSuccessResult, setGrantSuccessResult] = useState<ComplimentaryGrantResult | null>(null);

  // Complimentary Grant Readback State
  const [readbackData, setReadbackData] = useState<ComplimentaryGrantReadback | null>(null);
  const [isReadbackLoading, setIsReadbackLoading] = useState(false);
  const [readbackError, setReadbackError] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState({
    fullName: "",
    whatsapp: "",
    email: "",
    brandName: "",
    mainProduct: "Landing Page PartnerHub",
    siteId: "",
    domain: "",
    referrerCode: "",
    paymentMethod: "direct" as "wompi" | "direct",
    status: "PAID" as ActivationLeadStatus
  });

  const fetchReferrals = async () => {
    try {
      const res = await fetch("/api/internal/referrals");
      if (res.ok) {
        const json = await res.json();
        setReferralCodes(json.codes || []);
        setReferralsList(json.referrals || []);
      }
    } catch {
      // Non-blocking
    }
  };

  const fetchLeads = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [leadsRes, pagesRes, referralsRes] = await Promise.all([
        fetch("/api/internal/activation-leads"),
        fetch("/api/internal/product-pages"),
        fetch("/api/internal/referrals")
      ]);

      if (!leadsRes.ok) {
        throw new Error("No se pudo cargar el listado de empresarios.");
      }

      const data = await leadsRes.json();
      const leadList: ActivationLeadRecord[] = data.leads || [];

      let pageSites: ProductPageSiteSummary[] = [];
      if (pagesRes.ok) {
        const pData = await pagesRes.json();
        pageSites = pData.sites || [];
      }

      if (referralsRes.ok) {
        const refData = await referralsRes.json();
        setReferralCodes(refData.codes || []);
        setReferralsList(refData.referrals || []);
      }

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
    } catch (err) {
      setErrorMessage((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignEntrepreneurCode = async (targetSiteId: string, leadDisplayName: string) => {
    if (!codeAssignInput.trim()) {
      setCodeAssignError("Por favor ingresa un código de invitación.");
      return;
    }
    setIsAssigningCode(true);
    setCodeAssignError(null);
    setCodeAssignSuccess(null);

    try {
      const res = await fetch("/api/internal/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId: targetSiteId.trim().toLowerCase(),
          code: codeAssignInput.trim().toUpperCase(),
          displayName: leadDisplayName.trim()
        })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "No se pudo asignar el código.");
      }

      setCodeAssignSuccess(`Código "${json.code}" asignado exitosamente.`);
      setIsEditingCode(false);
      await fetchReferrals();
    } catch (err: unknown) {
      setCodeAssignError(err instanceof Error ? err.message : "Error al asignar código.");
    } finally {
      setIsAssigningCode(false);
    }
  };

  const handleLeadVerified = (leadId: string, verifResult: ProductPageVerificationResult) => {
    setLeads((prev) =>
      prev.map((l) => {
        if (l.id === leadId || (l.siteId && l.siteId === verifResult.siteId)) {
          return {
            ...l,
            publicationState: verifResult.status,
            lastVerification: verifResult
          };
        }
        return l;
      })
    );

    if (selectedLead && (selectedLead.id === leadId || selectedLead.siteId === verifResult.siteId)) {
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

  useEffect(() => {
    fetchLeads();
  }, []);

  // Update selection state when selected lead changes
  useEffect(() => {
    if (selectedLead) {
      setEditingStatus(selectedLead.status);
      setEditingSiteId(selectedLead.siteId || "");
      setConfirmingDelete(false);
      setIsEditingFields(false);
      setActionError(null);
      setDeliveryDraft(null);
      setEditForm({
        fullName: selectedLead.fullName || "",
        whatsapp: selectedLead.whatsapp || "",
        email: selectedLead.email || "",
        brandName: selectedLead.brandName || "",
        mainProduct: selectedLead.mainProduct || "",
        domain: selectedLead.onboardingData?.domain || "",
        paymentMethod: selectedLead.paymentMethod || "direct",
        country: selectedLead.onboardingData?.country || "",
        phone: selectedLead.onboardingData?.phone || "",
        purchaseUrl: selectedLead.onboardingData?.purchaseUrl || "",
        heroDesktopUrl: selectedLead.onboardingData?.heroDesktopUrl || "",
        heroMobileUrl: selectedLead.onboardingData?.heroMobileUrl || "",
        logoMode: selectedLead.onboardingData?.logoMode || "TYPOGRAPHY",
        logoUrl: selectedLead.onboardingData?.logoUrl || "",
        seoTitle: selectedLead.onboardingData?.seoTitle || "",
        metaDescription: selectedLead.onboardingData?.metaDescription || "",
        defaultMessage: selectedLead.onboardingData?.defaultMessage || "",
        analyticsMeasurementId: selectedLead.onboardingData?.analyticsMeasurementId || "",
        fontPreset: selectedLead.onboardingData?.fontPreset || "executive",
        palettePreset: selectedLead.onboardingData?.palettePreset || "cobalt-cyan"
      });

      // Initialize referral code assignment states
      setCodeAssignError(null);
      setCodeAssignSuccess(null);
      setIsEditingCode(false);
      setCopiedOwnCode(false);
      const existing = referralCodes.find((c) => c.siteId === selectedLead.siteId);
      if (existing) {
        setCodeAssignInput(existing.code);
      } else if (selectedLead.siteId) {
        setCodeAssignInput(selectedLead.siteId.toUpperCase().replace(/[^A-Z0-9]/g, ""));
      } else {
        setCodeAssignInput("");
      }
    }
  }, [selectedLead, referralCodes]);

  // Handle Save All Editable Fields via PATCH /api/internal/activation-leads/:id
  const handleSaveEditableFields = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;
    setIsSubmittingPatch(true);
    setActionError(null);

    try {
      const patchBody = {
        fullName: editForm.fullName.trim(),
        whatsapp: editForm.whatsapp.trim(),
        email: editForm.email.trim() || null,
        brandName: editForm.brandName.trim(),
        mainProduct: editForm.mainProduct.trim() || undefined,
        paymentMethod: editForm.paymentMethod,
        onboardingData: {
          domain: editForm.domain.trim().toLowerCase() || undefined,
          country: editForm.country.trim() || undefined,
          phone: editForm.phone.trim() || undefined,
          purchaseUrl: editForm.purchaseUrl.trim() || undefined,
          heroDesktopUrl: editForm.heroDesktopUrl.trim() || undefined,
          heroMobileUrl: editForm.heroMobileUrl.trim() || undefined,
          logoMode: editForm.logoMode,
          logoUrl: editForm.logoMode === "IMAGE" ? (editForm.logoUrl.trim() || undefined) : undefined,
          seoTitle: editForm.seoTitle.trim() || undefined,
          metaDescription: editForm.metaDescription.trim() || undefined,
          defaultMessage: editForm.defaultMessage.trim() || undefined,
          analyticsMeasurementId: editForm.analyticsMeasurementId.trim() || undefined,
          fontPreset: editForm.fontPreset,
          palettePreset: editForm.palettePreset
        }
      };

      const res = await fetch(`/api/internal/activation-leads/${selectedLead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchBody),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Error al actualizar los datos del empresario.");
      }

      const updatedLead = json.lead || json;
      setLeads((prev) => prev.map((l) => (l.id === selectedLead.id ? updatedLead : l)));
      setSelectedLead(updatedLead);
      setIsEditingFields(false);
      setSuccessMessage(`Datos de ${updatedLead.brandName} actualizados exitosamente.`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setIsSubmittingPatch(false);
    }
  };

  // Handle Create Paid Lead via POST /api/internal/activation-leads
  const handleCreatePaidLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.domain.trim()) {
      setActionError("El Dominio de publicación es obligatorio.");
      return;
    }
    setIsCreatingLead(true);
    setActionError(null);

    try {
      const body = {
        fullName: createForm.fullName.trim(),
        whatsapp: createForm.whatsapp.trim(),
        email: createForm.email.trim() || null,
        brandName: createForm.brandName.trim(),
        mainProduct: createForm.mainProduct.trim() || "Landing Page PartnerHub",
        siteId: createForm.siteId.trim().toLowerCase() || undefined,
        referrerCode: createForm.referrerCode.trim().toUpperCase() || undefined,
        paymentMethod: createForm.paymentMethod,
        status: createForm.status,
        termsAccepted: true,
        onboardingData: {
          domain: createForm.domain.trim().toLowerCase()
        }
      };

      const res = await fetch("/api/internal/activation-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "No se pudo registrar el empresario pagado.");
      }

      setCreatedLeadResult(json);
      setSuccessMessage(`Empresario pagado "${json.lead.brandName}" registrado exitosamente.`);
      fetchLeads();
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setIsCreatingLead(false);
    }
  };

  const handleCopyOnboardingLink = (path: string) => {
    const fullUrl = `${window.location.origin}${path}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const copyToClipboard = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    setSuccessMessage(`${label} copiado al portapapeles.`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handlePrepareDelivery = async (sendEmail: boolean) => {
    if (!selectedLead) return;
    setIsPreparingDelivery(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/internal/activation-leads/${selectedLead.id}/delivery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sendEmail })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "No se pudo preparar la entrega.");
      }

      setDeliveryDraft(json);
      setSuccessMessage(
        sendEmail
          ? json.emailDelivery?.message || "Entrega preparada."
          : "Mensaje de entrega preparado."
      );
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setIsPreparingDelivery(false);
    }
  };

  // Patch status handler
  const handleUpdateStatus = async (newStatus: ActivationLeadStatus) => {
    if (!selectedLead) return;
    setIsSubmittingPatch(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/internal/activation-leads/${selectedLead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Error al actualizar el estado.");
      }

      // Update lead in state
      setLeads((prev) => prev.map((l) => (l.id === selectedLead.id ? json : l)));
      setSelectedLead(json);
      setSuccessMessage(`Estado de ${selectedLead.brandName} actualizado a ${newStatus}.`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setIsSubmittingPatch(false);
    }
  };

  // Patch siteId handler
  const handleLinkSiteId = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;
    const cleanSiteId = editingSiteId.trim().toLowerCase();

    if (!cleanSiteId) {
      setActionError("Ingresa un slug de siteId válido.");
      return;
    }

    setIsSubmittingPatch(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/internal/activation-leads/${selectedLead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId: cleanSiteId }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Error al vincular el sitio.");
      }

      const updatedLead = json.lead || json;
      setLeads((prev) => prev.map((l) => (l.id === selectedLead.id ? updatedLead : l)));
      setSelectedLead(updatedLead);
      setSuccessMessage(`Sitio ${cleanSiteId} vinculado exitosamente a ${selectedLead.brandName}.`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setIsSubmittingPatch(false);
    }
  };

  // Archive lead handler
  const handleArchiveLead = async () => {
    if (!selectedLead) return;
    setIsSubmittingPatch(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/internal/activation-leads/${selectedLead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordState: "ARCHIVED" }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "No se pudo archivar el registro.");
      }

      setLeads((prev) => prev.filter((l) => l.id !== selectedLead.id));
      setSelectedLead(null);
      setSuccessMessage(`El registro de ${selectedLead.brandName} ha sido archivado exitosamente.`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setIsSubmittingPatch(false);
    }
  };

  // Delete test lead handler
  const handleDeleteTestLead = async () => {
    if (!selectedLead) return;
    setIsSubmittingPatch(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/internal/activation-leads/${selectedLead.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "DELETE_TEST" }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "No se pudo eliminar el registro de prueba.");
      }

      setLeads((prev) => prev.filter((l) => l.id !== selectedLead.id));
      setSelectedLead(null);
      setConfirmingDelete(false);
      setSuccessMessage(`El registro de prueba de ${selectedLead.brandName} fue eliminado exitosamente.`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setIsSubmittingPatch(false);
    }
  };

  const toggleGrantEcosystem = (type: EcosystemType) => {
    setGrantForm((prev) => ({
      ...prev,
      ecosystemTypes: prev.ecosystemTypes.includes(type)
        ? prev.ecosystemTypes.filter((t) => t !== type)
        : [...prev.ecosystemTypes, type]
    }));
  };

  const handleOpenGrantModal = () => {
    if (!selectedLead) return;
    const initialEco = selectedLead.ecosystemType || "PRODUCT";
    setGrantForm({
      ecosystemTypes: [initialEco],
      grantReason: "",
      effectiveDate: new Date().toISOString().slice(0, 10),
      cutoffDate: "",
      notes: ""
    });
    setGrantError(null);
    setGrantSuccessResult(null);
    setShowGrantModal(true);
  };

  const fetchComplimentaryGrantReadback = async (leadId: string) => {
    setIsReadbackLoading(true);
    setReadbackError(null);
    try {
      const res = await fetch(`/api/internal/activation-leads/${leadId}/complimentary-grant`);
      if (!res.ok) {
        if (res.status === 404) {
          setReadbackData(null);
          return;
        }
        throw new Error("No se pudo cargar la información de cortesías del partner.");
      }
      const data = await res.json();
      setReadbackData(data as ComplimentaryGrantReadback);
    } catch (err: unknown) {
      setReadbackError(err instanceof Error ? err.message : "Error al consultar cortesías del partner.");
    } finally {
      setIsReadbackLoading(false);
    }
  };

  useEffect(() => {
    if (selectedLead?.id) {
      fetchComplimentaryGrantReadback(selectedLead.id);
    } else {
      setReadbackData(null);
      setReadbackError(null);
    }
  }, [selectedLead?.id]);

  const handleSubmitComplimentaryGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;

    const validationMsg = validateComplimentaryGrantForm(grantForm);
    if (validationMsg) {
      setGrantError(validationMsg);
      return;
    }

    setIsSubmittingGrant(true);
    setGrantError(null);

    try {
      const payload = buildComplimentaryGrantPayload(grantForm);
      const res = await fetch(`/api/internal/activation-leads/${selectedLead.id}/complimentary-grant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "No se pudo asignar la cortesía de ecosistema.");
      }

      setGrantSuccessResult(resData as ComplimentaryGrantResult);
      setSuccessMessage(`Cortesía asignada con éxito para ${selectedLead.fullName}.`);
      setTimeout(() => setSuccessMessage(null), 5000);
      await fetchComplimentaryGrantReadback(selectedLead.id);
    } catch (err: unknown) {
      setGrantError(err instanceof Error ? err.message : "Error desconocido al procesar la cortesía.");
    } finally {
      setIsSubmittingGrant(false);
    }
  };

  // Calculate Status Counts
  const counts = {
    total: leads.length,
    NEW: leads.filter((l) => l.status === "NEW").length,
    CONTACTED: leads.filter((l) => l.status === "CONTACTED").length,
    PAID: leads.filter((l) => l.status === "PAID").length,
    CONVERTED: leads.filter((l) => l.status === "CONVERTED").length,
    CANCELLED: leads.filter((l) => l.status === "CANCELLED").length,
  };

  // Filtered Leads
  const filteredLeads = leads.filter((lead) => {
    // Status filter
    if (statusFilter !== "ALL" && lead.status !== statusFilter) return false;
    // Payment filter
    if (paymentFilter !== "ALL" && lead.paymentMethod !== paymentFilter) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = lead.fullName.toLowerCase().includes(q);
      const matchBrand = lead.brandName.toLowerCase().includes(q);
      const matchEmail = lead.email?.toLowerCase().includes(q) || false;
      const matchSite = lead.siteId?.toLowerCase().includes(q) || false;
      const matchRef = lead.referrerCode?.toLowerCase().includes(q) || false;
      const matchPhone = lead.whatsapp.toLowerCase().includes(q);
      const matchDomain = lead.onboardingData?.domain?.toLowerCase().includes(q) || false;
      return matchName || matchBrand || matchEmail || matchSite || matchRef || matchPhone || matchDomain;
    }

    return true;
  });

  // Calculate missing fields for an onboarding payload
  const getMissingFields = (lead: ActivationLeadRecord) => {
    const ob = lead.onboardingData || {};
    const missing: { field: string; label: string }[] = [];

    if (!ob.domain?.trim()) missing.push({ field: "domain", label: "Dominio de publicación" });
    if (!ob.country?.trim()) missing.push({ field: "country", label: "País de Operación" });
    if (!ob.whatsapp?.trim()) missing.push({ field: "whatsapp", label: "WhatsApp de Atención" });
    if (!ob.phone?.trim()) missing.push({ field: "phone", label: "Teléfono Directo" });
    if (!ob.purchaseUrl?.trim()) missing.push({ field: "purchaseUrl", label: "URL de Compra / Pasarela" });
    if (!ob.heroDesktopUrl?.trim()) missing.push({ field: "heroDesktopUrl", label: "Imagen Hero Desktop" });
    if (!ob.heroMobileUrl?.trim()) missing.push({ field: "heroMobileUrl", label: "Imagen Hero Mobile" });
    
    // Only check logoUrl if logoMode === "IMAGE"
    if (ob.logoMode === "IMAGE" && !ob.logoUrl?.trim()) {
      missing.push({ field: "logoUrl", label: "Imagen de Logotipo" });
    }
    
    // faviconUrl is optional and auto-generated (PH-008B), so it is excluded from missing fields checklist.
    if (!ob.imageUseConsent) missing.push({ field: "imageUseConsent", label: "Consentimiento Uso de Imágenes" });
    if (!ob.agreementAccepted) missing.push({ field: "agreementAccepted", label: "Aceptación de Acuerdo" });

    // Dynamic total fields depending on logoMode (10 if IMAGE mode, 9 if TYPOGRAPHY mode)
    const totalFields = ob.logoMode === "IMAGE" ? 10 : 9;
    const completedCount = Math.max(0, totalFields - missing.length);
    const percentage = Math.round((completedCount / totalFields) * 100);

    return { missing, completedCount, totalFields, percentage };
  };

  const statusMeta: Record<ActivationLeadStatus, { label: string; dot: string; badge: string; pulse?: boolean }> = {
    NEW: {
      label: "Nuevo",
      dot: "bg-amber-500",
      badge: "border-amber-300 bg-amber-100 text-amber-900",
      pulse: true
    },
    CONTACTED: {
      label: "Contactado",
      dot: "bg-blue-500",
      badge: "border-blue-300 bg-blue-100 text-blue-900"
    },
    PAID: {
      label: "Pagado",
      dot: "bg-emerald-500",
      badge: "border-emerald-300 bg-emerald-100 text-emerald-900"
    },
    CONVERTED: {
      label: "Convertido",
      dot: "bg-green-600",
      badge: "border-green-300 bg-green-100 text-green-900"
    },
    CANCELLED: {
      label: "Cancelado",
      dot: "bg-rose-500",
      badge: "border-rose-300 bg-rose-100 text-rose-900"
    }
  };

  const getStatusBadge = (status: ActivationLeadStatus, compact = false) => {
    const meta = statusMeta[status];

    if (compact) {
      return (
        <span
          className={`inline-flex h-8 w-8 items-center justify-center rounded-full border ${meta.badge}`}
          title={meta.label}
          aria-label={meta.label}
        >
          <span className={`h-2.5 w-2.5 rounded-full ${meta.dot} ${meta.pulse ? "animate-pulse" : ""}`} />
        </span>
      );
    }

    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.badge}`}>
        <span className={`h-2 w-2 rounded-full ${meta.dot} ${meta.pulse ? "animate-pulse" : ""}`} />
        {meta.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Notification Toast */}
      {successMessage && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-800 hover:opacity-80">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm font-semibold text-rose-900">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={fetchLeads} className="inline-flex items-center gap-1 text-xs font-bold underline">
            <RefreshCw className="h-3.5 w-3.5" /> Reintentar
          </button>
        </div>
      )}

      {/* METRICS & STATUS COUNTERS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <div
          onClick={() => setStatusFilter("ALL")}
          className={`cursor-pointer rounded-2xl border p-4 transition ${
            statusFilter === "ALL"
              ? "border-cyan-500 bg-cyan-50 shadow-sm ring-1 ring-cyan-500"
              : "border-slate-200 bg-white hover:border-slate-300"
          }`}
        >
          <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Total Registros
          </p>
          <p className="mt-1 font-heading text-2xl font-extrabold text-slate-900">
            {counts.total}
          </p>
        </div>

        <div
          onClick={() => setStatusFilter("NEW")}
          className={`cursor-pointer rounded-2xl border p-4 transition ${
            statusFilter === "NEW"
              ? "border-amber-500 bg-amber-100/80 shadow-sm ring-1 ring-amber-500"
              : "border-amber-200 bg-amber-50 hover:border-amber-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-900">
              NUEVO
            </p>
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
          </div>
          <p className="mt-1 font-heading text-2xl font-extrabold text-amber-950">
            {counts.NEW}
          </p>
        </div>

        <div
          onClick={() => setStatusFilter("CONTACTED")}
          className={`cursor-pointer rounded-2xl border p-4 transition ${
            statusFilter === "CONTACTED"
              ? "border-blue-500 bg-blue-100/80 shadow-sm ring-1 ring-blue-500"
              : "border-blue-200 bg-blue-50 hover:border-blue-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-900">
              CONTACTADO
            </p>
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
          </div>
          <p className="mt-1 font-heading text-2xl font-extrabold text-blue-950">
            {counts.CONTACTED}
          </p>
        </div>

        <div
          onClick={() => setStatusFilter("PAID")}
          className={`cursor-pointer rounded-2xl border p-4 transition ${
            statusFilter === "PAID"
              ? "border-emerald-500 bg-emerald-100/80 shadow-sm ring-1 ring-emerald-500"
              : "border-emerald-200 bg-emerald-50 hover:border-emerald-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-900">
              PAGADO
            </p>
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </div>
          <p className="mt-1 font-heading text-2xl font-extrabold text-emerald-950">
            {counts.PAID}
          </p>
        </div>

        <div
          onClick={() => setStatusFilter("CONVERTED")}
          className={`cursor-pointer rounded-2xl border p-4 transition ${
            statusFilter === "CONVERTED"
              ? "border-green-600 bg-green-100/80 shadow-sm ring-1 ring-green-600"
              : "border-green-200 bg-green-50 hover:border-green-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-green-900">
              CONVERTIDO
            </p>
            <span className="h-2.5 w-2.5 rounded-full bg-green-600" />
          </div>
          <p className="mt-1 font-heading text-2xl font-extrabold text-green-950">
            {counts.CONVERTED}
          </p>
        </div>

        <div
          onClick={() => setStatusFilter("CANCELLED")}
          className={`cursor-pointer rounded-2xl border p-4 transition ${
            statusFilter === "CANCELLED"
              ? "border-rose-500 bg-rose-100/80 shadow-sm ring-1 ring-rose-500"
              : "border-rose-200 bg-rose-50 hover:border-rose-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-rose-900">
              CANCELADO
            </p>
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
          </div>
          <p className="mt-1 font-heading text-2xl font-extrabold text-rose-950">
            {counts.CANCELLED}
          </p>
        </div>
      </div>

      {/* SEARCH AND FILTERS BAR */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4 md:space-y-0 md:flex md:items-center md:justify-between md:gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por empresario, marca, correo, siteId o código de referido..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Status Select */}
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-semibold text-slate-700 focus:border-cyan-500 focus:outline-none"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="NEW">NUEVO</option>
              <option value="CONTACTED">CONTACTADO</option>
              <option value="PAID">PAGADO</option>
              <option value="CONVERTED">CONVERTIDO</option>
              <option value="CANCELLED">CANCELADO</option>
            </select>
          </div>

          {/* Payment Method Select */}
          <div>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-semibold text-slate-700 focus:border-cyan-500 focus:outline-none"
            >
              <option value="ALL">Todos los Métodos de Pago</option>
              <option value="wompi">Tarjeta (Wompi)</option>
              <option value="direct">Transferencia Directa</option>
            </select>
          </div>

          <button
            onClick={fetchLeads}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            title="Recargar datos"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Actualizar</span>
          </button>

          {/* Botón Registrar Empresario Pagado */}
          <button
            type="button"
            onClick={() => {
              setShowCreateModal(true);
              setCreatedLeadResult(null);
              setActionError(null);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 px-3.5 py-2 text-xs font-bold text-white shadow transition"
          >
            <UserPlus className="h-4 w-4" />
            <span>Registrar Empresario Pagado</span>
          </button>
        </div>
      </div>

      {/* MODAL REGISTRAR EMPRESARIO PAGADO */}
      {showCreateModal && (
        <ModalPortal>
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-cyan-600" />
                <h3 className="font-heading text-lg font-bold text-slate-900">
                  Registrar Empresario Pagado
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700:bg-slate-800:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Success Result with Copyable Onboarding Link */}
            {createdLeadResult ? (
              <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5 space-y-4">
                <div className="flex items-center gap-2 text-emerald-900 text-sm font-bold">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <span>¡Empresario Creado Exitosamente!</span>
                </div>

                <div className="space-y-1 text-xs text-slate-700">
                  <p>Marca: <strong>{createdLeadResult.lead.brandName}</strong></p>
                  <p>Empresario: <strong>{createdLeadResult.lead.fullName}</strong></p>
                  <p>Estado: <span className="font-bold text-emerald-700 uppercase">{createdLeadResult.lead.status}</span></p>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-white p-3 space-y-2">
                  <span className="text-[11px] font-bold uppercase text-slate-400 block">Ruta de Onboarding Generada</span>
                  <code className="font-mono text-xs text-slate-900 block break-all font-bold">
                    {createdLeadResult.onboardingPath}
                  </code>
                  <button
                    type="button"
                    onClick={() => handleCopyOnboardingLink(createdLeadResult.onboardingPath)}
                    className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 px-3.5 py-1.5 text-xs font-bold text-white shadow transition"
                  >
                    {copiedLink ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedLink ? "¡Enlace Copiado!" : "Copiar Enlace de Onboarding"}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setCreatedLeadResult(null);
                    setShowCreateModal(false);
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white py-2 text-xs font-bold text-slate-700"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreatePaidLead} className="space-y-4 text-xs">
                {actionError && (
                  <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-rose-700 font-semibold">
                    {actionError}
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Nombre Completo *
                    </label>
                    <input
                      type="text"
                      required
                      value={createForm.fullName}
                      onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                      placeholder="Ej. Carlos Mendoza"
                      className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Nombre Comercial / Marca *
                    </label>
                    <input
                      type="text"
                      required
                      value={createForm.brandName}
                      onChange={(e) => setCreateForm({ ...createForm, brandName: e.target.value })}
                      placeholder="Ej. Salud Vital"
                      className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      WhatsApp *
                    </label>
                    <input
                      type="text"
                      required
                      value={createForm.whatsapp}
                      onChange={(e) => setCreateForm({ ...createForm, whatsapp: e.target.value })}
                      placeholder="Ej. +573001234567"
                      className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      value={createForm.email}
                      onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                      placeholder="carlos@ejemplo.com"
                      className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Identificador de Sitio / siteId (Slug)
                    </label>
                    <input
                      type="text"
                      value={createForm.siteId}
                      onChange={(e) => setCreateForm({ ...createForm, siteId: e.target.value })}
                      placeholder="Ej. dorian-higuita"
                      className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-mono font-bold text-slate-900"
                    />
                    <p className="mt-1 text-[11px] text-slate-400">
                      Formato slug en minúsculas (ej. dorian-higuita)
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Dominio de Publicación *
                    </label>
                    <input
                      type="text"
                      required
                      value={createForm.domain}
                      onChange={(e) => setCreateForm({ ...createForm, domain: e.target.value })}
                      placeholder="Ej. dorianhiguita.pro"
                      className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-mono font-bold text-slate-900"
                    />
                    <p className="mt-1 text-[11px] text-slate-400">
                      Dominio independiente (ej. dorianhiguita.pro)
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Método de Pago
                    </label>
                    <select
                      value={createForm.paymentMethod}
                      onChange={(e) => setCreateForm({ ...createForm, paymentMethod: e.target.value as "wompi" | "direct" })}
                      className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-900"
                    >
                      <option value="direct">Transferencia Directa</option>
                      <option value="wompi">Wompi / Tarjeta</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Estado Inicial
                    </label>
                    <select
                      value={createForm.status}
                      onChange={(e) => setCreateForm({ ...createForm, status: e.target.value as ActivationLeadStatus })}
                      className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-900"
                    >
                      <option value="PAID">PAGADO (Recomendado)</option>
                      <option value="NEW">NUEVO</option>
                      <option value="CONTACTED">CONTACTADO</option>
                      <option value="CONVERTED">CONVERTIDO</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Código de Referido (Opcional)
                  </label>
                  <input
                    type="text"
                    value={createForm.referrerCode}
                    onChange={(e) => setCreateForm({ ...createForm, referrerCode: e.target.value })}
                    placeholder="Ej. JP94536693"
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-mono font-bold uppercase text-slate-900"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingLead}
                    className="rounded-xl bg-cyan-600 hover:bg-cyan-500 px-5 py-2 text-xs font-bold text-white shadow transition disabled:opacity-50"
                  >
                    {isCreatingLead ? "Creando..." : "Crear Empresario Pagado"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </ModalPortal>
      )}

      {/* MAIN TABLE SECTION */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400 space-y-3">
            <RefreshCw className="h-8 w-8 animate-spin text-cyan-500" />
            <p className="text-sm font-medium">Cargando operaciones de empresarios...</p>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <Users className="mx-auto h-12 w-12 text-slate-300" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                No se encontraron empresarios
              </h3>
              <p className="text-xs text-slate-500">
                {searchQuery || statusFilter !== "ALL" || paymentFilter !== "ALL"
                  ? "Intenta modificar los filtros de búsqueda o restablecer la selección."
                  : "Aún no se han registrado leads de activación en el sistema."}
              </p>
            </div>
            {(searchQuery || statusFilter !== "ALL" || paymentFilter !== "ALL") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("ALL");
                  setPaymentFilter("ALL");
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
              >
                Limpiar Filtros
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="w-16 py-3.5 px-4 text-center">Estado</th>
                  <th className="py-3.5 px-4">Empresario / Marca</th>
                  <th className="py-3.5 px-4">Sitio Vinculado</th>
                  <th className="py-3.5 px-4">Dominio de Publicación</th>
                  <th className="w-28 py-3.5 px-4">Registro</th>
                  <th className="w-24 py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredLeads.map((lead) => {
                  return (
                    <tr
                      key={lead.id}
                      className="hover:bg-slate-50/60 transition"
                    >
                      {/* Estado */}
                      <td className="py-3.5 px-4 text-center">
                        {getStatusBadge(lead.status, true)}
                      </td>

                      {/* Empresario / Marca */}
                      <td className="py-3.5 px-4">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 text-sm truncate">
                            {lead.brandName}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            {lead.fullName}
                          </p>
                        </div>
                      </td>

                      {/* Sitio Vinculado y Verificación */}
                      <td className="py-3.5 px-4">
                        {lead.siteId ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs font-bold text-slate-900 rounded bg-slate-100 px-2 py-0.5">
                                {lead.siteId}
                              </span>
                              <Link2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                            </div>
                            <div>
                              <VerificationBadge status={lead.lastVerification?.status || lead.publicationState} />
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 border border-amber-200">
                            Sin vincular
                          </span>
                        )}
                      </td>

                      {/* Dominio de Publicación */}
                      <td className="py-3.5 px-4 font-mono text-xs">
                        {lead.onboardingData?.domain ? (
                          <a
                            href={`https://${lead.onboardingData.domain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-cyan-600 hover:underline inline-flex min-w-0 items-center gap-1"
                          >
                            <Globe className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{lead.onboardingData.domain}</span>
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        ) : (
                          <span className="text-amber-600 font-semibold text-[11px]">
                            Pendiente
                          </span>
                        )}
                      </td>

                      {/* Fecha */}
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {new Date(lead.createdAt).toLocaleDateString("es-CO", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric"
                        })}
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          {lead.siteId && (
                            <VerifyNowButton
                              siteId={lead.siteId}
                              iconOnly={true}
                              onVerified={(res) => handleLeadVerified(lead.id, res)}
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedLead(lead)}
                            aria-label={`Gestionar ${lead.brandName}`}
                            title={`Gestionar ${lead.brandName}`}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-600 text-white shadow-sm transition hover:bg-cyan-500"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedLead && (
        <ModalPortal>
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white p-6 text-slate-900 rounded-t-3xl">
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 className="font-heading text-xl font-bold text-slate-900">{selectedLead.brandName}</h3>
                  {getStatusBadge(selectedLead.status)}
                  <VerificationBadge status={selectedLead.lastVerification?.status || selectedLead.publicationState} />
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  Empresario: <strong className="text-slate-900">{selectedLead.fullName}</strong> — Registrado el{" "}
                  {new Date(selectedLead.createdAt).toLocaleString("es-CO")}
                </p>
              </div>

              <button
                onClick={() => setSelectedLead(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 text-slate-800">
              <DeliveryGuardAlert status={selectedLead.lastVerification?.status || selectedLead.publicationState} />
              {selectedLead.lastVerification?.checks && (
                <FailedChecksDetails checks={selectedLead.lastVerification.checks} />
              )}

              {/* Action Error Banner */}
              {actionError && (
                <div className="flex items-center gap-2 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs font-semibold text-rose-700">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                  <span>{actionError}</span>
                </div>
              )}

              {/* DELIVERY NOTIFICATION */}
              <div className="rounded-2xl border border-cyan-200 bg-cyan-50/60 p-5 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Mail className="h-4 w-4 text-cyan-600" />
                      Entrega al empresario
                    </h4>
                    <p className="mt-1 text-xs text-slate-600">
                      Prepara el mensaje final con URL publica, datos de contacto, enlace de compra y proximos pasos. Si SMTP esta configurado, tambien envia el correo.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handlePrepareDelivery(false)}
                      disabled={isPreparingDelivery}
                      className="inline-flex items-center gap-2 rounded-xl border border-cyan-300 bg-white px-3 py-2 text-xs font-bold text-cyan-900 hover:bg-cyan-100 transition disabled:opacity-50"
                    >
                      <Copy className="h-4 w-4 text-cyan-600" />
                      {isPreparingDelivery ? "Preparando..." : "Preparar mensaje"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePrepareDelivery(true)}
                      disabled={isPreparingDelivery}
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 transition disabled:opacity-50"
                    >
                      <Mail className="h-4 w-4 text-cyan-300" />
                      {isPreparingDelivery ? "Enviando..." : "Enviar correo"}
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 text-xs">
                  <div className="rounded-xl border border-cyan-100 bg-white p-3">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Correo destino</span>
                    <span className="font-bold text-slate-900">{selectedLead.email || "Pendiente por registrar"}</span>
                  </div>
                  <div className="rounded-xl border border-cyan-100 bg-white p-3">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Dominio</span>
                    <span className="font-mono font-bold text-slate-900">{selectedLead.onboardingData?.domain || "Pendiente"}</span>
                  </div>
                  <div className="rounded-xl border border-cyan-100 bg-white p-3">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Estado recomendado</span>
                    <span className="font-bold text-slate-900">
                      {(selectedLead.lastVerification?.status || selectedLead.publicationState) === "VERIFIED"
                        ? "Lista para entrega"
                        : "Verificar antes de entregar"}
                    </span>
                  </div>
                </div>

                {deliveryDraft && (
                  <div className="space-y-3">
                    <div
                      className={`rounded-xl border p-3 text-xs font-semibold ${
                        deliveryDraft.emailDelivery.status === "SENT"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : deliveryDraft.emailDelivery.status === "FAILED"
                          ? "border-rose-200 bg-rose-50 text-rose-800"
                          : "border-amber-200 bg-amber-50 text-amber-800"
                      }`}
                    >
                      {deliveryDraft.emailDelivery.message}
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Mensaje preparado
                        </h5>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => copyToClipboard(deliveryDraft.whatsappMessage, "Mensaje de WhatsApp")}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-100"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            Copiar WhatsApp
                          </button>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(deliveryDraft.emailText, "Correo de entrega")}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-100"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            Copiar correo
                          </button>
                          {deliveryDraft.whatsappUrl && (
                            <a
                              href={deliveryDraft.whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-500"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                              Abrir WhatsApp
                            </a>
                          )}
                          {deliveryDraft.mailtoUrl && (
                            <a
                              href={deliveryDraft.mailtoUrl}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-cyan-500"
                            >
                              <Mail className="h-3.5 w-3.5" />
                              Abrir correo
                            </a>
                          )}
                        </div>
                      </div>

                      <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-950 p-3 text-[11px] leading-relaxed text-slate-100">
                        {deliveryDraft.emailText}
                      </pre>
                    </div>
                  </div>
                )}
              </div>

              {/* OPERATIONAL QUICK ACTIONS */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* 1. Change Status */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Edit3 className="h-4 w-4 text-cyan-500" />
                    Cambiar Estado Operativo
                  </h4>

                  <div className="grid grid-cols-2 gap-2">
                    {(["NEW", "CONTACTED", "PAID", "CONVERTED", "CANCELLED"] as ActivationLeadStatus[]).map((st) => (
                      <button
                        key={st}
                        onClick={() => handleUpdateStatus(st)}
                        disabled={isSubmittingPatch || selectedLead.status === st}
                        className={`rounded-xl py-2 px-3 text-xs font-bold transition flex items-center justify-between ${
                          selectedLead.status === st
                            ? "bg-slate-900 text-white ring-2 ring-cyan-500"
                            : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <span>{st}</span>
                        {selectedLead.status === st && <Check className="h-3.5 w-3.5 text-cyan-400" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Link siteId & Verify */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Link2 className="h-4 w-4 text-cyan-500" />
                    {selectedLead.siteId ? "Sitio Vinculado" : "Vincular Sitio"}
                  </h4>

                  {selectedLead.siteId ? (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                          <Check className="h-4 w-4 text-emerald-500" />
                          Sitio: <span className="font-mono text-sm underline">{selectedLead.siteId}</span>
                        </p>
                        <VerifyNowButton
                          siteId={selectedLead.siteId}
                          onVerified={(res) => handleLeadVerified(selectedLead.id, res)}
                        />
                      </div>
                      {selectedLead.lastVerification?.verifiedAt && (
                        <p className="text-[11px] text-slate-500">
                          Verificado: {new Date(selectedLead.lastVerification.verifiedAt).toLocaleString("es-CO")}
                        </p>
                      )}
                    </div>
                  ) : (
                    <form onSubmit={handleLinkSiteId} className="space-y-3">
                      <div>
                        <input
                          type="text"
                          value={editingSiteId}
                          onChange={(e) => setEditingSiteId(e.target.value)}
                          placeholder="Ej. salud-vital"
                          className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-mono font-bold text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:outline-none"
                        />
                        <p className="mt-1 text-[11px] text-slate-400">
                          Debe ser un slug en minúsculas (ej. yenny-garcia).
                        </p>
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmittingPatch || !editingSiteId.trim()}
                        className="w-full rounded-xl bg-cyan-600 hover:bg-cyan-500 py-2.5 text-xs font-bold text-white shadow transition disabled:opacity-50"
                      >
                        {isSubmittingPatch ? "Vinculando..." : "Vincular Sitio"}
                      </button>
                    </form>
                  )}
                </div>

                {/* 3. Acciones Especiales de Registro (Archivar & Eliminar prueba) */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 space-y-3 md:col-span-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Archive className="h-4 w-4 text-cyan-500" />
                    Acciones Especiales de Registro
                  </h4>

                  <div className="flex flex-wrap items-center gap-3">
                    {/* Botón Archivar */}
                    <button
                      type="button"
                      onClick={handleArchiveLead}
                      disabled={isSubmittingPatch}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100:bg-slate-800 transition disabled:opacity-50"
                    >
                      <Archive className="h-4 w-4 text-slate-500" />
                      <span>Archivar Empresario</span>
                    </button>

                    {/* Botón Eliminar Prueba (Condicional: sólo si no tiene siteId y estado no es PAID ni CONVERTED) */}
                    {!selectedLead.siteId && selectedLead.status !== "PAID" && selectedLead.status !== "CONVERTED" && (
                      !confirmingDelete ? (
                        <button
                          type="button"
                          onClick={() => setConfirmingDelete(true)}
                          disabled={isSubmittingPatch}
                          className="inline-flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100:bg-rose-900/60 transition"
                        >
                          <Trash2 className="h-4 w-4 text-rose-500" />
                          <span>Eliminar prueba</span>
                        </button>
                      ) : (
                        <div className="inline-flex flex-wrap items-center gap-2.5 rounded-xl border border-rose-500/50 bg-rose-500/10 p-2.5 text-xs font-semibold text-rose-700">
                          <AlertOctagon className="h-4 w-4 text-rose-500 shrink-0" />
                          <span>¿Confirmas eliminar este registro de prueba de forma irreversible?</span>
                          <button
                            type="button"
                            onClick={handleDeleteTestLead}
                            disabled={isSubmittingPatch}
                            className="rounded-lg bg-rose-600 hover:bg-rose-500 px-3 py-1 text-xs font-bold text-white shadow"
                          >
                            {isSubmittingPatch ? "Eliminando..." : "Sí, Eliminar"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingDelete(false)}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-bold text-slate-700"
                          >
                            Cancelar
                          </button>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* 4. Ecosistemas de Cortesía & Historial Persistido */}
                <div className="rounded-2xl border border-purple-200 bg-purple-50/40 p-5 space-y-4 md:col-span-2">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-100 pb-3">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                        <Gift className="h-4 w-4 text-purple-600" />
                        Ecosistemas de Cortesía & Entitlement
                      </h4>
                      <p className="mt-0.5 text-xs text-slate-600">
                        Gestiona y consulta el acceso gratuito asignado a Producto, Negocio VSL o Marca Personal.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenGrantModal}
                      className="inline-flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2 text-xs font-bold text-white shadow transition shrink-0"
                    >
                      <Gift className="h-4 w-4" />
                      <span>Asignar cortesía</span>
                    </button>
                  </div>

                  {/* Estado de Carga / Error */}
                  {isReadbackLoading ? (
                    <div className="flex items-center gap-2 py-3 text-xs text-purple-700 font-medium">
                      <RefreshCw className="h-4 w-4 animate-spin text-purple-600" />
                      <span>Consultando cortesías persistidas del partner...</span>
                    </div>
                  ) : readbackError ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                      <span>{readbackError}</span>
                    </div>
                  ) : readbackData ? (
                    <div className="space-y-4">
                      {/* Entitlement Summary Card */}
                      <div className="rounded-xl border border-purple-200/80 bg-white p-3.5 space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            Ecosistemas Incluidos en Entitlement
                          </span>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              readbackData.entitlement.commercialState === "KNOWN"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}>
                              {readbackData.entitlement.commercialState === "KNOWN" ? "COMERCIAL CONOCIDO" : "ESTADO DESCONOCIDO"}
                            </span>
                            {readbackData.entitlement.regenerationRequired && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300" title={readbackData.entitlement.regenerationReasons.join(", ")}>
                                <Sparkles className="h-3 w-3 text-amber-600" />
                                REGENERACIÓN REQUERIDA
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {readbackData.entitlement.includedEcosystems.length > 0 ? (
                            readbackData.entitlement.includedEcosystems.map((eco) => (
                              <span
                                key={eco}
                                className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-900"
                              >
                                <Check className="h-3.5 w-3.5 text-purple-600" />
                                {ECOSYSTEM_NAMES[eco] || eco}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400 italic">No hay ecosistemas habilitados aún</span>
                          )}
                        </div>

                        {readbackData.entitlement.rootRedirectTarget && (
                          <div className="text-[11px] text-slate-600 font-medium pt-1 border-t border-slate-100 flex items-center gap-1">
                            <Globe className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                            <span>
                              Redirección principal ({ECOSYSTEM_NAMES[readbackData.entitlement.rootRedirectTarget.ecosystemType]}):{" "}
                              <strong className="font-mono text-purple-900">{readbackData.entitlement.rootRedirectTarget.publicHost}</strong>
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Historial de Cortesías Persistidas */}
                      <div className="space-y-2">
                        <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Cortesías Asignadas Persistidas ({readbackData.grants.length})
                        </h5>

                        {readbackData.grants.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 p-4 text-center text-xs text-slate-500">
                            Este partner no posee cortesías de ecosistema asignadas actualmente.
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                            {readbackData.grants.map((grant) => {
                              const statusConfig = LIFECYCLE_STATUS_LABELS[grant.lifecycleStatus] || {
                                label: grant.lifecycleStatus,
                                colorClass: "bg-slate-100 text-slate-700 border-slate-300"
                              };
                              return (
                                <div
                                  key={grant.id}
                                  className="rounded-xl border border-slate-200 bg-white p-3 space-y-2 text-xs text-slate-800 shadow-sm"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      {grant.ecosystemTypes.map((eco) => (
                                        <span
                                          key={eco}
                                          className="inline-flex items-center rounded-md bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-900"
                                        >
                                          {ECOSYSTEM_NAMES[eco] || eco}
                                        </span>
                                      ))}
                                    </div>
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${statusConfig.colorClass}`}>
                                      {statusConfig.label}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-slate-600">
                                    <p>
                                      <strong>Motivo:</strong> {grant.grantReason}
                                    </p>
                                    <p>
                                      <strong>Efectiva:</strong> {grant.effectiveDate}
                                    </p>
                                    <p>
                                      <strong>Corte:</strong> {grant.cutoffDate || "Sin límite (Permanente)"}
                                    </p>
                                    {grant.operator.email && (
                                      <p className="truncate">
                                        <strong>Operador:</strong> {grant.operator.email}
                                      </p>
                                    )}
                                  </div>

                                  {grant.notes && (
                                    <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg italic">
                                      "{grant.notes}"
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* ONBOARDING COMPLETENESS & MISSING FIELDS CHECKLIST */}
              {(() => {
                const { missing, completedCount, totalFields, percentage } = getMissingFields(selectedLead);
                return (
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileCheck className="h-5 w-5 text-cyan-500" />
                        <h4 className="text-sm font-bold text-slate-900">
                          Completitud de Onboarding ({percentage}%)
                        </h4>
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-500">
                        {completedCount} de {totalFields} datos suministrados
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          percentage === 100
                            ? "bg-emerald-500"
                            : percentage >= 50
                            ? "bg-cyan-500"
                            : "bg-amber-500"
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    {/* Missing items checklist */}
                    {missing.length > 0 ? (
                      <div>
                        <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">
                          Campos Faltantes por Suministrar ({missing.length}):
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {missing.map((m) => (
                            <span
                              key={m.field}
                              className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800"
                            >
                              <AlertTriangle className="h-3 w-3 text-amber-500" />
                              {m.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-600">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>¡Onboarding completo al 100%! Todos los datos requeridos fueron suministrados.</span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* DETAILED DATA TABS / SECTIONS */}
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Información del Empresario y Onboarding
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsEditingFields(!isEditingFields)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-300 bg-cyan-50 px-3 py-1.5 text-xs font-bold text-cyan-900 hover:bg-cyan-100 transition"
                  >
                    <Edit3 className="h-3.5 w-3.5 text-cyan-600" />
                    <span>{isEditingFields ? "Ver Vista Lectura" : "Editar Todos los Campos"}</span>
                  </button>
                </div>

                {isEditingFields ? (
                  <form onSubmit={handleSaveEditableFields} className="rounded-2xl border border-cyan-200 bg-cyan-50/40 p-5 space-y-5 text-xs">
                    <h5 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <Save className="h-4 w-4 text-cyan-600" />
                      Edición Integral de Registro y Onboarding
                    </h5>

                    {/* Datos Mínimos Base */}
                    <div className="space-y-3">
                      <p className="text-[11px] font-bold uppercase text-slate-500">Datos Base del Empresario</p>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Nombre Completo</label>
                          <input
                            type="text"
                            required
                            value={editForm.fullName}
                            onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                            className="w-full rounded-xl border border-slate-200 bg-white p-2.5 font-semibold text-slate-900"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Nombre Comercial / Marca</label>
                          <input
                            type="text"
                            required
                            value={editForm.brandName}
                            onChange={(e) => setEditForm({ ...editForm, brandName: e.target.value })}
                            className="w-full rounded-xl border border-slate-200 bg-white p-2.5 font-semibold text-slate-900"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">WhatsApp</label>
                          <input
                            type="text"
                            required
                            value={editForm.whatsapp}
                            onChange={(e) => setEditForm({ ...editForm, whatsapp: e.target.value })}
                            className="w-full rounded-xl border border-slate-200 bg-white p-2.5 font-semibold text-slate-900"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Correo Electrónico</label>
                          <input
                            type="email"
                            value={editForm.email}
                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                            className="w-full rounded-xl border border-slate-200 bg-white p-2.5 font-semibold text-slate-900"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Producto / Servicio</label>
                          <input
                            type="text"
                            value={editForm.mainProduct}
                            onChange={(e) => setEditForm({ ...editForm, mainProduct: e.target.value })}
                            placeholder="Ej. Landing Page PartnerHub"
                            className="w-full rounded-xl border border-slate-200 bg-white p-2.5 font-semibold text-slate-900"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Método de Pago</label>
                          <select
                            value={editForm.paymentMethod}
                            onChange={(e) => setEditForm({ ...editForm, paymentMethod: e.target.value as "wompi" | "direct" })}
                            className="w-full rounded-xl border border-slate-200 bg-white p-2.5 font-semibold text-slate-900"
                          >
                            <option value="direct">Transferencia Directa</option>
                            <option value="wompi">Tarjeta (Wompi)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Datos de Onboarding */}
                    <div className="space-y-3 pt-3 border-t border-cyan-200">
                      <p className="text-[11px] font-bold uppercase text-slate-500">Campos de Onboarding Especificados</p>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                            Dominio de Publicación *
                          </label>
                          <input
                            type="text"
                            required
                            value={editForm.domain}
                            onChange={(e) => setEditForm({ ...editForm, domain: e.target.value })}
                            placeholder="Ej. jairopinto.pro"
                            className="w-full rounded-xl border border-slate-200 bg-white p-2.5 font-mono font-bold text-slate-900"
                          />
                          <p className="mt-1 text-[11px] text-slate-400">
                            Ruta destino en Hostinger: <code className="font-mono">/home/u658137804/domains/&#123;domain&#125;/public_html</code>
                          </p>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">País de Operación</label>
                          <input
                            type="text"
                            value={editForm.country}
                            onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                            placeholder="Ej. Colombia"
                            className="w-full rounded-xl border border-slate-200 bg-white p-2.5 font-semibold text-slate-900"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Teléfono Directo</label>
                          <input
                            type="text"
                            value={editForm.phone}
                            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                            placeholder="Ej. +573188430283"
                            className="w-full rounded-xl border border-slate-200 bg-white p-2.5 font-semibold text-slate-900"
                          />
                        </div>

                        <div className="sm:col-span-2 grid gap-4 rounded-2xl border border-slate-200 bg-white/70 p-4">
                          <p className="text-[11px] font-bold uppercase text-slate-500">SEO y Conversión</p>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Título SEO</label>
                            <input
                              type="text"
                              value={editForm.seoTitle}
                              onChange={(e) => setEditForm({ ...editForm, seoTitle: e.target.value })}
                              placeholder="Ej. Dorian Higuita - Bienestar y Vitalidad con Gano Excel"
                              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 font-semibold text-slate-900"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Meta descripción</label>
                            <textarea
                              rows={2}
                              value={editForm.metaDescription}
                              onChange={(e) => setEditForm({ ...editForm, metaDescription: e.target.value })}
                              placeholder="Descripción breve para Google y previsualizaciones sociales."
                              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 font-semibold text-slate-900"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Mensaje inicial de WhatsApp</label>
                            <textarea
                              rows={2}
                              value={editForm.defaultMessage}
                              onChange={(e) => setEditForm({ ...editForm, defaultMessage: e.target.value })}
                              placeholder="Mensaje prellenado al abrir WhatsApp desde la landing."
                              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 font-semibold text-slate-900"
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">URL de Compra / Pasarela</label>
                          <input
                            type="url"
                            value={editForm.purchaseUrl}
                            onChange={(e) => setEditForm({ ...editForm, purchaseUrl: e.target.value })}
                            placeholder="https://pasarela.com/checkout"
                            className="w-full rounded-xl border border-slate-200 bg-white p-2.5 font-semibold text-slate-900"
                          />
                        </div>

                        <div className="sm:col-span-2 space-y-4">
                          <HeroImageUploader
                            label="Hero Desktop"
                            variant="hero-desktop"
                            siteId={selectedLead.siteId || editForm.domain || "sitio"}
                            value={editForm.heroDesktopUrl}
                            onChange={(url) => setEditForm({ ...editForm, heroDesktopUrl: url })}
                          />

                          <HeroImageUploader
                            label="Hero Mobile"
                            variant="hero-mobile"
                            siteId={selectedLead.siteId || editForm.domain || "sitio"}
                            value={editForm.heroMobileUrl}
                            onChange={(url) => setEditForm({ ...editForm, heroMobileUrl: url })}
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Modo de Logo</label>
                          <select
                            value={editForm.logoMode}
                            onChange={(e) => setEditForm({ ...editForm, logoMode: e.target.value as "TYPOGRAPHY" | "IMAGE" })}
                            className="w-full rounded-xl border border-slate-200 bg-white p-2.5 font-semibold text-slate-900"
                          >
                            <option value="TYPOGRAPHY">Tipografía (Nombre de marca)</option>
                            <option value="IMAGE">Imagen de Logo</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                            URL Imagen de Logo {editForm.logoMode === "TYPOGRAPHY" && "(Opcional)"}
                          </label>
                          <input
                            type="url"
                            value={editForm.logoUrl}
                            onChange={(e) => setEditForm({ ...editForm, logoUrl: e.target.value })}
                            placeholder="https://.../logo.png"
                            className="w-full rounded-xl border border-slate-200 bg-white p-2.5 font-semibold text-slate-900"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">ID Medición GA4 (Analytics)</label>
                          <input
                            type="text"
                            value={editForm.analyticsMeasurementId}
                            onChange={(e) => setEditForm({ ...editForm, analyticsMeasurementId: e.target.value })}
                            placeholder="G-XXXXXXXXXX"
                            className="w-full rounded-xl border border-slate-200 bg-white p-2.5 font-mono font-bold text-slate-900"
                          />
                        </div>
                      </div>

                      {/* Personalización Visual y Tema (PH-025) */}
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                          <Sparkles className="h-4 w-4 text-cyan-600" />
                          <h6 className="text-xs font-bold uppercase text-slate-900">
                            Personalización Visual y Tema (PH-025)
                          </h6>
                        </div>

                        <FontSelector
                          value={editForm.fontPreset}
                          onChange={(preset) => setEditForm({ ...editForm, fontPreset: preset })}
                        />

                        <PaletteSelector
                          value={editForm.palettePreset}
                          onChange={(preset) => setEditForm({ ...editForm, palettePreset: preset })}
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setIsEditingFields(false)}
                        className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingPatch}
                        className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 px-5 py-2 text-xs font-bold text-white shadow transition disabled:opacity-50"
                      >
                        <Save className="h-4 w-4" />
                        <span>{isSubmittingPatch ? "Guardando..." : "Guardar Cambios de Empresario"}</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                {/* 1. Datos de Registro Base */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-2">
                    Datos de Registro Mínimo
                  </h4>

                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 text-xs">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Nombre Completo</span>
                      <span className="font-bold text-slate-900">{selectedLead.fullName}</span>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Marca / Comercial</span>
                      <span className="font-bold text-slate-900">{selectedLead.brandName}</span>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Correo Electrónico</span>
                      <span className="font-bold text-slate-900">{selectedLead.email || "Pendiente por registrar"}</span>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">WhatsApp Registro</span>
                      <a
                        href={`https://wa.me/${selectedLead.whatsapp.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-emerald-600 hover:underline flex items-center gap-1"
                      >
                        <MessageCircle className="h-3 w-3" />
                        {selectedLead.whatsapp}
                      </a>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Código Referido (Origen)</span>
                      <span className="font-bold text-cyan-600 font-mono">
                        {selectedLead.referrerCode || "Ninguno (Directo)"}
                      </span>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Método Pago</span>
                      <span className="font-bold text-slate-900 uppercase">
                        {selectedLead.paymentMethod}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Programa de Referidos & Código Propio */}
                {(() => {
                  const ownCodeRecord = selectedLead.siteId ? referralCodes.find((c) => c.siteId === selectedLead.siteId) : null;
                  const attractedReferrals = selectedLead.siteId
                    ? referralsList.filter((r) => r.referrerSiteId === selectedLead.siteId || (ownCodeRecord && r.referrerCode === ownCodeRecord.code))
                    : [];
                  const qualifiedAttracted = attractedReferrals.filter((r) => r.status === "QUALIFIED").length;
                  const pendingAttracted = attractedReferrals.filter((r) => r.status === "PENDING").length;

                  const inviterCodeRecord = selectedLead.referrerCode
                    ? referralCodes.find((c) => c.code.toUpperCase() === selectedLead.referrerCode?.toUpperCase())
                    : null;
                  const inviterReferralRecord = selectedLead.siteId
                    ? referralsList.find((r) => r.referredSiteId === selectedLead.siteId)
                    : null;
                  const inviterDisplayName = inviterCodeRecord?.displayName || (selectedLead.referrerCode ? "Código registrado en lead" : "Ninguno");

                  return (
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-2 flex items-center justify-between">
                        <span>Programa de Referidos & Códigos de Invitación</span>
                        {selectedLead.siteId && (
                          <span className="text-[10px] font-mono text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                            {selectedLead.siteId}
                          </span>
                        )}
                      </h4>

                      <div className="grid gap-4 sm:grid-cols-2 text-xs">
                        {/* Código Propio */}
                        <div className="rounded-2xl border border-cyan-100 bg-gradient-to-br from-cyan-50/40 via-white to-slate-50 p-4 space-y-3 shadow-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                              Código Propio para Compartir
                            </span>
                            {ownCodeRecord ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                                <Lock className="h-3 w-3 text-emerald-700" />
                                {ownCodeRecord.siteId.startsWith("ref-") ? "Provisional (Bloqueado)" : "Asignado y Bloqueado"}
                              </span>
                            ) : (
                              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                                Sin código
                              </span>
                            )}
                          </div>

                          {ownCodeRecord && !isEditingCode ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 rounded-xl border border-cyan-200 bg-white px-3 py-2 font-mono text-base font-bold text-cyan-950 tracking-wider flex items-center justify-between">
                                  <span>{ownCodeRecord.code}</span>
                                  <Lock className="h-4 w-4 text-cyan-600/70" />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(ownCodeRecord.code);
                                    setCopiedOwnCode(true);
                                    setTimeout(() => setCopiedOwnCode(false), 2000);
                                  }}
                                  className="rounded-xl border border-cyan-300 bg-white p-2.5 text-cyan-700 hover:bg-cyan-50 transition shadow-sm"
                                  title="Copiar código"
                                >
                                  {copiedOwnCode ? (
                                    <Check className="h-4 w-4 text-emerald-600" />
                                  ) : (
                                    <Copy className="h-4 w-4" />
                                  )}
                                </button>
                              </div>

                              <div className="flex items-center justify-between pt-1">
                                <span className="text-[11px] text-slate-500">
                                  {attractedReferrals.length} {attractedReferrals.length === 1 ? "referido atraído" : "referidos atraídos"} ({qualifiedAttracted} calificados, {pendingAttracted} pendientes)
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsEditingCode(true);
                                    setCodeAssignInput(ownCodeRecord.code);
                                  }}
                                  className="text-[11px] font-bold text-slate-500 hover:text-cyan-700 underline flex items-center gap-1"
                                >
                                  <Lock className="h-3 w-3" />
                                  <span>Desbloquear y modificar</span>
                                </button>
                              </div>
                            </div>
                          ) : selectedLead.siteId ? (
                            <div className="space-y-2">
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={codeAssignInput}
                                  onChange={(e) => setCodeAssignInput(e.target.value.toUpperCase())}
                                  placeholder="Ej. JP94536693"
                                  className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-1.5 font-mono text-xs uppercase font-bold text-slate-900 focus:border-cyan-500 focus:outline-none"
                                />
                                <button
                                  type="button"
                                  disabled={isAssigningCode}
                                  onClick={() => handleAssignEntrepreneurCode(selectedLead.siteId!, selectedLead.brandName || selectedLead.fullName)}
                                  className="rounded-xl bg-cyan-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-cyan-500 transition disabled:opacity-50"
                                >
                                  {isAssigningCode ? "Guardando..." : ownCodeRecord ? "Guardar y Bloquear" : "Asignar"}
                                </button>
                                {isEditingCode && (
                                  <button
                                    type="button"
                                    onClick={() => setIsEditingCode(false)}
                                    className="rounded-xl border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-100"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                              {codeAssignError && (
                                <p className="text-[11px] text-rose-600">{codeAssignError}</p>
                              )}
                              {codeAssignSuccess && (
                                <p className="text-[11px] text-emerald-600">{codeAssignSuccess}</p>
                              )}
                            </div>
                          ) : (
                            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-2.5 text-center text-slate-500 text-[11px]">
                              Para asignar un código de invitación propio, primero vincula un <strong>ID de Sitio (siteId)</strong> al empresario en la sección superior.
                            </div>
                          )}
                        </div>

                        {/* Invitador / Referente */}
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                              Invitado Por (Referente)
                            </span>
                            {selectedLead.referrerCode ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-bold text-cyan-800 border border-cyan-200">
                                <Lock className="h-3 w-3 text-cyan-700" />
                                Inmutable (Bloqueado)
                              </span>
                            ) : (
                              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                                Directo
                              </span>
                            )}
                          </div>

                          {selectedLead.referrerCode ? (
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm font-bold text-slate-900 flex items-center gap-1.5">
                                  <span>{selectedLead.referrerCode}</span>
                                  <Lock className="h-3.5 w-3.5 text-slate-400" />
                                </span>
                                {inviterReferralRecord && (
                                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                    inviterReferralRecord.status === "QUALIFIED"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : inviterReferralRecord.status === "VALIDATED"
                                      ? "bg-blue-100 text-blue-800"
                                      : inviterReferralRecord.status === "PENDING"
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-slate-200 text-slate-700"
                                  }`}>
                                    {inviterReferralRecord.status === "QUALIFIED" ? "Calificado" : inviterReferralRecord.status === "VALIDATED" ? "Validado" : inviterReferralRecord.status === "PENDING" ? "Pendiente" : inviterReferralRecord.status}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-600">
                                <strong>Invitador:</strong> {inviterDisplayName}
                              </p>
                              {inviterCodeRecord?.siteId.startsWith("ref-") && (
                                <p className="text-[10px] text-amber-700 bg-amber-50 rounded p-1 border border-amber-200">
                                  Este código fue creado provisionalmente desde el registro. Puede vincularse a un empresario oficial en la pestaña &quot;Programa de Referidos&quot;.
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-500 italic">
                              Este empresario se registró directamente sin código de invitación.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 3. Datos de Onboarding Suministrados */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-2">
                    Información Detallada de Onboarding
                  </h4>

                  {selectedLead.onboardingData ? (
                    <div className="grid gap-4 sm:grid-cols-2 text-xs">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:col-span-2">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Dominio de Publicación</span>
                        {selectedLead.onboardingData.domain ? (
                          <a
                            href={`https://${selectedLead.onboardingData.domain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-cyan-600 hover:underline flex items-center gap-1 font-mono text-sm"
                          >
                            <Globe className="h-4 w-4" />
                            {selectedLead.onboardingData.domain}
                            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                          </a>
                        ) : (
                          <span className="text-amber-600 font-bold text-xs">Dominio no configurado</span>
                        )}
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">País de Operación</span>
                        <span className="font-bold text-slate-900">
                          {selectedLead.onboardingData.country || "No especificado"}
                        </span>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">WhatsApp Visible / Teléfono</span>
                        <span className="font-bold text-slate-900">
                          {selectedLead.onboardingData.whatsapp || "No especificado"} / {selectedLead.onboardingData.phone || "N/A"}
                        </span>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:col-span-2">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">URL de Compra / Checkout</span>
                        {selectedLead.onboardingData.purchaseUrl ? (
                          <a
                            href={selectedLead.onboardingData.purchaseUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-cyan-600 hover:underline flex items-center gap-1 truncate"
                          >
                            {selectedLead.onboardingData.purchaseUrl}
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        ) : (
                          <span className="text-slate-400">Sin URL suministrada</span>
                        )}
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Hero Desktop URL</span>
                        {selectedLead.onboardingData.heroDesktopUrl ? (
                          <a
                            href={selectedLead.onboardingData.heroDesktopUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-cyan-600 hover:underline flex items-center gap-1 truncate"
                          >
                            Ver Imagen Hero Desktop
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        ) : (
                          <span className="text-slate-400">No suministrada</span>
                        )}
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Hero Mobile URL</span>
                        {selectedLead.onboardingData.heroMobileUrl ? (
                          <a
                            href={selectedLead.onboardingData.heroMobileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-cyan-600 hover:underline flex items-center gap-1 truncate"
                          >
                            Ver Imagen Hero Mobile
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        ) : (
                          <span className="text-slate-400">No suministrada</span>
                        )}
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Modo de Logotipo</span>
                        <span className="font-bold text-slate-900 uppercase">
                          {selectedLead.onboardingData.logoMode || "TYPOGRAPHY"}
                        </span>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">ID GA4</span>
                        <span className="font-bold text-slate-900 font-mono">
                          {selectedLead.onboardingData.analyticsMeasurementId || "No suministrado"}
                        </span>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Preset Tipográfico</span>
                        <span className="font-bold text-slate-900 capitalize">
                          {selectedLead.onboardingData.fontPreset || "executive"}
                        </span>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Paleta de Color</span>
                        <span className="font-bold text-slate-900 capitalize">
                          {selectedLead.onboardingData.palettePreset || "cobalt-cyan"}
                        </span>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Consentimiento Imágenes</span>
                        <span className="font-bold text-slate-900">
                          {selectedLead.onboardingData.imageUseConsent ? "Sí, Autorizado" : "No otorgado"}
                        </span>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Aceptación Acuerdo</span>
                        <span className="font-bold text-slate-900">
                          {selectedLead.onboardingData.agreementAccepted ? "Sí, Aceptado" : "No aceptado"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">El empresario aún no ha iniciado el formulario de onboarding.</p>
                  )}
                </div>

                {/* 4. Fotografías fuente del onboarding */}
                {(() => {
                  const validPhotos = selectedLead.onboardingData?.sourcePhotos?.filter(isValidHttpsUrl) ?? [];
                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Fotografías fuente del onboarding
                        </h4>
                        {validPhotos.length > 0 && (
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                            {validPhotos.length} fotos
                          </span>
                        )}
                      </div>

                      {validPhotos.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2">
                          {validPhotos.map((photoUrl, idx) => (
                            <a
                              key={idx}
                              href={photoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100 hover:border-cyan-500 transition-colors"
                              onClick={(e) => {
                                const img = e.currentTarget.querySelector('img');
                                if (img && img.style.display === 'none') {
                                  e.preventDefault();
                                }
                              }}
                            >
                              <img
                                src={photoUrl}
                                alt={`Fotografía fuente ${idx + 1}`}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                              <div className="hidden absolute inset-0 flex items-center justify-center bg-slate-100 text-slate-400">
                                <ImageIcon className="h-5 w-5" />
                              </div>
                            </a>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">No hay fotografías fuente cargadas</p>
                      )}
                    </div>
                  );
                })()}

              </>
            )}
          </div>
        </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-200 bg-slate-50 p-4 text-right">
              <button
                onClick={() => setSelectedLead(null)}
                className="rounded-xl border border-slate-300 bg-white px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* MODAL ASIGNAR CORTESÍA DE ECOSISTEMAS */}
      {showGrantModal && selectedLead && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
            <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-5 my-8">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-purple-600" />
                  <div>
                    <h3 className="font-heading text-lg font-bold text-slate-900">
                      Asignar Cortesía de Ecosistemas
                    </h3>
                    <p className="text-xs text-slate-500">
                      Partner: <strong className="text-slate-900">{selectedLead.fullName}</strong> ({selectedLead.brandName})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGrantModal(false)}
                  className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {grantError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>{grantError}</span>
                </div>
              )}

              {grantSuccessResult ? (
                <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5 space-y-4">
                  <div className="flex items-center gap-2 text-emerald-900 text-sm font-bold">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <span>¡Cortesía Asignada Exitosamente!</span>
                  </div>

                  <div className="space-y-2 text-xs text-slate-700">
                    <p>
                      Ecosistemas otorgados:{" "}
                      <span className="font-bold text-slate-900">
                        {grantSuccessResult.grant.ecosystemTypes.join(", ")}
                      </span>
                    </p>
                    <p>Motivo: <strong>{grantSuccessResult.grant.grantReason}</strong></p>
                    <p>Fecha Efectiva: <strong>{grantSuccessResult.grant.effectiveDate}</strong></p>
                    {grantSuccessResult.grant.cutoffDate && (
                      <p>Fecha de Corte: <strong>{grantSuccessResult.grant.cutoffDate}</strong></p>
                    )}
                  </div>

                  {grantSuccessResult.grant.regenerationRequired && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-blue-600 shrink-0" />
                      <span>
                        <strong>Nota:</strong> Se requiere regenerar la landing del partner para aplicar la nueva cortesía (regenerationRequired: true).
                      </span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setShowGrantModal(false);
                      setGrantSuccessResult(null);
                    }}
                    className="w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white shadow hover:bg-slate-800 transition"
                  >
                    Cerrar
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmitComplimentaryGrant} className="space-y-4">
                  {/* Ecosystem Selection Checkboxes */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Ecosistemas a Otorgar *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {[
                        { type: "PRODUCT" as const, label: "Producto", desc: "Landing de producto" },
                        { type: "BUSINESS" as const, label: "Negocio VSL", desc: "Negocio y VSL" },
                        { type: "PERSONAL_BRAND" as const, label: "Marca Personal", desc: "Marca del líder" }
                      ].map((eco) => {
                        const checked = grantForm.ecosystemTypes.includes(eco.type);
                        return (
                          <label
                            key={eco.type}
                            className={`flex flex-col p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                              checked
                                ? "border-purple-500 bg-purple-50 text-purple-950 font-bold"
                                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleGrantEcosystem(eco.type)}
                                className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                              />
                              <span>{eco.label}</span>
                            </div>
                            <span className="text-[10px] text-slate-500 mt-1 font-normal">
                              {eco.desc}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Grant Reason */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Motivo de la Cortesía *
                    </label>
                    <input
                      required
                      type="text"
                      value={grantForm.grantReason}
                      onChange={(e) => setGrantForm({ ...grantForm, grantReason: e.target.value })}
                      placeholder="Ej. Promoción especial de lanzamiento / Bonificación por liderazgo"
                      className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  {/* Dates Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                        Fecha Efectiva *
                      </label>
                      <input
                        required
                        type="date"
                        value={grantForm.effectiveDate}
                        onChange={(e) => setGrantForm({ ...grantForm, effectiveDate: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-semibold text-slate-900 focus:border-purple-500 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                        Fecha de Corte (Opcional)
                      </label>
                      <input
                        type="date"
                        value={grantForm.cutoffDate}
                        onChange={(e) => setGrantForm({ ...grantForm, cutoffDate: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-semibold text-slate-900 focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Notas Internas (Opcionales)
                    </label>
                    <textarea
                      rows={2}
                      value={grantForm.notes}
                      onChange={(e) => setGrantForm({ ...grantForm, notes: e.target.value })}
                      placeholder="Detalles adicionales para registro del operador..."
                      className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-medium text-slate-900 placeholder-slate-400 focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowGrantModal(false)}
                      disabled={isSubmittingGrant}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingGrant || grantForm.ecosystemTypes.length === 0}
                      className="rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2 text-xs font-bold text-white shadow transition disabled:opacity-50"
                    >
                      {isSubmittingGrant ? "Asignando..." : "Confirmar Asignación"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
