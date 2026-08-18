# CDX-20260818-012 — DONE

## Resumen

Se amplió el registro backend de pagos manuales con asignación explícita de uno o varios ecosistemas, `offerCode` opcional y modos `CATALOG` o `MANUAL_NEGOTIATED`.

El backend genera y persiste un snapshot comercial versión 1 con oferta, ecosistemas, modo de precio, monto, moneda y timestamp. El monto negociado se conserva literalmente; el modo catálogo exige coincidencia con la oferta server-side.

## Contrato

Para métodos manuales, `POST /api/internal/payments` requiere:

- `ecosystemTypes`: selección no vacía, válida y sin duplicados.
- `pricingMode`: `CATALOG` o `MANUAL_NEGOTIATED`.
- `offerCode`: obligatorio de hecho para validar `CATALOG`; opcional en negociado.
- `amountCop`: monto confirmado; en negociado no se reemplaza con el catálogo.

La respuesta conserva el registro existente y añade `paymentId`, `ecosystemTypes`, `commercialSnapshot` y `regenerationRequired`.

Los asientos Wompi mantienen compatibilidad y no fueron modificados: pueden omitir estos campos porque continúan respaldados por el snapshot de activación.

## Entitlement y regeneración

- Solo snapshots de pagos `CONFIRMED` alimentan el entitlement.
- Los ecosistemas manuales se unen a los del snapshot de activación sin inferencias retroactivas.
- `regenerationRequired` se marca cuando el pago habilita al menos un ecosistema nuevo.
- El entitlement reporta targets faltantes, pero no genera ni publica páginas.
- Un pago anulado deja de alimentar el entitlement porque la consulta filtra por `CONFIRMED`.

## Compatibilidad histórica

Los pagos históricos sin `commercialSnapshot` siguen siendo legibles y no se reescriben. No reciben ecosistemas inferidos por monto, método, ID o referencia.

## Archivos modificados

- `app/web/server/services/manualPaymentLedgerCore.ts`
- `app/web/server/services/manualPaymentLedgerCore.test.ts`
- `app/web/server/services/manualPaymentLedgerService.ts`
- `app/web/server/services/partnerEcosystemEntitlementCore.ts`
- `app/web/server/services/partnerEcosystemEntitlementCore.test.ts`
- `app/web/server/services/partnerEcosystemEntitlementService.ts`
- `app/web/package.json`
- `brain/agent-requests/codex/requests/CDX-20260818-012_manual_payment_ecosystem_assignment.md`
- `brain/agent-requests/codex/reports/CDX-20260818-012_manual_payment_ecosystem_assignment_DONE.md`

## Verificación

- Pruebas focalizadas: 20/20 aprobadas.
- ESLint backend: aprobado.
- Build: aprobado.
- `git diff --check`: aprobado.

## Riesgos e integración

- CDX-012 se basa en CDX-010 (`88f08e9`); CDX-010 debe integrarse primero.
- La UI actual no envía aún los nuevos campos manuales. Su adaptación pertenece a un ticket Antigravity independiente.
- No existe edición destructiva del snapshot: las correcciones futuras deben ser operaciones de ajuste auditadas.

## Rama y PR

- Rama: `codex/CDX-20260818-012-manual-payment-ecosystem-assignment`.
- Base: `codex/CDX-20260818-010-staged-ecosystem-upgrade-pricing`.
- PR: no creado; pendiente de auditoría.
