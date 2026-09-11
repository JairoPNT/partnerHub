# CDX-20260911-001 — Personal Brand runtime template packaging — DONE

## Resultado

La imagen final ahora empaqueta la plantilla canónica completa de Personal Brand y copia de forma explícita sus dos comandos de mantenimiento read-only. Esto corrige el bloqueo observado en EasyPanel: `PERSONAL_BRAND_CANONICAL_TEMPLATE_MISSING_OR_UNREADABLE`.

## Cambios

- `Dockerfile`
  - Copia `plantillas-de-pagina/personal-brand/` al stage `builder`.
  - Copia esa carpeta al stage final `runner` como `/app/plantillas-de-pagina/personal-brand/`.
  - Copia explícitamente `jairo-personal-brand-master-package.mjs` y `prepare-jairo-personal-brand-publication-preview.mjs` a `/app/scripts/`.
- `app/web/scripts/personal-brand-runtime-packaging.test.mjs`
  - Contrato que valida la plantilla en builder y runner, los scripts en runner y sus comandos npm.
- `app/web/package.json`
  - Agrega `test:personal-brand-runtime-packaging`.

## Verificación

- Red: la nueva prueba falló inicialmente por la copia de plantilla inexistente.
- Green: `npm run test:personal-brand-runtime-packaging` — PASS (1).
- `npm run test:jairo-personal-brand-master-package` — PASS (7).
- `npm run test:jairo-personal-brand-publication-preview` — PASS (65).
- `git diff --check` — PASS.
- Revisión independiente: sin hallazgos bloqueantes; se endureció el test para comprobar específicamente el stage final y los comandos npm.

## Limitaciones de verificación local

- No se pudo ejecutar un build Docker: este equipo no tiene un daemon Docker accesible.
- El build Next local no pudo completarse en el worktree porque su instalación de dependencias quedó incompleta (`next` sin sus archivos runtime requeridos) después de la instalación aislada; no es un error producido por el cambio de `Dockerfile`.
- El siguiente auto-deploy de EasyPanel es la verificación de construcción de imagen. Después de que termine, solo se debe repetir el preview read-only de master package.

## Seguridad y alcance

- Sin cambios de DNS, Cloudflare, Hostinger, SFTP, secretos, destinos de publicación ni archivos remotos.
- No ejecuta publicación ni creación de paquete.
- Rama, commit y despliegue: pendientes al redactar este reporte.
