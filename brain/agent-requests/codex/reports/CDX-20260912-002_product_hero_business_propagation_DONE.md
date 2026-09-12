# CDX-20260912-002 — Propagación de hero Producto a Business — DONE

## Resultado

Al generar o actualizar una página **Producto** de partner, PartnerHub ahora localiza únicamente el Business del mismo `ownerKey`, compara el póster VSL derivado y, solo si cambió, regenera el paquete Business y solicita su publicación mediante la cola durable existente.

No realiza publicación directa, operaciones SFTP, DNS ni llamadas a proveedores. La cola existente conserva sus validaciones `ACTIVE` + `PAID`/`CONVERTED`, entitlement, owner y PublishingTarget `READY`; registrar una cortesía no llama esta ruta.

## Salvaguardas

- No lee fuentes de Business de otros propietarios.
- Omite regeneración si el póster ya coincide.
- Omite propagación si falta la fuente Producto o si el owner tiene una identidad Producto ambigua.
- Un fallo al regenerar un Business no interrumpe el guardado de Producto ni llega a encolar ese Business.
- El resultado adicional de las rutas de generación es aditivo: `businessPosterPropagation`.

## Archivos modificados

- `app/web/app/api/internal/product-pages/generate/route.ts`
- `app/web/app/api/internal/product-pages/[siteId]/route.ts`
- `app/web/server/services/businessProductHeroPropagationCore.ts`
- `app/web/server/services/businessProductHeroPropagationExecutionCore.ts`
- `app/web/server/services/businessProductHeroPropagationService.ts`
- Pruebas y script `test:business-product-hero-propagation` en `app/web/package.json`.

## Verificación

- `npm run test:business-product-hero-propagation`: 8/8 aprobadas.
- `npm run lint`: 0 errores y 0 warnings.
- `npm run build`: exit 0, TypeScript aprobado.
- `git diff --check`: limpio.
- Revisión independiente: sin hallazgos críticos ni importantes después de dos rondas; aprobada para merge.

## Riesgos pendientes

Persisten únicamente warnings preexistentes de Turbopack/NFT sobre trazado dinámico de `next.config.mjs` y advertencias experimentales de Node al ejecutar el loader de tests. No provienen de este ticket.
