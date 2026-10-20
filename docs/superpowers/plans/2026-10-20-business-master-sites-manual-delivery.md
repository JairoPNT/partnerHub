# Entrega manual de Negocio desde Master Sites — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir al Super Admin revisar la plantilla Business existente, elegir partners habilitados, preparar su destino y solicitar su publicación desde Master Sites.

**Architecture:** Un adaptador manual pequeño reutiliza entitlement, provisioning, generación y worker actuales. El navegador envía IDs y revisiones, nunca configuración de identidad/hosting; cada partner tiene un comando y resultado independientes. Autorización y exclusión mutua se validan en servidor.

**Tech Stack:** Next.js App Router, TypeScript, Zod, Cloudflare Access/Jose, almacenamiento file-backed y cola/SFTP guardados existentes. Sin nuevas dependencias ni migraciones Prisma.

**Spec:** `docs/superpowers/specs/2026-10-20-business-master-sites-manual-delivery-design.md` — aprobada por Jairo el 2026-10-20.

## Global Constraints

- «Se empieza por BUSINESS. No se importan ZIP ni se construye un catálogo de variantes en esta entrega.»
- «Empezar con selección vacía.» No utilizar la replicación legacy con PRODUCT por defecto.
- «No se requiere fuente ni contratación de Producto para entregar solo Negocio.»
- «Cortesía habilita elegibilidad pero no genera/publica ni marca converted por registrarla.»
- «Un HTTP 201 de generación o una cola aceptada no significan publicación terminada.»
- «Sin configuración, denegar.» Super Admin humano verificado en servidor; no ampliar Cloudflare Access.
- «No modificar el comportamiento automático ya existente mediante este ticket.» Solo añadir coordinación de seguridad, sin eliminar sus disparadores ni habilitar otros nuevos.
- Codex no implementa UI; Antigravity no implementa backend/auth. Un ticket, branch/worktree y revisión por resultado; no tocar el checkout raíz sucio. PowerShell local y sh en EasyPanel; nunca Bash.

## Review Focus

1. Partner BUSINESS_ONLY sin fuentes previas: debe aparecer y poder entregarse sin depender de Producto (tests 008/010).
2. Cambio de dominio, WhatsApp, entitlement o master después de revisar: conflicto antes de mutar (tests 008/010).
3. Peticiones de procesos distintos, job activo y worker con journal de recuperación: no sobreescribir fuente ni carpeta durante publicación (tests 009).
4. Reintento tras respuesta perdida o fallo entre generación y enqueue: recuperar una sola operación y no generar otra publicación silenciosa (tests 010).
5. Una respuesta tardía tras cambiar partner/pestaña o fallo parcial del grupo: no mostrar datos ajenos ni repetir éxitos (tests AGR-001/011).

## Contrato compartido v1 (decisiones para todos los tickets)

- Ruta administrativa nueva: `GET /api/internal/master-sites/business`; devuelve `{template, partners}` con `Cache-Control: no-store`. Lectura sin proveedores, generación ni enqueue.
- `template`: `{id:"ganomaster-business", ecosystemType:"BUSINESS", available:boolean, revision:string|null, previewUrl:string|null, blockedReasons:string[]}`. Una sola plantilla; `revision` identifica el inventario local revisado, no una aprobación global ficticia.
- `partners[]`: `{activationLeadId, displayName, siteId:string|null, publicHost:string|null, status, blockedReasons:string[], reviewRevision:string|null, canPrepareTarget:boolean, canPublish:boolean, currentJob:SafeJob|null}`.
- `status`: `BLOCKED | TARGET_REQUIRED | TARGET_PENDING | READY | QUEUED | RUNNING | CURRENT | FAILED`. Solo CURRENT respaldado por la intención actual/journal/verificación, nunca solo por una etiqueta histórica del lead.
- `SafeJob`: `{id,status,phase,attemptCount,updatedAt,completedAt?:string,lastErrorCode?:string}`; no lease/token, hashes de identidad ni rutas remotas.
- Comandos: `POST /api/internal/master-sites/business/prepare-target` y `/publish`, cada uno **un partner**. JSON estricto `{requestId:UUID, activationLeadId:UUID, templateId:"ganomaster-business", expectedRevision:hex64, confirmation}`. Prepare usa `PREPARE_SELECTED_BUSINESS_TARGET`; publish usa `PUBLISH_SELECTED_BUSINESS_TEMPLATE` y permite `updateExisting:boolean` (default false).
- Resultado: `{operationId:UUID, activationLeadId, siteId, publicHost, outcome, job:SafeJob|null, blockedReasons:string[]}`. Outcome `TARGET_READY | TARGET_PENDING | ENQUEUED | ALREADY_CURRENT | ALREADY_SCHEDULED | BLOCKED | RETRY_REQUIRED`.
- HTTP: 401 sesión inválida; 403 no Super Admin/origen; 400 payload inválido; 404 partner inexistente; 409 revisión/identidad/busy/conflicto o reintento que requiere revisión; 202 encolado/destino pendiente; 200 idempotencia/al día/destino listo. Error `{error:SAFE_CODE,blockedReasons?:string[]}`, sin excepciones crudas.
- UI envía uno a uno los seleccionados, máximo 10 por confirmación; no existe endpoint «todos». Estado de jobs se obtiene por el GET administrativo nuevo, sin exigir otra audiencia Access al navegador.
- Revisión = hash estable de plantilla + datos efectivos del partner + entitlement vigente + fuente Business (o ausencia) + target (o ausencia). No usar timestamps de consulta que invaliden cada lectura. POST recompone y verifica bajo exclusión antes de escribir.
- Identidad autorizada: `authenticateCloudflareAccessRequest` con audiencia administrativa existente y `identityType=HUMAN`, email de la identidad JWT incluida en `MASTER_SITES_SUPER_ADMIN_EMAILS` (CSV normalizada, vacía deniega). POST requiere `Origin: https://app.partnerhub.club` y JSON. No inferir el email de Jairo del registro de ningún partner. No imprimir la configuración ni cambiar las políticas Access.

