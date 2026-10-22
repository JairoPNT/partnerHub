# Business Cutover Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Conectar la migración009 al cierre010 con autoridad real y fin verificado, preparando el camino existente para publicar los ajustes de Claudia.

**Architecture:** Un conector administrativo comparte capacidades en un único grafo con el controlador y lifecycle existentes. Captura estricta durante migración, verificación fija de compatibilidad después del despliegue y commit terminal por rename conservan evidencia y distinguen resultados inciertos. La composición del release235 y el corte/publicación reales son entregas posteriores explícitas.

**Tech Stack:** TypeScript/MJS, Node20 runtime, Node24 para tests TS, esbuild, Next.js, filesystem POSIX y Docker Linux; PowerShell local y **sh**, nunca Bash, en contenedores/EasyPanel.

**Spec:** `docs/superpowers/specs/2026-10-22-business-cutover-integration-design.md`, aprobada por Jairo el2026-10-22 en PR239/head7c247f59d59fa96dcc9fa2e7f65e4c3110a4d0c7. **Este plan aún requiere su revisión antes de implementar.**

## Global Constraints

- Reutilizar lifecycle/coordinador/publicador; no nuevo publicador, SFTP manual ni cambios de DNS/campañas, UI/assets/copy revisados235, Product/Brand, auth/Prisma/pagos/credenciales.
- PREDECESSOR conserva master9760 y lineage e9a2; SUCCESSOR conserva seis pins009, manifest negocio.ganomaster.pro, consentimiento por carga y GA4/Meta false. No hashes provisionales o perfiles suministrados por caller.
- Operación/volumen físicos, registro2, directorios0700/archivos0600 y UID esperado; sin JSON/booleans/callbacks aprobatorios, TTL/PID/force/takeover ni limpieza ajena.
- Mismo grafo de capacidades WeakMap; control serial durante toda captura/mutación/verificación/fin. No control expirado ni doble controlador. Drenar claims reales, no inferir desde cola vacía.
- Antes de staging/reserva/primer write de paquete, marcador MIGRATION_STARTED durable ligado al plan. Nunca CANCEL después. No replay automático de APPLY tras caída.
- Antes del rename terminal, error conserva cierre. Después, error fsync/recibo produce RELEASE_COMMIT_UNCONFIRMED; no afirmar cierre ni reinsertar claim. No garantía de power-loss/rollback de storage.
- APIs públicas009 siguen WRITER_EXCLUSION_UNPROVEN; STATUS010 read-only se conserva. Writers mantienen BUSY409 y semántica worker existente.
- BEGIN productivo exige ambos artefactos revisados, canal probado de resume/reopen, procedencia/tareas/volumen/exclusión externa comprobados. Una consola dentro de una tarea no prueba todo el host.
- No repetir implementación/revisiones010 ni atribuir sus conteos a011.22 advisories npm siguen sin triage/waiver; no upgrades fuera de alcance ni certificación de seguridad por pasar tests.

## Review Focus

1. PREVIEW y APPLY adquieren locks distintos: el plan debe permanecer estable sin excluir cambios reales del master/lineage (Task2).
2. MJS legacy corre directamente en Node20: el puente TypeScript no debe cargarse en la ruta legacy ni duplicar WeakMaps en el runner (Tasks2/5).
3. Perfil recién inventariado no acredita por sí solo un build revisado: separar checksum propio, semántica fija y procedencia externa; sin ciclo de autohash (Tasks3/5).
4. BEGIN nuevo tras rename viejo y antes del fsync/recibo/cleanup anterior: el owner anterior no toca el claim nuevo (Task4).
5. Caída o fallo de fsync tras commit: diagnóstico honesto, no falso CLOSED/OPEN confirmado ni intento automático de reparar (Tasks4/6).

## Ejecución y mapa de archivos

Método ya elegido por Jairo: **subagente implementador por tarea y reviewer independiente antes de la siguiente**, más revisión final de rama. Owner de integración Codex; nivel de revisión fuerte por integridad/concurrencia. Una rama/worktree de ejecución desde main vigente, con este spec/plan aprobado; conservar scratch010/011 y checkout raíz ajeno. La rama documental actual no autoriza código todavía.

