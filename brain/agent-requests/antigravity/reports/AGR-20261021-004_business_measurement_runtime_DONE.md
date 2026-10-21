# AGR-20261021-004 — Runtime de consentimiento Business

Request ID: AGR-20261021-004. Owner: Antigravity runtime, asignación explícita por tarea del orquestador.

Estado: implementación de Tasks 1/2 terminada localmente; Task 1 revisada independientemente. Task 2 y aprobación final de seguridad del artefacto siguen pendientes de revisión independiente. DONE identifica la entrega de implementación, no aprobación de activación/publicación.

## Cambios y contratos

- Autoridad única `window.PartnerHubBusinessConsent`, default deny, categorías independientes, almacenamiento estricto por sitio/origen y TTL de 180 días; API/evento inmutables según contrato congelado.
- Adaptadores internos `syncProviders(epoch)` y `trackWhatsappClick(event)`. Doble gate: elección explícita vigente y readiness técnica del paquete; IDs/origen/readiness/contacto se capturan desde campos aprobados, sin exponerlos en la API.
- Un loader por proveedor/documento; una PageView propia. No se encolan/reproducen clics anteriores al consentimiento o durante carga/fallo del SDK. Fallos no bloquean navegación ni provocan retries.
- Listener delegado sobre cinco placements, clic nativo `isTrusted`, destino WhatsApp contrastado con el número configurado; deduplicación del mismo objeto Event y admisión de clics reales posteriores, incluidos targets anidados y teclado. Payload propio de clic exclusivamente `{placement,destination:'whatsapp'}`.
- GA4: `page_view` / `click_cta`; Meta: `PageView` / `trackCustom WhatsAppClick`. Sin Lead, registro, venta, Ads/GTM/CAPI ni identificación propia.
- Epoch invalidado antes de revocación, descarte de onload tardío, denegación de la emisión propia, revocación entre pestañas sin concesión implícita, expiración con timer compatible con el límite 32-bit del navegador. Una retirada/reducción con SDK iniciado deja el documento en cuarentena hasta navegación limpia.
- Contexto conservador: no cargar con query/hash/ruta no raíz o referrer no vacío. Loader con `referrerPolicy='no-referrer'`. Globals/colas/scripts de SDK ajenos bloquean el adaptador afectado; no se reutilizan ni borran.

## Archivos modificados

- `plantillas-de-pagina/business/measurement-runtime.js`
- `plantillas-de-pagina/business/measurement-runtime.test.mjs`
- `plantillas-de-pagina/business/measurement-test-harness.mjs`
- Este reporte propio. No app.js, index.html, styles.css, config.js, backend ni fuentes/output reales.

## Evidencia TDD y verificación — 2026-10-21

Task 1 conservada: `c92401d` y corrección revisada `05ea7726efc187c1cc7bc4dc27ebfb896cc44733`; no se borran esos hashes históricos.

Task 2 RED inicial: `node --test plantillas-de-pagina/business/measurement-runtime.test.mjs` dio 11 pass / 12 fail. Fallaron los 12 tests nuevos por ausencia de loaders/eventos/estado de retirada, incluyendo los nueve nombres exigidos en el plan. La aserción Task1 de «no loaders incluso después de aceptar readiness=true» se acotó a readiness sin elección: era una restricción temporal de Task1, no el contrato final.

Primer GREEN: 23/23 tras corregir el fixture del header para reflejar el anchor real sin ID; no se relajó la validación del runtime. Revisión propia añadió `cross_tab_clear_or_corruption_removes_persistence_claim`: RED 24 pass / 1 fail (`local` en lugar de `none`), luego GREEN 25/25. La corrección elimina preferencias/persistencia al recibir borrado/corrupción/expiración de otra pestaña. Test adicional de expiración/singleton pasó sobre el comportamiento ya implementado.

Verificación final local, Node v24.16.0 / npm 11.13.0, PowerShell nativo:

- `node --test plantillas-de-pagina/business/measurement-runtime.test.mjs`: exit 0, 25/25, sin skip.
- `node --check plantillas-de-pagina/business/measurement-runtime.js`: exit 0.
- En `app/web`, `npm run lint`: exit 0, sin warnings de ESLint.
- En `app/web`, `npm run test:business-whatsapp-cta`: exit 0, 7/7.
- En `app/web`, `npm run test:ecosystem-templates`: exit 0, 8/8.
- En `app/web`, `npm test`: exit 1, Missing script `test`; no existe suite agregada por defecto. No se declara que toda la aplicación haya sido probada.
- `git diff --check`: exit 0. Git advierte conversión LF→CRLF; las regresiones existentes emiten `ExperimentalWarning` del loader y `MODULE_TYPELESS_PACKAGE_JSON`. No se editaron configuración/dependencias para ocultarlos.
- Build de app: no ejecutado, tal como permite Task2 porque el diff de producto es solo asset clásico aislado/test/harness y no afecta código de app ni su build. No se afirma build verde nuevo.

