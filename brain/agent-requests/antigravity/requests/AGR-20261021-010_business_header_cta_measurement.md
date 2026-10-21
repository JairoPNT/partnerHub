# AGR-20261021-010 — Medición del CTA real del encabezado

Estado: implementación completada; revisión e integración del controlador pendientes. Owner: frontend runtime/Antigravity delegado, tier balanced. Follow-up AGR007 de revisión final dentro de AGR005/CDX006 aprobado. Reporte: `brain/agent-requests/antigravity/reports/AGR-20261021-010_business_header_cta_measurement_DONE.md`.

- Outcome: el CTA real aprobado #btnNavContact se reconoce como placement=header con las mismas guardas de destino y consentimiento, sin cambiar navegación ni payload.
- Evidencia: final review CDX006 P2; index.html:39 tiene id=btnNavContact, runtime:235 solo reconoce header sin id. Tests anteriores simulaban id vacío.
- Allowed: plantillas-de-pagina/business/measurement-runtime.js, measurement-runtime.test.mjs, measurement-test-harness.mjs solo si fixture lo requiere, request/reporte propios.
- Excluded: app/index/styles/config/UI, backend/registry/integration scripts; SDK real, master/source/publicación/campañas. No tracking extra, sin nuevos eventos/PII ni relajar destinos/trusted/consent.
- Dependencies: integración 3b05356 y contrato por carga; parallel-safe AGR009 (app/UI tests distintos), rama/worktree propios. Root rebindea hashes y valida navegador después.
- Verify: RED con id real del index aprobado; GREEN evento header exactamente una vez por clic confiable con destino del partner y permiso correspondiente; negativo sin permiso/destino equivocado/sintético conservado. Ejecutar runtime suite y UI regresión, sin suites redundantes.
- Delivery: commit y reporte AGR-20261021-010_business_header_cta_measurement_DONE.md, evidencia y límites; sin push/PR/merge. Scoped revisión final después de integrar ambos.
