# CDX-20261023-001 — conexión Business de Master Sites

Estado: IMPLEMENTED_REVIEWED_RELEASE_BLOCKED. Código y revisión de esta conexión cerrados; baseline global de verificación no verde. No fusionado, desplegado ni probado con clientes reales por este ticket. Rama/worktree preservados; no PR creado ni push en este corte.

## Entrega

Continúa la especificación/plan aprobados de CDX-20261020-006, frontend pendiente AGR-20261020-001 e integración011. Base técnica main `5fc239e5caf970d04536b2248fd1109ffbbb5308`. Rama de integración `codex/CDX-20261023-001-master-sites-business-integration`; commits frontend `e8cb723`, reporte `3510cac`, correctivo `cbf36d2`, reporte `129730c`, scope `2d49cb7`; integración/pruebas `f942944`, correctivo de pruebas `18fc568`, corrección final frontend `f4ca0d1` / reporte `45d2223`, imports del fixture `a088433`. Los commits posteriores de cierre solo actualizan documentación.

Master Sites → Negocio ahora consume las tres rutas administrativas existentes: GET de plantilla/partners, POST prepare-target y POST publish. Una plantilla aprobada, selección vacía/máximo10, acciones separadas y confirmación de versión/nombres/hosts. Muestra bloqueos, cola/worker y CURRENT solo desde backend; un202 no es publicado. Actualizar CURRENT requiere confirmación expresa. Cortesía habilita pero nunca genera/publica al registrarla. Reintento incierto conserva cuerpo/requestId; no repite automáticamente éxitos. Lecturas tardías no restauran acceso tras401/403 ni quitan el gate409; respuestas de otro partner no se aceptan como éxito.

No nuevo publicador, modificación de DTO/auth/Prisma/servicios productivos, dependencias/Docker, plantilla o archivos públicos. Producto/Marca conservados. UI implementada por subagente en rol Antigravity bajo su request; Codex coordinó contrato, tests e integración, sin implementación visual directa.

## Archivos

- `app/web/components/master-sites-business-delivery-{view.tsx,model.ts,api.ts}` y tests model/API; integración mínima en `master-site-management-view.tsx`, reemplazando el placeholder Business y evitando lecturas legacy Product al operar Negocio.
- `app/web/scripts/master-sites-business-delivery.integration.test.mjs`.
- `app/web/server/services/masterSitesBusinessCommand.test-fixtures.ts`: extracción del fixture/worker fake existente; `masterSitesBusinessCommandService.test.ts` conserva escenarios/aserciones y consume el helper. Test-only, sin código productivo agregado al backend.
- Requests/reportes de AGR-001 y este CDX.

## Evidencia fresca

