# AGR-20261021-004 — Runtime de consentimiento y medición Business

Estado: contrato y plan técnico PR #229 aprobados por Jairo el 2026-10-21. Runtime asignado a subagente en rol Antigravity/frontend; revisión independiente por tarea, sin publicación.

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
