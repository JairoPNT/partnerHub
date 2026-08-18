# CDX-20260818-014 — Compatibilidad de pagos manuales durante rollout de ecosistemas

## Owner

Codex (Backend Lead).

## Dependencia

Follow-up de `CDX-20260818-012` (`f737079`).

## Objetivo único

Conservar temporalmente el contrato legacy de pagos manuales y aceptar en paralelo el contrato nuevo con ecosistemas explícitos, sin inferencias ni entitlement retroactivo.

## Comportamiento requerido

- Payload nuevo con `ecosystemTypes` y `pricingMode`: conserva toda la validación y snapshot de CDX-012.
- Payload legacy sin ambos campos: registra el pago sin snapshot comercial, ecosistemas ni regeneración.
- Payload parcial: rechazado.
- Respuesta legacy: `commercialState: UNKNOWN` y `ecosystemAssignmentRequired: true`.
- No inferir ecosistemas por monto, método, categoría o referencia.
- Los pagos históricos permanecen intactos.

## Fuera de alcance

- Frontend de Payments.
- Wompi, checkout, DNS o publicación.
- Inferencia o migración automática de pagos legacy.

## Aceptación

- Payload legacy registra correctamente.
- Payload nuevo conserva la lógica de CDX-012.
- Vacíos, duplicados y payloads parciales se rechazan.
- Legacy no recibe ecosistemas ni regeneración inventados.
- Regresión del ledger, ESLint backend, build y `git diff --check` aprobados.
