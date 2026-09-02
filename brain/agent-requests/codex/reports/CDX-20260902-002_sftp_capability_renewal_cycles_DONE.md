# CDX-20260902-002 — DONE

## Resultado

El renovador SFTP ya admite ciclos sucesivos. El PREVIEW deriva el hash de la
capability activa validada, y APPLY conserva cada evidencia vencida en un
archivo inmutable separado por su hash de contenido. Los archivos de ciclos
anteriores ya no bloquean una capability activa distinta.

## Cambios

- Eliminado el hash de capability fijado en build.
- Nuevo namespace de renovación `CDX-20260902-002`, compatible con el archivo
  histórico `CDX-20260827-003` sin modificarlo.
- Plan dinámico ligado a bytes activos, manifest, target, conexión, alcance y
  vencimiento validados.
- Colisión fail-closed cuando la misma capability existe activa y archivada.
- Journal por hash con `planMaterial` para verificar un replay idempotente del
  plan exacto sin depender del estado mutable posterior.
- Claim, recheck previo, rollback y ausencia de operaciones remotas preservados.

## Archivos

- `app/web/scripts/jairo-business-sftp-capability-renewal.mjs`
- `app/web/scripts/jairo-business-sftp-capability-renewal.test.mjs`
- Request y este reporte

## Verificación

- Renovación SFTP: 9/9 PASS, incluidos dos ciclos completos.
- Probe SFTP: 9/9 PASS.
- Preparación de capability: 5/5 PASS.
- Preparación de publicación: 7/7 PASS.
- Publicación protegida: 18/18 PASS.
- Total focalizado/regresión: 48/48 PASS.
- ESLint `--no-ignore --max-warnings=0`: PASS.
- Next.js production build y TypeScript: PASS; solo warning NFT/Turbopack
  preexistente.
- `git diff --check`: PASS.

## Git

- Base: `origin/main` `980145d13beb7d9cc2ac111a772ec8cc458ba161`.
- Rama: `codex/CDX-20260902-002-sftp-capability-renewal-cycles`.
- Commit de implementación: `94c881a`.
- Push/PR/merge: pendientes de autorización específica.

## Seguridad y operaciones

- No se ejecutaron SFTP, Hostinger, DNS, SSL, EasyPanel APPLY ni publicación.
- No se modificaron capabilities, archivos de auditoría ni datos generados de
  producción.
- PREVIEW continúa sin adaptador, proveedor ni escritura remota.

## Follow-up

Sí. Tras push, revisión, merge y autodeploy, ejecutar el PREVIEW de renovación.
El archivado local y el nuevo probe SFTP requieren autorizaciones separadas.
