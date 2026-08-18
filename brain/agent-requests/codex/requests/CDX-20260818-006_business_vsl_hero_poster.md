# CDX-20260818-006 — Reutilización del Hero Producto como poster VSL

## Owner

Codex.

## Scope

Normalizar la configuración generada de páginas Business de partners para reutilizar la URL del Hero Producto como `vsl.thumbnailUrl`, sin crear ni copiar imágenes.

## Allowed files/modules

- Normalización backend de generación de páginas.
- Helper y pruebas backend focalizadas.
- Script de prueba en `app/web/package.json`.
- Request y reporte DONE.

## Excluded files/modules

- Frontend, plantillas visuales y tracking.
- Wompi, ledger, pagos, dominios, Prisma y migraciones.
- Binarios, generación de imágenes y modificación de Heroes existentes.

## Dependencies

- Generación multi-ecosistema existente en `origin/main`.
- URLs finales de Hero ya disponibles en la configuración del partner.

## Parallel-safe with

Tickets que no modifiquen `productPageGenerationService.ts`, `package.json` ni el nuevo helper.

## Integration notes

La regla se aplica solo a sitios partner Business; no modifica masters ni los ecosistemas Product/Personal Brand. El fallback es Desktop → Mobile → `favicon.svg` interno.

## Acceptance criteria

- `vsl.thumbnailUrl` coincide con Hero Desktop cuando existe.
- Fallback a Mobile y placeholder interno.
- Campos VSL antiguos permanecen compatibles.
- No se crean/copiar imágenes ni se inyecta tracking.
- Pruebas backend, ESLint, build y diff-check aprobados.
