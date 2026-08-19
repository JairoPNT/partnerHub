export type EcosystemType = "PRODUCT" | "BUSINESS" | "PERSONAL_BRAND";

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
