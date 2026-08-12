# CDX-20260812-010 — DONE

## Request ID

`CDX-20260812-010`

## Resumen

Se implementó un catálogo backend Zod para las cuatro ofertas aprobadas y la selección server-side por `offerCode`. Las altas públicas e internas pueden recibir únicamente el código y persisten `offerCode` junto con un `offerSnapshot` normalizado e inmutable. Los campos derivados enviados por el cliente se rechazan y los registros históricos sin oferta siguen siendo válidos.

El follow-up `CDX-20260812-012` corrigió la consistencia entre oferta y ecosistema. Las ofertas individuales aceptan únicamente su ecosistema o lo derivan cuando se omite. `PLAN_360` rechaza cualquier `ecosystemType` único y conserva sus tres ecosistemas exclusivamente en el snapshot. Las altas sin `offerCode` mantienen el comportamiento histórico: respetan el ecosistema enviado o usan `PRODUCT` por defecto.

El follow-up `CDX-20260812-013` protegió también las actualizaciones administrativas. `updateStatus` valida cualquier nuevo `ecosystemType` contra el `offerSnapshot` persistido antes de escribir: acepta coincidencias en ofertas individuales, rechaza contradicciones y no permite representar `PLAN_360` mediante un ecosistema único. Los leads históricos sin snapshot conservan la lógica anterior.

## Archivos modificados

- `app/web/server/services/activationOfferCatalog.ts`
- `app/web/server/services/activationOfferCatalog.test.ts`
- `app/web/server/services/activationLeadService.ts`
- `app/web/server/services/activationOfferUpdateGuard.ts`
- `app/web/server/services/activationOfferUpdateGuard.test.ts`
- `brain/agent-requests/codex/requests/CDX-20260812-010_offer_catalog_snapshot_contract.md`
- `brain/agent-requests/codex/requests/CDX-20260812-012_offer_ecosystem_consistency_fix.md`
- `brain/agent-requests/codex/requests/CDX-20260812-013_offer_snapshot_update_guard.md`
- `brain/agent-requests/codex/reports/CDX-20260812-010_offer_catalog_snapshot_contract_DONE.md`

## Contrato producido

- Entrada de creación: `offerCode` opcional con valores `PRODUCT_ONLY`, `BUSINESS_ONLY`, `PERSONAL_BRAND_ONLY` o `PLAN_360`.
- Persistencia: `offerCode` y `offerSnapshot` opcionales para compatibilidad histórica.
- `offerSnapshot`: `{ offerCode, ecosystemTypes, amountCop, currency: "COP", billingType: "ONE_TIME", selectedAt }`.
- El snapshot se deriva exclusivamente del catálogo backend y no forma parte de ningún contrato de actualización.
- `PRODUCT_ONLY`, `BUSINESS_ONLY` y `PERSONAL_BRAND_ONLY` derivan o validan el `ecosystemType` correspondiente.
- `PLAN_360` no persiste un `ecosystemType` único; `offerSnapshot.ecosystemTypes` es la fuente de verdad de sus tres ecosistemas.
- `CDX-20260812-011` debe usar exclusivamente el snapshot persistido como fuente económica para Payment Intent/Wompi.

## Verificación

- Pruebas focalizadas: PASS, 16/16. Incluyen creación consistente y guards de actualización válida, contradictoria, `PLAN_360` e histórica sin snapshot.
- ESLint focalizado de los tres archivos backend: PASS, cero warnings.
- ESLint global: ejecutado; FAIL por 4 errores y 13 warnings preexistentes únicamente en archivos frontend excluidos (`partners-referrals-view.tsx`, `personal-brand-blocks-view.tsx`, `topbar.tsx` y `lib/ecosystem-contracts.ts`).
- `npm run build`: PASS.
- `git diff --check`: PASS.

## Git

- Rama: `codex/CDX-20260812-010-offer-catalog-snapshot`
- Commit de implementación: `ec8dd28`
- Commit de consistencia CDX-012: `a615da6`.
- Commit de matriz de pruebas CDX-012: `2b79f08`.
- Commit de guard CDX-013: incluido en el nuevo commit que actualiza el PR #113.
- PR existente de CDX-010: `#113`. CDX-013 no abre un PR adicional.

## Riesgos pendientes

- La rama hereda deuda ESLint global de frontend fuera del alcance y debe corregirse en un ticket de su propietario.
- Todavía no existe integración Wompi, checkout, webhook ni firma; corresponde a `CDX-20260812-011`.
- No se migraron registros históricos; la ausencia de `offerCode` y `offerSnapshot` se conserva intencionalmente.

## Follow-up

Sí: `CDX-20260812-011` para Payment Intent + Checkout/Webhook Wompi en Sandbox después de la auditoría y merge de este contrato.