El harness ejecuta el asset real con Node VM; simula solo browser/red, registra loaders/imágenes/beacons/fetch/XHR y controla resolución/error de SDK mediante promesas. Se inspeccionan comandos completos y semillas de teléfono, mensaje, nombre, ownerKey y texto DOM; no aparecen en comandos de analytics. Nunca descargó ni ejecutó SDK real ni envió eventos reales. Esto valida el emisor propio, no el comportamiento automático del proveedor ni recepción externa.

## Controles oficiales leídos antes de implementar

Consultados 2026-10-21 mediante agent-reach / lector Jina, sin cuentas ni sesiones autenticadas:

- [Google consent básico](https://developers.google.com/tag-platform/security/guides/consent?consentmode=basic): bloquear la carga antes de aceptar. Solo después del permiso se crea stub/loader; `analytics_storage` concedido, `ad_storage`, `ad_user_data`, `ad_personalization` siempre denied.
- [Google privacidad](https://developers.google.com/tag-platform/security/guides/privacy): config con `allow_google_signals:false`, `allow_ad_personalization_signals:false`, `send_page_view:false`; retirada usa `window['ga-disable-'+measurementId]=true`. No se llama actualización de consentimiento denegado que pudiera generar pings sin cookies.
- [Google pageviews](https://developers.google.com/analytics/devguides/collection/ga4/views): config sin PageView automática y un evento manual con URL raíz, referrer vacío y título genérico. `send_page_view:false` por sí solo no desactiva history/enhanced measurement.
- [Google enhanced measurement](https://support.google.com/analytics/answer/9216061): eventos automáticos, enlaces salientes/formularios y cambios de historial dependen de configuración de cuenta/tag. Esa configuración no fue consultada ni modificada; no se asume segura.
- [Meta consentimiento](https://developers.facebook.com/docs/meta-pixel/implementation/gdpr/): `fbq('consent','revoke')` antes de init y al retirar; grant únicamente con permiso vigente. La documentación declara recepción de headers/ubicación/referrer y otras categorías: no existe afirmación de SDK sin datos personales.
- [Meta avanzado](https://developers.facebook.com/docs/meta-pixel/advanced/): `fbq('set','autoConfig',false,pixelId)` antes de init para modo manual; init solo con pixelId, sin advanced-matching ni campos de formulario. No se usa imagen/noscript como alternativa al SDK ni mecanismos silenciosos.

## Límites y decisiones explícitas para revisión/integración

1. Ruling: `reloadRequired` solicita navegación limpia a la UI pero el runtime nunca llama `location.reload()`. Si setItem y removeItem fallan tras una aceptación durable legible, solo puede garantizarse denegación en memoria; recargar automáticamente podría restaurar ese grant antiguo. Una recarga manual tampoco tiene garantía de default deny si ese storage vuelve a ser legible. La UI AGR-005 y la integración deben tratar este caso explícitamente; su implementación/verificación está pendiente. Coste: no se limpia automáticamente un SDK ya cargado; su revocación oficial se solicita, pero requests ya emitidos o automáticos no se pueden cancelar por promesa.
2. Ruling: se bloquean ambos adaptadores en contexto no raíz, con cualquier query/hash/referrer, incluso benigno, porque sanitizar solo argumentos no controla auto-colección. Coste: cobertura de medición reducida; WhatsApp sigue navegable.
3. Readiness=true solo existe en fixtures offline. Este ticket no modifica ningún registry/paquete/cuenta real: ambos flags del release deben seguir false hasta evidencia independiente de controles efectivos de SDK/cuenta. GA4 requiere enhanced/automatic measurement y destinations/conexiones revisados; Meta requiere controles efectivos de autoeventos/metadata/advanced matching y otros ajustes relevantes, además de lo enviado por el stub.
4. `ga-disable` / Meta revoke son solicitudes mediante controles oficiales, no sandbox de SDK. Las pruebas VM no demuestran que toda petición automática real cesó; librerías ya cargadas pueden conservar cookies/estado, emitir solicitudes pendientes o reaccionar a cambios de documento. No se borran cookies ajenas ni se retiran eventos/datos remotos. Cambios mediante history API sin evento de navegación y comportamiento automático deben evaluarse en el gate de integración; no se garantiza seguridad desde mocks.
5. El destino de clic se contrasta con `distributor.whatsappNumber` válido; con número ausente/inválido se omite medición del clic aunque una URL custom pudiera navegar. No se envía esa URL como fallback analítico.
6. Revisión independiente de Task2/seguridad final, UI lifecycle, prueba local de navegador interceptado, packaging Node20, hashes aprobados y release compatible siguen pendientes. No fusionar activación parcial a main. Publicación/WhatsApp/proveedores/cuentas/DNS/SFTP requieren gates separados.

## Rama, commits y follow-up

- Rama: `codex/AGR-20261021-004-business-consent-runtime`.
- Implementación Task2: `008892c8db12de5a1c29904bacc6c3d79c774987`.
- PR: no creado por este ejecutor; no push, merge ni publicación.
- Follow-up requerido: sí, revisión independiente e integración coordinada; no se ejecutan tareas de otro owner desde este reporte.
