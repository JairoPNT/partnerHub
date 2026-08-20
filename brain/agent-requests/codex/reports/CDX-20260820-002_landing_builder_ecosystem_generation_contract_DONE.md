# CDX-20260820-002 — Reporte DONE

## Resultado

El backend soporta generación y replicación diferenciada para `PRODUCT`, `BUSINESS` y `PERSONAL_BRAND`. La auditoría encontró y corrigió dos gaps: generación de partners sin validar entitlement y verificación de checks de compra PRODUCT sobre plantillas BUSINESS/PERSONAL_BRAND.

## Contrato confirmado

| Ecosistema | Master siteId | Host master | Template canónica | Master generado |
| --- | --- | --- | --- | --- |
| PRODUCT | `ganomaster` | `product.ganomaster.pro` | `plantillas-de-pagina/producto` | `generated-sites/ganomaster` |
| BUSINESS | `ganomaster-business` | `business.ganomaster.pro` | `plantillas-de-pagina/business` | `generated-sites/ganomaster-business` |
| PERSONAL_BRAND | `ganomaster-personal-brand` | `brand.ganomaster.pro` | `plantillas-de-pagina/personal-brand` | `generated-sites/ganomaster-personal-brand` |

- Los siteIds master son aislados; un master de otro ecosistema se rechaza antes de copiar archivos.
- Los masters publican en directorios dedicados bajo el host master; `ganomaster.pro` raíz no sustituye los tres subdominios canónicos.
- Un partner se resuelve por `siteId` contra el entitlement vigente. Un ecosistema no incluido responde `409 ECOSYSTEM_NOT_ENTITLED`; un siteId sin entitlement responde `409 PARTNER_ENTITLEMENT_NOT_FOUND`.
- El guard corre antes de borrar o escribir el paquete. `replicate` y `publish` lo heredan porque ambos pasan por `productPageGenerationService.generate`.
- Replicación filtra fuentes por ecosistema y mantiene `siteId`, configuración y master del mismo tipo.
- Verificación conserva checks comunes de host, config y assets para los tres; los checks de botones/handlers de compra se ejecutan solo para PRODUCT.

## Tracking

- Meta Pixel `PageView`: la generación lo inyecta en HTML para los tres ecosistemas cuando existe `integrations.meta.pixelId`.
- PRODUCT: GA4 se carga dinámicamente y existen eventos Meta personalizados `WhatsAppClick` y `StoreClick` en la plantilla.
- BUSINESS: el ID de analytics queda en config, pero la plantilla no implementa actualmente carga runtime de GA4 ni eventos Meta personalizados.
- PERSONAL_BRAND: consume `analytics.measurementId` solo si `gtag` ya existe; la plantilla no carga por sí misma el script de GA4 ni define paridad de eventos personalizados.
- Google Ads se conserva como configuración, sin runtime confirmado en estas plantillas.

La paridad de tracking de BUSINESS/PERSONAL_BRAND requiere un ticket separado dueño de plantillas/frontend; no se amplió este request.

## Archivos

- `app/web/server/services/partnerEcosystemGenerationGuard.ts`
- `app/web/server/services/partnerEcosystemGenerationGuard.test.ts`
- `app/web/server/services/productPageGenerationService.ts`
- `app/web/server/services/productPageVerificationContract.ts`
- `app/web/server/services/productPageVerificationContract.test.ts`
- `app/web/server/services/productPageVerificationService.ts`
- `app/web/app/api/internal/product-pages/generate/route.ts`
- `app/web/app/api/internal/product-pages/replicate/route.ts`
- `app/web/app/api/internal/product-pages/publish/route.ts`
- `app/web/package.json`

## Verificación

- `npm run test:ecosystem-generation-contract`: PASS, 14/14.
- ESLint backend focalizado: PASS, cero warnings.
- `npm run build`: PASS. Persiste warning no bloqueante de trazado NFT/Turbopack preexistente.
- `git diff --check`: PASS.

## Git

- Rama: `codex/CDX-20260820-002-landing-builder-ecosystem-contract`.
- Commit de implementación: `e9dac42`.
- PR: no abierto.
- Deploy/producción: no ejecutados.

## Gaps y dependencias

- La futura UI de Landing Builder debe enviar el `siteId` de target y el `ecosystemType` exactos; no debe inventar fallback al dominio raíz.
- Los partners deben tener entitlement vigente y, para siteIds secundarios, un PublishingTarget que permita resolver el owner.
- Falta paridad de tracking runtime para BUSINESS/PERSONAL_BRAND.
- Publicación y verificación reales requieren un ticket productivo separado y autorización explícita.
- El backend sigue usando almacenamiento JSON; despliegues con múltiples réplicas requieren coordinación de escritura fuera de este alcance.

## Límites preservados

No se modificaron UI, Payments, Wompi, ledger, DNS/Hostinger, Docker ni datos productivos. No se publicó ninguna página.