T1–T5 comparten autoridad y son secuenciales, sin dos writers sobre store/controller/lifecycle/packaging. T6 consume el runner completo y solo crea fixtures locales aislados. Revisiones read-only y frontend realmente independiente pueden correr en paralelo, no una composición235 que modifique estos módulos mientras estén asignados. El controller mantiene brain/reportes; los agentes no editan ese estado compartido.

| Tarea | Owner / archivos permitidos | Resultado consumido después |
|---|---|---|
|1|Codex: store/controller existentes y tests; nuevo `businessCutoverExclusiveScope.test.ts`|Scope serial y binding durable de plan|
|2|Codex: nuevo `businessConsentCutoverMigration.ts` y `businessCutoverMigrationAuthority.ts` con tests; release/lifecycle MJS y declaraciones `.d.mts` pareadas|Captura/aplicación interna real, sin liberar cierre|
|3|Codex: nuevos `businessCutoverReleaseProfile.ts`, `businessCutoverReleaseVerification.ts`, tests; `scripts/build-business-cutover-writer-inventory.mjs` y test|Perfil fijo e identidad efímera de verificación|
|4|Codex: nuevo `businessCutoverReleaseService.ts` y test; cambios estrechos en store/controller y sus tests|Commit terminal/diagnóstico/cancelación segura|
|5|Codex: nuevo `scripts/business-consent-cutover.ts`, parser/test, packaging test; Dockerfile/package.json y smokes existentes afectados|CLI única Node20 e inventario compilado real|
|6|Codex: test integración TS y fixtures/harness/scripts de ensayo propios en scratch; reporte del controller|Evidencia funcional/Linux011, límites de release explícitos|

No tocar `publication-runtime-modules.d.ts` global para esconder tipos; `.d.mts` nuevas describen solo los exports MJS consumidos. No refactor masivo de archivos grandes. Setup/fixtures pertenecen a la tarea que los usa. Tareas de implementación1–5 comienzan con baseline focalizada, RED/GREEN y commit propio;6 verifica la integración y no inventa RED si la cobertura nueva pasa de entrada. Si baseline falla previamente, documentar antes de atribuirlo al cambio.

## Interfaces comunes que fijan las tareas

Los scopes, captures, permits y proofs marcados opacos son identidades privadas, no objetos estructurales del caller. Datos públicos nunca equivalen a capacidad. Tipos de datos compartidos viven con su productor; imports de tipos no crean dependencias runtime hacia perfiles desde el store.

