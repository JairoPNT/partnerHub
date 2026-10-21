# CDX-20261021-001 — Perfil de contenido Business por partner

Estado: implementación backend completada; pendiente revisión independiente e integración del controlador. No desplegado ni publicado.

## Resultado

- Contrato estricto `BusinessLandingContent`: límites aprobados, presets oficiales, texto sin HTML, rechazo de claims conocidos y URLs canónicas bajo `https://media.partnerhub.club/comunes/business/`.
- GET/PUT `/api/internal/master-sites/business/content`: autenticación humana Super Admin mediante autorizador existente; PUT exige Origin administrativo exacto y JSON; respuestas seguras con `Cache-Control: no-store`.
- Servidor resuelve identidad, host y entitlement desde el snapshot existente. GET devuelve `profile: null` cuando no existe. PUT no acepta identidad de sitio, propietario, WhatsApp, campaña ni proveedores.
- Persistencia exclusivamente en `.sources/{siteId}.json`: revisión fresca y CAS de bytes bajo lock Business existente, rename atómico, rechazo de rutas simbólicas/junctions y conservación del documento original salvo `businessLandingContent`.
- Perfil validado llega al ensamblador, normalización, `config.js` y regeneración Business. Product y Personal Brand rechazan el perfil y conservan su salida anterior sin él.
- Guardar/leer no genera, publica, encola ni llama proveedores. La prueba de generación usa exclusivamente archivos temporales y colaboradores de I/O aislados.

## Archivos

- `app/web/shared/business-landing-content-contract.ts` y `.test.ts`.
- `app/web/server/services/masterSitesBusinessContentService.ts` y `.test.ts`.
- `app/web/server/services/masterSitesBusinessContentRouteHandlers.ts` y `masterSitesBusinessContentRoutes.test.ts`.
- `app/web/app/api/internal/master-sites/business/content/route.ts`.
- `app/web/server/services/productPageSourceService.ts` y `productPageSourceBusinessContent.test.ts`.
- `app/web/server/services/productPageGenerationService.ts` y `productPageGenerationBusinessCta.test.ts`.
- `app/web/server/services/masterSitesBusinessInput.ts` y `.test.ts`.
- Fixtures locales `masterSitesBusinessContent.test-fixtures.ts` y `masterSitesBusinessContentGeneration.integration.test.mjs`.

## Verificación

- Baseline enfocada antes de cambios: 3/3 pass.
- TDD observado: contrato inexistente → 4 pass; método CAS inexistente → 4 pass; perfil descartado/aceptado indebidamente fuera de Business y servicio inexistente → 8 pass; rutas inexistentes → 6 pass. Detalle de secuencia en el reporte local del ticket.
- Verificación final específica: 26 tests, 25 pass, 0 fail, 1 skip. Incluye generación real de paquete temporal y regeneración, CAS de bytes, campos originales, aislamiento, autorización JWT real, Origin/JSON y junctions.
- Regresión ampliada Master Sites/Business anterior a las dos últimas pruebas: 164 tests, 163 pass, 0 fail, 1 skip.
- Suite web completa descubierta: 1116 tests, 1105 pass, 10 fail, 1 skip. Los diez fallos se reprodujeron idénticos en el worktree base `business-consent-audit` (main `d74b2fb` más documentación): 90 tests, 80 pass, 10 fail. Son baseline, no regresiones de este ticket.
- Fallos baseline: cinco casos de `scripts/jairo-business-sftp-capability-renewal.test.mjs`; proyección canónica de `scripts/jairo-business-source-generation-dry-run.test.mjs`; tres casos de `scripts/prepare-jairo-business-publication-preview.test.mjs`; packaging Node20 de `scripts/product-destination-reconcile.packaging.test.mjs` (máquina usa Node24).
- Build Next de producción: PASS (compilación, typecheck y prerender). ESLint de archivos modificados: PASS. `git diff --check -- app/web`: PASS.
- `npm test` no existe en este package; se usó descubrimiento explícito de archivos con Node test runner. `tsc` crudo incluye errores preexistentes de los tests (imports `.ts`/`ProcessEnv`); el build Next sí pasa. No se alteró configuración para ocultar errores.

## Rama y entrega

- Rama: `codex/CDX-20261021-001-business-paid-traffic-followups`.
- Commit: el commit que incorpora este reporte; consultar `git log -1 -- brain/agent-requests/codex/reports/CDX-20261021-001_business_campaign_config_contract_DONE.md`.
- PR: el controlador lo abrirá después de la revisión independiente. Este agente no hizo push ni abrió PR.
- Evidencia local: `.local-secrets/sdd/CDX-20261021-001/task-1-report.md`, `focused-final.log`, `full-tests.log`, `baseline-failures.log`, `build-final.log` y `typecheck.log`.

## Riesgos y follow-up

- El test de symlink de archivo requiere privilegios no disponibles en Windows (`EPERM`); se omite explícitamente. El test de junction de directorio sí pasa. Conviene ejecutar también el caso de archivo en Linux antes del gate productivo.
- La lista de claims reduce regresiones conocidas; no certifica texto nuevo ni sustituye revisión editorial.
- `npm ci --ignore-scripts` reportó 22 vulnerabilidades del lock existente (3 moderate, 18 high, 1 critical). No se actualizaron dependencias fuera de alcance.
- Build mantiene avisos existentes de raíz con múltiples lockfiles y tracing dinámico de Next; Node test runner emite avisos experimentales/module type existentes.
- El fallback neutro/renderizado del perfil, UI de edición, consentimiento y verificación pública pertenecen a sus tickets separados. Este backend no declara la landing lista para Ads.
- Follow-up requerido: revisión independiente de seguridad/contrato y posterior integración con plantilla/UI; ninguna operación productiva autorizada aquí.
