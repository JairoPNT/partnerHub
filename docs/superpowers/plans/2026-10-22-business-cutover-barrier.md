# Business Cutover Barrier Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar y revisar el cierre durable de escritores Business que permita después integrar la migración y publicar los ajustes aprobados de Claudia sin una ventana master/código incompatible.

**Architecture:** Extender el coordinador existente con comprobación global antes/después de adquirir el claim de sitio. Un controlador privado conserva el cierre entre procesos y despliegues, serializa su administración y drena claims reales. La integración con CDX009 y el corte productivo son entregas dependientes, no permisos implícitos de este plan.

**Tech Stack:** TypeScript, Node20 de producción, node:fs/promises, AsyncLocalStorage, node:test, esbuild, Docker/Linux; PowerShell local y sh en EasyPanel. Sin dependencias nuevas.

**Spec:** `docs/superpowers/specs/2026-10-21-business-cutover-barrier-design.md`, aprobada por Jairo el 2026-10-22.

## Global Constraints

- Ticket CDX-20261021-010; Owner Codex; rama `codex/CDX-20261021-010-business-cutover-barrier`. No editar el checkout raíz sucio ni trabajo de otros agentes.
- Claims global y por sitio: `.master-package-claims/ganomaster-business` y `.business-publication-site-claims/<sha256(siteId)>` bajo el mismo output canónico. No una segunda barrera alternativa.
- Presencia/corrupción/symlink/propiedad incierta bloquean; nunca robo por TTL, edad, PID o jobs vacíos.
- El cierre sobrevive procesos/despliegues. No liberar en `finally`; sí liberar la exclusión administrativa propia al terminar normalmente un comando, sin retirar el cierre global.
- Credencial privada, nunca stdout/HTTP/env/JSON aprobatorio; no autoriza generación/publicación ni acredita compatibilidad.
- No UI, plantillas, auth, Prisma, pagos, DNS, Ads, SFTP ni mutaciones de datos reales en esta implementación. Product/Brand sin cambio funcional.
- CDX009 público mantiene `WRITER_EXCLUSION_UNPROVEN` durante CDX010. No modificar su lifecycle ni su reader para aceptar el claim propio en este ticket.
- No activar BEGIN/CANCEL/RELEASE productivos hasta integrar y revisar el verificador fijo de reapertura. STATUS es la única operación CLI productiva inicial.
- La ventana de mantenimiento ya está autorizada; la aprobación de este plan autoriza implementación/pruebas, no reemplaza evidencia de despliegue, Linux, lineage o planes frescos.

## Review Focus

1. Escritor que pasó el precheck justo antes de crearse el cierre: no ejecuta acción después del segundo check (Task2).
2. Dos administradores con la misma credencial: cancelación y migración no se intercalan; caída conserva exclusión (Task3).
3. Sustitución por mismos bytes con inode distinto o ancestro symlink: no limpiar objetos reemplazados (Task1).
4. Imagen sucesora que omite la barrera en un bundle: arranque bajo cierre falla la prueba de compatibilidad (Task4 y gate de integración).
5. Lectura de estado o entrada de CLI malformada: no crea directorios, revela credenciales ni abre la barrera (Tasks3/4).

## División y orden

Tasks1→2→3→4 comparten contrato y se implementan secuencialmente, con subagente implementador y revisión fresca por tarea, según método ya solicitado por Jairo. No lanzar escritores paralelos de estos archivos. Puede prepararse el fixture de verificación de Task2 en paralelo solo después de fijar la interfaz1 y declarando archivos de test exclusivos; integración siempre por un owner.

Revisión de conformidad y revisión de seguridad/calidad antes de avanzar; corregir hallazgos en el implementador original. Revisión premium para propiedad/concurrencia, por riesgo de integridad productiva; no repetir auditorías ajenas de plantilla/BFCache ya cerradas.

## Mapa de archivos e interfaces comunes

