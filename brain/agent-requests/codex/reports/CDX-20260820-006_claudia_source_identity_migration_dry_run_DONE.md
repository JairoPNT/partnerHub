# CDX-20260820-006 — Reporte DONE

## Resultado

Se implementó un comando sin APPLY que prepara un backup y dos fuentes proyectadas exclusivamente dentro del directorio de auditoría:

- Product: copia de la fuente real, cambiando únicamente `site.id` y `site.appName` a `claudia-calero-product`.
- Personal Brand: objeto `CONFIG` leído de `plantillas-de-pagina/personal-brand/config.js`, con identidad `claudia-calero` y dominio `claudiacalero.pro`. No transforma ni mezcla el JSON Product.

La fuente real, verificaciones, historial, PublishingTargets y proveedores permanecen read-only. El resultado siempre contiene `mode: DRY_RUN` y `changed: false`.

## Allowlist obligatoria

El manifest admite exactamente esta migración:

```json
{
  "confirmation": "DRY_RUN_CLAUDIA_SOURCE_IDENTITY",
  "allowlist": [{
    "sourceSiteId": "claudia-calero",
    "productSiteId": "claudia-calero-product",
    "brandSiteId": "claudia-calero",
    "baseDomain": "claudiacalero.pro",
    "expectedSourceHash": "<SHA256_REAL_DE_CLAUDIA_CALERO_JSON>"
  }]
}
```

El comando bloquea hash distinto, fuente que no sea `PRODUCT / claudia-calero`, plantilla que no sea PERSONAL_BRAND y cualquier `claudia-calero-product.json` preexistente.

## Backup y hashes

Ruta por defecto al ejecutar en EasyPanel:

`/data/generated-sites/.migration-audits/<timestamp>-claudia-source-identity-dry-run/`

Contenido:

- `backup/claudia-calero.json`
- `backup/claudia-calero.verification.json`, si existe
- `backup/claudia-calero.history.json`, si existe
- `projected/claudia-calero-product.json`
- `projected/claudia-calero.json` — Personal Brand
- `manifest.json`
- `dry-run.json`

La salida incluye SHA-256 no vacíos para fuente real, plantilla Brand normalizada, ambas proyecciones y los dependientes encontrados. El hash real Product no se conoce en este chat porque no se leyó EasyPanel; debe capturarse y aprobarse antes del DRY_RUN.

Hash del archivo canónico Brand en este commit, bytes del archivo: `ab91c4ffdd17a32a2c0d2bc50deafbc43127ebfd390a3aae86b690c375b4b7d7`.

## Comandos EasyPanel pendientes

Preflight estrictamente read-only para obtener el hash que debe insertarse en el manifest:

```sh
sha256sum /data/generated-sites/.sources/claudia-calero.json
```

Después de revisar/cargar el manifest autorizado en `/data/generated-sites/.migration-inputs/CDX-20260820-006/manifest.json`, ejecutar desde `/app/app/web`:

```sh
npm run maintenance:claudia-source-identity-dry-run -- --manifest=/data/generated-sites/.migration-inputs/CDX-20260820-006/manifest.json
```

Este segundo comando crea solo el paquete de auditoría. No escribe fuentes productivas ni incluye una opción APPLY.

## Reversibilidad y dependencias

- El DRY_RUN es reversible eliminando únicamente su carpeta de auditoría; las fuentes reales no cambian.
- El apex `claudiacalero.pro` queda `preserved: true`, `rewritten: false`.
- Verificación e historial se respaldan y hashean, pero no se migran ni reinterpretan.
- La proyección Brand contiene placeholders de la plantilla canónica. Completar datos Brand reales requiere otro ticket y no debe copiar datos semánticos del Product automáticamente.
- Un APPLY futuro deberá ser un ticket nuevo con orden transaccional, hashes revisados, backup previo y rollback; no forma parte de CDX-006.
- CDX-005 debe continuar bloqueado hasta que una migración de fuentes autorizada haya dejado identidades compatibles.

## Verificación

- `npm run test:claudia-source-identity-dry-run`: PASS, 3/3.
- ESLint focalizado `--no-ignore`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.
- Warning NFT/Turbopack preexistente durante build.

## Archivos

- `app/web/scripts/claudia-source-identity-dry-run.mjs`
- `app/web/scripts/claudia-source-identity-dry-run.test.mjs`
- `app/web/package.json`
- `brain/agent-requests/codex/requests/CDX-20260820-006_claudia_source_identity_migration_dry_run.md`
- `brain/agent-requests/codex/reports/CDX-20260820-006_claudia_source_identity_migration_dry_run_DONE.md`

## Autorizaciones pendientes

1. Push/PR/deploy del código del DRY_RUN.
2. Ejecutar únicamente `sha256sum` read-only en EasyPanel.
3. Crear/cargar y revisar el manifest con ese hash.
4. Ejecutar el DRY_RUN en EasyPanel.

No están autorizados APPLY, overwrite/rename de fuentes, targets, DNS, Hostinger, publicación ni regeneración.

## Git

- Rama: `codex/CDX-20260820-006-claudia-source-identity-migration`.
- PR/deploy: no ejecutados.
