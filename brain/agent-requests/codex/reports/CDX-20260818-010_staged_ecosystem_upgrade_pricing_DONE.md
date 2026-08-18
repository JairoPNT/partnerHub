# CDX-20260818-010 — DONE

## Resumen

Se implementó un calculador comercial puro y server-side para compras directas, upgrades conjuntos y addons individuales de ecosistemas. El cliente solo solicita ecosistemas; no puede proporcionar ni sobrescribir el monto calculado.

El cálculo consume evidencia comercial explícita por pago. Solo considera estados asentados `CONFIRMED` o `APPROVED`; ignora `PENDING`, `DECLINED` y `VOIDED`. No infiere ecosistemas por monto, IDs o referencias.

## Reglas implementadas

- Plan 360 directo: `350000 COP`.
- Upgrade desde exactamente un ecosistema, sin addon individual previo: monto necesario para alcanzar un total histórico de `400000 COP`.
- Addons individuales: Producto `180000`, Business `180000`, Marca Personal `100000`; los tres sucesivos totalizan `460000 COP`.
- Un addon individual confirmado invalida la elegibilidad para el bundle escalonado.
- Pagos asentados sin ecosistemas explícitos o con montos inválidos son rechazados, no acreditados.
- Ecosistemas ya confirmados no pueden cotizarse otra vez.

## Ejemplos

| Historial confirmado | Compra solicitada | Modo | Monto |
| --- | --- | --- | ---: |
| Ninguno | Producto + Business + Marca | `DIRECT_BUNDLE` | $350.000 |
| Producto $180.000 | Business + Marca | `STAGED_BUNDLE_UPGRADE` | $220.000 |
| Business $180.000 | Producto + Marca | `STAGED_BUNDLE_UPGRADE` | $220.000 |
| Marca $100.000 | Producto + Business | `STAGED_BUNDLE_UPGRADE` | $300.000 |
| Producto $180.000 + Business addon $180.000 | Marca addon | `INDIVIDUAL_ADDON` | $100.000 |

## Contrato de cotización

La respuesta incluye `offerCode`, `pricingMode`, ecosistemas incluidos y confirmados, elegibilidad, total histórico confirmado, monto COP, IDs/referencias previas y un snapshot congelado con timestamp. El código escalonado es `PLAN_360_STAGED_UPGRADE`.

## Archivos modificados

- `app/web/server/services/stagedEcosystemUpgradePricingCore.ts`
- `app/web/server/services/stagedEcosystemUpgradePricingCore.test.ts`
- `app/web/package.json`
- `brain/agent-requests/codex/requests/CDX-20260818-010_staged_ecosystem_upgrade_pricing.md`
- `brain/agent-requests/codex/reports/CDX-20260818-010_staged_ecosystem_upgrade_pricing_DONE.md`

## Verificación

- Pruebas focalizadas: 8/8 aprobadas.
- ESLint backend (`server` y `app/api`): aprobado.
- Build: aprobado.
- `git diff --check`: aprobado.

## Riesgos de integración

- El ledger histórico actual no contiene evidencia de ecosistemas en todos los registros legacy. Esos pagos no deben usarse para cotizar hasta contar con asignación comercial explícita; nunca se debe inferir por monto.
- El endpoint público, checkout y Wompi deben consumir posteriormente el snapshot server-side sin aceptar `amountCop` del cliente.
- La persistencia definitiva debe guardar `offerCode`, `pricingMode`, ecosistemas y referencias previas junto al nuevo pago, sin reescribir pagos existentes.

## Rama y PR

- Rama: `codex/CDX-20260818-010-staged-ecosystem-upgrade-pricing`.
- PR: no creado; pendiente de auditoría.
