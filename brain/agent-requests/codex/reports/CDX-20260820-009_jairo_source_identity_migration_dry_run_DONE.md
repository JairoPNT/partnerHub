# CDX-20260820-009 — Reporte DONE

## Resultado

Comando especializado exclusivamente DRY_RUN para resolver la colisión `jairo-pinto` PRODUCT frente a la identidad canónica PERSONAL_BRAND.

- Respalda y hashea `jairo-pinto.json`, verificación e historial si existen.
- Proyecta Product a `jairo-pinto-product`, cambiando solo `site.id` y `site.appName`.
- Proyecta Brand a `jairo-pinto` desde `/app/runtime-assets/personal-brand-config.js`; no transforma Product.
- Escribe únicamente bajo `.migration-audits`.
- Devuelve siempre `changed:false`; APPLY no existe.
- Preserva `jairopinto.pro`; no toca fuentes, targets, DNS, Hostinger, publicación ni regeneración.

## Evidencia de entrada

- CDX-007: `SOURCE_COLLISION:jairo-pinto`.
- Entitlement: PRODUCT, BUSINESS, PERSONAL_BRAND.
- Verificación esperada: `6e694d66f58c20053eaf2bcdc121db41b7e9e3e0980206d7af0cbe2cf5f12e82`.
- Historial esperado: `77b1fdbca68992731f8d9b9e2e2b03027fb7da37782c7730967ac9201bdefbc0`.
- Backup previo del plan: `/data/generated-sites/.migration-audits/2026-08-21T12-37-14.161Z-jairo-pinto-identity-plan`.

El comando reporta los hashes observados; el operador debe compararlos con esta evidencia. El hash real de la fuente se exige dentro del manifest.

## Manifest

```json
{
  "confirmation": "DRY_RUN_JAIRO_SOURCE_IDENTITY",
  "allowlist": [{
    "sourceSiteId": "jairo-pinto",
    "productSiteId": "jairo-pinto-product",
    "brandSiteId": "jairo-pinto",
    "baseDomain": "jairopinto.pro",
    "expectedSourceHash": "<SHA256_REAL_JAIRO_PINTO_JSON>"
  }]
}
```

## Comando EasyPanel posterior

Después de deploy, hash read-only y manifest aprobado, desde `/app`:

```sh
npm run maintenance:jairo-source-identity-dry-run -- --manifest=/data/generated-sites/.migration-inputs/CDX-20260820-009/manifest.json
```

Backup resultante: `/data/generated-sites/.migration-audits/<timestamp>-jairo-source-identity-dry-run/` con fuente/dependientes, manifest, dry-run y ambas proyecciones.

## Verificación

- Tests focalizados: PASS 4/4.
- ESLint focalizado: PASS.
- Build: PASS.
- `git diff --check`: PASS.
- Warning NFT/Turbopack preexistente.

## Git y límites

- Rama: `codex/CDX-20260820-009-jairo-source-identity-dry-run`.
- PR/deploy/DRY_RUN productivo: no ejecutados.
- Sin APPLY ni operaciones productivas mutantes.
