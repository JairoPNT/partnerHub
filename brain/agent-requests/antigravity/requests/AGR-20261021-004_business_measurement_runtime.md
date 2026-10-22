# AGR-20261021-004 — Runtime de consentimiento y medición Business

Estado: Task 2 REVIEW FAILED / NEEDS FIXES — NO COMPLETADA, NO APROBADA para activación, integración o publicación. El contrato y plan técnico PR #229 fueron aprobados por Jairo el 2026-10-21; esa aprobación no subsana el hallazgo posterior de revisión independiente. Task 1 conserva su revisión previa.

Checkpoint de revisión — 2026-10-21:

- El revisor independiente de Task 2 rechazó el comportamiento de recarga tras fallar simultáneamente setItem/removeItem: la retirada queda solo en memoria y una aceptación antigua legible se restaura en un documento nuevo.
- El arbitraje premium de privacidad, comunicado por el orquestador, confirma que una denegación durable incondicional no puede garantizarse con localStorage como único mecanismo si sus escrituras y borrados fallan. Un handoff de denegación en sessionStorage no resuelve recuperación de todos los almacenamientos ni otras pestañas.
- Recomendación pendiente de Jairo, NO aprobada: exigir consentimiento fresco por documento y no restaurar grants guardados. Alternativa pendiente: conservar la política de restauración a 180 días y mantener medición bloqueada hasta rediseño. No se cambia todavía el contrato ni se implementa ninguna alternativa.
- Sin fix especulativo ni cambios de source/tests/UI durante esta espera. Ambos providers reales siguen false; no hay autorización de activación. Evidencia y reproducción en el reporte propio; los tests locales pasados no equivalen a cumplimiento completo.

- Owner: Antigravity. Tier balanced y revisión independiente de seguridad antes de integrar.
- Outcome: runtime único de navegador, default deny, persistencia 180 días, retirada y clic WhatsApp sin PII propia ni conversiones ficticias.
- Plan: `docs/superpowers/plans/2026-10-21-business-measurement-runtime.md`; contrato congelado: `2026-10-21-business-consent-delivery.md` en la misma carpeta. Leer también spec aprobado de consentimiento.
- Allowed: exclusivamente `plantillas-de-pagina/business/measurement-runtime.js`, `measurement-runtime.test.mjs`, `measurement-test-harness.mjs`; request/reporte propios. No otro archivo de plantilla.
- Excluded: app.js/index.html/styles.css/config.js, backend, APIs, auth, master/source real, cuentas/tags/eventos externos, publicación y otros ecosistemas.
- Dependencies: aprobación del plan. No depende de terminar backend para trabajar con fixtures de CONFIG y metadata reservada congelados.
- Parallel-safe with: CDX-005, AGR-001/003 (contenido sin runtime), AGR-002 (editor) y AGR-005 (UI sin runtime). No tocar archivos reservados de otros tickets.
- Contract: window.PartnerHubBusinessConsent con getState/setConsent/withdraw y evento local exactos del plan. UI no controla IDs, storage ni SDKs. Origen esperado y provider readiness no los decide el visitante/editor; consentimiento independiente de ambos.
- Verify: pruebas VM sobre código real con I/O fake; ausencia/rechazo/expiración/storage error; categorías selectivas; reload/otra pestaña/retirada durante carga; dedupe; SDK fallido; payloads y URLs/referrer; cero SDK en preview. Nunca descargar SDK real para las pruebas.
- Delivery: rama/worktree propios, commits por tarea, revisión independiente, PR sin merge/publicación y reporte `brain/agent-requests/antigravity/reports/AGR-20261021-004_business_measurement_runtime_DONE.md` con controles oficiales empleados y gates que sigan bloqueados.
