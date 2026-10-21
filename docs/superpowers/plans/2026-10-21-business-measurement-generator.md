# Business Measurement Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generar un paquete Business que retire el Meta heredado y entregue solo el runtime local aprobado, preservando fuentes y paquetes ante rechazo.

**Architecture:** Un preparador server-only valida y captura los bytes del artefacto antes del reemplazo de output. El generador bifurca solo BUSINESS; CLI de master y manifests incluyen el nuevo asset sin reinterpretar evidencia histórica.

**Tech Stack:** TypeScript, fs/crypto de Node, Node test runner/VM y CLIs ESM existentes.

**Spec:** `docs/superpowers/specs/2026-10-21-business-consent-measurement-design.md`; interfaces compartidas: `docs/superpowers/plans/2026-10-21-business-consent-delivery.md`.

## Global Constraints

- Ticket CDX-20261021-005, owner Codex. Pendiente aprobación de plan. Rama/worktree propio; sin cambios de frontend, IDs, credenciales, cuentas o datos reales. Regresiones byte-a-byte Product/Brand; no alterar metaPixelHtml.ts globalmente.
- Contrato runtime/API/storage/eventos exacto del plan coordinador. Default deny, 180 días, sin noscript ni SDK en preview; no afirmación de cumplimiento legal.
- No nueva dependencia, bypass de aprobación por ENV/payload HTTP ni cambio de hashes/journals históricos. El registry real se llena solo en integración después de revisión de frontend.

## Review Focus

- Master parcial o runtime modificado: fallar antes de rm/write y dejar fuente/output intactos (Task 1).
- Tags no administrados o normalización demasiado amplia: no ocultar ejecutables al calcular el hash (Task 1).
- Carrera entre hash y copia: escribir buffers capturados, no releer ejecutables después de validar (Task 1).
- Manifests/CLI/master persistente con inventario anterior: distinguir versión nueva e históricos sin forzar aceptación (Task 2).
- Otro ecosistema/identity spoof o perfil de contenido stale: conservar los guards y regresiones PR226 (Task 2).

---

### Task 1: Preflight y ensamblado Business con bytes aprobados

**Files:** Create `app/web/server/services/businessMeasurementHtml.ts`, `businessMeasurementHtml.test.ts`, `businessMeasurementArtifacts.ts`, `businessMeasurementAuthority.ts`, `businessMeasurementAuthority.test.ts`, `businessMeasurementGeneration.integration.test.mjs`. Modify `app/web/server/services/productPageGenerationService.ts`. No archivos de plantilla.

**Interfaces:**
- `BusinessMeasurementArtifact = {version:1,indexHtmlSha256:string,appJsSha256:string,runtimeSha256:string,stylesSha256:string,providers:{ga4:boolean,meta:boolean}}`; hashes hex64. Registry `APPROVED_BUSINESS_MEASUREMENT_ARTIFACTS: readonly BusinessMeasurementArtifact[]` vacío hasta integración; sin valores inventados ni canonical actual automáticamente confiado. Los flags solo se promueven con evidencia de controles del SDK, no por tener ID.
- `createBusinessMeasurementPreparer({approvedArtifacts}): {prepare(templateDirectory:string):Promise<PreparedBusinessMeasurement>}`. `PreparedBusinessMeasurement = {artifactVersion:1,indexHtml:string,appJs:Buffer,runtimeJs:Buffer,stylesCss:Buffer,providers:{ga4:boolean,meta:boolean}}`. Tests inyectan registry fixture; producción usa solo el registry interno, nunca el request del cliente.
- HTML limpio elimina únicamente los bloques Meta PartnerHub reconocidos usando applyMetaPixelToHtml(html) sin ID. Hash de index normaliza solo esos bloques y valores ?v de config/app/styles/runtime con nombres exactos. Resto del HTML/JS/CSS no se reescribe para hacerlo pasar.
- prepare comprueba archivo regular/rutas físicas esperadas, capturas de bytes e integridad, referencia única al runtime y orden config/runtime/app; devuelve errores constantes `BUSINESS_MEASUREMENT_ARTIFACT_UNAPPROVED` o `BUSINESS_MEASUREMENT_TEMPLATE_INVALID`. No rutas/bytes en errores públicos.
- `resolveBusinessMeasurementAuthority({siteId,activationLeadId}, {getPartner}):Promise<{expectedOrigin:string,ga4MeasurementId:string|null,metaPixelId:string|null}>` consume el getPartner server-side existente y valida snapshot site/lead/entitlement Business coincidentes. Usa el input ya ensamblado con precedencia onboarding/source del mismo partner. No confía en IDs/domain de la petición de generación. Master Business no llama esta autoridad y desactiva ambos proveedores.

- [ ] **Step 1 — RED:** añadir tests `rejects_unapproved_before_mutation`, `strips_only_managed_meta_and_noscript`, `rejects_modified_app_runtime_css_and_unmanaged_pixel`, `copies_validated_bytes_not_later_master_reads`. Assert fuente/output sentinel iguales; cambiar query versions permitidas conserva hash, añadir script cambia hash/rechaza. Fixtures solo fake IDs.

