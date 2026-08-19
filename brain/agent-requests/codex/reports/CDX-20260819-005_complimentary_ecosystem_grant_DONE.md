# CDX-20260819-005 — Reporte DONE

## Resumen

Se implementó una operación backend autenticada e idempotente para otorgar ecosistemas sin crear pagos ni afectar Revenue. Los grants se guardan en un ledger comercial separado y se incorporan al contrato de entitlement únicamente cuando están vigentes.

## Contrato

- `POST /api/internal/activation-leads/:leadId/complimentary-grant`.
- Autenticación obligatoria mediante Cloudflare Access.
- Payload estricto con ecosistemas únicos, motivo, fecha efectiva, fecha de corte opcional y notas.
- La identidad y correo del operador se obtienen del token validado; no se aceptan desde el payload.
- Respuesta `201` para creación y `200` para repetición idempotente.
- Un grant futuro no se activa antes de `effectiveDate`; deja de aportar entitlement después de `cutoffDate`.

## Persistencia e invariantes

- Archivo separado: `${PRODUCT_PAGE_COMMERCIAL_GRANT_DIR}/complimentary-ecosystem-grants.json`.
- Default: `/data/generated-sites/.commercial-grants/complimentary-ecosystem-grants.json`.
- Escritura atómica mediante archivo temporal y `rename`.
- No se escribe en `payments.json`, Wompi, leads, DNS, dominios ni publicaciones.
- No existen campos de monto, moneda, paymentId o revenue en el grant.
- El entitlement combina oferta, pagos comerciales confirmados y grants activos sin convertir grants en snapshots financieros.
- `regenerationRequired` se marca solo si el grant introduce al menos un ecosistema no incluido previamente.

## Validación

- Suite focalizada y regresiones financieras: PASS, 32/32.
- Incluye creación, auditoría, validación, idempotencia, fechas, corte, regeneración, invariancia del ledger, entitlement y métricas.
- ESLint backend: PASS.
- Build: PASS; advertencia NFT preexistente del workspace.
- `git diff --check`: PASS.

## Archivos modificados

- `app/web/app/api/internal/activation-leads/[id]/complimentary-grant/route.ts`
- `app/web/server/services/complimentaryEcosystemGrantCore.ts`
- `app/web/server/services/complimentaryEcosystemGrantCore.test.ts`
- `app/web/server/services/complimentaryEcosystemGrantService.ts`
- `app/web/server/services/partnerEcosystemEntitlementCore.ts`
- `app/web/server/services/partnerEcosystemEntitlementCore.test.ts`
- `app/web/server/services/partnerEcosystemEntitlementService.ts`
- `app/web/package.json`
- Request y reporte de CDX-20260819-005.

## Operación real

No se ejecutaron grants para `claudia-calero`, `blanca-ruiz` ni ningún otro partner. No se crearon pagos ni se alteraron métricas.

## Rama y PR

- Rama: `codex/CDX-20260819-005-complimentary-ecosystem-grant`.
- PR: no abierto; pendiente de auditoría.

## Riesgos y follow-up

El directorio de grants debe residir en el volumen persistente del despliegue. La ejecución de asignaciones reales requiere un ticket OPS separado y confirmación explícita del operador.
