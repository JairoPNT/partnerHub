export type BusinessReadinessStatus =
  | "READY_FOR_PUBLICATION_PREVIEW"
  | "PUBLICATION_CURRENT"
  | "PUBLICATION_SCHEDULED"
  | "RETRY_REQUIRED"
  | "BLOCKED";

export type BusinessReadinessBlockedReason =
  | "ACTIVATION_NOT_APPROVED"
  | "ENTITLEMENT_NOT_FOUND"
  | "BUSINESS_NOT_ENTITLED"
  | "TARGET_NOT_FOUND"
  | "TARGET_OWNERSHIP_MISMATCH"
  | "TARGET_NOT_READY"
  | "ARTIFACT_MISSING"
  | "ARTIFACT_INVALID"
  | "MASTER_PACKAGE_MISSING"
  | "INVENTORY_UNAVAILABLE";

export interface BusinessReadinessArtifacts {
  sourceHash: string;
  targetHash: string;
  masterPackageHash: string;
  intentHash: string;
}

export interface BusinessCommercialReadinessResponse {
  status: BusinessReadinessStatus;
  blocked: boolean;
  blockedReasons: BusinessReadinessBlockedReason[];
  siteId?: string;
  publicHost?: string;
  artifacts?: BusinessReadinessArtifacts | null;
}

export interface BusinessReadinessStatusConfig {
  label: string;
  badgeClass: string;
  description: string;
  isBlocked: boolean;
}

export const BUSINESS_READINESS_STATUS_CONFIG: Record<BusinessReadinessStatus, BusinessReadinessStatusConfig> = {
  READY_FOR_PUBLICATION_PREVIEW: {
    label: "Listo para revisión",
    badgeClass: "bg-blue-50 text-blue-800 border-blue-200",
    description: "El ecosistema de Negocio está listo para revisión técnica. Los controles de publicación se gestionan en un flujo separado.",
    isBlocked: false
  },
  PUBLICATION_CURRENT: {
    label: "Publicación al día",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
    description: "El sitio de Negocio se encuentra publicado y sincronizado. La gestión de publicación se realiza en un ticket aprobado independiente.",
    isBlocked: false
  },
  PUBLICATION_SCHEDULED: {
    label: "Publicación programada",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
    description: "Existe un trabajo de publicación en cola o en ejecución. El control de despliegue se administra en un flujo operativo separado.",
    isBlocked: false
  },
  RETRY_REQUIRED: {
    label: "Reintento requerido",
    badgeClass: "bg-rose-50 text-rose-800 border-rose-200",
    description: "El último intento de publicación requiere reintento. Las acciones de reintento corresponden a un ticket operativo posterior.",
    isBlocked: false
  },
  BLOCKED: {
    label: "Bloqueado para publicación",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
    description: "No cumple con los requisitos comerciales o técnicos previos para publicación.",
    isBlocked: true
  }
};

export const BUSINESS_BLOCKED_REASON_LABELS: Record<BusinessReadinessBlockedReason, string> = {
  ACTIVATION_NOT_APPROVED: "Activación del partner aún no aprobada o registro inactivo.",
  ENTITLEMENT_NOT_FOUND: "Registro de derechos comerciales no encontrado o en estado desconocido.",
  BUSINESS_NOT_ENTITLED: "Ecosistema de Negocio no incluido en el plan comercial asignado.",
  TARGET_NOT_FOUND: "Destino de publicación de Negocio no configurado en inventario.",
  TARGET_OWNERSHIP_MISMATCH: "Discrepancia en la propiedad o identificador del destino de publicación.",
  TARGET_NOT_READY: "Destino de publicación de Negocio aún no se encuentra en estado listo.",
  ARTIFACT_MISSING: "Artefacto de generación de Negocio ausente.",
  ARTIFACT_INVALID: "Artefacto de generación de Negocio inválido o con discrepancia de identidad.",
  MASTER_PACKAGE_MISSING: "Paquete maestro de Negocio no disponible.",
  INVENTORY_UNAVAILABLE: "Inventario de publicación o dependencias no disponibles."
};

export function getReadinessStatusInfo(status: BusinessReadinessStatus): BusinessReadinessStatusConfig {
  return (
    BUSINESS_READINESS_STATUS_CONFIG[status] || {
      label: status,
      badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
      description: "Estado no reconocido por el sistema.",
      isBlocked: false
    }
  );
}

export function getBlockedReasonDescription(reason: BusinessReadinessBlockedReason | string): string {
  return (
    BUSINESS_BLOCKED_REASON_LABELS[reason as BusinessReadinessBlockedReason] ||
    `Requisito no cumplido: ${reason}`
  );
}

export function formatReadinessErrorMessage(status: number, rawError?: string): string {
  if (status === 401) {
    return "Requiere acceso a la sesión oficial de Cloudflare Access para consultar la disponibilidad comercial.";
  }
  if (status === 404) {
    return "No se encontró el registro del partner en el sistema.";
  }
  return rawError || "No se pudo consultar el estado de disponibilidad comercial de Negocio.";
}

export interface FetchBusinessReadinessOptions {
  leadId: string;
  fetchFn?: typeof fetch;
  signal?: AbortSignal;
}

export async function fetchBusinessCommercialReadiness({
  leadId,
  fetchFn = fetch,
  signal
}: FetchBusinessReadinessOptions): Promise<BusinessCommercialReadinessResponse> {
  const res = await fetchFn(`/api/internal/activation-leads/${leadId}/business-commercial-readiness`, {
    signal
  });
  if (!res.ok) {
    let errJson: { error?: string } = {};
    try {
      errJson = (await res.json()) as { error?: string };
    } catch {
      // ignore JSON parse failure on non-JSON error
    }
    throw new Error(formatReadinessErrorMessage(res.status, errJson.error));
  }
  return (await res.json()) as BusinessCommercialReadinessResponse;
}

export interface ReadinessSessionManager {
  request: (leadId: string) => Promise<BusinessCommercialReadinessResponse | null>;
  cancel: () => void;
  getCurrentLeadId: () => string | null;
}

export function createReadinessSessionManager(fetchFn: typeof fetch = fetch): ReadinessSessionManager {
  let activeLeadId: string | null = null;
  let activeController: AbortController | null = null;

  return {
    async request(leadId: string) {
      if (activeController) {
        activeController.abort();
      }
      activeLeadId = leadId;
      const controller = new AbortController();
      activeController = controller;

      try {
        const result = await fetchBusinessCommercialReadiness({
          leadId,
          fetchFn,
          signal: controller.signal
        });
        if (activeLeadId !== leadId) {
          return null;
        }
        return result;
      } catch (error) {
        if (activeLeadId !== leadId || (error instanceof Error && error.name === "AbortError")) {
          return null;
        }
        throw error;
      }
    },
    cancel() {
      if (activeController) {
        activeController.abort();
        activeController = null;
      }
      activeLeadId = null;
    },
    getCurrentLeadId() {
      return activeLeadId;
    }
  };
}