## Archivos y responsabilidades

- `app/web/shared/master-sites-business-contract.ts` y `.test.ts`: DTO/esquemas Zod públicos, sin server-only (007).
- `app/web/server/auth/masterSitesOperatorAuth.ts` y test: autenticación/autorización/origen (007).
- `app/web/server/services/masterSitesBusinessPreviewService.ts`, `masterSitesBusinessInput.ts` y sus respectivos `.test.ts`: lectura y payload desde fuentes autoritativas (008).
- `app/web/server/services/businessPublicationSiteCoordinator.ts` y `.test.ts`: exclusión compartida; hooks mínimos en generación/job service/worker/source save/publicación legacy (009).
- `app/web/server/services/masterSitesBusinessCommandService.ts`, `masterSitesBusinessOperationStore.ts` y tests: comandos e idempotencia (010).
- `app/web/app/api/internal/master-sites/business/route.ts`, `prepare-target/route.ts`, `publish/route.ts` y `app/web/server/services/masterSitesBusinessRoutes.test.ts`: wrappers y tests reales de handlers (010).
- `app/web/components/master-sites-business-delivery-view.tsx`, `master-sites-business-delivery-model.ts` y tests; integración mínima en `master-site-management-view.tsx` (AGR-001).
- Requests/reportes con ID propio en `brain/agent-requests/`; documentación/env de la allowlist en ticket 007, no variables de credenciales reales.

## Task 1 — CDX-20261020-007: contrato y autorización del operador

Owner: Codex. Branch `codex/CDX-20261020-007-master-sites-operator-contract`. Áreas: DTO, helper auth, tests y documentación de allowlist. Excluye UI/servicios de publicación/infra productiva. Independiente del trabajo de interacción de Antigravity; bloquear integración UI hasta fijar DTO.

**Interfaces:** `authorizeMasterSitesOperator(request:Request):Promise<CloudflareAccessIdentity>`; DTO/export Zod descritos arriba. Inyectar verificador/configuración en factory para probar JWT reales de test sin red; producción usa el verificador Jose existente.

- [ ] Test RED `rejects_missing_allowlist_service_identity_and_nonmember_before_dispatch`: cada escenario falla con 401/403; cero operación invocada. Test `rejects_forged_identity_and_cross_origin_post`: firma/audiencia falsas y origen ajeno no autorizan aunque el body diga admin. Test DTO: tipos distintos de BUSINESS, rutas/WhatsApp extra y listas de partners son rechazados.
- [ ] Ejecutar el nuevo test y confirmar fallo por la conducta no implementada, no por un import roto.
- [ ] Implementar DTO y autorización; no añadir otra política Access ni un fallback a cualquier usuario autenticado.
- [ ] GREEN: suite auth/contrato y `npm run test:cloudflare-access`; lint de los archivos. Documentar configuración vacía por defecto en `app/web/.env.example` sin emails/secretos reales.
- [ ] Commit, revisión independiente y contrato congelado antes de que otros tickets lo consuman.

