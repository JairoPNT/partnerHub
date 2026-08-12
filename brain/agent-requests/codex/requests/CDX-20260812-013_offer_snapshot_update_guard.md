# CDX-20260812-013 — Protección del snapshot durante actualizaciones

## Objetivo

Impedir que una actualización administrativa cambie `ecosystemType` de un activation lead que ya posee `offerSnapshot` incompatible.

## Alcance

- En `updateStatus`, si existe `offerSnapshot`, validar cualquier `ecosystemType` recibido contra `offerSnapshot.ecosystemTypes`.
- Para ofertas individuales, aceptar únicamente el ecosistema del snapshot.
- Para `PLAN_360`, no aceptar un `ecosystemType` único distinto del contrato multiecosistema; conservar el snapshot como fuente de verdad.
- Mantener compatibilidad con leads históricos sin snapshot.
- Agregar pruebas de actualización válida, contradictoria y lead histórico.

## Exclusiones

No tocar Wompi, frontend, onboarding visual, ledger, dashboard ni el catálogo de precios.

## Dependencia

Aplicar sobre la rama de `CDX-20260812-010` que alimenta el PR #113. No crear otro PR.

## Aceptación

1. Un lead con snapshot no puede quedar con ecosistema incompatible por una actualización.
2. Los leads sin snapshot conservan el comportamiento actual.
3. Pruebas focalizadas, ESLint, build y `git diff --check` pasan.
