# CDX-20260818-014 — DONE

## Resumen

Se corrigió el rollout de CDX-012 para aceptar simultáneamente los contratos legacy y nuevo de pagos manuales.

- Legacy: ausencia conjunta de `ecosystemTypes` y `pricingMode`.
- Nuevo: ambos campos presentes y validados.
- Parcial: rechazado para evitar estados ambiguos.

## Contrato legacy

El pago se registra con el mismo monto, método, categoría y referencia históricos. No se crea `commercialSnapshot`, no se asignan ecosistemas y no se marca regeneración.

La respuesta expone:

```json
{
  "ecosystemTypes": [],
  "commercialSnapshot": null,
  "commercialState": "UNKNOWN",
  "ecosystemAssignmentRequired": true,
  "regenerationRequired": false
}
```

## Contrato nuevo

Conserva la lógica completa de CDX-012: selección no vacía y sin duplicados, validación de catálogo, monto `MANUAL_NEGOTIATED`, snapshot server-side, entitlement explícito y regeneración solo para ecosistemas nuevos.

## Archivos modificados

- `app/web/server/services/manualPaymentLedgerCore.ts`
- `app/web/server/services/manualPaymentLedgerCore.test.ts`
- `app/web/server/services/manualPaymentLedgerService.ts`
- `brain/agent-requests/codex/requests/CDX-20260818-014_manual_payment_backward_compatibility.md`
- `brain/agent-requests/codex/reports/CDX-20260818-014_manual_payment_backward_compatibility_DONE.md`

## Verificación

- Regresión focalizada de ledger y entitlement: 22/22 aprobadas.
- ESLint backend: aprobado.
- Build: aprobado.
- `git diff --check`: aprobado.

## Seguridad y compatibilidad

- No se infieren ecosistemas para entradas legacy ni registros históricos.
- No se modifican pagos existentes.
- No se publica ni provisiona ningún target.
- Wompi permanece sin cambios.

## Rama y PR

- Rama: `codex/CDX-20260818-012-manual-payment-ecosystem-assignment`.
- Commit base: `f737079`.
- PR: no creado; pendiente de auditoría.