- Controlador: conjunto final **202/202PASS**, cero fallos/skips, exit0 en `a088433` después del último ajuste de imports; DTO/auth/preview/input/coordinador/commands/store/routes/model/API/integración. Runtime local Node24.16.0; warnings heredados experimental-loader/typeless no silenciados. Log `final-accepted-focused.log` retenido.
- Frontend:19/19; Chrome local390/1440, teclado, sin overflow/errores, selección vacía, resultados mixtos, prepare→publish, reintento exacto y GETs diferidos ante401/403/409. Capturas comprobadas; red salvo harness local interceptada.
- Integración: BUSINESS_ONLY sin fuente propia Business/Producto → TARGET_REQUIRED → preparación explícita TARGET_READY → GET READY → publicación explícita ENQUEUED/QUEUED → worker real SUCCEEDED/COMPLETE → GET CURRENT. Fuente y destino Business correctos, Producto/apex ajenos byteidénticos. JWT RS256 local y authorizer/handlers reales; no mocks de sus respuestas. Solo Hostinger/DNS/readiness y publicación/verificación externa son simulados en directorios temporales propios.
- Pérdida de respuesta: handler real confirma efecto202, transporte devuelve503 antes de llegar al cliente, cliente guarda solicitud incierta y repite exactamente la almacenada; mismo operation/job/source, una generación. Entitlement/revisión modificados bloquean409 antes de efectos. Casos sin sesión, no allowlist y service identity deniegan antes de construir servicios.
- `npm run lint` final del controlador exit0, cero errores/warnings. Fallo transitorio de un import no usado en extracción reproducido y cerrado; no se oculta como baseline.
- `npm run build` previo a la extracción de fixture: exit0, Next16.4.1/Turbopack, tipos y39rutas. El build fresco de `45d2223` encontró TS5097 en imports `.ts` del nuevo helper `*.test-fixtures.ts`: **se retira la inferencia de que aquel build anterior certificaba la rama completa**. El helper entra al chequeo productivo aunque sea test-only. Corregido en `a088433` únicamente con siete imports usando el alias `@/` ya compartido por TypeScript y el loader de pruebas. Build fresco final exit0, tipos completos y39/39rutas; full lint exit0, consumidores83/83 y controlador202/202. Log completo `task-6-alias-build.log` inspeccionado; revisión acotada independiente acepta el arreglo sin nueva rotura. Workspace-root +34avisos de tracing dinámico existentes conservados. No Docker local ni supresión del chequeo de tipos.
- `git diff --check` exit0 y diff de backend productivo/DTO/rutas/dependencias/plantillas contra5fc239e vacío.

## Revisión por tarea

Task5 encontró tres defectos reales: GET tardío tras denegación, GET previo a409 y respuesta de otro partner. Implementador los reprodujo/corrigió; re-review acepta los tres sin nuevos Critical/Important. Task6 encontró import no usado y prueba de replay que no simulaba pérdida: corregidos; re-review acepta ambos sin nuevos bloqueantes.

La revisión completa de `5fc239e..9fd7526` encontró un único P2: recibos aceptados impedían continuar TARGET_PENDING, reintentar tras job FAILED/CANCELLED o actualizar CURRENT dentro de la misma vista. Una única ola frontend `f4ca0d1` / reporte `45d2223` añade continuación deliberada por fila únicamente tras un GET iniciado después de aceptar el recibo. Archiva ese recibo, no selecciona ni publica: exige nueva revisión/confirmación/requestId y mantiene consentimiento CURRENT, bloqueo de siblings y replay incierto exacto. API/model23/23 y Chrome HTTP falso cubren las transiciones. El único re-review acotado `final-wave-review.md` marca ADDRESSED sin nuevos Critical/Important. No hay hallazgos fuente de esa revisión pendientes; el build de fixture y el baseline global son gates separados.

El gate local de build del fixture quedó cerrado por `a088433` y `task-6-build-fix-review.md` (ADDRESSED, sin nuevos Critical/Important). No se abrió una segunda ola de hallazgos frontend ni una nueva revisión integral. La suite global no verde continúa como gate de integración, no se dispensa por los resultados focales.

## Baseline global no verde

Se ejecutaron los76scripts `test:*` declarados:66exit0 y10exit1 antes de modificar backend productivo (que sigue intacto). NO afirmar suite global verde. Fallan:

- `test:product-destination-reconcile-packaging` (requiere Node20 real configurado, no24).
- `test:publication-jobs` (dos expectativas históricas de código de refresh frente al coordinador vigente).
- `test:jairo-business-source-dry-run` (pin/artefacto canónico histórico).
- `test:jairo-business-publication-preview` (tres fixtures históricos de identidad target).
- `test:jairo-business-master-package-drift-recovery`, `test:business-master-runtime-packaging`, `test:business-consent-master-migration` (dependencia de runtime Node20 explícito).
- `test:jairo-business-sftp-capability-renewal` (cinco escenarios históricos de renovación/preview).
- `test:business-consent-cutover-runtime` (Node20, bytes LF frente a checkout CRLF y standalone previo al build).
- `test:business-cutover-runtime-packaging` (Node20 explícito).

