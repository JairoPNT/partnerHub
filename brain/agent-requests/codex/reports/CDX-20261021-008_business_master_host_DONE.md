# CDX-20261021-008 — Master Negocio en negocio.ganomaster.pro

- Owner: Codex (contrato compartido/backend). Rama `codex/CDX-20261021-008-business-master-host`, base `dd5d958` desde origin/main; no incorpora PR235.
- Estado: implementación, validación local y revisión independiente/scoped aprobadas, sin hallazgos abiertos. P2 de evidencia histórica corregido. No hosting ni página pública modificados.
- Causa: regla canónica aprobada ya decía negocio.ganomaster.pro, pero el contrato consumido por Master Sites, lookup backend e inventario aún usaban business.ganomaster.pro.

## Cambios

- `app/web/lib/ecosystem-contracts.ts`: BUSINESS en MASTER_SITE_DOMAINS y CANONICAL_URLS cambia a negocio.ganomaster.pro. El componente existente consume ambos para etiquetas, enlace externo y site.domain del formulario; sin JSX/UX nuevo.
- `app/web/server/services/ecosystemService.ts`: resolución de dominio actual Business para publicación de preview master y verificación usa negocio.ganomaster.pro.
- `app/web/server/services/domainInventoryBuilder.ts`: fila Business master con el host correcto; no inventa DNS/SSL/publicación READY. La revisión encontró P2 de evidencia histórica unida solo por siteId: ahora Business requiere domain exacto para mostrar verificación/fecha, o queda NOT_CHECKED. No altera registros persistidos ni comportamiento de evidencias Product/Brand/partners.
- `app/web/scripts/business-master-host-contract.test.mjs`: ejecuta contratos compartidos/servicios reales compilados con esbuild existente; solo server-only marker inerte. Prueba enlace/formulario, lookup por ID, inventario y preservación de Product/Brand y alias histórico.

ID `ganomaster-business`, directorios `business`, rutas remotas, Product y Brand sin cambios. Alias `business.ganomaster.pro` y hashes/manifiestos/scripts históricos no se reescriben. No migración de fuentes/targets persistidos ni configuración del servidor remoto.

## Verificación fresca

- RED antes del fix: 3 fallos por host antiguo, 1 pase de Product/Brand; no errores de montaje.
- GREEN inicial: 4/4. Regresión P2: RED 5/6 (VERIFIED antiguo erróneo), GREEN final `node --test scripts/business-master-host-contract.test.mjs`: 6/6; cubre old/missing/null/foreign host, host exacto y evidencia no relacionada preservada.
- `node --experimental-strip-types --test server/services/domainInventoryBuilder.test.ts server/services/partnerHostnameContract.test.ts server/services/ecosystemTemplateResolver.test.ts`: 16/16.
- `node --experimental-strip-types --test server/services/productPageVerificationContract.test.ts`: 1/1.
- `npm run lint`: exit0, sin errores/advertencias ESLint.
- `npm run build`: exit0 después de la corrección P2, TypeScript/39 rutas correctos. Advertencias existentes: workspace-root/múltiples lockfiles y1NFT tracing final (2 en la primera compilación). Node advierte MODULE_TYPELESS_PACKAGE_JSON en suites TS; no silenciado.
- Un intento desde raíz falló al resolver imports del test por asumir cwd app/web; corregido montaje esbuild a ruta relativa al módulo. GREEN6/6 desde raíz después; no defecto del producto ni fallo oculto.
- `git diff --cached --check`: exit0. No agregado npm test disponible; no se afirma suite universal ni proveedor real probado.

## Alcance de entrega

El deploy de este PR corrige Master Sites en la app. NO sube la plantilla, no habilita DNS/TLS, no cambia targets persistidos y no actualiza Claudia por sí mismo. La entrega de consentimiento235 conserva gates separados; esta corrección no los aprueba. Publicar el master en su destino canónico y luego Claudia requiere su proceso de preview/compatibilidad/autorización.

Revisión independiente y scoped retenidas en `.local-secrets/sdd/CDX-20261021-008/review.md` y `rereview.md` (ignoradas). El último dictamen cierra P2 y permite merge condicionado al build final, que pasó. Commit/PR por controlador antes del handoff. Sin secretos ni cambios de cuentas/campañas.
