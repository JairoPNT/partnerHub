# CDX-20261021-005 — Generador Business con consentimiento

Estado: implementación de Task 1 y Task 2 disponible en rama. Revisión independiente inicial de Task 2 FAILED por carrera Important; fix round 1 implementado y verificado, pendiente re-review independiente. Ticket NO cerrado para release/integración. El sufijo DONE es la convención del protocolo, no una aprobación de activación.

## Alcance y commits

- Owner: Codex Backend Lead. Rama: `codex/CDX-20261021-005-business-measurement-generator`.
- Task 1: `a9064d7` (preflight/ensamblado) y `a8d547c` (autoridad server-only durante jobs activos); revisión independiente previa informada por el coordinador.
- Task 2: `9188d6d7cd913ffb072e7ba2cbfa766bf7493750`, base `a8d547c1cf9d754573bf20eb5cc154a03f9f5c60`.
- Task 2 fix round 1: `1b7155e5bec8a7748085dff4e9c1e1f79d564c54` (pin de captura final; dos regresiones deterministas).
- Sin push, PR, merge, datos reales, APPLY real, proveedores, DNS, SFTP ni publicación. El coordinador gestiona revisión e integración.

## Resultado Task 2

- Creación/refresh incluyen `measurement-runtime.js` en inventario, hashes, manifest, copia y regla no-cache; rechazan runtime ausente o no regular antes de mutar el master.
- Inventarios `LEGACY_*` independientes conservan los hashes, manifests, request IDs, archivos y journals históricos; no se amplió la allowlist de paquete previo ni el destino permitido.
- Un preview/autorización de los CLIs pre-runtime no autoriza el inventario nuevo. El drift del runtime cambia el plan/hash y el rechazo preserva el árbol de salida completo.
- Staging temporal de ambos entrypoints `.mjs`, importación y creación local con fixtures bajo Node20; sin dependencias TypeScript/build ni llamadas externas.
- El registry productivo de artefactos de Task 1 sigue vacío. Los fixtures usan únicamente cuatro assets sintéticos, el preparador real y snapshots reales del servicio de preview enlazados a sus stores de test. No hay bypass productivo ni cambios de frontend.

## Archivos Task 2

Todos bajo `app/web/`:

- `scripts/jairo-business-master-package.mjs` y `.test.mjs`.
- `scripts/jairo-business-master-package-drift-recovery.mjs` y `.test.mjs`.
- `scripts/business-measurement-packaging.test.mjs` (nuevo).
- `scripts/business-master-runtime-packaging.test.mjs`.
- `scripts/business-master-package-drift-recovery.integration.test.mjs` (fixture histórico/actual separado).
- `scripts/business-publication-site-coordination.integration.test.mjs` y `scripts/claudia-business-generation.integration.test.mjs` (fixtures de éxito afectados).
- `server/services/businessMeasurement.test-fixtures.ts` (helper exclusivo de tests).
- `server/services/businessLandingContentLegacyIngress.test.mjs`, `businessMasterContent.integration.test.mjs`, `masterSitesBusinessCommandService.test.ts` y `masterSitesBusinessContentGeneration.integration.test.mjs` (fixtures de éxito afectados; aserciones de perfil, identidad, poster, retries y bloqueo conservadas).

## Evidencia RED/GREEN

- Node20 RED inicial: 66 tests, 61 pass, 5 fail relevantes: runtime fuera de inventario; refresh sin runtime; drift sin cambiar plan; runtime ausente/directorio no rechazado. No se aceptó un error de runtime/dependencias como RED.
- GREEN final Node20 `v20.20.2`: 69/69, cero skip. Comando desde `app/web`: `node --test scripts/business-measurement-packaging.test.mjs scripts/jairo-business-master-package.test.mjs scripts/jairo-business-master-package-drift-recovery.test.mjs scripts/business-master-runtime-packaging.test.mjs`, usando el ejecutable Node20 explícito verificado por el coordinador.
- Fixtures legacy/command: RED reproducido 65 tests, 17 pass, 48 fail (3 legacy y 45 command por preflight); todos resueltos mediante fixtures, no guards debilitados.
- Descubrimiento acotado de fixtures directos: tres fallos en master refresh/content y tres en Claudia/coordinación por preflight. Datos incompletos del snapshot (UUID, esquema target y ruta canonical) fueron corregidos en test. Corrida adicional final 54/54.
- Corrida final combinada Node24 `v24.16.0`: 155/155, cero skip. Incluye measurement HTML/authority/generation, legacy ingress, Business CTA, Meta HTML, command service, master-refresh integration, master-content generation, Claudia generation y coordinación Business/Product. No es una afirmación de suite global.
- `npm run lint`: exit 0. `npm run build`: exit 0. `git diff --check`: exit 0.
- El helper inicial causó un fallo de typecheck por import `.ts`; corregido a alias `@/` sin cambios de tsconfig/package/lock. Build posterior completo verde. Persisten warning de múltiples lockfiles y 8 warnings NFT/dynamic-trace de Next en la corrida final; no se modificó configuración ajena.

