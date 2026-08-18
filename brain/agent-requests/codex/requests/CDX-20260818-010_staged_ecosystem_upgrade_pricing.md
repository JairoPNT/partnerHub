# CDX-20260818-010 — Precio escalonado para completar ecosistemas

## Owner

Codex (Backend Lead).

## Objetivo único

Implementar en el catálogo y contrato comercial la regla de precios para partners que comienzan con un ecosistema y luego completan los otros dos.

## Regla comercial aprobada

- Compra inicial: Producto $180.000, Business $180.000, Marca Personal $100.000 y Plan 360 directo $350.000 COP.
- Con exactamente un ecosistema confirmado y sin addon individual previo, los dos restantes pueden adquirirse juntos para un total histórico de $400.000 COP.
- Los addons individuales se cobran a precio completo y pierden el descuento escalonado; los tres sucesivos totalizan $460.000 COP.

## Invariantes

- Elegibilidad calculada únicamente en servidor con pagos `CONFIRMED`/`APPROVED` asentados y ecosistemas confirmados.
- El cliente no define el monto final.
- Los pagos originales no se modifican.
- La cotización conserva oferta, snapshot, monto, ecosistemas y referencias previas.
- No existe descuento retroactivo después de un addon individual.

## Contrato mínimo

- `offerCode`.
- `pricingMode`: `DIRECT_BUNDLE`, `STAGED_BUNDLE_UPGRADE` o `INDIVIDUAL_ADDON`.
- Ecosistemas incluidos y ya confirmados.
- Elegibilidad, total confirmado, monto COP y pagos previos.
- Snapshot inmutable.

## Fuera de alcance

- Frontend y checkout.
- Integración Wompi.
- DNS, regeneración o publicación.
- Modificación de pagos históricos.

## Aceptación

- Pruebas para cada ecosistema inicial, upgrade conjunto, addons sucesivos, Plan 360 directo y pagos no confirmados.
- Monto server-side y snapshot inmutable.
- ESLint backend, build y `git diff --check` aprobados.
- Reporte DONE con ejemplos y riesgos de integración Wompi.
