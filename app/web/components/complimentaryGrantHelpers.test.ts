import assert from "node:assert/strict";
import test from "node:test";

import {
  validateComplimentaryGrantForm,
  buildComplimentaryGrantPayload,
  ECOSYSTEM_NAMES,
  LIFECYCLE_STATUS_LABELS,
  isEcosystemCovered,
  getAvailableEcosystems,
  formatComplimentaryGrantConflictError,
  type ComplimentaryGrantFormState,
  type ComplimentaryGrantReadback,
  type ComplimentaryGrantConflictResponse
} from "./complimentaryGrantHelpers.ts";

test("validateComplimentaryGrantForm fails if no ecosystems selected", () => {
  const invalidForm: ComplimentaryGrantFormState = {
    ecosystemTypes: [],
    grantReason: "Motivo valido",
    effectiveDate: "2026-08-19",
    cutoffDate: "",
    notes: ""
  };
  const error = validateComplimentaryGrantForm(invalidForm);
  assert.ok(error && error.includes("al menos un ecosistema"));
});

test("validateComplimentaryGrantForm fails if grantReason is empty or under 2 chars", () => {
  const invalidForm: ComplimentaryGrantFormState = {
    ecosystemTypes: ["PRODUCT"],
    grantReason: " ",
    effectiveDate: "2026-08-19",
    cutoffDate: "",
    notes: ""
  };
  const error = validateComplimentaryGrantForm(invalidForm);
  assert.ok(error && error.includes("mínimo 2 caracteres"));
});

test("validateComplimentaryGrantForm fails if cutoffDate is prior to effectiveDate", () => {
  const invalidForm: ComplimentaryGrantFormState = {
    ecosystemTypes: ["PRODUCT"],
    grantReason: "Bonificación por lanzamiento",
    effectiveDate: "2026-08-19",
    cutoffDate: "2026-08-01",
    notes: ""
  };
  const error = validateComplimentaryGrantForm(invalidForm);
  assert.ok(error && error.includes("posterior o igual"));
});

test("buildComplimentaryGrantPayload constructs valid backend payload without payment fields", () => {
  const validForm: ComplimentaryGrantFormState = {
    ecosystemTypes: ["PRODUCT", "BUSINESS"],
    grantReason: "Lanzamiento especial 2026",
    effectiveDate: "2026-08-19",
    cutoffDate: "2026-12-31",
    notes: "Aprobado por dirección comercial"
  };

  const payload = buildComplimentaryGrantPayload(validForm);
  assert.deepEqual(payload.ecosystemTypes, ["PRODUCT", "BUSINESS"]);
  assert.equal(payload.grantReason, "Lanzamiento especial 2026");
  assert.equal(payload.effectiveDate, "2026-08-19");
  assert.equal(payload.cutoffDate, "2026-12-31");
  assert.equal(payload.notes, "Aprobado por dirección comercial");
});

test("ECOSYSTEM_NAMES maps ecosystem types to Spanish labels", () => {
  assert.equal(ECOSYSTEM_NAMES.PRODUCT, "Producto");
  assert.equal(ECOSYSTEM_NAMES.BUSINESS, "Negocio VSL");
  assert.equal(ECOSYSTEM_NAMES.PERSONAL_BRAND, "Marca Personal");
});

test("LIFECYCLE_STATUS_LABELS maps lifecycle states correctly", () => {
  assert.equal(LIFECYCLE_STATUS_LABELS.ACTIVE.label, "Activa");
  assert.equal(LIFECYCLE_STATUS_LABELS.SCHEDULED.label, "Programada");
  assert.equal(LIFECYCLE_STATUS_LABELS.EXPIRED.label, "Expirada");
});

test("isEcosystemCovered identifies covered ecosystems from readback entitlement", () => {
  const readback: ComplimentaryGrantReadback = {
    activationLeadId: "lead-1",
    effectiveDate: "2026-08-20",
    grants: [],
    entitlement: {
      commercialState: "KNOWN",
      includedEcosystems: ["PRODUCT", "BUSINESS"],
      regenerationRequired: false,
      regenerationReasons: [],
      rootRedirectTarget: null
    }
  };

  assert.equal(isEcosystemCovered("PRODUCT", readback), true);
  assert.equal(isEcosystemCovered("BUSINESS", readback), true);
  assert.equal(isEcosystemCovered("PERSONAL_BRAND", readback), false);
  assert.equal(isEcosystemCovered("PRODUCT", null), false);
});

test("getAvailableEcosystems returns only uncovered ecosystems", () => {
  const readbackAllCovered: ComplimentaryGrantReadback = {
    activationLeadId: "claudia-lead",
    effectiveDate: "2026-08-20",
    grants: [],
    entitlement: {
      commercialState: "KNOWN",
      includedEcosystems: ["PRODUCT", "BUSINESS", "PERSONAL_BRAND"],
      regenerationRequired: false,
      regenerationReasons: [],
      rootRedirectTarget: null
    }
  };

  assert.deepEqual(getAvailableEcosystems(readbackAllCovered), []);

  const readbackPartial: ComplimentaryGrantReadback = {
    activationLeadId: "partial-lead",
    effectiveDate: "2026-08-20",
    grants: [],
    entitlement: {
      commercialState: "KNOWN",
      includedEcosystems: ["PRODUCT"],
      regenerationRequired: false,
      regenerationReasons: [],
      rootRedirectTarget: null
    }
  };

  assert.deepEqual(getAvailableEcosystems(readbackPartial), ["BUSINESS", "PERSONAL_BRAND"]);
});

test("formatComplimentaryGrantConflictError formats HTTP 409 conflict messages clearly", () => {
  const conflictResp: ComplimentaryGrantConflictResponse = {
    error: "ECOSYSTEM_ALREADY_GRANTED",
    conflicts: [
      { ecosystemType: "PRODUCT", sources: ["CONFIRMED_PAYMENT"] },
      { ecosystemType: "BUSINESS", sources: ["ACTIVE_COMPLIMENTARY_GRANT"] }
    ]
  };

  const message = formatComplimentaryGrantConflictError(conflictResp);
  assert.ok(message.includes("Producto (cubierto por pago confirmado)"));
  assert.ok(message.includes("Negocio VSL (cubierto por cortesía activa)"));
});
