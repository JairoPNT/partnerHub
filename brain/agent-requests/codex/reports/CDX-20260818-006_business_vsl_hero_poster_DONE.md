# CDX-20260818-006 — Reutilización del Hero Producto como poster VSL — DONE

## Resumen

La generación backend de una página Business para un partner ahora produce:

```text
vsl.thumbnailUrl = hero.desktop || hero.mobile || "favicon.svg"
```

La URL CDN se conserva literalmente. No se descarga, genera, copia ni modifica ningún archivo de imagen. `favicon.svg` ya forma parte del paquete y funciona como placeholder interno final.

## Alcance y compatibilidad

- Solo actúa para `ecosystemType=BUSINESS` y un site ID que no sea master.
- Product, Personal Brand y el master Business permanecen sin cambios.
- Los campos VSL antiguos (`provider`, `embedUrl`, `autoPlay`, textos, etc.) se conservan; únicamente se normaliza `thumbnailUrl`.
- Las configuraciones antiguas sin `vsl` o sin Hero Desktop continúan siendo válidas.
- No se añadió tracking ni se modificaron integraciones existentes.
- No se tocaron Wompi, ledger, pagos, dominios, Prisma o migraciones.

## Archivos modificados

- `app/web/server/services/businessVslPoster.ts`
- `app/web/server/services/businessVslPoster.test.ts`
- `app/web/server/services/productPageGenerationService.ts`
- `app/web/package.json`
- `brain/agent-requests/codex/requests/CDX-20260818-006_business_vsl_hero_poster.md`
- `brain/agent-requests/codex/reports/CDX-20260818-006_business_vsl_hero_poster_DONE.md`

## Verificación

- Configuración partner Business y equivalencia Desktop: PASS.
- Fallback Desktop → Mobile → placeholder: PASS.
- Compatibilidad VSL antigua: PASS.
- Exclusión Product, Personal Brand y master Business: PASS.
- Poster Business: PASS, 5/5.
- Regresión de sincronización Hero: PASS, 6/6.
- Regresión de selección de ecosistemas: PASS, 8/8.
- Total backend focalizado: PASS, 19/19.
- ESLint backend: PASS.
- Build: PASS; conserva el warning preexistente de workspace root/NFT del preview.
- `git diff --check`: PASS.

## Rama y entrega

- Rama: `codex/CDX-20260818-006-business-vsl-hero-poster`.
- Base: `origin/main` en `e789862`.
- Commit: HEAD final, comunicado al cierre.
- PR: no abierto.
