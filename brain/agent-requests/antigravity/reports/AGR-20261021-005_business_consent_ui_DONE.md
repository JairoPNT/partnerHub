# AGR-20261021-005 — Business consent UI

Estado: implementación local y revisión independiente terminadas: spec/calidad Approved, visual ship. Integración CDX006 y revisión final/scoped aprobadas sobre `88c003d`; follow-up AGR009 corrige la confirmación de retirada en cuarentena. No publicado, proveedores desactivados; gates productivos separados.
Owner: Antigravity (rol frontend delegado expresamente). Fecha: 2026-10-21.

## Cambios

- Aviso en flujo normal, sin superponer video, contenido ni WhatsApp. Aceptar todo, Rechazar opcionales y Configurar comparten estilo, tamaño y visibilidad.
- Preferencias mediante dialog nativo, categorías inicialmente desmarcadas, borrador hasta guardar, cancelar/cerrar/backdrop/Escape sin guardar, foco inicial/circular/restaurado y enlace permanente en footer para reabrir/retirar.
- `initBusinessConsentUI` consume únicamente `getState/setConsent/withdraw` y escucha `partnerhub:business-consent-change`. Lee de nuevo la autoridad, no confía en `event.detail`, y descarta borradores al revocar externamente. Inicialización idempotente.
- API ausente/tardía/fallida o superficie de eventos incompleta: controles de concesión deshabilitados y mensaje factual, sin bloquear render/contacto. Recuperación por evento o reapertura; sin polling. `reloadRequired` mantiene ambas categorías denegadas y no permite regrant aparente.
- Privacidad factual sobre GA4/Meta opcionales y gates técnicos; elección solo en memoria de la carga actual, nueva elección al recargar y retirada sin prometer cancelar solicitudes previas. Retirada de la afirmación heredada de cumplimiento jurídico. Sin identidad/correo/plazos inventados.
- Orden único `config.js → measurement-runtime.js → app.js`. Sin tracking, storage, SDKs ni emisores propios en UI.
- Se preservaron FAQ/config, VSL, perfil/medios, los cinco CTA WhatsApp y sus bindings/destinos, términos y demás contenido. Impeccable se aplicó como extensión estrecha de identidad existente, no como rediseño.

## Archivos

- `plantillas-de-pagina/business/index.html`
- `plantillas-de-pagina/business/app.js`
- `plantillas-de-pagina/business/styles.css`
- `plantillas-de-pagina/business/consent-ui.test.mjs`
- Request y este reporte propios.

## Verificación

- TDD: suite inicial RED 0/11 (controles ausentes); GREEN 11/11. Borde de eventos RED y GREEN adicional: 12/12 final. Test ejecuta app.js real con fronteras DOM/API, no un controlador clonado; storage/red/tracking lanzan si UI los toca.
- `node --test plantillas-de-pagina/business/consent-ui.test.mjs plantillas-de-pagina/business/measurement-runtime.test.mjs`: 45/45, sin skips.
- `node --check plantillas-de-pagina/business/app.js`: exit 0.
- `app/web`: `npm run lint`: exit 0; `test:business-whatsapp-cta`: 7/7; `test:ecosystem-templates`: 8/8; `test:business-vsl-correlation`: 9/9.
- `node --test app/web/scripts/business-paid-traffic-template.test.mjs` con Playwright local y Chrome activados: 7/7, sin skip del navegador. Incluye perfiles/media, fallback y overflow de plantilla heredada.
- Chrome aislado 390×844 y 1440×900, runtime real, identidad/contacto sintéticos y cada request interceptado antes de navegar: selección, igual saliencia, foco/Tab/Escape/retorno, retirada y nueva elección tras reload pasan. Ancho 320×450 sin overflow horizontal y retirada alcanzable mediante scroll. Nunca se accedió a CDN, SDK, WhatsApp ni proveedor real.
- Detector Impeccable, una ejecución sobre los tres targets modificados: exit 0, pero **31 hallazgos (27 warnings y 4 advisory)**. Son principalmente estilos heredados (contraste muted, glow, chips, typography, cards, overflow y FAQ transition). El detector global mezcla h3 heredado de 18px con nuevos h2 de 20px; dentro del consentimiento la relación título/body es 20/15. No se presenta como detector limpio ni se modificaron áreas fuera de alcance.
- `git diff --check`: exit 0.

Build: N/A para assets HTML/CSS/JS estáticos sin compilación propia; sintaxis y render real verificados. No se ejecutó build completo Next.js porque este ticket no modifica la aplicación Next ni su empaquetado. No se afirma verde global del repositorio; el mantenimiento de aserción headline backend CDX007 pertenece a otro ticket.

Warnings: Node reporta MODULE_TYPELESS_PACKAGE_JSON y experimental-loader heredados en suites TypeScript; Git avisa normalización LF→CRLF. No se cambiaron dependencias para silenciarlos.

## Capturas y límites

Directorio absoluto local de evidencia (ignorado, no incluido en commit):
`C:/Users/jairo/.codex/worktrees/business-paid-traffic-followups/PartnerHub/.local-secrets/sdd/AGR-20261021-005/`

- `mobile-banner.png`, `mobile-dialog.png`
- `desktop-banner.png`, `desktop-dialog.png`
- Informe detallado: `task-1-report.md`; reproductor aislado: `browser-check.mjs`.

Dos rondas batched de capturas como máximo. La primera detuvo la aserción desktop por diferencia subpíxel de anchura; la segunda usó tolerancia geométrica <0.5px y mantuvo igualdad exacta de altura/color/fondo y overflow estricto. No hubo rediseño ni lote de retoques visuales. La comprobación de capacidad de eventos agregada después no altera el render de Chrome.

## Git, riesgos y siguientes gates

- Rama: `codex/AGR-20261021-005-business-consent-ui`.
- Código/tests: `f5f5727` (base `1cbdb6b31cc088c733240717f929957f80e29adc`). Reporte/request: commit documental posterior en la misma rama.
- Sin push, PR, merge, fuentes/master, credenciales, cuentas, proveedores, backend/runtime edits ni publicación.
- Pendiente: revisión independiente de código/capturas por controlador e integración/browser/network CDX-006. Los SDK y su recepción real no se verifican en este ticket; flags técnicos siguen sin habilitarse. Revisión jurídica/identidad legal no se sustituye por esta UI.
- Follow-up: sí, gates de integración y release ya previstos; no se identifica un cambio adicional de UI obligatorio en esta entrega.
