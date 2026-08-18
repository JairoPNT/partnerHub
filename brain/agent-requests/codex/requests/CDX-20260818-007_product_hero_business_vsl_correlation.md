# CDX-20260818-007 — Validación de correlación Hero Producto → poster VSL Business

## Owner

Codex.

## Scope

Auditar y corregir la correlación backend para que una página Business de partner use exclusivamente el Hero del source PRODUCT hermano como poster VSL.

## Allowed files/modules

- Servicios backend de generación y correlación de sources.
- Helper y pruebas Business VSL introducidos por CDX-20260818-006.
- `app/web/package.json` para el comando focalizado.
- Request y reporte DONE.

## Excluded files/modules

- Frontend, templates visuales, masters, tracking y assets.
- Wompi, ledger, pagos, dominios, provisioning y Prisma.
- Escritura o migración de PublishingTargets.

## Dependencies

- CDX-20260818-006 (`b0e59c8`), aún no integrado en `main` al iniciar este follow-up.
- Contrato `PublishingTarget.ownerKey` de PH-036A.

## Parallel-safe with

Tickets que no modifiquen generación de páginas, correlación multi-ecosistema ni `package.json`.

## Integration notes

La propiedad compartida se resuelve mediante `ownerKey`; queda prohibido inferir el partner desde sufijos de `siteId`. La lectura de targets es estrictamente read-only y acepta solo versión 2.

## Acceptance criteria

- `Business.vsl.thumbnailUrl === Product.hero.desktop` con URL literal.
- Un Hero exclusivo de Business nunca se usa como poster.
- Fallback Product Desktop → Product Mobile → `favicon.svg`.
- Sin cambios a masters, Product, Personal Brand, assets o infraestructura.
- Pruebas focalizadas, ESLint, build y diff-check.