```ts
// T1 — businessCutoverMaintenanceService.ts, mantiene exports010.
type BusinessCutoverExclusiveScope = opaque;
withBusinessCutoverExclusive<T>(control: BusinessCutoverControl,
  action: (scope: BusinessCutoverExclusiveScope) => Promise<T>): Promise<T>;
assertBusinessCutoverExclusive(scope: BusinessCutoverExclusiveScope): Promise<BusinessCutoverOperation>;
type MigrationBinding = Readonly<{ planHash: string; releaseId: string; material: Uint8Array }>;
bindBusinessCutoverMigration(scope: BusinessCutoverExclusiveScope, binding: MigrationBinding): Promise<void>;
readBusinessCutoverMigrationBinding(scope: BusinessCutoverExclusiveScope): Promise<MigrationBinding | null>;
startBusinessCutoverMigration(scope: BusinessCutoverExclusiveScope, planHash: string): Promise<void>;

// T2 — businessConsentCutoverMigration.ts / authority.ts.
type BusinessConsentCutoverCapture = opaque;
type BusinessCutoverMigrationPermit = opaque;
type CutoverPreview = Readonly<{ planHash: string; blockedReasons: readonly string[] }>;
captureBusinessConsentCutover(scope: BusinessCutoverExclusiveScope): Promise<BusinessConsentCutoverCapture>;
describeBusinessConsentCutover(capture: BusinessConsentCutoverCapture): CutoverPreview;
applyBusinessConsentCutover(scope: BusinessCutoverExclusiveScope,
  expectedPlanHash: string): Promise<Readonly<{ outcome: 'APPLIED'; planHash: string; journalHash: string }>>;
readBusinessConsentCutover(scope: BusinessCutoverExclusiveScope): Promise<Readonly<{
  planHash: string; journalHash: string; packageHash: string; releaseId: string }>>;
assertBusinessCutoverMigrationPermit(permit: BusinessCutoverMigrationPermit): Promise<void>;

// T3 — profile.ts / verification.ts; getters solo metadata, nunca autoridad serializada.
type CutoverReleaseId = 'business-consent-predecessor-v1' | 'business-consent-successor-v1';
type BusinessCutoverVerifiedRelease = opaque;
verifyBusinessConsentRelease(scope: BusinessCutoverExclusiveScope,
  kind: 'CANCEL' | 'REOPEN'): Promise<BusinessCutoverVerifiedRelease>;
assertBusinessCutoverVerifiedRelease(proof: BusinessCutoverVerifiedRelease,
  scope: BusinessCutoverExclusiveScope): Promise<Readonly<{
    kind: 'CANCEL' | 'REOPEN'; releaseId: CutoverReleaseId; planHash: string | null; factsHash: string }>>;

// T4 — releaseService.ts. No raw RELEASE desde store/controller o CLI.
// Validadores de rebind: no ejecutan rename ni abren el cierre.
assertBusinessCutoverRelocatedOwnership(handle: BusinessCutoverHandle): Promise<void>; // store
markBusinessCutoverClaimRelocated(scope: BusinessCutoverExclusiveScope): Promise<void>; // controller
type CutoverReleaseResult = Readonly<{ outcome: 'CANCELLED' | 'REOPENED' |
  'RELEASE_COMMIT_UNCONFIRMED'; commitObserved: boolean; persistenceConfirmed: boolean }>;
finishBusinessConsentCutover(scope: BusinessCutoverExclusiveScope,
  kind: 'CANCEL' | 'REOPEN'): Promise<CutoverReleaseResult>;
readBusinessConsentCutoverOutcome(outputDirectory: string,
  operationId: string): Promise<Readonly<{ outcome: 'CLOSED' | 'RELEASED' | 'UNKNOWN';
    persistenceConfirmed: boolean }>>;
```

`opaque` en este bloque es notación del plan: implementar brand unique symbol y WeakMap privado, no un tipo exportado llamado opaque. Binding máximo1MiB, hash SHA25664hex de material canónico, releaseId ASCII96máximo validado contra el perfil fijo en T2; sin secretos. Errores de autoridad siguen BUSINESS_CUTOVER_CLOSED. Errores de dominio controlados usan códigos fijos BUSINESS_CUTOVER_PLAN_MISMATCH/PROFILE_INVALID/ARTIFACTS_UNAVAILABLE; no interpolar args/paths. El conector captura los errores de dominio dentro del scope y los devuelve al dispatcher sin romper el cleanup ni normalizar un resultado poscommit a falso CLOSED.

### Task1: Scope exclusivo y binding de migración

**Interfaces:** produce T1 del bloque común; consume handle/control010 genuinos. Modificar solo store/controller y tests asignados. Sin release ni perfiles aquí.

- [ ] Escribir tests `scope_cannot_be_forged_or_reused`, `exclusive_callback_serializes_entire_action`, `binding_is_private_immutable_and_same_operation`, `started_requires_drained_matching_binding`, `queued_scope_is_revoked_before_lock_cleanup`. Assertions: JSON/control expirado/otra copia rechazan; dos callbacks no se solapan; marcador sigue al fsync del binding, antes de cualquier permiso de paquete; no archivo/claim ajeno eliminado.
- [ ] Ejecutar suite T1 con el comando TS de la sección Verificación: RED por exports ausentes/assertions nuevas, no por setup. Guardar salida.
- [ ] Implementar cola/scope en el controlador existente: no encolar `drain`/`mark` dentro de su propia cola y producir deadlock. Helpers de scope operan directamente bajo exclusión activa. Binding fijo `operation/migration-plan.json` con metadata version1/operationId/recordDigest/planHash/releaseId/material canónico; O_EXCL/no-follow, modos privados, límites y hash exactos, sin sobrescritura.
- [ ] Extender whitelist del store y parser de eventos estrictamente: evento version1 `MIGRATION_PLAN_BOUND` con reason=planHash, ligado al archivo validado, seguido del MIGRATION_STARTED existente. Mantener registros2/eventos010 válidos; formatos1 de store/unknown entries rechazan. Binding es metadata de control, no staging/auditoría de paquete; CANCEL antes de started aún exige hechos intactos. APIs010 previas mantienen contrato.
- [ ] GREEN T1+store/controller/coordinator010; tests de ownership/substitución/fsync y reentrancia sin skips evitables. Revisión independiente de alcance/seguridad; commit `feat: bind Business migration to exclusive cutover scope`.