## Task 2 — CDX-20261020-008: preview y payload Business autoritativo

Owner: Codex. Branch `codex/CDX-20261020-008-master-sites-business-preview`. Áreas: preview/input/tests nuevos; no edita auth, generador, job service, worker ni frontend. Depends 007; paralelo seguro con 009 y AGR-001.

**Interfaces:** `createMasterSitesBusinessPreviewService(deps).get():Promise<BusinessOverview>` y `.getPartner(activationLeadId:string):Promise<BusinessPartnerSnapshot>`; snapshot interno contiene `reviewRevision` y material confiable, no se serializa íntegro. `buildMasterSitesBusinessInput(snapshot):ProductPageGenerationInput` devuelve un input ya validado con el esquema existente.

- [ ] RED: `includes_business_only_partner_without_any_saved_source` devuelve TARGET_REQUIRED, no exige Producto. `revoked_grant_or_archived_partner_is_blocked` no produce input publicable. `ambiguous_owner_domain_or_inventory_is_blocked` nunca usa el primer registro por coincidencia parcial.
- [ ] RED: `builds_business_input_without_purchase_url_or_master_tracking` conserva identidad/WhatsApp/integraciones autorizadas del partner; omite purchaseUrl, usa metadatos SEO Business no vacíos y VSL aprobado. `changed_master_domain_whatsapp_or_entitlement_changes_review_revision`; leer dos veces los mismos datos no cambia revisión.
- [ ] Implementar readers con lead/entitlement frescos, validación estricta de target e inventario completo, master local y jobs. JSON corrupto/ambiguo bloquea; no desaparecer un conflicto por filtrar un registro malformado.
- [ ] GREEN: tests nuevos + `npm run test:partner-entitlement`, suites Business de generación/póster. Sin llamadas Hostinger/SFTP en pruebas ni en GET.
- [ ] Commit y revisión de aislamiento. Entregar al UI solo los DTO; no exponer onboarding completo ni rutas.

## Task 3 — CDX-20261020-009: coordinación por sitio de Negocio

Owner: Codex. Branch `codex/CDX-20261020-009-business-site-coordination`. Áreas: coordinador nuevo y hooks mínimos en `productPageGenerationService.ts`, `publicationJobService.ts`, `publicationJobWorkerService.ts`, `productPageSourceService.ts` y `productPagePublicationService.ts`; tests dedicados. Excluye auth/preview/command service/UI. Paralelo seguro con 007/008/AGR-001; 010 integra después.

**Interfaces:** `withBusinessPublicationSite(siteId:string, action:()=>Promise<T>):Promise<T>`, exclusión de filesystem entre procesos y reentrada solo del mismo contexto propietario validado. `BusinessSiteBusyError` se transforma en conflicto o deferral, no en publicación fallida por contención normal. Definir en este ticket los hooks de generación, enqueue y worker para que no exista «comprobar busy y escribir» sin exclusión compartida.

Hook exacto del worker: después de `claimNext` (ya liberado su mutex de metadata), adquirir coordinador y mantenerlo hasta complete/fail. Si está ocupado, `publicationJobService.deferClaimedJob(id:string,leaseToken:string)` devuelve QUEUED mediante validación del token, restaura attemptCount y devuelve DEFERRED; no ejecutar ni marcar FAILED. Preservar wrapper/gates del master-refresh. Orden: coordinador de sitio -> mutex corto de job; nunca esperar sitio reteniendo mutex de job. Generación/regenerate adquieren antes de leer/remover; save directo, enqueue/enqueueReviewed y publicación legacy deben participar para Business, porque pueden ser llamados fuera del worker. Capacidad reentrante solo de contexto interno, jamás del JSON HTTP. No basta proteger únicamente las nuevas rutas.

- [ ] RED multiproceso con barreras reales: dos comandos no entran juntos; worker pausado antes de swap impide que otro generador elimine su paquete/fuente; dos workers de intenciones diferentes del mismo sitio no se solapan.
- [ ] RED recuperación: journal existente se verifica bajo la misma exclusión; un coordinador ocupado devuelve/deja trabajo reintentable sin marcar FAILED ni consumir intentos. Probar liberar en `finally` ante error y que un proceso vivo nunca pierda exclusión por TTL, incluso si vence su lease RUNNING. Tests de source-save directo/publicación legacy bloqueados, dos sitios independientes y reentrada worker->regenerate->generate->save/manual->generate->enqueue sin deadlock.
- [ ] Implementar claim atómico y ownership, sin robo por antigüedad. Un claim huérfano bloquea con diagnóstico y recuperación explícita, no borrado automático inseguro. Reentrada interna evita deadlocks al regenerar/encolar desde la operación dueña. Producto/Brand y disparadores actuales no cambian semántica.
- [ ] GREEN: tests coordinator + suites `test:publication-jobs`, `test:publication-job-worker`, `test:publication-events`, generación/regeneración Business y master refresh barrier. Revisar posibles lock-order deadlocks entre sitio, job y refresh.
- [ ] Commit y revisión independiente antes de usar el coordinador en comandos manuales. Este gate no se sustituye por deshabilitar botones.

