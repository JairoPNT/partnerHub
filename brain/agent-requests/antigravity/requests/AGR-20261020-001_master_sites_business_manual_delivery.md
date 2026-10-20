# AGR-20261020-001 — Master Sites: entrega manual de Negocio

Status: READY FOR FRONTEND IMPLEMENTATION. Jairo aprobó especificación y plan técnico el 2026-10-20. Contrato007 revisado independientemente y fusionado mediante PR #213, merge `b84c942906837464933dc723bf55e329e894fa48`. Se permite implementar UI contra este contrato; integración y habilitación real esperan backend010 y revisión011. No simular un backend listo ni producir escrituras productivas durante pruebas.

- Owner: Antigravity.
- Outcome: operar la plantilla Business aprobada y publicar partners seleccionados desde Master Sites, sin comandos.
- Allowed files: `app/web/components/master-site-management-view.tsx`, nuevos componentes/tests frontend Business de Master Sites y este request/reporte.
- Excluded: backend/routes/services/auth, Prisma, Docker/env, plantillas HTML/CSS/JS publicadas, fuentes/targets/jobs productivos, otras pantallas.
- Dependencies: leer spec `docs/superpowers/specs/2026-10-20-business-master-sites-manual-delivery-design.md` y plan `docs/superpowers/plans/2026-10-20-business-master-sites-manual-delivery.md`. Contrato007 ya disponible; backend010 pendiente. Puede trabajar UI en paralelo desde el contrato007 congelado con fakes locales solo de test; habilitación real espera backend/integración. No reutilizar `/product-pages/replicate` omitiendo ecosistema.
- Parallel-safe with: CDX-20261020-008 (preview/input), CDX-20261020-009 (coordinación por sitio) y CDX-20261020-010 (comandos/rutas), todos en archivos backend separados. Detenerse si otro request toca MasterSiteManagementView.
- Integration notes: Codex provee datos autoritativos y comandos seguros; Antigravity no calcula entitlement, roles, ownerKey, rutas ni payloads de identidad.

## UX requerida

Conservar selector Producto/Negocio/Marca Personal; hacer operativa Negocio. Mostrar una única plantilla Business existente con preview/versión, partners habilitados y bloqueos concretos. Selección inicial vacía, nunca todos preseleccionados. Confirmar versión y partners explícitos. Diferenciar preparación de destino de generación/publicación; ambas son acciones manuales. Seguir jobs hasta estado real, sin convertir un HTTP 201 en «Publicado».

No mezclar fuentes Producto con Negocio ni mostrar información del partner anterior durante una carga. Manejar sesión vencida, acceso denegado, cambio de versión/datos, jobs activos y fallos parciales. No mostrar tokens, hashes técnicos innecesarios ni rutas remotas. No republicar Claudia ni otros sitios desde una apertura de pantalla o una prueba visual.

## Contrato congelado para frontend

Importar únicamente tipos/esquemas del módulo client-safe `app/web/shared/master-sites-business-contract.ts` (Zod, sin imports de servidor). No copiar otro contrato ni importar authorizer/services al cliente. Exportaciones relevantes: `MasterSitesBusinessReadResponse`, `MasterSitesBusinessPartner`, `MasterSitesBusinessTemplate`, `MasterSitesSafeJob`, `MasterSitesBusinessPrepareTargetRequest`, `MasterSitesBusinessPublishRequest`, `MasterSitesBusinessCommandResult`, `MasterSitesErrorResponse`. Los esquemas usan los mismos nombres en camelCase + `Schema`, por ejemplo `masterSitesBusinessReadResponseSchema` y `masterSitesBusinessPublishRequestSchema`.

