# CDX-20260820-007 — Reporte DONE

## Dependencia satisfecha

CDX-006 fue validado en producción: `changed:false`, `blocked:false`, apex preservado, proyecciones Product/Brand correctas y backup en `.migration-audits`. CDX-007 reutiliza el patrón exclusivamente como planificador; no implementa migración.

## Inventario base y proyección

| Orden | Partner | Estado fuente CDX-004 | Proyección inicial | Gate |
| ---: | --- | --- | --- | --- |
| 1 | `claudia-calero` | PRODUCT / VERIFIED | `claudia-calero-product`, `claudia-calero-business`, `claudia-calero` según entitlement validado | Piloto DRY_RUN validado; cualquier migración sigue separada |
| 2 | `jairo-pinto` | PRODUCT / VERIFIED | según entitlement real exportado | Requiere entitlement + hashes |
| 3 | `lida-castaneda` | PRODUCT / VERIFIED | según entitlement real exportado | Requiere entitlement + hashes |
| 4 | `yenny-garcia` | PRODUCT / VERIFIED | según entitlement real exportado | Requiere entitlement + hashes |
| 5 | `blanca-ruiz` | null / VERIFIED | ninguna mientras sea null | Bloqueado `ECOSYSTEM_TYPE_NULL` |
| 6 | `dorian-higuita` | null / VERIFIED | ninguna mientras sea null | Bloqueado `ECOSYSTEM_TYPE_NULL` |

La lista excluye `ganomaster`, que es master y está fuera de alcance. No se infieren ecosistemas para ningún partner.

## Comportamiento del comando

- Exige exactamente un `activationLeadId/siteId` allowlisted.
- Lee un inventario revisado y un export de entitlements reales; ambos requieren SHA-256 en el manifest.
- Lee fuentes canónicas candidatas, verificación, historial y PublishingTargets únicamente para detectar evidencia/conflictos.
- Proyecta `<slug>`, `<slug>-product`, `<slug>-business` solo para ecosistemas incluidos en el entitlement.
- Un ecosistema: apex redirige al host proyectado de ese ecosistema.
- Dos o más: apex redirige a `brand.<dominio>`; si PERSONAL_BRAND no está incluido, bloquea `MULTI_ECOSYSTEM_BRAND_REDIRECT_UNENTITLED`.
- Apex siempre queda `preserved:true`, `rewritten:false` y nunca es target.
- Detecta colisiones de source siteId/ecosistema, target siteId y hostname.
- Escribe solo evidencia bajo `.migration-audits`; siempre devuelve `changed:false`.
- `--apply`/`--mode=APPLY` están rechazados y no existe persistencia de fuentes/targets.

## Inputs y comando EasyPanel pendiente

Inputs revisados bajo `/data/generated-sites/.migration-inputs/CDX-20260820-007/`:

- `partners-inventory.json`: exactamente los seis partners, sin masters.
- `partner-entitlements.json`: `activationLeadId`, `siteId`, `includedEcosystems` derivados del contrato real.
- `<siteId>-manifest.json`: confirmation, hashes de ambos archivos y allowlist de un partner.

Ejemplo de ejecución para el siguiente partner autorizado, desde `/app`:

```sh
npm run maintenance:all-partner-source-identity-dry-run -- --inventory=/data/generated-sites/.migration-inputs/CDX-20260820-007/partners-inventory.json --entitlements=/data/generated-sites/.migration-inputs/CDX-20260820-007/partner-entitlements.json --manifest=/data/generated-sites/.migration-inputs/CDX-20260820-007/jairo-pinto-manifest.json
```

No se recomienda volver a ejecutar Claudia salvo auditoría específica; el siguiente candidato operativo es Jairo Pinto, condicionado a obtener su `activationLeadId`, entitlement y hashes reales.

## Backup

Cada ejecución crea únicamente:

`/data/generated-sites/.migration-audits/<timestamp>-<siteId>-identity-plan/`

con inventario, entitlements, manifest, identidades/hash de fuentes encontradas, targets existentes y `dry-run.json`. Verificación/historial se hashean y reportan; no se copian ni modifican en este plan.

## Pruebas y build

- `npm run test:all-partner-source-identity-dry-run`: PASS, 4/4.
- ESLint focalizado `--no-ignore`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.
- Warning NFT/Turbopack preexistente.

## Archivos

- `app/web/scripts/all-partner-source-identity-dry-run.mjs`
- `app/web/scripts/all-partner-source-identity-dry-run.test.mjs`
- `app/web/package.json`
- `Dockerfile`
- request y reporte CDX-007.

## Riesgos y autorizaciones

- Falta export productivo de entitlements/activationLeadId para cinco partners; sin él el comando no debe ejecutarse.
- Blanca/Dorian requieren decisión operativa explícita de ecosystemType.
- La regla multi-ecosistema exige Brand; un entitlement multi sin Brand queda bloqueado para decisión de arquitectura.
- La proyección no autoriza creación de fuentes ni targets.

Autorizaciones pendientes: push/PR/deploy; export read-only de entitlements; revisión de hashes; selección explícita de un partner; carga de inputs; ejecución DRY_RUN individual. No se autoriza APPLY, DNS, Hostinger, publicación o regeneración.

## Git

- Rama: `codex/CDX-20260820-007-all-partner-source-identity-plan`.
- PR/deploy: no ejecutados.
