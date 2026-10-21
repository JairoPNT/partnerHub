# AGR-20261021-007 — consentimiento Business por carga

Fecha: 2026-10-21. Estado: implementación terminada; revisión independiente y seguridad final pendientes del coordinador. Rol: Antigravity/frontend-runtime, asignación explícita de Jairo. No es aprobación de publicación.

## Resultado

- Cada documento comienza denegado y nunca consulta, escribe ni elimina preferencias de localStorage, sessionStorage o cookies. Una aceptación antigua puede seguir físicamente presente, sin restaurar permisos.
- Eliminados TTL, restauración persistente, timers de expiración y eventos de storage como autoridad de consentimiento.
- API `getState/setConsent/withdraw`, evento, validación estricta de dos booleanos propios y copias congeladas conservados. `policyVersion: '2026-10-21'`, `expiresAt: null`; `persistence: 'none'` al inicio/reset/deshabilitado y `'session'` solo para elección explícita en memoria del documento. Nunca `'local'`.
- Retirada/reducción invalida epoch y emisores y vacía las colas propias antes de revocar SDKs. Si algún SDK inició, ambas categorías quedan denegadas, se notifica y se solicita una única recarga limpia. La cuarentena impide reaceptar en ese documento aunque la navegación no ocurra. Sin SDK iniciado no se recarga.
- `pageshow.persisted === true` invalida la elección; pageshow inicial normal la conserva. La restauración con SDK iniciado también solicita una sola recarga.
- BroadcastChannel por origen y siteId: `ph:business-consent:v1:<siteId>`, solo `{version:1, action:'withdraw'}`. Las retiradas/reducciones locales emiten denegación; recibirla deniega ambas categorías sin eco. Ausencia/fallo del canal no impide la retirada local. No se transmiten permisos positivos ni identificadores personales.
- Gates técnicos de configuración/identidad/origen, readiness, contexto sensible, singleton, clic confiable, WhatsApp, dedupe y payload mínimo permanecen. No se modificaron flags ni configuración de release.

## Archivos

- `plantillas-de-pagina/business/measurement-runtime.js`
- `plantillas-de-pagina/business/measurement-runtime.test.mjs`
- `plantillas-de-pagina/business/measurement-test-harness.mjs`
- Request AGR007 y este reporte.

El harness ejecuta el asset real en cada documento nuevo. Solo sustituye fronteras de navegador/red: stores fallidos/recuperados, transporte SDK, reload, eventos y canal asíncrono por origen/nombre. No se añadieron hooks de test a producción.

## TDD RED / GREEN

Primero se agregó `new_document_ignores_readable_old_grant_when_all_mutations_fail` con aceptación antigua legible y set/remove fallidos. Comando:

`node --test --test-name-pattern=new_document_ignores_readable_old_grant_when_all_mutations_fail plantillas-de-pagina/business/measurement-runtime.test.mjs`

RED sobre runtime anterior: exit 1, 0 pass / 1 fail; `old analytics grant must never restore`, actual `true`, esperado `false`. El fallo demuestra restauración del permiso antiguo, no un error de harness.

Después de adaptar expectativas de persistencia/TTL obsoletas y añadir cobertura, antes de editar producción: suite completa exit 1, 15 pass / 17 fail. Fallaban restauración de grants, expiresAt, storage, reload, BFCache y canal aún ausente.

GREEN final después de producción: `node --test plantillas-de-pagina/business/measurement-runtime.test.mjs`, exit 0, 32 pass / 0 fail / 0 skip. Cubre grant antiguo aún presente; nuevo documento real; todos los stores fallidos y recuperados; retirada durante/después de carga; reducción; una sola recarga posterior a notificación; BFCache; canal estricto/revoke-only/sin eco/sin grants; origen/siteId; canal ausente, constructor fallido y envío fallido. Se conservaron regresiones de categorías, payload, contexto/origen, proveedores, WhatsApp, dedupe, singleton y carga fallida.

## Verificación

En raíz del worktree:

- Suite runtime: 32/32, exit 0, sin warnings/skips.
- `node --check plantillas-de-pagina/business/measurement-runtime.js`: exit 0.
- `node --check plantillas-de-pagina/business/measurement-test-harness.mjs`: exit 0.
- `node --check plantillas-de-pagina/business/measurement-runtime.test.mjs`: exit 0.
- `git diff --check` y `git diff --cached --check`: exit 0.

En `app/web`:

- `npm run lint`: exit 0 (`eslint . --max-warnings=0`), sin warnings.
- `npm run test:business-whatsapp-cta`: exit 0, 7/7, sin skips.
- `npm run test:ecosystem-templates`: exit 0, 8/8, sin skips.
- `npm run test:business-vsl-poster`: exit 0, 5/5, sin skips.

Warnings de Node observados: `ExperimentalWarning` por `--experimental-loader` en suite WhatsApp, y `[MODULE_TYPELESS_PACKAGE_JSON]` en los tests TS WhatsApp/plantilla/VSL. No se ocultaron ni se cambió configuración fuera de scope. No hubo fallos finales en las verificaciones ejecutadas.

Build: no ejecutado / no aplicable al cambio aislado de asset clásico y tests; ningún módulo Next/app/dependencia fue modificado. No existe script agregado `npm test` en `app/web/package.json`, por lo que no se afirma suite global. Las únicas omisiones son build global y revisión/browser integrado, no un skip silencioso de los tests ejecutados.

## Git

- Rama: `codex/AGR-20261021-007-fresh-consent`.
- Base: `6d7cc358d3435a817a4a4b281070f59876ff818a`.
- Implementación: `3382bc2d7799c4494318c9a0994f6bd0cd957b10`.
- Reporte/request: commit documental posterior en la misma rama.
- Sin push, PR, merge ni publicación.

## Autorrevisión, límites y follow-up

Autorrevisión del diff y del contrato aprobados: solo rutas permitidas; ninguna decisión UI nueva; sin API/backend/registry/app/index/styles/config ni fuente/master modificados. La reducción con SDK iniciado deniega ambas categorías antes de recargar; reducción sin SDK conserva únicamente la elección explícita restante en memoria. El reset BFCache/remoto usa `persistence:'none'` y una elección local usa `'session'`.

Pendiente: revisión independiente del coordinador, seguridad final e integración/browser CDX006; UI AGR005 depende de esta revisión y debe informar consentimiento por carga. BroadcastChannel es best-effort, no garantiza pestañas suspendidas. No se borran cookies ajenas ni se promete cancelar solicitudes ya emitidas. Los dobles offline no prueban controles de privacidad/configuración de cuentas SDK reales, recepción externa, cumplimiento jurídico, tags públicos heredados ni readiness pública. No se contactaron proveedores/cuentas reales ni DNS/SFTP/publicación. Follow-up: sí, los gates separados ya previstos; no se detectó otro cambio de runtime requerido durante autorrevisión.
