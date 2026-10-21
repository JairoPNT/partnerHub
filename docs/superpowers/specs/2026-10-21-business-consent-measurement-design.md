# Business — consentimiento y medición del piloto Claudia

Ticket de diseño: CDX-20261021-004. Contrato del PR #228 aprobado explícitamente por Jairo el 2026-10-21; autorizada la preparación del plan técnico. Implementación pendiente de revisión del plan. No hay cambios de runtime ni publicación en esta entrega.

## Objetivo y evidencia

Corregir la carga incondicional de Meta y habilitar medición mínima de visitas/clics Business, sin convertir un clic en conversación, registro o venta. Base: auditoría CDX-20261021-002, main `8ba3a9b`, PH-044 y revisión read-only de `applyConfiguredIntegrations`/generación. El perfil de contenido del PR #226 permanece independiente.

Alternativas: (1) bloqueo básico hasta consentimiento, recomendado por privacidad y pruebas deterministas; (2) modo avanzado con pings sin cookies, descartado para este piloto; (3) CMP externa, diferida para no añadir cuentas/dependencias. No se certifica cumplimiento legal mediante esta solución técnica.

## Contrato aprobado

1. Dos categorías opcionales independientes: Analítica (GA4) y Publicidad (Meta). Ambas denegadas inicialmente. Aceptar todo, rechazar opcionales y configurar deben ser acciones claras y equivalentes; cerrar el aviso no acepta.
2. Antes de aceptar una categoría no cargar su SDK ni emitir pings, PageView o eventos. Sin JavaScript no habrá pixel `noscript`. WhatsApp y el contenido no dependerán del consentimiento publicitario.
3. Usar solo los IDs existentes del partner/sitio. No heredar IDs del master ni de otros ecosistemas. No añadir Google Ads, GTM, CAPI, enhanced conversions, User ID ni credenciales. Las señales publicitarias de Google siguen denegadas incluso con Analítica aceptada.
4. Guardar únicamente versión de política, elección de categorías y fecha de expiración por sitio/origen. Propuesta de vigencia: 180 días, como decisión de producto y no plazo legal. Ausente/corrupto/expirado/versión distinta => denegado. Si storage falla, permitir elección explícita solo en memoria y volver a denegado al recargar. No consentimiento compartido entre dominios/subdominios.
5. Permitir reabrir preferencias y retirar. Bloquear inmediatamente el envío propio y descartar colas/callbacks pendientes mediante versión de estado; aplicar revocación soportada y recarga limpia si hubo SDK cargado. No prometer retirar solicitudes ya enviadas ni borrar datos remotos. Verificar también otras pestañas. La limpieza de cookies, si procede, será exclusivamente de las gestionadas por este sitio, sin borrado global de dominio.
6. Solo producción bajo el origen público esperado puede activar SDKs. Preview de Master Sites, localhost, `file:` y origen distinto permanecen sin medición externa, aunque exista elección guardada.

## Contrato entre generador y navegador

- Codex modifica exclusivamente política de generación del paquete: elimina los bloques Meta administrados heredados en Business, incluido noscript; conserva IDs/configuración y copia el asset local aprobado. Product y Personal Brand conservan su comportamiento actual mediante regresiones explícitas. No modifica `metaPixelHtml.ts` globalmente para resolver solo Business.
- Antigravity es owner del runtime de navegador no visual y de su UI, mediante tickets separados y archivos distintos. Codex no implementa código de plantilla/UX.
- Runtime propuesto: `plantillas-de-pagina/business/measurement-runtime.js`, cargado después de `config.js` y antes de `app.js`. Consume CONFIG Business validado y el origen público esperado; no permite IDs, endpoints o destinos arbitrarios desde eventos/UI.
- API única propuesta `window.PartnerHubBusinessConsent`: `getState()` devuelve solo categorías/estado vigente; `setConsent({analytics:boolean, marketing:boolean})` exige ambas claves y ninguna extra; `withdraw()` deniega ambas. Notifica a la UI mediante un evento local de cambio sin datos personales. La UI no escribe storage ni llama SDKs.
- Un runtime y un listener de CTA por documento. Un PageView por proveedor/documento después de consentimiento; aceptar repetidamente no duplica. No se reproducen clics anteriores al consentimiento. Una revocación invalida cargas asíncronas iniciadas antes.
- Validar el paquete seleccionado antes de borrar/reemplazar output. Tags, loaders, iframes o pixels de medición no administrados requieren rechazo y corrección explícita; no eliminar JavaScript arbitrario silenciosamente. El artefacto ejecutable debe tener versión/hash aprobados en el gate de integración. Un escáner de firmas no prueba ausencia de tracking arbitrario.
- El paquete conserva navegación/video/WhatsApp aunque falten IDs, el usuario rechace o un SDK falle. No bloquear navegación esperando confirmación de entrega de eventos.

