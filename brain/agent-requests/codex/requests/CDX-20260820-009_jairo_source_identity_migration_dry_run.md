# CDX-20260820-009 — Jairo source identity migration DRY_RUN

## Evidencia de dependencia

CDX-007 en producción devolvió `SOURCE_COLLISION:jairo-pinto`: la fuente actual es PRODUCT, mientras la identidad canónica reserva `jairo-pinto` para PERSONAL_BRAND.

## Objetivo

Preparar backup/hash y proyecciones aisladas `jairo-pinto-product` Product y `jairo-pinto` Brand desde el artefacto canónico runtime.

## Límites

Exclusivamente DRY_RUN, `changed:false` y escritura bajo `.migration-audits`. Sin APPLY, overwrite de `.sources`, PublishingTargets, DNS, Hostinger, publicación, regeneración, pagos, ledger o UI.
