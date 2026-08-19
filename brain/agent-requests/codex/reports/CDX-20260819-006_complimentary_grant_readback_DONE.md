# CDX-20260819-006 — Reporte DONE

## Resultado

Se añadió una lectura interna autenticada que recupera los grants de cortesía persistidos de un activation lead y entrega simultáneamente el resumen vigente de su entitlement comercial.

## Endpoint

`GET /api/internal/activation-leads/:leadId/complimentary-grant`

- Requiere Cloudflare Access.
- Devuelve `404` si el activation lead no existe.
- Usa `Cache-Control: no-store, max-age=0` para que reabrir el detalle consulte persistencia actual.
- No crea ni modifica grants, pagos, ingresos, targets o publicaciones.

## Contrato de lectura

Cada grant expone:

- `id`;
- `ecosystemTypes`;
- `grantReason`;
- `effectiveDate` y `cutoffDate`;
- `notes`;
- operador (`subject` y correo disponible);
- `regenerationRequired`;
- `lifecycleStatus`: `SCHEDULED`, `ACTIVE` o `EXPIRED`;
- `createdAt`.

El resumen de entitlement expone estado comercial, ecosistemas incluidos vigentes, redirección raíz, razones y bandera de regeneración. Los grants futuros o vencidos siguen visibles para auditoría, pero solo los activos participan en el entitlement.

## Validaciones

- Pruebas focalizadas y regresiones: PASS, 37/37.
- Cobertura de lectura persistida/reapertura, ausencia de grants, vigencia y límites de corte, inmutabilidad, entitlement, ledger y métricas.
- ESLint backend: PASS.
- Build: PASS; advertencia NFT preexistente del workspace.
- `git diff --check`: PASS.

## Archivos modificados

- `app/web/app/api/internal/activation-leads/[id]/complimentary-grant/route.ts`
- `app/web/server/services/complimentaryEcosystemGrantService.ts`
- `app/web/server/services/complimentaryGrantReadbackCore.ts`
- `app/web/server/services/complimentaryGrantReadbackCore.test.ts`
- `app/web/package.json`
- Request y reporte de CDX-20260819-006.

## Dependencia

Esta rama parte de `codex/CDX-20260819-005-complimentary-ecosystem-grant`; CDX-005 debe integrarse antes que CDX-006.

## Invariantes operativas

- Asignaciones reales ejecutadas: 0.
- Payments y Revenue modificados: no.
- Wompi, DNS y publicación modificados: no.
- PR abierto: no.

## Rama

`codex/CDX-20260819-006-complimentary-grant-readback`