- Crear `app/web/server/services/businessCutoverClaimStore.ts`: inspección segura y capacidades privadas de claims, sin semántica de publicación.
- Crear `app/web/server/services/businessCutoverMaintenanceService.ts`: estado durable y exclusión administrativa; ningún adaptador de migración.
- Modificar `app/web/server/services/businessPublicationSiteCoordinator.ts`: handshake global y propiedad de sitio reforzada, preservando exports actuales y reentrancia.
- Modificar `app/web/server/services/productPageVerificationService.ts`: envolver Business en el coordinador antes de leer/escribir/verificar, sin cambios al resultado público.
- Crear tests homónimos de store/maintenance/verificación; extender `businessPublicationSiteCoordinator.test.ts` y child existente para escenarios entre procesos.
- Crear `app/web/scripts/business-cutover-maintenance.ts`: CLI de STATUS; empaquetar a `/app/scripts/business-cutover-maintenance.mjs`.
- Crear `app/web/scripts/business-cutover-runtime-packaging.test.mjs`; modificar Dockerfile y package.json solo para esos scripts/bundles. Tipos TypeScript nativos, no declaraciones any.
- Evidencia/reportes propios en `brain/agent-requests/codex/`; actualizar estado al completar, no declarar publicación por completar código.

### Task1: Store de claims y propiedad física

**Files:** crear store y `businessCutoverClaimStore.test.ts`; no tocar todavía coordenador ni CDX009.

**Interfaces producidas:** `inspectBusinessGlobalClosure(outputDirectory: string): Promise<"OPEN" | "CLOSED">` (solo lectura, inseguro→error de cierre); `acquireBusinessCutoverClosure(outputDirectory: string, operationId: string): Promise<BusinessCutoverHandle>`; `resumeBusinessCutoverClosure(outputDirectory: string, operationId: string): Promise<BusinessCutoverHandle>`; `assertBusinessCutoverOwnership(handle: BusinessCutoverHandle): Promise<void>`. Handle nominal opaco, registrado en WeakMap privado; no constructor/export de prueba ni serialización restaurable.

`operationId` UUID canónico; directorio administrativo privado `.business-cutover-operations/<operationId>` modo0700, credencial32bytes aleatorios modo0600/creación exclusiva. Resume lee esa credencial por ruta fija y comprueba registro/claim físico del volumen; usuario con escritura del mismo UID es frontera confiable, no protección contra root. El handle da autoridad solo al controlador, jamás a writers normales. `OPEN` exige ancestros seguros y ausencia real; ENOENT intermedio no debe seguir symlink ni hacer mkdir.

- [ ] Escribir tests rojos: `status_is_read_only`, `existing_global_claim_is_never_replaced`, `same_bytes_replaced_inode_is_not_owned`, `symlink_hardlink_or_corrupt_marker_fails_closed`, `serialized_handle_cannot_restore_authority`. Aserciones: bytes/inodes ajenos intactos; status no crea paths; `JSON.parse(JSON.stringify(handle))` rechazado.
- [ ] Ejecutar tests y guardar FAIL por exports ausentes, no por problemas de entorno.
- [ ] Implementar las firmas y límites anteriores usando lstat/open O_NOFOLLOW cuando disponible, comparación de identidad de descriptor/directorio/ancestros y archivos con nlink1. No copiar el lifecycle de migración ni refactorizar Product. Documentar límites de pathname-races contra procesos privilegiados/mismo UID hostil.
- [ ] Reejecutar suite: PASS cero skips; registrar comandos y Node. Revisión independiente de propiedad/secretos.
- [ ] Commit `feat: add private Business cutover claim store` tras diff-check limpio.

### Task2: Handshake de writers y bypass de verificación

**Files:** coordinador/test/child existentes; servicio de verificación y nuevo `productPageVerificationBusinessCutover.test.ts`. Consume Task1 `inspectBusinessGlobalClosure`; conserva `createBusinessPublicationSiteCoordinator`, `withBusinessPublicationSite`, `BusinessSiteBusyError`, `withoutBusinessPublicationSiteOwnership`.

