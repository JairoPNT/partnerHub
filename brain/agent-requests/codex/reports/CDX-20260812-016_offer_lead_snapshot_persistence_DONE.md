# CDX-20260812-016 — DONE

## Request ID

`CDX-20260812-016`

## Resumen

El registro público ahora devuelve el contrato de oferta persistido antes de iniciar Wompi. El snapshot se resuelve exclusivamente desde el catálogo backend, incluye el ecosistema individual (o `null` para `PLAN_360`), los ecosistemas completos, monto COP, moneda, tipo de cobro, fecha de selección y versión del catálogo. El navegador no puede inyectar monto, moneda, versión ni snapshot.

## Archivos modificados

- `app/web/server/services/activationOfferCatalog.ts`
- `app/web/server/services/activationOfferCatalog.test.ts`
- `app/web/app/api/public/activation-leads/route.ts`
- Request y reporte DONE de `CDX-20260812-016`

## Contrato expuesto

- `POST /api/public/activation-leads`: añade `offerCode`, `ecosystemType` y `offerSnapshot` a la respuesta 201.
- `GET/POST /api/internal/activation-leads`: conserva la serialización completa existente del lead, incluyendo esos campos.
- Nuevos snapshots: `offerCode`, `ecosystemType`, `ecosystemTypes`, `amountCop`, `currency`, `billingType`, `catalogVersion` y `selectedAt`.
- Leads históricos sin `offerCode` ni `offerSnapshot`: continúan serializándose sin snapshot.

## Verificación

- Pruebas focalizadas de catálogo/contrato: PASS, 12/12.
- Pruebas focalizadas del consumidor Wompi: PASS, 7/7.
- ESLint backend focalizado: PASS, cero warnings.
- `npm run build`: PASS.
- `git diff --check`: PASS.

## Git

- Rama: `codex/CDX-20260812-016-offer-lead-snapshot`
- Commit de implementación: `b226eb4`.
- PR: no creado por instrucción.

## Riesgos y follow-up

- No se modificaron frontend, Wompi, onboarding, ledger, dashboard ni pagos.
- El frontend deberá enviar un `offerCode` válido para que el alta nueva incluya snapshot; esa integración queda fuera de este ticket.
