# CDX-20261021-011 — Especificación de integración preparada

Fecha2026-10-22. Owner Codex backend. Entrega de **diseño**, no DONE de implementación ni publicación. Jairo aprobó el alcance “Sí, reutilizar el flujo existente”; falta aprobación de esta especificación escrita y luego del plan técnico.

## Cambios

- Request011 con resultado/owner/áreas/dependencias y fases explícitas.
- Especificación `docs/superpowers/specs/2026-10-22-business-cutover-integration-design.md`: capacidad efímera genuina en el mismo grafo, lifecycle legacy conservado, cierre retenido en modo interno, plan determinista sin locks/eventos volátiles, auditoría interna schema2, perfiles fijos de runtime/plantilla, verificación entre imágenes y cancel/reopen guardados.
- Punto de commit por rename del claim completo a evidencia privada, propiedad terminal distinta del path global y resultado incierto poscommit explícito. Nueva operación nunca se elimina al completar la anterior. No booleans/JSON de autoridad, `--force`, takeover ni otro publicador.
- LIVE_PROJECT_STATE actualizado con merge/deploy238, estado011 y siguiente gate. Sin cambios de producto, tests, dependencias o datos.

## Revisión y verificación

Revisión propia de placeholders/contradicciones/scope, más revisión independiente de integridad/concurrencia: **sin Critical/Important ni Minor que requieran cambio**; lista para revisión humana escrita. Se explicitó sin cambiar el contrato el caso nuevo BEGIN antes del fsync/recibo/cleanup anterior. Revisión solo documental/focalizada de interfaces, no suites/build ni segunda ejecución de010. Reporte detallado ignorado `.local-secrets/sdd/CDX-20261021-011/spec-review.md`.

Límites considerados y retenidos: implementación/no-overwrite/rebind/cleanup necesitan pruebas011; perfiles/imágenes/tareas/ACL/canal reales son gates posteriores; root/mismoUID hostil, scripts externos y pérdida eléctrica/rollback no están garantizados;22 advisories npm siguen sin triage/waiver y composición debe identificar aplicabilidad. No se declara seguridad productiva certificada.

Comprobación live read-only con Chrome existente: PR238 Action **Success2026-10-22T14:08:53Z**, manifest-list `sha256:bf32a55e655b5bc6f22d8a95a1a15878097e61199c71c3d5cb01193f48405638`. Consola Sh, tarea visible `user-generator_partnerhub.1.b7b6ot1fhibbwy7mds244mpj3`, comando `NPM_CONFIG_UPDATE_NOTIFIER=false npm run maintenance:business-cutover-status` devolvió request010/protocolbusiness-cutover-v1, modeSTATUS, changed:false, localWritesMade:false, providerCallsMade:false, statusOPEN, reasons[], migrationStarted:false. Consola cerrada al terminar. Prueba presencia/lectura del protocolo en esa tarea, no exclusión de todas las tareas u operadores. No BEGIN/migración/SFTP/DNS/campañas ni cambio de la página pública.

**Build/test nuevos: NOT_RUN, entrega solo documental.** Gate010 Linux y sus resultados siguen en su informe, no se atribuyen a011. Diff-check staged de documentos PASS antes del commit; warnings Git de normalización LF/CRLF, no errores del diff. Rama `codex/CDX-20261021-011-business-cutover-integration-design`, base main522394bf00ffbeb45e892b60403835f8c8296ec6; código fuente intacto. Worktree aislado reutilizado y scratch010 conservado; checkout raíz ajeno intacto.

## Siguiente

Jairo revisa la especificación; tras aprobarla se prepara el plan técnico con subagentes/revisión por tarea, sin ejecutar producción por la sola aprobación del diseño. Después implementación011, composición235+010+011, pruebas/gates operativos y corte ya autorizado; Claudia usa el publicador existente y requiere verificación pública independiente. **Los ajustes de Claudia todavía no están entregados.** No volver a pedir la misma ventana de mantenimiento, ni crear monitor/apagado.