**Interfaces:** no nuevo parámetro HTTP ni bypass booleano. `BusinessSiteBusyError` sigue siendo la clase reconocida por el worker; un cierre global se traduce a esa clase. Reforzar identidad de owner de sitio siguiendo los precedentes de Product, sin alterar su módulo. `verify(input)` conserva `Promise<ProductPageVerificationResult>` y su validación de entrada; separar cuerpo privado para envolver Business por siteId antes del primer source read/fetch/write. La clasificación Business incluye ganomaster-business y el contrato de sufijo existente; comprobar identidad del source como ya corresponda, no inferir Product desde una lectura mutable sin guard.

- [ ] Añadir tests rojos deterministas con mensajes IPC/eventos (no sleeps probabilísticos): `global_before_site_acquire_blocks_action`, `global_between_precheck_and_site_claim_blocks_action`, `existing_reentrant_action_drains`, `expired_async_context_cannot_reenter`, `site_replacement_not_removed`. En la carrera, contador de acción===0 y claim ajeno/global intacto.
- [ ] Añadir fixture aislado del servicio: `direct_business_verify_under_closure_has_zero_fetch_or_write`, `publish_nested_verify_can_drain`, `product_and_brand_unchanged`. Dobles para fetch/repositorios; ninguna red real. Si el aislamiento exige factoría, añadirla solo con dependencias tipadas y conservar el singleton público.
- [ ] Verificar FAIL por comportamiento actual; implementar doble check en adquisiciones frescas, no bloquear reentrancia válida ya activa. Liberar solo el claim de sitio efectivamente propio si falla el segundo check. Integrar verify sin crear otro publicador ni alterar reintentos del worker.
- [ ] PASS de tests nuevos y regresiones de coordinador, fuente, contenido, comandos, worker y generación Business; revisar especialmente detached/references. No borrar claims huérfanos ni marcar jobs SUCCEEDED por mantenimiento.
- [ ] Commit `fix: gate cooperating Business writers during master cutover`; revisión por tarea antes de3.

### Task3: Controlador durable, drenado y serialización administrativa

**Files:** maintenance service/test; store solo si un cambio de interfaz se revisa antes. Consume handle Task1 y namespace de sitios Task2.

**Interfaces producidas:**

```typescript
type BusinessCutoverStatus = {
  status: "OPEN" | "CLOSING" | "DRAINED" | "VERIFIED" | "BLOCKED";
  operationId: string | null;
  migrationStarted: boolean;
  blockedReasons: string[];
};
readBusinessCutoverStatus(outputDirectory: string): Promise<BusinessCutoverStatus>;
beginBusinessCutover(outputDirectory: string, operationId: string): Promise<BusinessCutoverStatus>;
drainBusinessCutover(control: BusinessCutoverControl, timeoutMs: number): Promise<BusinessCutoverStatus>;
withBusinessCutoverController<T>(handle: BusinessCutoverHandle,
  action: (control: BusinessCutoverControl) => Promise<T>): Promise<T>;
markBusinessCutoverMigrationStarted(control: BusinessCutoverControl): Promise<void>;
```

`BusinessCutoverControl` es otra capacidad opaca de ámbito activo; no se puede reusar tras retornar su callback ni convertir el handle en control. Lock administrativo exclusivo `.controller` dentro del directorio de operación. BEGIN adquiere esa exclusión al inicializar, y drain/mark solo mutan con control activo. Eventos numerados inmutables, encadenados por hash, bajo `events/` fijan transiciones; no confiar en `state.json` sobrescribible. Una secuencia parcial/inconsistente bloquea. Marcar migración iniciada durablemente antes de cualquier futura mutación de paquete; no expira y descarta cancelación al perfil antiguo.

Timeout entero0..30000ms, polling acotado50ms solo en implementación de espera; tests usan sincronización/dobles de reloj locales. Drenado escanea claims reales sin ignorar entradas corruptas/desconocidas; no elimina ninguna. El lock administrativo se libera solo con ownership válido tras un retorno normal/error controlado; caída dura deja lock huérfano y STATUS lo informa, sin recuperación automática. Global closure nunca se libera por terminar comando/proceso.