Assertions mínimas del caso de rechazo (paths/bytes pertenecen al fixture temporal):
```js
await assert.rejects(() => preparer.prepare(fixtureDirectory), /BUSINESS_MEASUREMENT_ARTIFACT_UNAPPROVED/);
assert.deepEqual(await readFile(outputSentinel), previousOutput);
assert.deepEqual(await readFile(sourcePath), previousSource);
```
- [ ] **Step 2:** ejecutar desde app/web `node --conditions=react-server --experimental-strip-types --experimental-loader ./scripts/node-test-alias-loader.mjs --test server/services/businessMeasurementHtml.test.ts server/services/businessMeasurementGeneration.integration.test.mjs`; guardar fallo por módulo/comportamiento ausente.
- [ ] **Step 3:** implementar interfaces/preflight y bifurcación BUSINESS dentro del lock existente y antes de rm/copy, incluso antes de procesar un master no aprobado. Conservar las comprobaciones de identidad/entitlement. Usar buffers preparados para index/app/styles/runtime; configuración nueva desde fuente validada. Product/Brand mantienen camino anterior. No source/history/enqueue ante preflight rechazado.
- [ ] **Step 3b:** test RED/GREEN `legacy_body_and_master_cannot_override_partner_measurement_ids`, `mismatched_lead_site_entitlement_fails_before_write`, `fresh_onboarding_disable_overrides_saved_id`. Implementar autoridad fresca bajo lock y reemplazar únicamente origen/IDs de medición Business por sus valores servidor antes de serializar. Conservar capacidad de deshabilitar ID y reglas existentes de Master Sites; no auth redesign ni cambios de identidad/contacto. Comparar configuración/source de ambos partners después de intentos cruzados.
- [ ] **Step 4:** incluir runtime en files/manifest, cache busting y regla no-cache generada únicamente Business. Nunca volver a inyectar Meta head/body en Business después del preflight.
- [ ] **Step 4b:** añadir metadata reservada CONFIG.businessMeasurement según plan coordinador, con origen derivado del dominio validado y flags exclusivamente del artefacto aprobado. Test `source_master_and_http_cannot_override_release_policy` debe forjar ambos flags/origen y comprobar salida server-derived. No aceptar metadata en productPageGenerationInputSchema ni businessLandingContentSchema.
- [ ] **Step 5 — GREEN:** repetir tests y `node --conditions=react-server --experimental-strip-types --experimental-loader ./scripts/node-test-alias-loader.mjs --test server/services/businessMeasurementAuthority.test.ts server/services/businessLandingContentLegacyIngress.test.mjs server/services/productPageGenerationBusinessCta.test.ts server/services/metaPixelHtml.test.ts`; pass y sin provider calls. Regresión Product/Brand compara HTML/config/manifest esperados sin asset Business.
- [ ] **Step 6:** commit acotado `feat(business): preflight approved consent measurement assets`; revisión independiente antes de Task 2, sin merge parcial a main.

### Task 2: Inventario de master y packaging productivo

**Files:** Modify `app/web/scripts/jairo-business-master-package.mjs`, `jairo-business-master-package.test.mjs`, `jairo-business-master-package-drift-recovery.mjs`, `jairo-business-master-package-drift-recovery.test.mjs`, `business-master-runtime-packaging.test.mjs`. Create `app/web/scripts/business-measurement-packaging.test.mjs`. Actualizar fixtures Business tocadas por Task 1 solo con artefactos aprobados de test, nunca para ocultar baseline. Dockerfile solo si una prueba demuestra archivo excluido: abrir follow-up en lugar de expansión silenciosa.

**Interfaces:** inventario actual Business añade measurement-runtime.js en creación/refresh/manifest y hashes; constantes LEGACY_* conservan el inventario/hash anterior independiente del inventario nuevo. Un master viejo requiere un nuevo preview/planHash, no ejecución con autorización antigua.

- [ ] **Step 1 — RED:** `new_master_contains_runtime_and_manifest_hash`, `legacy_archives_remain_byte_valid`, `refresh_runtime_drift_changes_plan`, `missing_runtime_rejects_without_replacing_master`; assert archivos/journals originales no cambian al rechazar. Prueba de staging runtime con Node20, sin SFTP/provisioners reales.
- [ ] **Step 2:** `node --test scripts/business-measurement-packaging.test.mjs scripts/jairo-business-master-package.test.mjs scripts/jairo-business-master-package-drift-recovery.test.mjs scripts/business-master-runtime-packaging.test.mjs`; demostrar RED relevante, no conformarse con error por Node/dependencia ausente.
- [ ] **Step 3:** implementar inventario nuevo y compatibilidad histórica; incluir runtime en regla de cache Business, controles de archivo regular y hashes. No cambiar request IDs históricos ni ampliar el destino permitido.
- [ ] **Step 4 — GREEN:** repetir pruebas y smoke import/generación de paquete temporal en Node20 usando fixtures; sin APPLY real. Si el ejecutable/contenedor falta, reportar gate bloqueado y no sustituir Node24 como evidencia productiva.
- [ ] **Step 5:** `npm run lint`, `npm run build` y `git diff --check`. Comparar cualquier fallo amplio con baseline, no corregir código ajeno. Mantener los límites Windows symlink/Node20 explícitos.
- [ ] **Step 6:** commit, reporte CDX-005 con evidencia RED/GREEN/archivos/límites; abrir PR revisable y hacer revisión final de seguridad. Esperar runtime/UI e integración antes de activar el gate en main/master persistente.