## Task 4 — CDX-20261020-010: comandos manuales y rutas

Owner: Codex. Branch `codex/CDX-20261020-010-master-sites-business-commands`. Áreas: command/store/routes/tests nuevos. Depends 007/008/009; no edita sus módulos ni frontend sin follow-up. Paralelo seguro con AGR-001 sobre contrato congelado.

**Interfaces:** `createMasterSitesBusinessCommandService(deps).prepareTarget(command,operator):Promise<BusinessCommandResult>` y `.publish(command,operator):Promise<BusinessCommandResult>`. Store file-backed bajo `.master-sites-business-operations/`; operationId=requestId con vinculación a actor/acción/partner/revisión, creación exclusiva y checkpoints durables. Los handlers inyectan servicios existentes en proceso, no hacen fetch a sus propios endpoints ni solicitan cookies/tokens del navegador.

- [ ] RED `revalidates_revision_entitlement_and_target_before_any_write`: revocación, cambio de datos/master o target extranjero producen 409 sin generación/proveedor. `prepares_only_selected_business_subdomain` usa owner/domain/IP de servidor, no compra y no toca raíz/Producto. READY existente no se reprovisiona para volver publicationState a PENDING; target pendiente continúa vía provisioner existente y revisión nueva.
- [ ] RED `manual_generation_enqueues_one_job_and_retains_actor`: input generado válido y sin checkout, fuente correcta y un solo job con actor auditado; no invocar el enqueuer automático adicional después de llamar al servicio generador. `existing_active_job_or_current_site_does_not_regenerate`: CURRENT sin updateExisting devuelve ALREADY_CURRENT; QUEUED/RUNNING devuelve ALREADY_SCHEDULED.
- [ ] RED `same_request_after_response_loss_recovers_without_new_publication` y `crash_after_generation_before_enqueue_recovers_pinned_source`: store checkpoint precede cada efecto, revalidar hashes/owner y continuar solo estado propio consistente. RequestId reutilizado para otro actor/partner/acción produce 409. Source o target cambiados durante recuperación bloquean; no reescribir jobs/journals.
- [ ] Implementar una operación por partner bajo coordinador; guardar selección/versiones y actor hash en auditoría durable sin datos secretos. Generate usa `productPageGenerationService.generate` y enqueue explícito usa `publicationJobService.enqueue` + wake existente. Provisioning reutiliza `createSubdomainProvisioningService` con clientes/config de servidor, nunca rutas/IP del body.
- [ ] Implementar GET/POST según DTO; ocultar razones internas sensibles. Handler tests reales cubren auth antes de deps, 400/401/403/404/409/202/200, GET sin efectos y JSON inválido. Tests con archivos temporales/servicios reales, fakes solo en proveedores/red.
- [ ] GREEN: suites nuevas, auth, preview, coordinator, Hostinger-only, jobs/worker/events y generación Business; lint/build. Commit y revisión de seguridad/aislamiento, sin operación productiva durante tests.

## Task 5 — AGR-20261020-001: interfaz manual Business

Owner: Antigravity. Branch `antigravity/AGR-20261020-001-master-sites-business-manual-delivery`. Allowed: componentes/modelo/tests frontend listados y reporte. Excluded: backend, auth, plantillas, infra y datos productivos. Depends contrato 007; diseño/modelo UI puede ir en paralelo con 008/009/010; habilitación real espera APIs verificadas.

**Interfaces:** consume únicamente GET y los dos POST administrativos v1; no importar servicios server-only. `reduceBusinessDeliveryState(state,event)` en modelo frontend gestiona selección/revisión/resultados y es testeable con Node siguiendo el patrón de tests actual; componentes invocan modelo y fetch con AbortController/request sequence.