- [ ] Tests rojos: `drain_sees_live_claim_even_with_empty_job_queue`, `drain_timeout_keeps_closed`, `two_controllers_with_same_operation_are_exclusive`, `migration_started_marker_is_irreversible_and_serialized`, `crash_and_restart_keep_global_and_controller_closed`, `torn_event_or_changed_parent_blocks_status`, `expired_control_cannot_mark_started`.
- [ ] Ejecutar FAIL; implementar interfaces y protocolo. Resume sin lock huérfano puede continuar operación válida; con lock huérfano exige recuperación independiente que pruebe cese del owner, no `--force`.
- [ ] No implementar ni exportar RELEASE/CANCEL en CDX010, ni callback de aprobación o test hook que libere el cierre. La integración dependiente aportará lector de perfil fijo bajo la misma exclusión; hasta entonces BEGIN queda fuera del CLI productivo. Probar que ni un control válido tiene método de liberación ni los argumentos CLI permiten iniciar/cancelar/liberar.
- [ ] Suite PASS y pruebas child-process con volumen temporal, secretos ausentes de salida/errores. Revisión independiente premium de administración concurrente y reinicios.
- [ ] Commit `feat: add durable Business cutover controller and drain`.

### Task4: Empaquetado, CLI read-only y ensayo Linux

**Files:** CLI TypeScript y packaging test nuevos; Dockerfile y app/web/package.json. No cambios en assets ni rutas públicas.

**Interfaces:** `maintenance:business-cutover-status` → `node scripts/business-cutover-maintenance.mjs --mode=STATUS`. Parser acepta solo STATUS y ningún root/token/hash/force desde CLI. Root se resuelve del PRODUCT_PAGE_OUTPUT_DIR existente, default `/data/generated-sites`; las factorías de tests usan temp roots. JSON redactado incluye requestId CDX-20261021-010, status/reasons, changed:false, localWritesMade:false, providerCallsMade:false. Código0 para lectura OPEN/closed coherente,2 para BLOCKED,1 para argumentos/error seguro; nunca imprime credencial o paths privados.

Docker construye CLI con esbuild targetnode20 y copia bundle al runner. Añadir constante `BUSINESS_CUTOVER_PROTOCOL_VERSION = "business-cutover-v1"` en módulo compartido y smoke de bundle que importa funciones reales. La constante sola no demuestra que todas las tareas cooperan.

- [ ] Test rojo empaqueta bundle real, ejecuta Node20 contra fixture sin claims, cerrado y corrupto; STATUS no crea ningún archivo. Args BEGIN/RELEASE/force/duplicados rechazados. Copiar bundle fuera del source tree para descubrir imports faltantes.
- [ ] Implementar scripts/packaging mínimo. Reconstruir Jairo generator bundle existente; test child lo arranca bajo cierre y prueba cero acción. No alegar compatibilidad desde grep de la constante.
- [ ] Ejecutar Node20 sobre bundles, TS suites con Node24 strip-types y loader react-server existente, global lint, build y diff-check. No llamar a esto lint de scripts excluidos. Linux real: build imagen y ejecutar fixture temporal sin montar /data real, sin credenciales ni red de proveedor. Si Docker/Linux no está disponible, registrar gate pendiente y no usar el controlador productivo.
- [ ] Commit `build: package Business cutover status and runtime guards`; revisión de rama completa. Reporte propio con comandos/exits/skips/versiones, restricciones y dependencia pendiente; actualizar brain sin decir que Claudia fue publicada.

## Comandos de verificación (desde app/web; no Bash)

