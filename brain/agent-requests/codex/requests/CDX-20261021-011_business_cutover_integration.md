# CDX-20261021-011 — Integración del corte Business existente

Owner: Codex backend. Revisión independiente de integridad/concurrencia: premium por propiedad durable, migración y reapertura productiva.
Estado: especificación y plan técnico aprobados explícitamente por Jairo el2026-10-22. Implementación y verificaciones completas con subagente por tarea/revisión independiente; integraciónPR pendiente de ejecución; ningún corte productivo ejecutado.

Checkpoint22oct: seis tareas/revisión final y única corrección cerradas en `e9e36b823589707388f07172073ea4fc57c28640`;43/43focales/lint0/re-review aprobado. Nuevo build real1118/1118Gitexactos y4smokesCLI pasan; suite finalTS200pass0fail2skips/MJS244pass0fail1skipWindows. Primera corrida concurrenteTSfalló un childstatusnull compatible con timeout; conservada, foco/full sin otras cargas pasan sin cambiar código/límite. Reporte IMPLEMENTATION conserva13decisiones/costes, retractaciónCRLF y límites. IntegraciónPR a continuación, no publicación pública;235/composición/hechosoperacionales separados. No repetir tareas ni010.

## Resultado único

Conectar CDX009 y CDX010 mediante capacidades reales de la misma operación, retener el cierre durante migración y despliegue, y permitir cancelación/reapertura únicamente mediante verificación fija de hechos. Reutilizar lifecycle/coordinador/publicador existentes; no crear otro publicador ni parche SFTP.

- Current allowed: implementación acotada de las seis tareas del plan aprobado, este request, checkpoint/reporte propios y actualización acotada de LIVE_PROJECT_STATE. Sin BEGIN/migración/publicación productivos durante esta implementación.
- Future implementation allowed, tras aprobar especificación y plan: módulos existentes `business-consent-master-release.mjs`, `business-master-transition-lifecycle.mjs`, `businessCutoverClaimStore.ts`, `businessCutoverMaintenanceService.ts`; módulo interno de integración/perfil/verificador y CLI dedicada; tests focalizados y empaquetado Dockerfile/package scripts estrictamente necesarios.
- Excluded: editar UI/assets/copy/registro de artefactos revisados235, auth/APIs/Prisma/pagos, clientes de proveedores, DNS, campañas/Ads, credenciales, comandos manuales SFTP, outputs reales o recuperación extraordinaria/borrado de claims. La composición posterior235 no autoriza rediseñar sus bytes/consentimiento.
- Dependencies:009/PR237 y010/PR238 fusionados. Gate Linux010 aprobado. La composición del sucesor235 sobre main y su validación son entregas dependientes, no se ocultan dentro de este request.
- Parallel-safe: revisión documental read-only, frontend independiente sin editar contratos/generadores/packaging/output compartidos. Las modificaciones de lifecycle/store/controller/integración son secuenciales, con un owner y revisión por tarea; no asignar dos writers de esos archivos.
- Branch de implementación: `codex/CDX-20261021-011-business-cutover-integration`, desde mainc30c45faac8c5712c78d5fffc23181cea7514b57 tras fusionar PR239 documental. Worktree aislado existente `C:/Users/jairo/.codex/worktrees/business-consent-runtime/PartnerHub`, evidencia010/planificación011 preservada. Checkout raíz ajeno intacto.

## Autoridad y siguiente gate

La ventana de mantenimiento/publicación de Claudia ya está autorizada; no pedirla de nuevo. Jairo aprobó expresamente especificación y plan técnico. Método: subagentes por tarea y revisión entre cada una. Gates actuales: implementación/revisiones y pruebas011; después composición235+010+011 y hechos operacionales reales. No BEGIN/APPLY/cancel/reopen productivos durante esta implementación.

Fuente: evaluación read-only `.local-secrets/sdd/CDX-20261021-010/integration-assessment.md`, informe Linux010 y GitHub. PR23582b6c5d separado, con conflictos observados; no fusionarlo/desplegarlo solo. Publicación/validación pública posterior debe acreditar los ajustes de Claudia; este conector por sí mismo no los publica.

Reporte de diseño: `brain/agent-requests/codex/reports/CDX-20261021-011_business_cutover_integration_DESIGN.md`. PR238 deploy Success14:08:53Z y STATUS productivo OPEN/changed:false/localWritesMade:false/migrationStarted:false comprobados por consola Sh. Eso no es retiro demostrado de todas las tareas ni aprobación del corte.

Plan: seis tareas secuenciales con límites y contratos productor/consumidor; scope/binding, captura+lifecycle, perfil/verificador, commit terminal, runner/packaging e integración/Linux. Reporte de planificación `CDX-20261021-011_business_cutover_integration_PLAN.md`. Composición235 y corte/publicación separados como dependencias; no se declaran completados al implementar el conector.