### Task2: Captura fija y lifecycle con propiedad prestada

**Interfaces:** consume T1; produce T2. Nueva autoridad se guarda en WeakMap del módulo authority y solo se minta desde el conector tras captura actual y scope validado; no exportar factory de permiso para caller. Declaraciones `.d.mts` pareadas de release/lifecycle fijan exports consumidos sin any.

- [ ] RED tests `preview_hash_survives_controller_reacquisition`, `protected_mutate_revert_invalidates_apply`, `fake_or_expired_permit_never_writes`, `migration_retains_closure_on_success_and_each_error`, `public009_apply_still_rejects`, `legacy_node20_path_does_not_import_ts`. Verificar también archive/journals e9a2/históricos byte-identical y API/CLI009 sin nuevo export mutante.
- [ ] Factorizar captura/readback internos en release MJS sin relajar reader público: mismo predecessor/lineage/pins009, staging fijo de la especificación y jobs reales. Omitir del plan solo lock/eventos/opmetadata volátiles; conservar recordDigest/owned claim y pruebas de artefactos. Capture opaco liga scope y datos físicos; describe entrega solo hash/reasons. APPLY vuelve a capturar/comparar antes de bind/start y cada write.
- [ ] Añadir `cutoverPermit` opcional al adapter del lifecycle; rama legacy intacta. **No import estático TS desde scripts legacy Node20.** El modo opt-in resuelve en import dinámico literal `.ts` el validador authority, que esbuild incorpora al único grafo administrativo; sin permit no se carga. Cualquier valor forjado falla antes de mkdir/write. La rama interna reemplaza todas las comprobaciones/releases globales por assert genuino/retención, incluidos rollback/catch/cleanup; stage/reserva siguen con su owner mecánico propio.
- [ ] Antes de llamar al lifecycle: bind exacto/start durable, mint privado de permit y aserciones activas. Crear009 audit con `planMaterial.schemaVersion=2`, operación/recordDigest/perfil/plan y evidencia fija. `readBusinessConsentCutover` reconoce esa versión, no convierte schema1 ni usa igualdad del overlay anterior tras deploy. Un APPLY parcial no se reejecuta automáticamente; diagnóstico conserva evidencia.
- [ ] GREEN tests T2 y suites MJS de migración/master previas; ejecutar un script legacy copiado fuera del repo con Node20 real y ausencia de rama TS. Revisión de todos los caminos que antes removían el claim; commit `feat: connect guarded Business migration to retained closure`.

### Task3: Perfil fijo e identidad efímera de verificación

**Interfaces:** consume T1/T2 y produce T3. Profile no se importa desde store ni writers. El generator de inventario es MJS puro y se ejecuta contra el layout que realmente enviará Docker, no contra source arbitrario aceptado por CLI.

- [ ] RED `wrong_runtime_with_correct_master_rejects`, `correct_runtime_with_wrong_master_rejects`, `provider_flags_or_missing_bundle_reject`, `reopen_checks_current_ancestors_not_old_overlay`, `cancel_rejects_after_started`, `proof_expires_and_is_not_json`. Assertions exactas de IDs del bloque común; un descriptor de imagen no basta sin bytes/guard y procedencia externa del release.
- [ ] Implementar profile cerrado: PREDECESSOR→master9760/canonical antiguo; SUCCESSOR→pins exactos009/manifest negocio.ganomaster.pro/providersfalse. Material del inventario: version1/releaseId, filas ordenadas `{path,sha256,size}`, solo paths relativos fijos dentro de `/app`, sin traversal/links inesperados/duplicados. Cobertura de todos los archivos enviados que afectan writers/dependencias, Next/standalone/runtime-assets/scripts incluidos; exclusiones exactas: propio inventario y CLI administrativa autocontenida. No exclusión por glob de directorios enteros ejecutables.
- [ ] Inventario propio se compila por digest en CLI después de construir writers; no checksum editable ni constante de versión sola. `UNAVAILABLE` sin hashes ficticios si el layout aún no contiene los artefactos fijos de corte: no se puede verificar ni BEGIN. La composición dependiente debe aportar los seis archivos aprobados al staging fijo sin autoría/edición de assets en011. Un input presente pero distinto a pins falla build, no se clasifica como aprobado.
- [ ] Verificador relee master/journals/archivo/operación/binding, runtime y jobs/claims bajo scope. CANCEL exige intacto/no started/no mutación de paquete; REOPEN exige started+009schema2+SUCCESSOR exactos. Proof WeakMap ligado a scope/kind/facts, assert lo revalida fresco; nunca aprobar desde un JSON guardado. Añadir tests de inventario propio válido con imagen no revisada: solo prueba integridad, **no** certifica procedencia externa ni habilita uso sin gate operacional.
- [ ] GREEN T3 con fixtures privados y bytes revisados, sin proveedores; revisión independiente de perfil/TCB/no ciclo; commit `feat: verify fixed Business cutover release profiles`.