- `GET /api/internal/master-sites/business` devuelve `{template,partners}`; solo lectura, sin side effects. Autenticación con sesión humana administrativa existente, no tokens de servicio en el navegador. `401` sesión inválida; `403` acceso denegado; fallos no deben dejar resultados anteriores aparentando estar actualizados.
- Template: `{id:"ganomaster-business",ecosystemType:"BUSINESS",available,revision,previewUrl,blockedReasons}`. `previewUrl` es string|null y puede ser ruta relativa same-origin. No construir enlaces con datos internos del partner. Validar que sea una ruta same-origin o URL HTTPS de preview aprobada antes de convertirla en enlace; no permitir `javascript:`, `data:` o hosts arbitrarios.
- Partner: `{activationLeadId,displayName,siteId,publicHost,status,blockedReasons,reviewRevision,canPrepareTarget,canPublish,currentJob}`. Campos de identidad ausentes pueden ser null. No inferir habilitación por entitlement visible ni por el badge histórico del lead: usar canPrepareTarget/canPublish del backend y revisión vigente.
- Estados: `BLOCKED|TARGET_REQUIRED|TARGET_PENDING|READY|QUEUED|RUNNING|CURRENT|FAILED`. `CURRENT` significa publicación actual verificada por backend; `READY` solo permite publicar. No presentar un comando aceptado o `TARGET_READY` como sitio publicado.
- `POST /api/internal/master-sites/business/prepare-target`: JSON estricto `{requestId:UUID,activationLeadId:UUID,templateId:"ganomaster-business",expectedRevision:hex64,confirmation:"PREPARE_SELECTED_BUSINESS_TARGET"}`.
- `POST /api/internal/master-sites/business/publish`: mismos identificadores/revisión y `confirmation:"PUBLISH_SELECTED_BUSINESS_TEMPLATE"`, `updateExisting:boolean` (false por defecto). Para actualizar CURRENT exigir confirmación explícita y `updateExisting:true`; no convertir un reintento en actualización automática.
- RequestId se crea para una operación confirmada; conservarlo al repetir exactamente esa misma solicitud por respuesta perdida. Si cambió la revisión/partner/acción, refrescar y pedir nueva confirmación con nuevo UUID; no reintentar silenciosamente 409 con datos nuevos. No mandar arrays, ownerKey, dominios, WhatsApp, roles, rutas ni configuración de hosting.
- Resultado `{operationId,activationLeadId,siteId,publicHost,outcome,job,blockedReasons}`. Outcome `TARGET_READY|TARGET_PENDING|ENQUEUED|ALREADY_CURRENT|ALREADY_SCHEDULED|BLOCKED|RETRY_REQUIRED`. Job seguro solo incluye id/status/phase/attemptCount/updatedAt/completedAt?/lastErrorCode?. No exponer errores crudos.
- HTTP `200` idempotencia/al día/destino listo; `202` destino pendiente/encolado; `400` payload; `404` partner; `409` revisión/identidad/busy/conflicto/reintento que requiere revisión. Error seguro `{error:SAFE_CODE,blockedReasons?:string[]}`. Tratar respuesta no-JSON como error genérico de conexión/sesión, nunca inyectar HTML.

## Selección, confirmación y seguimiento

- Máximo diez partners por confirmación, selección inicial vacía. Nunca seleccionar implícitamente al abrir/cambiar pestaña o tras recargar. POST unitarios, sin endpoint masivo «todos».
- Mostrar el resumen de la plantilla y partners/hosts antes de confirmar. Operaciones de destino y publicación separadas. Cortesía activa habilita elegibilidad, pero su registro no debe generar/publicar ni marcar converted.
- El GET y su modelo deben invalidarse al salir de Negocio, cerrar, cambiar selección/identidad o perder sesión. AbortController y/o request generation guard; una respuesta tardía no puede mezclar partners/pestañas. Controlar también respuestas tardías de POST y polling.
- Tras un resultado parcial, conservar los éxitos, mostrar cada fallo y no volver a publicar los exitosos al reintentar. Refrescar revisiones antes de una nueva confirmación. No recalcular reviewRevision en cliente.
- Polling del GET solo cuando hay jobs relevantes QUEUED/RUNNING, con limpieza al desmontar/cambiar pestaña y backoff ante error. Mostrar fallo real y lastErrorCode seguro, sin un bucle automático de retry/publicación. `SUCCEEDED/COMPLETE` y CURRENT provienen del servidor.
- No cambiar Producto ni habilitar acciones Brand. No arreglar duración del video, identidad visual general, checkout, landing ni otras pantallas en este request.

## Entrega y verificación

Tests de cambio de ecosistema/partner, selección vacía/máximo10, confirmación, acceso, errores/revisión409, respuesta perdida con mismo requestId, respuesta tardía/polling cancelado y resultado parcial sin repetir éxitos. GET/POST fake en test, sin publicar un cliente real. Lint/build y revisión responsive/accesibilidad. Rama propia `antigravity/AGR-20261020-001-master-sites-business-manual-delivery` desde main actualizado. Reportar archivos, resultados, rama/commit/PR y pendientes en `brain/agent-requests/antigravity/reports/AGR-20261020-001_master_sites_business_manual_delivery_DONE.md` solo cuando se implemente realmente. La revisión de Codex/011 es obligatoria antes de merge/habilitación.
