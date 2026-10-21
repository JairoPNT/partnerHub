# Business Measurement Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ejecutar consentimiento y medición Business con una sola autoridad por documento, sin SDKs antes de permiso ni datos propios sensibles.

**Architecture:** Un asset clásico autocontenido expone únicamente la API de consentimiento. Su estado controla dos adapters, con identidad/origen y readiness derivados del paquete. No modifica el DOM visual ni contiene emisores en app.js.

**Tech Stack:** JavaScript estático sin build/dependencias nuevas; Node VM, assert y test runner para browser/clock/storage/red simulados.

**Spec:** `docs/superpowers/specs/2026-10-21-business-consent-measurement-design.md`; contrato exacto API/storage/config: `docs/superpowers/plans/2026-10-21-business-consent-delivery.md`.

## Global Constraints

- Ticket AGR-20261021-004, owner Antigravity. Allowed solo measurement-runtime.js y tests/harness nombrados abajo. Excluir app.js/index.html/styles.css/config.js, backend, cuentas, publicación y fuentes reales.
- Default deny y TTL 180 días; no noscript, replay de clics previos, SDK en preview, Google Ads, GTM, CAPI o IDs inventados. Clic no equivale a venta. Payload propio solo placement/destination.
- El gate providers del paquete no sustituye consentimiento; falta/invalidez/false => no cargar ese SDK. Ningún query parameter, payload UI o storage puede activar readiness/origen/IDs.
- Ante límite de controles del SDK, dejar proveedor bloqueado y reportar evidencia faltante. No introducir flags no documentados ni declarar seguro el SDK desde mocks.

## Review Focus

- Preferencia corrupta/expirada, reloj retrocedido y fallo de storage: nunca una aceptación implícita (Task 1).
- Otro partner en preview administrativo o schema/origin falsificado: no cargar SDK aunque el storage diga aceptado (Task 1).
- Callback SDK tardío después de retirar, revocación de otra pestaña y ejecución duplicada del asset: no revivir medición (Task 2).
- Un click sobre icono/texto o mediante teclado es un único click real; clicks posteriores no se pierden (Task 2).
- Autoeventos/URLs/referrer del SDK no controlados: bloquear el proveedor, no asumir que custom payload limpio resuelve todo (Task 2).

---

### Task 1: Estado y API de consentimiento sin proveedores

**Files:** Create `plantillas-de-pagina/business/measurement-runtime.js`, `measurement-runtime.test.mjs`, `measurement-test-harness.mjs`. El harness no se copia al paquete público.

**Interfaces:** API, ConsentState, evento y storage exactos del plan coordinador. Runtime clásico IIFE; no imports de Node en producción ni test hooks públicos. Harness `createBusinessMeasurementHarness({config,origin,stored,now,storageError,referrer}): {window,document,clock,storage,requests,sdkCalls,click,flush,dispose}` ejecuta el archivo real con Node VM y falsifica solo fronteras de browser/red. Ningún request sale del proceso.

- [ ] **Step 1 — RED:** `initial_state_denies_both`, `acceptance_is_strict_and_categories_independent`, `ttl_is_180_days`, `invalid_or_expired_storage_denies`, `blocked_storage_is_session_only`, `preview_wrong_origin_master_or_bad_config_never_loads`. Assert getState no contiene CONFIG/IDs/contactos y modificar su copia no modifica el estado real.

Assertions mínimas (h es harness fresco con reloj now y readiness de proveedores false):
```js
const state = h.window.PartnerHubBusinessConsent.setConsent({ analytics: true, marketing: false });
assert.equal(state.expiresAt, now + 180 * 24 * 60 * 60 * 1000);
assert.equal(state.marketing, false);
assert.equal(h.requests.length, 0);
```
- [ ] **Step 2:** desde raíz `node --test plantillas-de-pagina/business/measurement-runtime.test.mjs`; fallo esperado por runtime/API ausente antes de implementación, no por un harness roto.
- [ ] **Step 3:** implementar singleton, validación de metadata/origen/config/IDs, persistencia estricta, getState/setConsent/withdraw y CustomEvent de cambio. Cerrar ventana/banner no es evento de aceptación; API inválida lanza TypeError y conserva estado previo sin mutar storage.
- [ ] **Step 4 — GREEN:** repetir tests, incluyendo reload con mismo site/origen y aislamiento de key de otro sitio. Duplicar ejecución no añade listeners ni resetea elección.
- [ ] **Step 5:** commit `feat(business): add isolated consent state runtime`; revisión independiente de estado/aislamiento antes de Task 2. No conectar todavía UI ni publicar asset.