### Task4: Commit terminal y diagnóstico idempotente

**Interfaces:** consume proof T3, scope T1; produce T4. ReleaseService es el único orquestador de fin y llama al verificador fijo; no exportar un comando raw-release desde el store. Cambios de ownership en store son validadores/rebind físico, no un permiso declarativo.

- [ ] RED `failure_before_commit_keeps_global`, `postrename_fsync_failure_is_unconfirmed`, `new_begin_during_old_finish_is_untouched`, `replay_cannot_release_new_operation`, `controller_cleanup_uses_relocated_owner`, `cancel_vs_start_and_verify_vs_release_are_serial`. Inyectar fallos solo en fixtures privados, no flags productivos.
- [ ] Implementar intención `operation/release-intent.json` version1, operationId/recordDigest/kind/planHash/releaseId/factsHash y pin físico de claim, escrita exclusiva/fsync y releída. Verificar fresco otra vez; destino fijo `operation/released-claim` ausente/same device. Revalidar scope+proof y ejecutar rename único del directorio completo como commit. No replace/EXDEV/copy fallback ni rmdir parcial del claim.
- [ ] Probar destino extranjero vacío/no vacío antes del último check y rechazar sin overwrite. La exclusión administrativa y directorio privado protegen esa ventana frente a writers cooperantes; `fs.rename` no se presenta como renameat2/RENAME_NOREPLACE portable ni defensa contra actor hostil mismoUID. Si no se puede asegurar ese perímetro en despliegue, no iniciar el corte.
- [ ] Inmediatamente registrar internamente el rename observado **antes de otra IO fallible**; rebind solo a identidad/bytes reales del claim reubicado original. Store/control conservan credential/record originales y validación de ancestros actuales; no exigen propiedad de una nueva entrada global. Callback/cleanup terminal usan ese owner y esperan pending work. No importar profile dentro del store para hacerlo posible.
- [ ] Fsync padres y recibo `operation/release-receipt.json` exclusivo version1 con digest de intención/kind/factsHash/commitObserved/persistenceConfirmed. Si hay fallo posterior al rename o cleanup, preservar `RELEASE_COMMIT_UNCONFIRMED` hasta la salida, no enmascararlo con el catch genérico CLOSED. No reinserción, cleanup de released-claim ni eliminación de operación/credencial.
- [ ] Reader terminal valida no-follow/identidades/bytes y formatos sin mutar: CLOSED propio activo, RELEASED propio reubicado exacto con intención, UNKNOWN conflicto. Recibo ausente/ambiguo no da persistenceConfirmed. Con global nuevo, diagnostica solo su operación histórica y **jamás** retira la nueva; nuevo intento mutante se detiene. GREEN T4+regresión010, revisión de cada punto de fallo/interleaving; commit `feat: commit and diagnose guarded Business reopening`.

### Task5: Runner único, empaquetado e inventario real

**Files:** CLI `app/web/scripts/business-consent-cutover.ts`, parser/test adyacente y `business-consent-cutover-runtime-packaging.test.mjs`; Dockerfile, package scripts, smokes anteriores afectados. Consume T1–T4; no frontend ni generación/publicación nueva.

