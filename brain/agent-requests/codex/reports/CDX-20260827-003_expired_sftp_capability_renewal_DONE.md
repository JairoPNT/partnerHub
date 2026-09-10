# CDX-20260827-003 — DONE

## Resultado

Se implementó un workflow app-owned para retirar de los inputs activos la
evidencia SFTP expirada de CDX-20260827-001, preservarla byte por byte en un
archivo local inmutable y devolver el siguiente PREVIEW de probe sin conexión
al proveedor.

## Cambios

- PREVIEW read-only que fija manifest, target/connection binding, capability
  hash, evidencia de cleanup, timestamp, TTL, expiración y destino de archivo.
- Bloqueo fail-closed ante evidencia vigente, hash/JSON/binding drift, claim,
  archive collision o input incompleto.
- APPLY separado por mode, confirmation y plan hash exacto.
- Claim local propio, staging privado y renames guardados; rollback pre-commit
  restaura la evidencia activa y nunca la elimina.
- Journal de archivo y rerun idempotente `ALREADY_ARCHIVED`.
- Ninguna ruta crea adapter SFTP, llama proveedores o modifica target/paquetes.

## Archivos

- `Dockerfile`
- `app/web/package.json`
- `app/web/scripts/jairo-business-sftp-capability-renewal.mjs`
- `app/web/scripts/jairo-business-sftp-capability-renewal.test.mjs`
- Request y este reporte.

## Verificación

- Tests propios: 7/7 PASS.
- Publication preparation CDX-20260827-001: 7/7 PASS.
- SFTP capability probe: 9/9 PASS.
- Business master package: 7/7 PASS.
- Guarded ecosystem publication: 18/18 PASS.
- Total focalizado/regresión: 48/48 PASS.
- ESLint focalizado `--no-ignore --max-warnings=0`: PASS.
- Next.js production build y TypeScript: PASS; solo warnings preexistentes de
  workspace/NFT.
- `git diff --check`: PASS.

## Git

- Base: `origin/main` `29c528009c8adc00fdb703e46fab79756682be0c`.
- Rama: `codex/CDX-20260827-003-expired-sftp-capability-renewal`.
- Commit y PR se registran en la entrega final.

## Seguridad y operaciones

- No se ejecutaron EasyPanel, SFTP, Hostinger, DNS, HTTPS, publicación ni
  cambios productivos.
- La evidencia productiva esperada está fijada por SHA-256 y solo se mueve a
  un archivo local sibling bajo `.publication-inputs`.
- Fuentes, master, paquete de Jairo, PublishingTarget y remoteRoot quedan fuera
  de la superficie de mutación.
- Las 12 vulnerabilidades `npm audit` ya presentes permanecen fuera de alcance;
  no se cambiaron dependencias.

## Follow-up

Sí. Tras merge/deploy:

1. Ejecutar PREVIEW del archivado.
2. Autorizar y ejecutar APPLY con el plan hash revisado.
3. Autorizar el `nextProbePreview.planHash` emitido y ejecutar el probe SFTP.
4. Repetir `PACKAGE_PREPARATION_PREVIEW` de CDX-20260827-001.