```sh
node --conditions=react-server --experimental-strip-types --experimental-loader ./scripts/node-test-alias-loader.mjs --test server/services/businessCutoverClaimStore.test.ts server/services/businessPublicationSiteCoordinator.test.ts server/services/productPageVerificationBusinessCutover.test.ts server/services/businessCutoverMaintenanceService.test.ts
node --test scripts/business-cutover-runtime-packaging.test.mjs scripts/business-master-runtime-packaging.test.mjs scripts/business-consent-master-package-migration.test.mjs
npm run lint
npm run build
git diff --check
```

Primer comando requiere Node con strip-types soportado (Node24 de pruebas), NO producción20. Empaquetado compila TS a Node20 y lo ejecuta realmente con el binario20, no simula compatibilidad cambiando target. El runbook Linux usa `sh`; no trasladar `--experimental-strip-types` a Node20. Antes de cada tarea ejecutar su suite focalizada como baseline; si falla previamente, reportarlo sin adjudicarlo al cambio.

## Dependencias para terminar la publicación (no ejecutadas por aprobar solo el plan010)

1. **CDX010 listo y revisado:** desplegar protocolo retrocompatible, verificar resultado237 previamente y luego nuevo deploy/tareas/volumen; no iniciar cierre aún sin integración completa. Mantener235 draft hasta composición segura.
2. **Integración dependiente con CDX009 (ticket/branch/owner separado):** compartir propiedad real del mismo claim, lector de lineage con capacidad interna (el reader009 actual rechaza cualquier claim global), adaptador current-profile y verificador fijo de reapertura/cancelación. Reutilizar lifecycle; no forzar el APPLY009 ni inventar wrapper de permiso. Añadir pruebas de fin a fin que migren un fixture histórico9760 y reabran solo con master/código/auditoría exactos, con control administrativo retenido. Los cambios de estas interfaces deben aprobarse/revisarse como integración, no expandir010 silenciosamente.
3. **Release compuesto:** incorporar235 + protocolo + integración, preservar los seis hashes revisados de template y todos los bundles cooperantes. Demostrar arranque del sucesor bajo cierre previo, viejo y nuevo código no generan durante el rolling deploy. No construir el sucesor desde la rama histórica235 sin CDX010.
4. **Corte autorizado, plan fresco:** confirmar todas las tareas viejas retiradas/root compartido, excluir scripts/operator ajenos, validar backup/lineage real y preview exacto; cerrar/drenar, migrar con capacidad real, mantener cierre a través del deploy compuesto, releer y reabrir bajo exclusión administrativa. Error conserva cierre/evidencia; nunca borrado manual de claims/auditorías. No cerrar si falta acceso/runner para reanudar.
5. **Claudia por publicador existente:** revalidar entitlement/fuente/target reales y la FAQ aprobada; generar preview fresco, publicar con job existente y verificar SUCCEEDED + página pública móvil/escritorio, CTA WhatsApp de Claudia, VSL, FAQ, navegación y consentimiento por carga. Clic no equivale a conversación/venta. No activar tags/integraciones no aprobados ni crear campañas; recepción real de eventos se acredita aparte de la mera presencia de código. Comprobar límites entre Business/Product/Brand.
6. **Entrega:** enlazar evidencia pública y estados reales en brain/reportes. Publicación del master en negocio.ganomaster.pro sigue independiente si necesita hosting/SFTP; su manifest canónico no demuestra entrega pública.

## Revisión propia y handoff

- [x] Cobertura de la especificación: handshake2, ownership1, administración/drenado3, bundles/Linux4, reapertura fija e integración explícitamente bloqueadas hasta fase dependiente. No se oculta un APPLY funcional dentro de STATUS.
- [x] Interfaces y nombres consistentes; capacidades no JSON, operaciones Product/Brand excluidas, mismo namespace global que009.
- [x] Cinco condiciones Review Focus asignadas a tests concretos; fallos conservan evidencia.
- [x] Sin código de producto, instalación de dependencias, comandos de mantenimiento ni publicación durante la elaboración del plan.
- [ ] Jairo revisa/aprueba este plan. Método preservado: subagentes por tarea con revisión entre cada una. Implementación todavía no iniciada.