- [ ] RED tests de export allowlist/parser/redacción/exit y Node20 real fuera del source tree. Rechazar duplicados, unknown, roots/template-dir/token/profile/hash de runtime/force. Fake permisos entre bundles no se aceptan. STATUS010 continúa idéntico/read-only. BEGIN con artefactos UNAVAILABLE falla **antes** de crear un claim.
- [ ] Parser exacto `--mode=BEGIN|DRAIN|PREVIEW|APPLY|VERIFY|REOPEN|CANCEL`, `--operation-id=<uuid>` siempre; timeout-ms entero0..30000 solo DRAIN; APPLY exige `--confirm=MIGRATE_REVIEWED_BUSINESS_CONSENT_MASTER --expected-plan-hash=<64hex>`; REOPEN `--confirm=REOPEN_VERIFIED_BUSINESS_CONSENT_MASTER`; CANCEL `--confirm=CANCEL_UNSTARTED_BUSINESS_CONSENT_CUTOVER`. Otros campos rechazan. Root solo configuración existente validada, no CLI. VERIFY diagnostica sin abrir, con escritura de metadata declarada si toma control.
- [ ] Agregar `maintenance:business-consent-cutover`→`node scripts/business-consent-cutover.mjs` y `test:business-consent-cutover-runtime`→test packaging. Root/resume/handle/control se resuelven dentro del runner, same graph. Antes de BEGIN comprobar fixed staging+profile disponibles; antes de mutations tomar control real. Map JSON sin paths/credenciales/PII: `{requestId,mode,status,reasons,planHash?,metadataWritesMade,packageWritesMade,providerCallsMade:false,publicationMade:false,commitObserved?,persistenceConfirmed?}`. Exit0 éxito confirmado,2 bloqueo previo al commit,3 commit observado/incierto,1 parser/error seguro sin afirmar estado de cierre. Sin raw stack ni args.
- [ ] Dispatcher: BEGIN usa inicializador010 tras preflight; DRAIN usa `drainBusinessCutover(control, timeout)` directamente en el callback del controlador. PREVIEW/APPLY/VERIFY/REOPEN/CANCEL usan el scope exclusivo y sus helpers sin volver a encolar funciones010 dentro de sí mismas. Probar DRAIN y APPLY completos para detectar deadlock, no solo probar el parser.
- [ ] Docker DAG sin autohash/ciclo COPY: `runtime-layout` prepara archivos reales enviados sin CLI011; genera inventario excluyéndose a sí mismo. `cutover-cli-builder` consume ese layout/inventario, compila el digest y bundle único011 con esbuild targetnode20 y alias server-only existente. `runner` parte de runtime-layout y añade la CLI. CLI/verificador son TCB de imagen revisada, excluidos de su inventario; ni registry ni UI nuevos por este task. Ausencia de staging produce descriptor UNAVAILABLE fail-safe, no artefacto SUCCESSOR ficticio. Composición posterior suministra bytes aprobados y ambos perfiles reales antes de producción.
- [ ] Preservar scripts legacy directos Node20; si009 bundle incorpora import dinámico TS, usar alias/shim necesarios sin modificar sus exports públicos. Ejecutar packaging nuevo+anterior, smokes import reales, generar fixtures e intentar escrituras Business/directverify bajo cierre previo; no basta grep de versión. GREEN/lint explícito CLI excluida de lint global, build Node20 desde app/web. Revisión de packaging/autoridad y commit `build: package fixed Business cutover runner`.

### Task6: Integración funcional y gate Linux011

**Owner/scope:** subagente de validación, sin cambios de producto; test nuevo `app/web/server/services/businessConsentCutoverIntegration.test.ts`, fixtures propios y reporte del controller. Consume commits revisados1–5; si descubre bug vuelve al owner correspondiente, no parche oculto desde validación.