Logs completos del coordinador en `.local-secrets/sdd/CDX-20261021-004-execution/generator-task-2-{red,green,fixtures-red,fixtures-green,additional-red,adapter-red,additional-green,regression,final-regression,lint,build}.log`. Reporte técnico detallado: `generator-task-2-report.md` en esa misma carpeta (no versionado).

## Revisión propia, límites y gates pendientes

- Self-review: inventarios históricos congelados, journals y allowlist sin cambios; helper importado solo desde tests; sin frontend/Docker/package/lock ni aprobaciones reales. TDD y verificación guiaron cambios y correcciones.
- La revisión independiente confirmó como Important la carrera de recaptura: create y refresh podían devolver APPLIED con bytes no autorizados bajo el planHash anterior. Su antigüedad no la excusa. Fix round 1 compara el hash de template capturado Y del paquete construido con el preview autorizado antes de staging/archive/reemplazo; la escritura sigue usando esos buffers capturados.
- No se probó Linux/contenedor (engine ausente) ni symlinks Windows. Sí se probaron archivos regulares frente a directorio/runtime ausente. Node20 Windows staging no acredita Docker/Linux ni runtime de navegador real.
- Runtime/UI finales y hashes aprobados pertenecen a AGR-004/005 + CDX-006. No se copiaron assets de sus ramas. La generación productiva sigue fail-closed con registry vacío.
- El refresh mantiene exclusivamente el paquete histórico allowlisted y request IDs existentes. No se autorizó migrar el master persistente V2 ni reutilizar su journal/preview: requiere gate independiente y hashes frescos en integración.
- Pendientes: revisión independiente Task 2 y resolución de hallazgos, revisión final de seguridad, integración compatible, navegador offline y autorización separada para cualquier cutover/publicación. No hay certificación legal ni recepción externa de eventos.

## Fix round 1 — evidencia posterior a revisión FAILED

- Scope: solo los dos CLIs owned y `scripts/business-measurement-packaging.test.mjs`, más estos reportes/request. Sin seam, ENV ni hook nuevo en producción.
- Tests `create_rejects_final_capture_mutate_read_revert_before_staging` y `refresh_rejects_final_capture_mutate_read_revert_before_staging`: subprocess aislado Node20 intercepta la tercera lectura real del runtime, cambia bytes en el fixture, captura y restaura antes de devolver. Comprueban rechazo con tres lecturas, cero staging y árbol completo de paquetes/journals originales sin cambios.
- RED Node20: comando `--test --test-name-pattern='final_capture_mutate_read_revert' scripts/business-measurement-packaging.test.mjs`; ambos tests fallaron con APPLIED en vez de REJECTED (2 fail; 7 casos no seleccionados, no éxito de suite).
- GREEN Node20: mismo comando completo de cuatro archivos de packaging indicado arriba, 71/71 pass, cero skip, exit 0. Incluye runtime staging y compatibilidad histórica.
- Integración relevante Node24: `node --conditions=react-server --experimental-strip-types --experimental-loader ./scripts/node-test-alias-loader.mjs --test scripts/business-master-package-drift-recovery.integration.test.mjs`: 1/1 pass.
- `npm run lint` y `git diff --check`: exit 0. Build no repetido en este round exclusivamente `.mjs`; build y 155 regresiones anteriores son evidencia histórica, no una nueva ejecución después del fix.
- Logs: `generator-task-2-fix1-{red,green,integration,lint}.log` en el scratch del coordinador. Self-review confirmó ambos pins antes de staging y conservación de buffers; re-review independiente pendiente, sin aprobación de release.
