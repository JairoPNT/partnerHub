import assert from "node:assert/strict";
import test from "node:test";

import {
  validateComplimentaryGrantForm,
  buildComplimentaryGrantPayload,
  ECOSYSTEM_NAMES,
  LIFECYCLE_STATUS_LABELS,
  type ComplimentaryGrantFormState
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
