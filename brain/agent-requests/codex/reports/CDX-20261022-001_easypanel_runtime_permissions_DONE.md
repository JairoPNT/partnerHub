# CDX-20261022-001 — correctivo de permisos del empaquetado EasyPanel

Owner: Codex backend/infra. Fecha2026-10-22. Resultado **CODE_VERIFIED**, no publicación de Claudia. Revisión independiente premium de seguridad filesystem: Approved, sin Critical/Important/Minor nuevos. PR/merge y resultado del auto-deploy se verifican después de esta instantánea premerge; no se infieren del build local.

## Causa demostrada

PR240 integra011 en main `4d8c1b0338e286f82d5b569f1b18b5aaf758ad63`, pero EasyPanel termina Error19:43:09Z en inventoryvisit72 después de Next/types39. El archivo oficial de GitHub conserva bytes correctos y permisos distintos del Gitarchive local:1119/1119miembros exactos a Git, archivos0664 y carpetas0775. Reproducción nativa del dobleCOPY de config: regulartrue/linkfalse/nlink1/uid0/gid0, SHA256 `f56ec79877aef16355e29412f51640bda7c87895de06ef93f44c8add6de3ab32`, modo0664, Node20.20.2; inventario sin cambios rechaza exactamentevisit72:108. No se conoce ni inventa el primer path real de EasyPanel.

## Cambios e interfaces

Rama `codex/CDX-20261022-001-easypanel-runtime-permissions`, base4d8c1b0. Código `a2fd82f178ea62f9f23cbbe0865cf4ebf5d700f3`: solo `Dockerfile` y `app/web/scripts/business-consent-cutover-runtime-packaging.test.mjs`,53inserciones/4eliminaciones.

Antes de inventariar, el layout fijo `/app` elimina únicamente permisos writegroup/other de directorios físicos y archivos regulares single-link. El paso estático previo también añade `-links 1`; ninguno sigue enlaces ni cambia un destino externo hardlink. Preserva bytes, owner, inode/nlink y execute. Inventario/tipos/path/pins/exclusiones/catches/autoridad se mantienen: links/hardlinks/otros siguen rechazados. Sin módulo/helper runtime nuevo, UI/assets, `/data`, UID productivo, DNS/SFTP, fuentes/targets, pagos/auth, campañas ni recuperación de claims.

Decisión del controller: endurecer el layout final construido, no relajar el inventario ni normalizar source. Coste si es incorrecta: acotar/revertir el paso build-only y repetir gates archive/Linux/deploy antes de BEGIN; nunca aplicar chmod a datos/host/credenciales o destinos externos.

## Verificación

- RED nativo LinuxNode20:0pass/2fallos esperados/11filtrados (hardlink externo alterado por paso antiguo; hardening final ausente). GREEN:3pass/0fail/10filtrados (dos conductuales+uno wiring). Los tests extraen/ejecutan comandos reales del Dockerfile, no otro normalizador.
- Covering de cinco suites packaging:47total/45pass/0fail/2WindowsPOSIXskip; dos casos nativos ejecutados aparte, no contar filtrados/omisiones como PASS. ESLint MJS explícito y diff-check0; controller repitió lint focal0.
- Archivo oficial exacto del FIX tras subir rama personal, HTTP200/144404114bytes: SHA256 `eaa647d59f15fbcaee5720df337115189e34b6ee9b0a4757a2a8fe38ec8a7026`. Auditoría rawTAR1119/1119Buffer==Git,0missing/extra/mismatch, modos originales0664/0775 conservados. Solo se elimina prefijo único GitHub al preparar contextoTAR; data/tipo/mode/uid/gid/mtime conservados, checksum/path recalculados. Contexto SHA256 `131dabb84ec96c44b6a7465f5aed0af768ce386adb33df9ddb2d223d113d4a6e`, sin extracción Windows/overlays.
- Dockerfile real sin sustitución: build0, Next/type39/assembly/inventario/CLI correctos. Imagen `cdx001-runtime-fix:a2fd82f`, manifest-list `sha256:95c370291fb1fdb7c32cd810b4685f490807c40d6af3d6ca8f4aba20a7a26623`, plataforma `sha256:bd5d0aa5e2c2b9bf17509b09b4e5bc1156b3510ab7aab87d64e4d5afe3033f6f`, config `sha256:48ca19e5d773b5b9934dd7a9ba699bb22acb9e05cd4662682cff06ffbf7a9b1f`. No registry push.
- Smoke real Node20.20.2/UID0: imports shippedCLI/maintenance/coordinator y versiones correctos; sidecar exactnull; BEGIN en proceso y CLI subprocess bloquea2/ARTIFACTS_UNAVAILABLE con flagsfalse, sin claim/package/metadata. Snapshots físicos del output propios idénticos incluidos dev/ino/mtime/ctime. Networknone/fetchdenied; cero proveedores/publicación.
- Scan nativo `/app`:2586regularfiles+595dirs, todos sin022, filesnlink1/no symlinks/otros. Incluye CLI final copiada después del inventario. No equivale a dos perfiles preparados para el corte.

## Evidencia, riesgos y siguiente gate

Workspace preservado `.superpowers/sdd/2026-10-22-easypanel-runtime-permissions/`: diagnostic/fix/review-report.md, audits1119porarchivo, rawTARs, logsRED/GREEN/47packaging/build/inspect/smoke y snapshot/commands. Controller leyó reportes/logs y resolvió CannotVerify de inventario heredado con revisión011 y reproducción medida; gate de imagen asignado cerrado con datos anteriores. No se repiten011191/244/T6 ni se atribuyen sus conteos a este ticket. Primer harness de Dockerfileabsoluto conTAR falló antes de producto y fue corregido/documentado.

Persisten22advisories npm3moderate/18high/1critical sin triage/waiver y warning NFT de Next;29tipos ajenos heredados no revalidados ni dispensados aquí. Ningún test certifica seguridad. Contenedor smoke efímero `--rm` eliminado con su output temporal tras guardar evidencia; sin volúmenes ni datos/recursos productivos eliminados. Archivos/imágenes/evidencia conservados.

Siguiente: integrar por PR y comprobar auto-deploy real. Después componer235 con main+010/011 (dos conflictos código+dos brain ya identificados), ambos artefactos revisados y hechos operacionales antes de corte/publicación existente de Claudia. No afirmar nuevo runtime desplegado ni ajustes públicos por este correctivo premerge; ventana ya autorizada, sin nueva decisión comercial requerida.
