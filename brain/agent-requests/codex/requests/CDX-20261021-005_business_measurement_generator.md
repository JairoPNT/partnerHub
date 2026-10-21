# CDX-20261021-005 — Generador Business con consentimiento

Estado: contrato y plan técnico PR #229 aprobados por Jairo el 2026-10-21. Implementación autorizada con subagentes y revisión por tarea; publicación productiva excluida.

Checkpoint 2026-10-21: Task 1 revisada y Task 2 implementada en `9188d6d`; revisión independiente Task 2 e integración pendientes. Registry productivo vacío; sin activación/publicación. Evidencia y límites en el reporte propio indicado abajo; no cerrar el ticket por este checkpoint.

- Owner: Codex Backend Lead, subagente implementador por tarea y revisor independiente. Tier balanced para ingeniería; premium para revisión final de seguridad/integridad.
- Outcome: paquete Business con asset aprobado, sin Meta heredado previo a consentimiento y con preflight anterior a escrituras.
- Plan: `docs/superpowers/plans/2026-10-21-business-measurement-generator.md`; contrato común: `2026-10-21-business-consent-delivery.md` en la misma carpeta.
- Allowed: productPageGenerationService.ts; nuevos businessMeasurementHtml.ts/tests/businessMeasurementArtifacts.ts y businessMeasurementAuthority.ts/tests; integración de generación Business y los scripts/tests de master/package expresamente listados en el plan. Actualizar este request y su reporte propio.
- Excluded: plantilla/frontend, APIs/auth/Prisma, IDs/entitlements, Product/Brand runtime, fuentes reales, cuentas/campañas/proveedores, APPLY real, DNS/SFTP y publicación. No ampliar Docker/package/lock sin defecto probado y follow-up.
- Dependencies: aprobación del plan; runtime AGR-004 y UI AGR-005 para activar release conjunto. Desarrollo backend puede usar fixtures sobre contrato congelado, sin esperar sus implementaciones.
- Parallel-safe with: AGR-004, AGR-005 y AGR-002 por archivos distintos; verificar otros owners activos antes de editar servicios compartidos.
- Integration: no merge parcial que rompa master persistente. CDX-006 es owner de hashes finales/ensamblado tras revisiones. Registry/metadata de release no provienen de payload HTTP/source/master; IDs/origen se resuelven desde el snapshot servidor ligado al entitlement/site, no desde el body legacy.
- Verify: RED/GREEN, rechazo sin mutaciones, bytes verificados=copiados, inventario nuevo/histórico, preservación perfil PR226 y Product/Brand, Node20 packaging, lint/build/diff.
- Report: `brain/agent-requests/codex/reports/CDX-20261021-005_business_measurement_generator_DONE.md`, con commits, pruebas, limitaciones y gate de publicación pendiente.
