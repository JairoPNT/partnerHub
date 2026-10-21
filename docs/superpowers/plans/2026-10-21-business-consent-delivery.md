# Business Consent Delivery Implementation Plan

> Contrato de persistencia supersedido por `../specs/2026-10-21-business-fresh-consent-amendment.md`, aprobado por Jairo 2026-10-21. Sin restauración ni TTL; `expiresAt:null`, memoria del documento. AGR007 corrige runtime antes de UI/integración. El resto del plan y los gates permanecen.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar consentimiento y medición mínima Business sin etiquetas previas al permiso ni regresiones en otros ecosistemas.

**Architecture:** Cuatro tickets separan generador, runtime de navegador, UI e integración. Backend y runtime avanzan con fixtures sobre este contrato congelado; la UI espera la plantilla/FAQ para no solaparse. Las ramas se revisan por separado y el release compatible se verifica conjuntamente antes de activar generación productiva.

**Tech Stack:** TypeScript/Node test runner, JavaScript estático/Node VM, HTML/CSS, navegador Chromium con Playwright ya incluido en el runtime local; sin nuevas dependencias de producto.

**Spec:** `docs/superpowers/specs/2026-10-21-business-consent-measurement-design.md` (contrato PR #228 aprobado por Jairo el 2026-10-21).

## Global Constraints

- Plan técnico del PR #229 aprobado explícitamente por Jairo el 2026-10-21. Implementación autorizada con subagentes por tarea, revisión independiente y revisión final de seguridad; no autoriza publicación productiva.
- Codex no modifica plantilla/frontend; Antigravity no modifica servicios/backend. Cada ticket tiene rama/worktree, archivos propios y reporte DONE; no limpiar checkout raíz ni cambios ajenos.
- Ambas categorías denegadas inicialmente; 180 días de preferencia local por sitio/origen. No SDK/ping/cola antes de aceptar; sin pixel noscript; preview nunca envía eventos reales.
- GA4: page_view/click_cta. Meta: PageView/custom WhatsAppClick. Clic no es conversación, registro o venta. No Google Ads/GTM/CAPI ni cambios de cuentas/campañas/presupuesto.
- Product/Personal Brand conservan su comportamiento; este trabajo no afirma que su consentimiento esté validado. No fuente real, publicación, DNS/SFTP ni confirmación de recepción externa en las pruebas.
- Comandos en EasyPanel mediante sh, nunca Bash. Localmente PowerShell/Node nativos. Usar Node20 para gate de packaging productivo; no declarar verde un test omitido o un fallo baseline.

## Review Focus

- Snapshot validado y bytes copiados deben ser los mismos; un cambio de master después del hash no puede introducir ejecutables diferentes.
- Retirada durante carga de SDK y en otra pestaña: invalidar callbacks/colas, conservar rechazo y no reactivar por respuestas tardías.
- Preview por mismo host administrativo y configuración manipulada: origen público exacto y site Business no-master, no inferir permiso desde hostname parcial.
- ID/evento válido no demuestra ausencia de PII automática del SDK; proveedor bloqueado si no hay evidencia de controles seguros.
- Cambio del inventario de archivos no invalida silenciosamente journals/archivos históricos ni despliega un runtime ausente en el master persistente.

## Contrato congelado para los planes componentes

- Asset: `measurement-runtime.js`; orden generado: config.js, measurement-runtime.js, app.js. Solo un ejemplar. No async/defer que cambie ese orden.
- Runtime consume solo CONFIG.ecosystemType, CONFIG.site.id/domain, CONFIG.analytics.measurementId (preferente) o integrations.analytics.measurementId, integrations.meta.pixelId y contacto derivado solo para validar el destino; nunca usa el master como fallback de IDs.
- Para Business partner, el generador debe resolver origen/IDs desde el snapshot servidor fresco del activationLead ligado al entitlement/site, usando las reglas de precedencia existentes de Master Sites. No basta con validar sintaxis del ID recibido en un body legacy. Origen/IDs de otro partner o del master se rechazan/ignoran sin escribir fuente ni paquete con esos destinos. Business master no configura SDKs de partners.
- Metadata reservada del paquete: `CONFIG.businessMeasurement = {version:1,expectedOrigin:string,providers:{ga4:boolean,meta:boolean}}`, derivada exclusivamente por el generador del dominio validado y el registry revisado. No se añade al schema de entrada, perfil ni API del editor. El master/source no puede promover sus flags. providers expresa autorización técnica de release, NO consentimiento; ambos gates deben cumplirse. Cada flag permanece false si faltan controles/evidencia del SDK, incluso con consentimiento aceptado.
- Origen autorizado: HTTPS exacto de CONFIG.site.domain (hostname sin esquema/ruta/puerto/credenciales); site.id Business distinto de ganomaster-business. app.partnerhub.club, localhost, IP, file y origen distinto => runtime deshabilitado, sin SDK. Config inválida => denegado; no autocorrecciones que amplíen permiso.
- API `window.PartnerHubBusinessConsent`: `getState(): ConsentState`; `setConsent(choice: {analytics:boolean,marketing:boolean}): ConsentState`; `withdraw(): ConsentState`. setConsent exige exactamente ambas claves, sin coerción. Objeto público sin IDs/contactos/configuración.
- `ConsentState = {policyVersion:'2026-10-21', analytics:boolean, marketing:boolean, expiresAt:number|null, persistence:'none'|'local'|'session', runtimeEnabled:boolean, reloadRequired:boolean}`. Cada respuesta es copia inmutable; categorías expresan elección, no verificación/entrega del proveedor.
- Evento local `partnerhub:business-consent-change`, detail = ConsentState. UI reacciona a ese evento; solo runtime lee/escribe preferencias y llama SDKs. Antes de API disponible, UI no concede nada ni usa stubs que acepten silenciosamente.
- Storage key `ph:business-consent:v1:<siteId>` en el origen actual; valor estricto `{policyVersion:'2026-10-21',analytics:boolean,marketing:boolean,expiresAt:number}`. TTL = 180*24*60*60*1000; fechas inválidas/futuras fuera del TTL, versión distinta y campos extra => denegado. Sin UUID, nombre, IP ni identificador de visitante.
- CTA placements permitidos: header, hero_primary, hero_secondary, final_primary, final_secondary. Conserva IDs existentes; se mapean header .bind-cta-primary, main-vsl-cta, secondary-vsl-cta, btnRegisterFinal y btnContactNegocioWa. Payload propio solo `{placement, destination:'whatsapp'}`; no URL ni texto. Listener delegado, verifica anchor/destino WhatsApp y clic real; mismo evento nativo una vez, un clic posterior distinto sí cuenta.
- Una carga y PageView por proveedor/documento. Clics previos al consentimiento se descartan, no se reenvían. Si SDK no está listo, no bloquear WhatsApp ni inventar entrega. Retirada bloquea el emisor propio primero y recarga limpia cuando corresponda; no promete cancelar requests ya enviados.
- Esta metadata concreta el origen esperado y el gate de seguridad de proveedor ya aprobados en el spec; no habilita ninguna cuenta ni es una nueva opción editable. Tests de inyección deben probar que source/HTTP/master no la controlan.

## Secuencia y entregables

1. **CDX-20261021-005 / Codex:** `2026-10-21-business-measurement-generator.md`. Política/preflight y empaquetado. Paralelo seguro con AGR-004/005 por archivos separados.
2. **AGR-20261021-004 / Antigravity:** `2026-10-21-business-measurement-runtime.md`. Runtime aislado y pruebas offline; no app/index/styles. Revisión de seguridad independiente.
3. **AGR-20261021-005 / Antigravity:** `2026-10-21-business-consent-ui.md`. Aviso/UI después de AGR-001 y AGR-003; consume API congelada con fixtures. No ejecutar en paralelo sobre sus archivos.
4. **CDX-20261021-006 / Codex orquestador:** `2026-10-21-business-measurement-integration.md`. Integrar ramas revisadas y artefacto aprobado, navegador offline y rehearsal de master. Revisión visual por Antigravity sin solapamiento de escrituras.

Los PR de componentes no se fusionan individualmente a main si generan un estado incompatible (asset faltante, runtime sin consentimiento, gate sin aprobación). El PR de integración contendrá los commits revisados y la aprobación de hashes reales, sin copiar código manualmente ni saltar revisiones. El asset nuevo aislado puede revisarse antes, pero no se activa parcialmente. El master persistente antiguo requiere preview/renovación autorizada separados; no declarar que un deploy de código lo actualizó.

## Gate final y ejecución

- [x] Revisión/aprobación del PR #229 por Jairo el 2026-10-21; implementar con el método ya elegido.
- [ ] Revisión por tarea, fix/re-review de hallazgos y seguridad final antes de merge de código compatible.
- [ ] Integración local con proveedores interceptados y evidencia por requisito; sin pruebas reales de WhatsApp/Ads/Analytics.
- [ ] Preparar release/master cutover y solicitud de autorización productiva con hashes frescos; publicar y validar Claudia únicamente bajo ese gate. No se reactiva revisión periódica.