No se alteraron fixtures/servicios ajenos para ocultarlos. El tsc general del implementador también reportó29diagnósticos existentes en tests ajenos; no es el typecheck productivo de Next, que pasó. Logs completos y clasificación en workspace ignorado `.superpowers/sdd/2026-10-20-business-master-sites-manual-delivery/`; conservar mientras haya gates abiertos.

## Límites y siguiente gate

No operación sobre Hostinger/DNS/SFTP, publicación de cliente, cuentas, campañas o presupuesto. La UI local no demuestra deploy ni autorización de la sesión humana real. Debe verificarse Super Admin en app.partnerhub.club y que Jairo elija el primer partner a entregar antes de un POST productivo. No elegir un cliente como prueba. El master público negocio.ganomaster.pro es separado del paquete interno que usa el generador.

No regenerar Claudia hasta integrar su excepción pública de medición de manera durable: este panel no implementa un bloqueo específico para Claudia. Tampoco modifica su CTA/mensaje, IDs, gate query/referrer o recepción en cuentas. El identificador de reintento incierto solo vive mientras el panel está montado; al salir, revisar estado del servidor antes de otra operación.

Disposición de los límites expresos del revisor: deploy/sesión humana/primer partner y proveedores reales quedan para el gate operacional separado; Claudia queda fuera por la excepción documentada. Las comprobaciones del backend reutilizado no son una certificación nueva de seguridad/concurrencia multiproceso. QA con capturas/teclado/red simulada no certifica todos los navegadores, lectores de pantalla, cargas altas o la ruta productiva. Producto/Marca solo tienen control de no-regresión del diff, no nueva calificación pública. Ninguno de estos límites se presenta como prueba pasada ni como permiso para cambiar cuentas o publicar un cliente.

Siguiente paso técnico: obtener verificación reproducible del baseline con Node20 requerido y resolver/clasificar los fixtures históricos bajo alcance separado; no cambiar contratos o plantillas compartidas para ocultar esos fallos dentro de este ticket. Después, integrar/desplegar la conexión y comprobar sesión Super Admin antes de una entrega manual elegida expresamente por Jairo. No se solicita otra aprobación de la misma especificación/plan ya ejecutados. No hubo notificación a otros chats ni nueva automatización.

## Decisiones de ejecución

1. Retomar plan aprobado en Task5, no reconstruir backend ya integrado; si el contrato resulta insuficiente, requiere follow-up acotado.
2. Rama codex/ para subagente con propiedad frontend Antigravity; cambia nomenclatura, no autoridad ni producto.
3. Adaptación de helpers SDD a PowerShell/apply_patch porque Jairo prohíbe Bash; mismos marker/ledger/paquetes de revisión ignorados.
4. Impeccable Operate/harden preservó el sistema visual existente; sin rediseño ni PRODUCT/DESIGN nuevos. Una advertencia de paleta se mantuvo por autoridad del incumbente.
5. Fallos globales de baseline visibles, fuera del alcance frontend; no se dispensa el gate de integración/despliegue ni se anuncia verde global.
6. Extraer fixture de test para ejercitar cliente+backend sin duplicar su setup; si alterara semántica, las pruebas existentes lo detectarían (57/57tras extracción y conjunto final198/198).
7. Reparar TS5097 dentro del helper nuevo usando aliases existentes, en vez de desactivar tipos o cambiar configuración; build y consumidores finales verifican esa resolución. Si fuera incorrecta, bloquearía el build/test, no se acepta por una mera inferencia de código productivo idéntico.

Estado local JSON del checkout raíz conciliado por el controlador y validado contra `project-status.schema.json`. Progreso y métricas financieras no cuantificados permanecen `null`; no se inventan porcentajes, ingresos o fechas de entrega. Decisión futura de Jairo: primer partner para el smoke operativo, solo después de los gates técnicos y de sesión. No hay autorización implícita de regeneración de Claudia.