### Task 2: Adapters y eventos de intención

**Files:** Modify los mismos archivos de Task 1; no otros archivos de plantilla ni backend. Documentación oficial de Google/Meta enlazada en el spec debe leerse antes de usar controles específicos del SDK.

**Interfaces:** adapters internos no exportados `syncProviders(epoch:number):void` y `trackWhatsappClick(event:Event):void`. Usan solo IDs validados del CONFIG del sitio y gates de estado/paquete; UI no puede proporcionar URLs/IDs/eventos. El emisor propio produce GA4 page_view/click_cta y Meta PageView/trackCustom WhatsAppClick, sin eventos comerciales ni duplicados.

- [ ] **Step 1 — RED:** añadir `zero_requests_before_choice_and_after_reject`, `only_chosen_ready_provider_loads`, `accept_twice_one_sdk_and_pageview`, `preconsent_click_is_not_replayed`, `withdraw_during_load_drops_callbacks`, `storage_event_revokes_without_regrant`, `nested_target_keyboard_and_two_distinct_clicks`, `payload_excludes_url_phone_message_identity`, `unowned_existing_sdk_is_blocked`. Simular SDK onload/error con promesas controladas; requests enumera loaders, imágenes y beacons.
- [ ] **Step 2:** repetir Node test y registrar RED de cada comportamiento nuevo. Testear query/hash/referrer sensibles y campo no aprobado en metadata/storage; si contexto no es demostrablemente seguro no hay request del proveedor.
- [ ] **Step 3:** implementar cargas exactas allowlisted solo tras gate doble y un listener delegado sobre los cinco CTA conocidos. No preventDefault ni espera de tracking. Verificar destino WhatsApp sin enviarlo en payload; event.isTrusted debe ser true para emitir. Nunca recorrer/renderizar todo CONFIG o texto del DOM como analytics.
- [ ] **Step 4:** GA4 usa send_page_view:false más un page_view manual por documento, page_location/referrer saneados, título genérico y Google signals/personalización desactivados; no activar señales publicitarias Google. Meta usa controles oficiales verificados de consentimiento/autoeventos; no advanced matching, campos de formulario o captura automática de CTA/href. Si la API o settings efectivos no permiten demostrarlo, conservar providers.meta=false y documentar gate, sin sustitutos silenciosos. Lo mismo aplica a enhanced measurement de GA4: no asumir su configuración de cuenta.
- [ ] **Step 5:** retirar invalida epoch antes de llamadas/revokes, corta el emisor propio, descarta cargas tardías y solicita recarga limpia cuando hay SDK; detectar cambios de otra pestaña. Deny persistido antes de recargar; si storage falla, recarga arranca denegado. No borrar cookies ajenas ni prometer eliminar eventos previos; no repetir PageView en el mismo documento al reaceptar.
- [ ] **Step 6 — GREEN:** repetir todas las pruebas; inspeccionar llamada por llamada y buscar params/hrefs semilla sensibles en SDK calls. Comprobar sin SDK cuando IDs vacíos/inválidos y que WhatsApp sigue navegable con SDK fallido/bloqueado.
- [ ] **Step 7:** `node --check plantillas-de-pagina/business/measurement-runtime.js`; desde app/web `npm run lint` y regresiones `npm run test:business-whatsapp-cta`, `npm run test:ecosystem-templates`. Build de app solo si el diff lo afecta; no inventar recepción real con tests VM.
- [ ] **Step 8:** commit/reporte AGR-004 con RED/GREEN, controles oficiales empleados y límites de auto-recolección. Revisión de seguridad antes de aprobación del artefacto; no fusionar activación parcial a main ni publicar.
