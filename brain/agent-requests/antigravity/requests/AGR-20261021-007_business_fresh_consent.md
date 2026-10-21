# AGR-20261021-007 — Consentimiento Business por carga

Estado: PENDING, autorizado por Jairo 2026-10-21; follow-up de AGR-004, no repetir su request completado/con revisión fallida.

- Owner: subagente dedicado en rol Antigravity, tier balanced; revisión independiente y seguridad premium al final.
- Outcome: eliminar restauración de permisos antiguos y cerrar la carrera de retirada/recarga con consentimiento por documento.
- Spec/plan vinculante: `docs/superpowers/specs/2026-10-21-business-fresh-consent-amendment.md` (contrato completo aprobado y criterios de verificación).
- Allowed: `plantillas-de-pagina/business/measurement-runtime.js`, `measurement-runtime.test.mjs`, `measurement-test-harness.mjs`; este request y reporte propio.
- Excluded: app.js/index.html/styles.css/config.js, backend/API/auth, registry, cuentas/SDK reales, fuentes/master, DNS/SFTP, publicación y otros ecosistemas.
- Dependencies: AGR004 código checkpoint02339c importado; aprobación explícita de consentimiento por carga. No reabrir la decisión de 180 días.
- Parallel-safe with: CDX005 y documentación coordinadora; AGR005 solo después de revisión runtime por dependencia contractual. Ningún otro escritor en runtime/harness/tests.
- Implementation: TDD, primero demostrar que los grants viejos restauran estado/SDK en el código anterior; implementar exactamente la enmienda, adaptar tests de TTL/persistencia obsoletos conservando regresiones restantes. Mantener todos los gates técnicos y no tocar UI. No descargar SDK real.
- Verify: Node runtime suite, node --check, lint y regresiones WhatsApp/plantilla/VSL pertinentes; declarar skips/fallos previos por nombre, sin afirmar suite global inexistente. Browser conjunto en CDX006; evidencia offline no demuestra privacidad/configuración de cuentas reales.
- Delivery: commit en rama/worktree aislado, reporte `brain/agent-requests/antigravity/reports/AGR-20261021-007_business_fresh_consent_DONE.md` con RED/GREEN/comandos/resultados/riesgos. No push/merge/publicación desde el implementer.
