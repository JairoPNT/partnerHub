# CDX-20260818-007 — Validación de correlación Hero Producto → poster VSL Business — DONE

## Resultado de auditoría

CDX-20260818-006 aplicaba el poster desde `Business.hero`, por lo que no demostraba la correlación obligatoria y podía usar accidentalmente un Hero exclusivo de Business. Este follow-up corrige esa fuente.

La generación Business de partner ahora:

1. lee identidades PublishingTarget v2 sin migrarlas ni escribirlas;
2. localiza el target BUSINESS por `siteId`;
3. localiza el target PRODUCT con el mismo `ownerKey` inmutable;
4. lee el source PRODUCT exacto;
5. extrae exclusivamente `Product.hero.desktop` y `Product.hero.mobile`;
6. asigna `Business.vsl.thumbnailUrl` con Desktop → Mobile → `favicon.svg`.

No se infiere propiedad recortando sufijos de `siteId`, dominio, nombre o email.

## Invariante comprobada

```text
Business.vsl.thumbnailUrl === Product.hero.desktop
```

La prueba usa simultáneamente un `Business.hero.desktop` diferente y comprueba que no sea elegido. También verifica que los bytes de la URL CDN PRODUCT (mayúsculas, `%20` y query string) se preserven literalmente.

## Protección de alcance

- Product y Personal Brand retornan su configuración original.
- El master Business no ejecuta correlación ni cambia su poster.
- No se generaron ni copiaron imágenes, ni se modificaron templates o archivos binarios.
- La lectura de PublishingTargets no invoca el servicio de provisioning, migraciones o persistencia.
- No se modificaron frontend, tracking, Wompi, ledger, pagos, dominios o Prisma.

## Archivos modificados en este follow-up

- `app/web/server/services/businessProductHeroCorrelation.ts`
- `app/web/server/services/businessProductHeroCorrelation.test.ts`
- `app/web/server/services/businessProductHeroCorrelationService.ts`
- `app/web/server/services/businessVslPoster.ts`
- `app/web/server/services/businessVslPoster.test.ts`
- `app/web/server/services/productPageGenerationService.ts`
- `app/web/package.json`
- `brain/agent-requests/codex/requests/CDX-20260818-007_product_hero_business_vsl_correlation.md`
- `brain/agent-requests/codex/reports/CDX-20260818-007_product_hero_business_vsl_correlation_DONE.md`

## Verificación

- Correlación e igualdad exacta: PASS.
- Rechazo de Hero Business accidental: PASS.
- Fallback Product Desktop → Mobile → `favicon.svg`: PASS.
- Preservación literal CDN: PASS.
- Exclusión de masters/Product/Personal Brand: PASS.
- Pruebas focalizadas: PASS, 9/9.
- ESLint backend: PASS.
- Build: PASS; conserva el warning preexistente workspace root/NFT del preview.
- `git diff --check`: PASS.

## Rama y entrega

- Rama: `codex/CDX-20260818-007-product-hero-business-vsl-correlation`.
- Base dependiente: `origin/codex/CDX-20260818-006-business-vsl-hero-poster` en `b0e59c8`.
- Commit: HEAD final, comunicado al cierre.
- PR: no abierto.

## Integración

CDX-20260818-006 debe integrarse antes de este follow-up, o ambos commits deben conservarse en orden. No requiere cambios frontend ni un ticket adicional para cumplir la correlación.