- [ ] Escribir/ejecutar el test integral contra commits1–5 y registrar baseline real; si pasa inicialmente, reportar cobertura añadida GREEN, no fabricar un RED. Si detecta bug, test RED y corrección por el owner del módulo antes de repetir. Fixture exacto9760+e9a2/journals, plantillas revisadas obtenidas de Git235 pinned82b6c5d en carpeta temporal (no checkout/canonical productivo). Probar begin/drain/preview, nueva adquisición mismo hash, apply/start/archivo/audit/schema2/cierre, nuevo proceso/profile y fin. Fakes de proveedor fallan si se llaman; no usar factory aprobatoria de profiles ni hooks exportados en CLI productiva.
- [ ] Node20 real sobre bundles011 y TS Node24 sobre servicios. Ejercitar cancelar antes de start, false proof, lock huérfano, reemplazo físico y cada fallo terminal; ambos flujos sin source/provider/publication writes. Fixture de profile es prueba del verificador, no prueba de que el release235 completo ya fue compuesto/desplegado.
- [ ] Dockerfile real desde Git limpio: no .env/secretos/scratch/node_modules heredados. Context desktop-linux explícito, contenedores Node20 sin red/puertos/privileged/socket/bind de datos reales, volumen nombrado privado propio. A/B de main process distintos, mismo output/inodes volumen y raíces distintas; UID real y1000, permisos/fsync, crash137 y resultado antes/después de commit. Names+labels exactos antes de cleanup; guardar argv normalizados, logs, versiones/digests/exit/snapshots antes de eliminar fixtures.
- [ ] Gate funcional011 PASS solo con resultados nuevos, revisión final de rama/corrección acotada y verificación del controller; guardar distinción entre simulación de perfil y build real. **No dar por pasado el gate de todos los writers de SUCCESSOR/ambas imágenes reales hasta la composición dependiente**; queda asignado al runbook siguiente. No BEGIN productivo por pasar fixtures.
- [ ] Controller documenta reporte011, estado brain y PR con source SHA/rango/revisiones/comandos/resultados/skips/limitaciones; sin título DONE público. Commit de test/reporte `test: cover Business cutover migration and terminal outcomes`.

## Verificación prescrita (cwd app/web, sh en Linux)

```sh
node --conditions=react-server --experimental-strip-types --experimental-loader ./scripts/node-test-alias-loader.mjs --test server/services/businessCutoverClaimStore.test.ts server/services/businessCutoverMaintenanceService.test.ts server/services/businessCutoverExclusiveScope.test.ts server/services/businessConsentCutoverMigration.test.ts server/services/businessCutoverMigrationAuthority.test.ts server/services/businessCutoverReleaseProfile.test.ts server/services/businessCutoverReleaseVerification.test.ts server/services/businessCutoverReleaseService.test.ts server/services/businessConsentCutoverIntegration.test.ts server/services/businessPublicationSiteCoordinator.test.ts server/services/productPageVerificationBusinessCutover.test.ts scripts/business-consent-cutover.test.ts
node --test scripts/build-business-cutover-writer-inventory.test.mjs scripts/business-consent-cutover-runtime-packaging.test.mjs scripts/business-cutover-runtime-packaging.test.mjs scripts/business-consent-master-package-migration.test.mjs scripts/jairo-business-master-package-drift-recovery.test.mjs scripts/jairo-business-master-package.test.mjs scripts/business-master-runtime-packaging.test.mjs
npm run lint
npm run build
git diff --check
```

Primer comando Node24 con basename `node`; no strip-types en runtime20. Packaging debe ejecutar binario20 real mediante BUSINESS_CUTOVER_TEST_NODE20, sin fallback24. Build con Node20 desde app/web, no la invocación alternativa desde raíz que falló en010. El CLI/parser nuevo excluido de lint global lleva lint focal `npx eslint --no-ignore scripts/business-consent-cutover.ts scripts/business-consent-cutover.test.ts`; tests de generator/directverify/worker/MasterSites y artefactos235 se añaden en composición para no declarar suite global inexistente. No repetir full suite por cada reviewer: focal por task y completa una vez al final de código revisado.

## Runbook dependiente para llegar a Claudia (no ejecutado al aprobar solo este plan)

Owner integración/release Codex, entrega separada con branch/áreas y plan declarados antes de modificar235/main. No implica nueva autoría visual. No reutilizar la imagen histórica235 sin011.

