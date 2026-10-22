# CDX-20261021-011 — Integración del corte Business existente

Owner: Codex backend. Revisión independiente de integridad/concurrencia: premium por propiedad durable, migración y reapertura productiva.
Estado: especificación escrita del PR239/head7c247f5 aprobada por Jairo el2026-10-22. Plan técnico preparado/revisado por el controller, pendiente aprobación del usuario; implementación no iniciada.

## Resultado único

Conectar CDX009 y CDX010 mediante capacidades reales de la misma operación, retener el cierre durante migración y despliegue, y permitir cancelación/reapertura únicamente mediante verificación fija de hechos. Reutilizar lifecycle/coordinador/publicador existentes; no crear otro publicador ni parche SFTP.

- Current allowed: este request, especificación `docs/superpowers/specs/2026-10-22-business-cutover-integration-design.md`, plan `docs/superpowers/plans/2026-10-22-business-cutover-integration.md`, checkpoint/reporte propios y actualización acotada de LIVE_PROJECT_STATE. Solo documentación/read-only en esta etapa.
- Future implementation allowed, tras aprobar especificación y plan: módulos existentes `business-consent-master-release.mjs`, `business-master-transition-lifecycle.mjs`, `businessCutoverClaimStore.ts`, `businessCutoverMaintenanceService.ts`; módulo interno de integración/perfil/verificador y CLI dedicada; tests focalizados y empaquetado Dockerfile/package scripts estrictamente necesarios.
- Excluded: editar UI/assets/copy/registro de artefactos revisados235, auth/APIs/Prisma/pagos, clientes de proveedores, DNS, campañas/Ads, credenciales, comandos manuales SFTP, outputs reales o recuperación extraordinaria/borrado de claims. La composición posterior235 no autoriza rediseñar sus bytes/consentimiento.
- Dependencies:009/PR237 y010/PR238 fusionados. Gate Linux010 aprobado. La composición del sucesor235 sobre main y su validación son entregas dependientes, no se ocultan dentro de este request.
- Parallel-safe: revisión documental read-only, frontend independiente sin editar contratos/generadores/packaging/output compartidos. Las modificaciones de lifecycle/store/controller/integración son secuenciales, con un owner y revisión por tarea; no asignar dos writers de esos archivos.
- Branch: `codex/CDX-20261021-011-business-cutover-integration-design`, desde main522394bf00ffbeb45e892b60403835f8c8296ec6. Worktree aislado existente `C:/Users/jairo/.codex/worktrees/business-consent-runtime/PartnerHub`, reutilizado tras cerrar implementación010; evidencia010 preservada. Checkout raíz ajeno intacto.

## Autoridad y siguiente gate

La ventana de mantenimiento/publicación de Claudia ya está autorizada; no pedirla de nuevo. Tras aprobar el alcance, Jairo aprobó expresamente la especificación del PR239 y pidió el plan técnico. Método ya elegido: subagentes por tarea y revisión entre cada una. Siguiente gate: revisión/aprobación del plan escrito; no pedir nuevamente el método. No BEGIN/APPLY/cancel/reopen productivos durante planificación.

Fuente: evaluación read-only `.local-secrets/sdd/CDX-20261021-010/integration-assessment.md`, informe Linux010 y GitHub. PR23582b6c5d separado, con conflictos observados; no fusionarlo/desplegarlo solo. Publicación/validación pública posterior debe acreditar los ajustes de Claudia; este conector por sí mismo no los publica.

Reporte de diseño: `brain/agent-requests/codex/reports/CDX-20261021-011_business_cutover_integration_DESIGN.md`. PR238 deploy Success14:08:53Z y STATUS productivo OPEN/changed:false/localWritesMade:false/migrationStarted:false comprobados por consola Sh. Eso no es retiro demostrado de todas las tareas ni aprobación del corte.

Plan: seis tareas secuenciales con límites y contratos productor/consumidor; scope/binding, captura+lifecycle, perfil/verificador, commit terminal, runner/packaging e integración/Linux. Reporte de planificación `CDX-20261021-011_business_cutover_integration_PLAN.md`. Composición235 y corte/publicación separados como dependencias; no se declaran completados al implementar el conector.
