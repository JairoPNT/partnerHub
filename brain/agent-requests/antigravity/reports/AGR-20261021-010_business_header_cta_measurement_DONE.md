# AGR-20261021-010 — Medición del CTA real del encabezado

Fecha: 2026-10-21. Estado: implementación completada, revisión e integración pendientes. Owner: Antigravity/frontend-runtime delegado. Follow-up acotado al P2 de la revisión final CDX-20261021-006, sin aprobación pública.

## Cambios y límites

- `measurement-runtime.js`: un caso explícito `btnNavContact -> header` en el switch existente. Guardas de evento confiable, deduplicación, teléfono/destino, consentimiento, readiness y contexto intactas. Sin navegación, payload, tipos de evento o tracking nuevos.
- `measurement-test-harness.mjs`: conserva el ID recibido y representa `btnNavContact` dentro de header; elimina el sustituto de header con ID vacío que ocultaba el defecto.
- `measurement-runtime.test.mjs`: placements existentes usan el ID real. Nueva regresión consume la identidad del CTA primario desde el header del index canónico y ejecuta el runtime real, sin modificar index. Cubre ambas categorías independientes, preconsentimiento, carga sin replay, target SVG anidado, clic con detail=0, mismo evento redistribuido, segundo clic distinto, sintético y teléfono ajeno. Cada proveedor autorizado recibe exactamente un evento por clic, con `{placement:'header',destination:'whatsapp'}`; navegación no impedida.
- Documentación: request AGR010 y este reporte. Ningún archivo AGR009/UI, backend, registry, generador o integración fue editado.

## Verificación TDD

Antes del cambio de producción:

`node --test plantillas-de-pagina/business/measurement-runtime.test.mjs`

RED: exit 1, 34 tests, 32 pass / 2 fail / 0 skip. Fallan `nested_target_keyboard_and_two_distinct_clicks` (permanece el evento anterior hero_primary al omitir header) y `canonical_header_id_emits_once_per_trusted_click_only_to_consented_ready_providers` (0 en vez de 1 evento). No es un error de harness o compilación.

Después del caso explícito:

`node --test plantillas-de-pagina/business/measurement-runtime.test.mjs plantillas-de-pagina/business/consent-ui.test.mjs`

GREEN: exit 0, 46/46 pass, 0 fail / 0 skip (34 runtime + 12 UI), sin warnings. Ejecutado con Node v24.16.0 en Windows. Las suites se ejecutaron una vez en conjunto; no se repitieron suites de backend no afectadas.

Sintaxis: `node --check` para runtime, runtime.test y harness; todos exit 0. `git diff --check` y staged diff check: exit 0.

Evidencia completa local ignorada: `.local-secrets/sdd/AGR-20261021-010/red.log`, `green.log`, `syntax-diff.log`.

Build: no ejecutado / no aplicable al asset clásico aislado; no se cambió Next, dependencias ni build config. No existe script agregado `npm test`; no se afirma build global ni suite global.

## Entrega e integración

- Rama: `codex/AGR-20261021-010-header-cta-measurement`.
- Base: `595b208cb7c68904a21d3f1edcf2e7e9db7488a1`.
- Commit de implementación: `0121ca0496955b57bf0607d7334a7620a9f82476`; el siguiente commit contiene únicamente cierre documental.
- PR/push/merge: ninguno.
- Follow-up: sí, controlador debe revisar el cambio, integrar AGR009 y AGR010, rebindear hashes literales de bytes LF aprobados y verificar header real generado en navegador. El harness de componente verifica runtime real con frontera de eventos/transporte simulada; detail=0 no certifica interacción nativa de teclado. Esta entrega no sustituye la prueba integrada nativa.
- Flags de proveedores permanecen false. Sin SDK real, cuentas, fetch público, master/source, publicación, infraestructura ni campañas. Gates previos de proveedores, compatibilidad/cutover y publicación continúan pendientes; no se declara readiness de medición real.
