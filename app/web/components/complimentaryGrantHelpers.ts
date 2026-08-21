export type EcosystemType = "PRODUCT" | "BUSINESS" | "PERSONAL_BRAND";
export type GrantLifecycleStatus = "ACTIVE" | "SCHEDULED" | "EXPIRED";

export interface ComplimentaryGrantFormState {
  ecosystemTypes: EcosystemType[];
  grantReason: string;
  effectiveDate: string;
  cutoffDate: string;
  notes: string;
}

export interface ComplimentaryGrantResult {
  grant: {
    id: string;
    activationLeadId: string;
    ecosystemTypes: EcosystemType[];
    grantReason: string;
    effectiveDate: string;
    cutoffDate: string | null;
    notes: string | null;
    operatorSubject: string;
    operatorEmail: string | null;
    regenerationRequired: boolean;
    createdAt: string;
  };
  idempotent: boolean;
}

export interface ComplimentaryGrantItem {
  id: string;
  ecosystemTypes: EcosystemType[];
  grantReason: string;
  effectiveDate: string;
  cutoffDate: string | null;
  notes: string | null;
  operator: {
    subject: string;
    email: string | null;
  };
  regenerationRequired: boolean;
  lifecycleStatus: GrantLifecycleStatus;
  createdAt: string;
}

export interface ComplimentaryGrantReadback {
  activationLeadId: string;
  effectiveDate: string;
  grants: ComplimentaryGrantItem[];
  entitlement: {
    commercialState: "KNOWN" | "UNKNOWN";
    includedEcosystems: EcosystemType[];
    regenerationRequired: boolean;
    regenerationReasons: string[];
    rootRedirectTarget: { ecosystemType: EcosystemType; publicHost: string } | null;
  };
}

export interface ComplimentaryGrantConflictResponse {
  error: "ECOSYSTEM_ALREADY_GRANTED";
  conflicts: Array<{
    ecosystemType: EcosystemType;
    sources: Array<"CONFIRMED_PAYMENT" | "ACTIVE_COMPLIMENTARY_GRANT">;
  }>;
}

export const ECOSYSTEM_NAMES: Record<EcosystemType, string> = {
  PRODUCT: "Producto",
  BUSINESS: "Negocio VSL",
  PERSONAL_BRAND: "Marca Personal"
};

export const LIFECYCLE_STATUS_LABELS: Record<GrantLifecycleStatus, { label: string; colorClass: string }> = {
  ACTIVE: { label: "Activa", colorClass: "bg-emerald-50 text-emerald-800 border-emerald-300" },
  SCHEDULED: { label: "Programada", colorClass: "bg-blue-50 text-blue-800 border-blue-300" },
  EXPIRED: { label: "Expirada", colorClass: "bg-slate-100 text-slate-600 border-slate-300" }
};

export function isEcosystemCovered(
  ecosystemType: EcosystemType,
  readbackData: ComplimentaryGrantReadback | null
): boolean {
  if (!readbackData || !readbackData.entitlement || !readbackData.entitlement.includedEcosystems) {
    return false;
  }
  return readbackData.entitlement.includedEcosystems.includes(ecosystemType);
}

export function getAvailableEcosystems(
  readbackData: ComplimentaryGrantReadback | null
): EcosystemType[] {
  const allEcosystems: EcosystemType[] = ["PRODUCT", "BUSINESS", "PERSONAL_BRAND"];
  return allEcosystems.filter((eco) => !isEcosystemCovered(eco, readbackData));
}

export function formatComplimentaryGrantConflictError(conflictData: ComplimentaryGrantConflictResponse): string {
  if (!conflictData.conflicts || conflictData.conflicts.length === 0) {
    return "Conflicto en la asignación: Uno o más ecosistemas seleccionados ya se encuentran cubiertos por un pago confirmado o cortesía activa.";
  }

  const details = conflictData.conflicts.map((c) => {
    const name = ECOSYSTEM_NAMES[c.ecosystemType] || c.ecosystemType;
    const sourceLabels = c.sources.map((s) => s === "CONFIRMED_PAYMENT" ? "pago confirmado" : "cortesía activa").join(" y ");
    return `${name} (cubierto por ${sourceLabels})`;
  });

  return `No se pudo asignar la cortesía: los siguientes ecosistemas ya están cubiertos: ${details.join("; ")}.`;
}

export function validateComplimentaryGrantForm(form: ComplimentaryGrantFormState): string | null {
  if (!form.ecosystemTypes || form.ecosystemTypes.length === 0) {
    return "Debes seleccionar al menos un ecosistema de cortesía.";
  }
  if (!form.grantReason || form.grantReason.trim().length < 2) {
    return "El motivo de la cortesía es obligatorio (mínimo 2 caracteres).";
  }
  if (!form.effectiveDate || !/^\d{4}-\d{2}-\d{2}$/.test(form.effectiveDate)) {
    return "La fecha efectiva debe tener un formato de fecha válido (AAAA-MM-DD).";
  }
  if (form.cutoffDate && form.cutoffDate.trim().length > 0) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.cutoffDate.trim())) {
      return "La fecha de corte debe tener un formato de fecha válido (AAAA-MM-DD).";
    }
    if (form.cutoffDate.trim() < form.effectiveDate) {
      return "La fecha de corte debe ser posterior o igual a la fecha efectiva.";
    }
  }
  return null;
}

export function buildComplimentaryGrantPayload(form: ComplimentaryGrantFormState) {
  const validationError = validateComplimentaryGrantForm(form);
  if (validationError) {
    throw new Error(validationError);
  }
  const uniqueEcosystems = Array.from(new Set(form.ecosystemTypes));
  return {
    ecosystemTypes: uniqueEcosystems,
    grantReason: form.grantReason.trim(),
    effectiveDate: form.effectiveDate,
    cutoffDate: form.cutoffDate.trim() || null,
    notes: form.notes.trim() || null
  };
}
