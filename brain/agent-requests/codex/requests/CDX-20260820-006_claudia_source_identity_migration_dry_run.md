# CDX-20260820-006 — Migración segura de fuentes de Claudia

## Objetivo

Resolver mediante backup/hash y DRY_RUN la colisión entre `claudia-calero.json` PRODUCT y la nueva identidad PERSONAL_BRAND, sin modificar fuentes ni infraestructura.

## Convención objetivo

- Producto: `claudia-calero-product` → `producto.claudiacalero.pro`
- Negocio: `claudia-calero-business` → `negocio.claudiacalero.pro`
- Marca Personal: `claudia-calero` → `brand.claudiacalero.pro`
- Apex `claudiacalero.pro`: preservar sin reescritura.

## Límites

No APPLY, overwrite, rename, PublishingTargets, DNS, Hostinger, publicación, regeneración, pagos, ledger ni UI.
