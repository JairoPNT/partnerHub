# CDX-20260812-012 — Consistencia entre oferta y ecosistema

## Objetivo

Corregir el contrato de `CDX-20260812-010` para que una alta no pueda persistir un `ecosystemType` contradictorio con el `offerCode`.

## Alcance

- Si `PRODUCT_ONLY`, aceptar únicamente `PRODUCT` o derivar `PRODUCT` server-side cuando el campo fue omitido.
- Si `BUSINESS_ONLY`, aceptar únicamente `BUSINESS` o derivar `BUSINESS` server-side cuando fue omitido.
- Si `PERSONAL_BRAND_ONLY`, aceptar únicamente `PERSONAL_BRAND` o derivar `PERSONAL_BRAND` server-side cuando fue omitido.
- Si `PLAN_360`, no aceptar un ecosistema único contradictorio; el snapshot debe seguir siendo la fuente de verdad con los tres ecosistemas.
- Mantener compatibilidad con altas históricas y altas sin `offerCode`.
- Agregar pruebas para payloads omitidos, coincidentes y contradictorios.

## Exclusiones

No tocar Wompi, frontend, onboarding visual, ledger, dashboard ni persistencias históricas.

## Dependencia

Aplicar sobre la rama de `CDX-20260812-010` antes de abrir su PR. Este follow-up debe conservar el mismo alcance y reporte actualizado.

## Aceptación

1. Ningún payload con oferta válida puede persistir un ecosistema incompatible.
2. El monto y los ecosistemas del snapshot siguen derivados exclusivamente del catálogo server-side.
3. Pruebas focalizadas, ESLint, build y `git diff --check` pasan.
