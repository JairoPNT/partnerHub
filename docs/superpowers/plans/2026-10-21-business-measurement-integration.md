# Business Consent Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Probar el paquete Business completo con browser/red aislados y dejar un release verificable, sin publicar ni enviar eventos reales.

**Architecture:** Integración única de ramas revisadas en worktree limpio, hashes de assets finales y generación/master rehearsal sobre fixtures. Playwright intercepta todas las URLs de la página antes de navegar; los SDKs son simulados. Evidencia offline y pendientes productivos permanecen separados.

**Tech Stack:** Node20 para packaging, Node test runner/VM, Chromium/Playwright existentes en runtime local y archivos temporales.

**Spec:** `docs/superpowers/specs/2026-10-21-business-consent-measurement-design.md`; API/metadata/tickets: `docs/superpowers/plans/2026-10-21-business-consent-delivery.md` y los tres planes componentes.

## Global Constraints

- Ticket CDX-20261021-006, owner Codex orquestador. Solo integración/tests/registry después de revisiones de CDX005, AGR004 y AGR005. Revisión visual Antigravity sin cambios solapados.
- No frontend redesign/fixes de contenido por Codex: devolver hallazgos al owner y reevaluar hashes. No SFTP/DNS, publicación, cuenta, SDK real, campaña, presupuesto, credenciales ni source real.
- Un test local con adapters fake no prueba ausencia de PII automática del SDK real ni recepción externa. providers permanece false donde faltan controles/evidencia; no llamar «listo para Ads» a una integración solo offline.
- Código no se fusiona parcialmente a main si el master/runtime persistente no es compatible. La activación productiva necesita gate/cutover explícito posterior y hashes frescos.

## Review Focus

- Página real, no solo VM: ninguna fuga por noscript, imagen, iframe, preload o script heredado (Task 1).
- Config de otro sitio o preview después de aceptación: cero requests de SDK y datos aislados (Task 1).
- Race de onload/retirada y doble init: ni eventos tardíos ni duplicados (Task 1).
- Master refresh/replay histórico con inventarios distintos: no artefacto incompleto ni autorización vieja reutilizada (Task 1).
- Verificación genérica de publicación no equivale a consentimiento o conversión: reporte separado con estado por proveedor (Task 1).

---

### Task 1: Integración local con navegador y master versionado

**Files:** Create `app/web/scripts/business-consent-browser.test.mjs`, `business-consent-browser-harness.mjs`, `business-consent-release-rehearsal.test.mjs`, `business-consent-readiness.mjs`. Modify únicamente `app/web/server/services/businessMeasurementArtifacts.ts` para registrar digests revisados/release readiness. Reporte `brain/agent-requests/codex/reports/CDX-20261021-006_business_consent_integration_DONE.md`. No editar plantilla o servicios de otro ticket para hacer pasar integración.

**Interfaces:**
- `runBusinessConsentReadiness({packageDirectory,artifact,fixtureOrigin}):Promise<{packageSha256:string,checks:{name:string,status:'PASS'|'FAIL'|'BLOCKED',evidence:string}[],providers:{ga4:'OFFLINE_TESTED'|'BLOCKED',meta:'OFFLINE_TESTED'|'BLOCKED'},publicVerification:'NOT_RUN'}>` solo archivos/fixtures, no endpoint público ni mutaciones de estado comercial.
- Browser harness usa `createRequire` con `PARTNERHUB_TEST_NODE_MODULES` (directorio node_modules descubierto por load_workspace_dependencies) para cargar Playwright existente. En este host se verificó `C:/Users/jairo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.js`. No agregar dependencia de producto; falta de módulo/browser => BLOCKED, no skip silencioso.
- Navegador nuevo headless/perfil efímero, sin sesión del usuario. Servir `https://negocio.fixture.test/` y el preview `https://app.partnerhub.club/api/internal/product-pages/preview/ana-business/index.html` mediante route.fulfill desde paquete temporal; interceptar todas las solicitudes antes de page.goto, con deny-by-default y SDK fake. Nunca navegar a Claudia real o abrir WhatsApp.
- SDK fake registra init/pageview/event params sin red y permite demorar/fallar onload. Click de CTA aborta navegación y solo acredita intención. Capturas de 390x844 y 1440x900; teclado/foco/zoom verificados con DOM real.

- [ ] **Step 1:** verificar planes aprobados y reportes/revisiones de componentes; crear branch/worktree de integración desde main y fusionar commits de los tres owners. No copiar archivos a mano ni descartar cambios de otra rama. Registrar SHA de cada componente y mantener los fixes en su owner.
- [ ] **Step 2 — RED:** añadir escenarios browser: reject/no-choice/no-JS => cero SDK/beacons; analytics-only/marketing-only => solo proveedor aceptado y ready; reload respeta elección; expire/storage error/otra pestaña; withdraw durante carga; dos clics reales y un evento repetido; preview/otro partner => cero SDK; payload no contiene seed phone/email/message ni URL sensible. Los tests deben usar código final de plantilla y runtime, no clones.
- [ ] **Step 3:** desde app/web cargar `PARTNERHUB_TEST_NODE_MODULES` con el valor del runtime instalado, luego `node --test scripts/business-consent-browser.test.mjs`. Guardar RED de integración o harness ausente por separado. Si no existe Chromium de Playwright, usar Chrome instalado con channel chrome y perfil efímero; no descargar otro navegador o usar perfil del usuario sin un paso de entorno autorizado.
- [ ] **Step 4:** corregir solo harness/ensamblado propio; devolver defectos a los owners, obtener commit revisado y repetir solo escenarios afectados. No relajar assertions, consent gates o policies para conseguir verde.
- [ ] **Step 5:** añadir rehearsal `legacy_master_refresh_carries_runtime_and_new_plan_hash`, `old_authorization_does_not_refresh_new_bytes`, `second_generation_same_approved_asset`, `product_brand_bytes_unchanged`. Usar los CLI reales con directorios temporales/fixtures, jamás sus destinos /data o remoto reales. Ejecutar `node --test scripts/business-consent-release-rehearsal.test.mjs` con Node20 real; si falta, dejar gate bloqueado.
- [ ] **Step 6:** calcular hashes reales del index normalizado/app/runtime/styles de las ramas revisadas; registrarlos con versión1. Semillas de test no pasan a registry. Verificar falsificación de metadata source/HTTP/master y modificación de un byte rechazan antes de escrituras. providers=false salvo evidencia específica revisada de SDK/auto-recolección; aprobación del artefacto no promueve automáticamente proveedores.
- [ ] **Step 7 — GREEN:** repetir browser/rehearsal y todos los tests nuevos de componentes; `npm run lint`, `npm run build`, `git diff --check`. Dar nombres/firmas de fallos baseline y tests omitidos, no etiquetar todo como verde. Reportar coverage de ausencia/aceptación/retirada, preview, contacto y paquetes por separado.
- [ ] **Step 8:** inspección visual/accesible por Antigravity; revisión final independiente de seguridad/privacidad (premium por riesgo). Emitir reporte readiness offline y lista exacta de gates pendientes: Node20/Linux si faltan, settings reales/SDK seguros por proveedor, consentimiento publicado y recepción externa.
- [ ] **Step 9:** PR único de release integrado revisable y plan de cutover de master/Claudia con preview hashes frescos; no merge/deploy incompatible ni APPLY/publicación en este ticket sin autorización productiva adicional. La ausencia de eventos por rechazo es comportamiento correcto, no un fallo a corregir habilitando seguimiento oculto.