## Semántica y datos

- GA4: `page_view` y `click_cta` solamente con Analítica aceptada e ID válido. Meta: `PageView` y custom `WhatsAppClick` solamente con Publicidad aceptada e ID válido. No enviar `Lead`, `CompleteRegistration`, `Purchase` ni eventos de Google Ads.
- Payload propio limitado a enums de posición del CTA y destino `whatsapp`. No CONFIG, href, teléfono, correo, nombre, texto de mensaje/botón/formulario, ownerKey ni identificador de usuario. Evitar duplicados del mismo evento nativo; no suprimir un clic posterior real como si fuera duplicado.
- La navegación a WhatsApp conserva el contacto del partner; su URL no se reutiliza como payload analítico. No sumar GA4 y Meta como si fueran contactos únicos.
- Los SDKs pueden recoger URL/referrer y datos automáticamente, independientemente del payload propio. Deben deshabilitarse funciones automáticas no necesarias con controles oficiales comprobados; GA4 debe usar ubicación/referrer saneados y Google signals/personalización desactivados. La integración debe comprobar URLs con query/hash/referrer sensibles y controles de Meta; si no puede demostrar un tratamiento seguro, ese proveedor permanece bloqueado en el piloto. No se declara «sin PII» solo por una allowlist de parámetros propios.
- Recibir un evento de prueba, verlo en reporte y atribuir un resultado comercial son evidencias diferentes. No se fabrican ventas o métricas. Analítica y Métricas sigue siendo solo lectura de campañas activas/resultados.

## Tickets y no solapamiento

| Ticket | Owner / archivos | Dependencias |
| --- | --- | --- |
| CDX-20261021-005 (por crear tras aprobación) | Codex: generador/helper Business y tests; no plantilla | Aprobación de este spec y del plan técnico; contrato/asset AGR-004 |
| AGR-20261021-004 (por redactar después de aprobación) | Antigravity: solo measurement-runtime.js y sus tests, sin editar app/index/styles | Contrato aprobado; puede avanzar paralelo al backend con fixtures |
| AGR-20261021-005 (por redactar después de aprobación) | Antigravity: aviso/preferencias y conexión a API en app/index/styles | AGR-001 y AGR-003 por solapamiento; API AGR-004 congelada |
| CDX-20261021-006 (por crear tras aprobación) | Codex orquestador: integración de paquete y validación local; revisión UX por Antigravity sin ediciones solapadas | Revisiones de backend/runtime/UI; publicación y comprobación con proveedores reales requieren autorización separada |

AGR-001/003 (contenido/FAQ) no deben añadir loaders o emisores paralelos. AGR-002 (editor Master Sites) puede avanzar en sus componentes sin tocar este contrato. No ejecutar tareas frontend en paralelo sobre app.js/index.html/styles.css.

## Aceptación y verificación posterior

- Fixtures offline: sin consentimiento, rechazo, aceptación selectiva, expiración, storage corrupto/bloqueado, recarga, retirada antes/durante carga, otra pestaña, IDs ausentes y deduplicación.
- Probar generador con master heredado, scripts no administrados y fallo previo a escritura: fuente/paquete anterior intactos; Product/Brand sin cambios.
- Navegador local con proveedores interceptados: ningún request previo a consentimiento, ninguno en preview; aviso accesible en móvil/escritorio y reapertura; contactos funcionales aunque medición esté bloqueada. Cubrir carga repetida y carreras de retirada.
- Revisión independiente de seguridad/privacidad y revisión de UI antes de integrar. Pruebas locales no acreditan recepción externa.
- Publicación, limpieza/revisión del master remoto y validación con IDs/cuentas reales pertenecen a otro gate autorizado. No tocar DNS/SFTP, anuncios, presupuesto, cuentas, integraciones externas o datos reales en las pruebas de implementación.

## Referencias técnicas consultadas — 2026-10-21

- Google: https://developers.google.com/tag-platform/security/concepts/consent-mode — diferencia básico/avanzado; básico bloquea tags antes de consentimiento.
- Google: https://developers.google.com/tag-platform/security/guides/consent?consentmode=basic — carga posterior y estado por categoría.
- Google: https://developers.google.com/tag-platform/security/guides/privacy — controles de signals/personalización.
- Meta: https://developers.facebook.com/docs/meta-pixel/implementation/gdpr/ — revoke/grant y categorías de datos del SDK. Lector directo devolvió 429; contenido oficial recuperado mediante la ruta Jina de agent-reach. Ninguna cuenta fue consultada.

Pendiente antes de implementación: revisión y aprobación del plan técnico. Se conserva la elección previa de Jairo: subagentes por tarea y revisión independiente; Antigravity mantiene sus áreas frontend. Los requests AGR-004/005 se preparan con el plan, sin activar trabajo de producto antes de su aprobación. No se reinicia el monitor periódico eliminado.