1. **Componer release:** resolver conflictos235 sobre main+011 preservando los seis bytes/pins y consentimiento aprobados; suministrar staging fijo al tooling PREDECESSOR y canonical nuevo al SUCCESSOR. Construir/probar ambos layouts e inventarios reales; verificar semántica de todos los writers Next/standalone y guard antes de source/fetch/write, no solo fixture. Registrar digests reales y aplicabilidad de advisories22, sin waiver automático. Si hace falta cambiar bytes de plantilla o contrato, handoff/decisión aparte.
2. **Antes de BEGIN:** ambas imágenes revisadas/guardadas, canal administrativo probado para reanudar/reabrir; despliegue tooling compatible, tareas antiguas retiradas y procedencia real, volumen/root/UID/modes compartidos, operadores/scripts externos excluidos durante ventana. Planes/snapshots no sustituyen hechos. Si no puede probarse retiro/procedencia desde el canal disponible, no cerrar ni pedir otro permiso de ventana: conseguir evidencia/canal adecuado.
3. **Corte:** UUID propio, BEGIN/DRAIN/PREVIEW; revisar plan fresco real y confirmación exacta del hash (nunca hash de ejemplo del documento), APPLY real con scope retenido; leer archivo/auditoría exactos. Error precommit conserva cierre, caída huérfana exige recuperación aparte. No SFTP/DNS/campañas en la migración.
4. **Desplegar SUCCESSOR bajo cierre:** confirmar retiro del tooling y todas las tareas antiguas, reanudar misma operación, VERIFY y REOPEN verificados. CANCEL solo si no empezó y PREDECESSOR sigue intacto. Resultado3 obliga a diagnóstico read-only, nunca reinsertar/borrar claims ni declarar OPEN confirmado. Guardar evidencia de fin y no mantener el sistema cerrado sin canal/procedimiento probado.
5. **Claudia por ruta existente:** GET `/api/internal/master-sites/business` autenticado Super Admin, revalidar entitlement/fuente/target y WhatsApp/FAQ aprobados. Usar `createMasterSitesBusinessCommandService().publish` por POST `/api/internal/master-sites/business/publish` con el contrato/revisión frescos de la aplicación; no inventar body ni saltar expectedRevision. Target ya existente: no invocar prepare-target/provisioner si implicaría DNS. Si cambió o no está READY, parar en el diagnóstico sin mutar DNS. Conservar paquete/intentHash y jobId; GET `/api/internal/publication-jobs/[jobId]` debe llegar SUCCEEDED/COMPLETE, no confundir enqueued con publicado.
6. **Entrega pública:** móvil/escritorio en negocio.claudiacalero.pro, texto aprobado/FAQ2h con propuesta8–12 sin garantías, CTAs WhatsApp correctos/no falso registro, identidad/disclosure, claims/urgencia/nav limpios, VSL visible con audio/poster/duración coherente, privacidad/consentimiento por carga y revocación. Verificar aislamiento Business/Product/Brand y consent-before-tags; clic no conversación/venta. No activar campañas/nuevas integraciones/IDs. Recepción real de eventos se acredita por evidencia de la integración autorizada, separada de presencia de scripts; si no puede comprobarse, informarlo sin fabricar éxito. Manifest de negocio.ganomaster.pro no equivale a publicar ese master público.

La ventana y publicación de Claudia ya están autorizadas. El hash fresco de migración selecciona hechos exactos, no es una segunda arquitectura ni un permiso para ignorar bloqueos. Cualquier expansión real de alcance sigue su gate. No crear monitor ni apagado local.

## Revisión propia del plan

- [x] Spec1–3→T1/T2;4→T3/T5 y composición;5–6→T1/T2;7–8→T3/T4;9→T5;10→T6+regresiones;11→runbook dependiente y entrega pública. Ningún gate futuro se declara ejecutado.
- [x] Interfaces productor/consumidor únicas; scopes/permits/proofs opacos, late import legacy/Node20, no cola autorreentrante ni perfil en store. Archivos/métodos nuevos nombrados, constraints heredados explícitos.
- [x] Cinco Review Focus asignados a tests/tasks concretos; nueva operación durante finalización vieja, plan estable y fallo poscommit no omitidos.
- [x] Steps RED/GREEN/review/commit por resultado verificable; sin código de producto instalado/escrito ni comandos de mantenimiento durante planificación. No delegar esta self-review a un subagente.
- [x] Método preservado subagentes+review por tarea. Antes de implementación Jairo revisa/confirma este plan; no solicitar nuevamente el método ni la misma ventana.
