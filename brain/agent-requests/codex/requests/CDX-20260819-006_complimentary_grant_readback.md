# CDX-20260819-006 — Lectura de asignaciones de cortesía

## Owner

Codex (Backend Lead).

## Dependencia

CDX-20260819-005.

## Objetivo

Exponer mediante una lectura interna autenticada los grants de cortesía persistidos y su efecto vigente en el entitlement del partner.

## Alcance

- GET interno autenticado por activation lead.
- Campos auditables, vigencia y resumen de entitlement.
- Compatibilidad con leads sin grants.
- Lectura sin crear pagos, ingresos ni publicaciones.

## Exclusiones

- Frontend.
- Payments, Revenue, Wompi, DNS, dominios y publicación.
- Asignaciones reales.

## Aceptación

- Pruebas de lectura, ausencia, vigencia, inmutabilidad y regresión de entitlements.
- ESLint backend, build y `git diff --check`.
- Reporte DONE, commit y push; no abrir PR.