- [ ] RED: selección inicial vacía; seleccionar BUSINESS no incluye fuentes PRODUCT; respuesta tardía de otro partner/pestaña se descarta. Usuario sin privilegio no ve acciones habilitadas, y el servidor sigue siendo autoridad.
- [ ] RED: confirmar 2 filas produce exactamente 2 comandos unitarios con revisiones visibles; un éxito y un fallo conservan resultados independientes y el retry no repite el éxito. 409 invalida revisión y pide refrescar, sin reenviar automáticamente.
- [ ] Implementar selector existente + tarjeta única de plantilla/preview, lista de partners y bloqueos, acciones separadas Preparar destino / Generar y publicar, confirmación con nombres/URLs/versión. Máximo 10 seleccionados y ninguna selección global por defecto. CURRENT necesita actualización explícita de esa fila.
- [ ] Seguimiento acotado del GET solo mientras haya selección pendiente/jobs activos y detener al desmontar/terminar; no background monitor ni nuevo requisito de audiencia de publicación. Enqueue se muestra «En cola», jamás «Publicado».
- [ ] GREEN tests de modelo/UI, lint/build, teclado y responsive. Reporte DONE con commit/PR; no ejecutar publicaciones como parte de visual QA. Revisión de Codex de contrato, no implementación UI por Codex.

## Task 6 — CDX-20261020-011: integración y gate productivo

Owner: Codex integrador y reviewer independiente; branch `codex/CDX-20261020-011-master-sites-business-integration`. Depends todos los anteriores revisados. No absorbe nuevas features. Cambios de contrato descubiertos abren follow-ups; una sola rama integra.

- [ ] Integration RED/GREEN en `app/web/scripts/master-sites-business-delivery.integration.test.mjs`: lead BUSINESS_ONLY sin fuentes -> preview -> preparación fake de proveedor -> generación real -> enqueue real -> worker fake de red -> estado terminal; comprobar bytes de Producto/raíz intactos. Reproducir pérdida de respuesta, cambio de entitlement y concurrencia de 009 en el conjunto.
- [ ] Ejecutar desde `app/web`: `npm run lint`, `npm run build` y `node --conditions=react-server --experimental-strip-types --experimental-loader ./scripts/node-test-alias-loader.mjs --test shared/master-sites-business-contract.test.ts server/auth/masterSitesOperatorAuth.test.ts server/services/masterSitesBusinessPreviewService.test.ts server/services/masterSitesBusinessInput.test.ts server/services/businessPublicationSiteCoordinator.test.ts server/services/masterSitesBusinessCommandService.test.ts server/services/masterSitesBusinessOperationStore.test.ts server/services/masterSitesBusinessRoutes.test.ts components/master-sites-business-delivery-model.test.ts scripts/master-sites-business-delivery.integration.test.mjs`. Cada tarea ejecuta la porción con sus archivos, y 011 la lista completa. Ejecutar además todas las suites `test:*` declaradas en package.json. No existe `npm test` genérico: no reportar una suite global ficticia. Registrar por nombre cualquier fallo de baseline y tratarlo explícitamente. `git diff --check` limpio.
- [ ] Revisión completa independiente de auth, aislamiento, lock-order, efectos y UX antes de PR/merge. Codex crea/fusiona los PR bajo la autorización existente; respetar auto-deploy sin disparar duplicados.
- [ ] Configurar allowlist solo con la identidad administrativa real de Jairo verificada en Access, no por inferencia; sin ese dato, rutas deniegan y se reporta el gate de configuración, sin debilitar auth.
- [ ] En producción, leer Claudia desde Master Sites: debe mostrar CURRENT/Publicado y verificado, sin regenerar/republicar al abrir. Primera nueva entrega requiere que Jairo identifique el partner habilitado que desea publicar; no elegir otro cliente por iniciativa del agente.
- [ ] Tras esa operación manual, verificar URL/contenido/video/CTA/worker y dashboard. Registrar evidencia y actualizar brain + `.project-status/status.json`; mantener null en dinero/progreso sin datos. No afirmar módulo habilitado hasta completar este gate.

## Orden, revisión y estado

007 contrato -> 008 preview y 009 coordinación en paralelo -> 010 comandos; AGR-001 puede preparar UI en paralelo desde contrato 007 -> 011 integración. Un subagente por tarea Codex y revisión entre entregas, como pidió Jairo; Antigravity mantiene propiedad de UI mediante su request. Seguridad/tenant/locks requieren revisión de riesgo apropiada, no solo build.

Plan aprobado explícitamente por Jairo el 2026-10-20. Ejecución con subagentes por tarea Codex y revisión entre entregas; frontend por Antigravity. La aprobación no implica que los controles ya estén implementados ni autoriza publicaciones de partners no seleccionados.
