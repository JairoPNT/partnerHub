# CDX-20261021-006 — Integración local de consentimiento Business

Estado: plan técnico PR #229 aprobado por Jairo el 2026-10-21. Ejecución pendiente de revisiones de componentes CDX-005 y AGR-004/005; no falta nueva aprobación del plan.

- Owner: Codex orquestador; revisión visual por Antigravity sin ediciones simultáneas.
- Outcome: paquete integrado revisado y evidencia local browser/packaging; no publicación ni acreditación de recepción externa.
- Plan: `docs/superpowers/plans/2026-10-21-business-measurement-integration.md`; contrato común/spec asociados obligatorios.
- Allowed: scripts/harness/reporter de integración listados en el plan, registry de hashes finales aprobado, este request/reporte. Integrar commits de owners, no reescribir su implementación.
- Excluded: frontend/copy, servicios de otros tickets salvo merge de sus commits revisados, auth/DB, master/source reales, cuentas/campañas/eventos reales, DNS/SFTP/APPLY productivo y publicación.
- Dependencies: plan aprobado; CDX-005 y AGR-004/005 implementados/revisados; AGR-001/003 previos a UI. Revisión de seguridad final antes de liberar código compatible.
- Parallel-safe: solo lectura de componentes; no modificar sus archivos mientras sus owners estén activos. Un único owner de registry y output fixture de integración.
- Verify: browser sin perfil del usuario y todos los requests interceptados; fixtures sin IDs reales; falsificación/retirada/dedupe/no-JS/preview; mobile/desktop; Node20 real y renovación/replay histórico del master en temp; lint/build/diff. No crear dependencia de producto para pruebas: Playwright existente del runtime local.
- Delivery: reporte `brain/agent-requests/codex/reports/CDX-20261021-006_business_consent_integration_DONE.md` con PASS/FAIL/BLOCKED por requisito/proveedor y publicVerification NOT_RUN. Release/cutover productivo requiere autorización separada; no activar el monitor eliminado.
