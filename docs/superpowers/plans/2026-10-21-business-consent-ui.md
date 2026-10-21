# Business Consent UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir aceptar/rechazar categorías y retirar la elección sin impedir contenido, video ni contacto de Business.

**Architecture:** Aviso no bloqueante y preferencias accesibles consumen exclusivamente la API del runtime. App no administra SDKs, storage ni eventos analíticos. HTML declara el orden de assets que el generador valida.

**Tech Stack:** HTML/CSS/JavaScript existentes, tests Node/DOM fixture y revisión browser local en integración.

**Spec:** `docs/superpowers/specs/2026-10-21-business-consent-measurement-design.md`; API/ConsentState/evento exactos: `docs/superpowers/plans/2026-10-21-business-consent-delivery.md`.

## Global Constraints

- Ticket AGR-20261021-005, owner Antigravity. Esperar AGR-001 y AGR-003 antes de tocar sus archivos. Rama propia; no ejecutar junto a otra tarea que edite app/index/styles.
- Aceptar todo, rechazar opcionales y configurar con visibilidad/peso equivalentes. Categorías no premarcadas; cerrar no acepta. Recuerdo 180 días administrado solo por runtime, no UI.
- No exigir aceptación para WhatsApp/video/contenido. No prometer recepción de eventos ni cumplimiento legal. No nuevos providers, IDs, destinos, source writes o cambios backend.

## Review Focus

- API tarda/falla/está ausente: denegado y contenido utilizable; jamás fallback que acepte (Task 1).
- Escape, clic fuera o cerrar preferencias: no equivale a guardar/aceptar (Task 1).
- Reapertura y cambio desde otra pestaña: mostrar la elección vigente, no un draft viejo (Task 1).
- Teclado/móvil/zoom y barra fija: controles legibles y sin tapar CTA/video (Task 1; browser real en CDX-006).
- Privacidad y scripts heredados: texto factual y sin listeners nuevos que emitan antes del consentimiento (Task 1).

---

### Task 1: Aviso/preferencias y conexión al runtime

**Files:** Modify `plantillas-de-pagina/business/index.html`, `app.js`, `styles.css`. Create `plantillas-de-pagina/business/consent-ui.test.mjs`. Read measurement-runtime.js/API sin modificarlo. No config.js ni FAQ/copy de campaña fuera de lo necesario para describir consentimiento.

**Interfaces:** `initBusinessConsentUI():void` dentro del patrón de inicialización de app.js. Consume API congelada; escucha `partnerhub:business-consent-change`. Selectores nuevos: `business-consent-banner`, `business-consent-accept`, `business-consent-reject`, `business-consent-configure`, `business-consent-dialog`, `business-consent-analytics`, `business-consent-marketing`, `business-consent-save`, `business-consent-cancel`, `business-consent-withdraw`, `business-consent-reopen`. Conservar todos los IDs/classes de CTA existentes.

- [ ] **Step 1 — RED:** probar `unset_shows_equal_choice_actions`, `accept_and_reject_send_complete_booleans`, `dismiss_does_not_save`, `save_selected_categories_only`, `reopen_reads_latest_state`, `missing_api_never_grants`, `duplicate_init_has_one_handler`. Stub solo la API y DOM; assert no localStorage/fbq/gtag/fetch propios en UI. El test debe cargar el app real, no una copia del controlador.

Assertions del stub API al rechazar y luego cancelar (el fixture hace click realista de DOM sobre cada control):
```js
assert.deepEqual(apiCalls, [{ method: 'setConsent', choice: { analytics: false, marketing: false } }]);
// Cancelar/cerrar no agrega otra llamada a la API.
assert.equal(apiCalls.length, 1);
```
- [ ] **Step 2:** desde raíz `node --test plantillas-de-pagina/business/consent-ui.test.mjs`; fallo esperado por controles/función ausentes. El harness simula DOM y no inicia requests externos.
- [ ] **Step 3:** implementar controles y flujo. Labels: «Aceptar todo», «Rechazar opcionales», «Configurar», categorías «Analítica (GA4)» y «Publicidad (Meta)», «Guardar preferencias», «Cancelar», «Retirar consentimiento» y footer «Preferencias de privacidad». Aviso explica propósitos y que puede continuar sin aceptar; diseño visual exacto pertenece a Antigravity dentro de la identidad aprobada.
- [ ] **Step 4:** configurar foco inicial/restore, Tab, aria-labelledby/modal para preferencias y Escape/cancel sin guardar. Borrador del dialog no muta runtime hasta Guardar; al reabrir descarta draft previo. Cambio externo refresca estado y evita sobrescribirlo con un draft obsoleto sin acción explícita nueva. Un error muestra mensaje factual, nunca aceptación aparente.
- [ ] **Step 5:** insertar `<script src="measurement-runtime.js"></script>` después de config y antes de app, una vez. No SDK externo/noscript ni emisores propios en index/app. Ausencia del API muestra «Las preferencias de medición no están disponibles. Puedes continuar navegando.» sin afirmar estados de proveedores no observados.
- [ ] **Step 6:** corregir el texto estático de privacidad para describir categorías/proveedores y cambio de preferencia; no decir «solo datos de WhatsApp». Describir SDKs solo cuando estén habilitados y con consentimiento; no inventar responsable, correo legal, plazos legales o aprobación jurídica. Mantener VSL visible y condiciones/copy/FAQ ya aprobados; si hay identidad legal faltante, reportar sin llenar con datos de ejemplo.
- [ ] **Step 7 — GREEN:** repetir tests; `node --check plantillas-de-pagina/business/app.js`; desde app/web `npm run lint`, `npm run test:business-whatsapp-cta`, `npm run test:ecosystem-templates` y `npm run test:business-vsl-correlation`. Confirmar diff sin cambios de IDs/contactos/campañas/otros ecosistemas.
- [ ] **Step 8:** reporte AGR-005 con pruebas, capturas locales móvil/escritorio y accesibilidad; commit/PR revisable. Browser/network completo se ejecuta después en CDX-006. No publicar ni fusionar UI activa sin runtime/backend compatibles.
