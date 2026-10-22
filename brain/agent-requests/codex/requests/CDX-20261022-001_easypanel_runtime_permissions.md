# CDX-20261022-001 — empaquetado runtime en EasyPanel

Owner: Codex backend/infrastructure. Corrección del despliegue real requerida por Jairo, sin DNS ni campañas. Base main4d8c1b0338e286f82d5b569f1b18b5aaf758ad63, PR240 fusionado. Rama `codex/CDX-20261022-001-easypanel-runtime-permissions` en worktree aislado business-consent-runtime, reutilizado tras cerrar011; evidencia anterior preservada. Sin otros source writers activos.

Estado: código y gates premerge completos. Causa demostrada por1119/1119bytes de archiveoficial y reproLinuxguard72/config0664/nlink1/pinexacto. Correctivo `a2fd82f178ea62f9f23cbbe0865cf4ebf5d700f3` soloDockerfile/test con RED/GREENnativo3pass, covering45pass/2WindowsPOSIXskip y lint0. Revisiónindependiente Approved/sinbloqueantes. BuildDockerfile real desde archiveoficialFIX con modos0664/0775 PASS, image95c37029…,smoke realNode20/no-writesPASS,scan2586files+595dirs sin022. PR/merge y auto-deploy a verificar a continuación. No corte/migración/publicación de Claudia por este correctivo.

## Resultado único

Diagnosticar y corregir la diferencia de empaquetado que hace fallar el build real de EasyPanel en inventory visit72 (`BUSINESS_CUTOVER_PROFILE_INVALID`), conservando todos los controles. El build local exacto de e9e36b8 pasa; EasyPanel240 termina Error22oct19:43:09Z después de compilar Next/types39 y COPY de runtime. No se ejecutó BEGIN/migración/publicación; no afirmar que el nuevo código quedó desplegado.

## Límites

- Primera fase diagnóstico read-only con evidencia exacta de path/tipo/mode/nlink y origen de bytes. Hipótesis: permisos de los COPY de archivo de GitHub distintos al archivo Git local; aún no confirmada, no parchar por suposición.
- Permitidos tras demostrar causa: mínimo Dockerfile y pruebas de empaquetado propias, helper build-only existente solo si necesario; no debilitar safePath/inventario, pins, controles de tipo/links/hardlinks/ancestros ni añadir exclusiones.
- Excluidos: servicios/store/controlador/autoridad/profiles/CLI, UI/assets/copy, Product/Brand, fuentes/targets/output reales, auth/Prisma/pagos, credenciales, DNS/SFTP/campañas, force/recovery, publicación y rollback de datos. No editar branch235 ni desplegarla sola.
- Dependencias:011 completo PR240. Parallel-safe: revisión/lectura documental; un solo implementador. Root mantiene brain/reportes y decisión técnica mínima; implementador reporta causa/propuesta antes de cambios de producto. Revisión independiente tras el fix, cubrir regresión real Linux sin repetir011 completo.
- Verificación: RED/GREEN reproducible del input real; bytes originales iguales; modos/owner/exec preservados salvo endurecimiento mínimo demostrado; tests focales, lint/build real desde procedencia medida, smoke de imagen sin proveedores. Mantener29tiposbaseline/22advisories/warnings divulgados, no waiver.

No nueva decisión comercial ni aprobación de ventana necesaria para investigar este fallo. Si la corrección requiere cambiar arquitectura/autoridad o no hay evidencia suficiente, detener el área afectada y reportar. Entrega próxima de composición235 y corte/publicación sigue separada.
