# CDX-20261021-001 — Perfil de contenido Business por partner

Estado: implementación backend completada y revisión independiente de seguridad aprobada el 2026-10-21. PR #226: https://github.com/JairoPNT/partnerHub/pull/226 (estado de integración en GitHub). Sin publicación de sitios ni verificación de deploy productivo en esta entrega.

## Follow-up de revisión independiente P1/P2

- La revisión encontró que POST `/product-pages/generate` y PATCH `/product-pages/[siteId]` aceptaban el perfil mediante el schema compartido. Ambos ingress ahora rechazan la propiedad de perfil explícita antes de generar, incluso sin JWT o con Origin ajeno; no se rediseñó la autorización legacy.
- Generación relee el perfil autoritativo de la fuente dentro del lock Business antes de componer `config.js`; no usa perfiles de snapshots anteriores de propagación/replicación. La omisión tampoco elimina un perfil aprobado.
- `productPageSourceService.save` conserva el perfil autoritativo bajo el mismo lock para todos los escritores genéricos y rechaza cambiar un site Business a otro ecosistema. Solo el método CAS del editor puede insertar/reemplazar el perfil.
- TDD follow-up: 6 fallos observados (ambos ingress explícitos, ambas omisiones, snapshot obsoleto y save genérico), luego 6 pass; un séptimo test de cambio de ecosistema falló y quedó GREEN con rechazo sin modificar bytes.
- Verificación final afectada: 230 tests, 229 pass, 0 fail, 1 skip por symlink Windows. Build de producción y `npm run lint` global: PASS. No se repitió suite completa; comparación baseline previa sigue registrada abajo.
- Archivos adicionales autorizados: los dos ingress legacy y `app/web/server/services/businessLandingContentLegacyIngress.test.mjs`. Request ampliado únicamente para este hallazgo.
- Evidencia: `followup-red.log`, `followup-ecosystem-red.log`, `followup-green.log`, `followup-affected.log`, `followup-build.log`, `followup-lint.log` en el scratch del ticket. Revisión original: `final-review.md`.

### Rechazo de identidad antes de modificar el paquete

- La revisión focal detectó que `generate` con site Business y `ecosystemType: PRODUCT` llegaba a reemplazar el paquete antes del rechazo tardío en `save`. Se agregó el mismo rechazo de identidad al inicio de `generate`, antes de locks, colaboradores o filesystem.
- Regresión con generador real: RED confirmó cambios del árbol del paquete y eliminación de `keep.txt`; GREEN conserva bytes de fuente y todos los archivos del paquete e invoca cero lecturas de entitlement.
- Verificación focal final: 35 tests, 34 pass, 0 fail, 1 skip Windows. Build de producción y lint global: PASS. Evidencia `identity-entry-{red,green,build,lint}.log`. Solo dos líneas productivas, test y reportes; sin ampliación de alcance.

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
- PR del controlador: #226. El implementador no hizo push ni abrió PR; el controlador integra después de la revisión independiente.
- Evidencia local: `.local-secrets/sdd/CDX-20261021-001/task-1-report.md`, `focused-final.log`, `full-tests.log`, `baseline-failures.log`, `build-final.log` y `typecheck.log`.

## Riesgos y follow-up

- El test de symlink de archivo requiere privilegios no disponibles en Windows (`EPERM`); se omite explícitamente. El test de junction de directorio sí pasa. Conviene ejecutar también el caso de archivo en Linux antes del gate productivo.
- La lista de claims reduce regresiones conocidas; no certifica texto nuevo ni sustituye revisión editorial.
- `npm ci --ignore-scripts` reportó 22 vulnerabilidades del lock existente (3 moderate, 18 high, 1 critical). No se actualizaron dependencias fuera de alcance.
- Build mantiene avisos existentes de raíz con múltiples lockfiles y tracing dinámico de Next; Node test runner emite avisos experimentales/module type existentes.
- El fallback neutro/renderizado del perfil, UI de edición, consentimiento y verificación pública pertenecen a sus tickets separados. Este backend no declara la landing lista para Ads.
- Revisión independiente final: Ready to merge Yes en `b5243f5`, tras cerrar P1/P2 y el guard de identidad antes de tocar paquetes. Verificación final: 35 tests, 34 pass, 0 fail, 1 skip Windows; build y lint global PASS. Las diez fallas amplias baseline no se presentan como suite verde.
- Follow-up requerido: integración con plantilla/UI, consentimiento/medición y gates de runtime/publicación; ninguna publicación productiva autorizada aquí.
