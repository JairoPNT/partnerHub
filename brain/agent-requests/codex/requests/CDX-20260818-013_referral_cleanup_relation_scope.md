# CDX-20260818-013 — Corrección del alcance de limpieza de referidos

## Owner

Codex (Backend Lead).

## Dependencia

Follow-up de `CDX-20260818-011` y su `DRY_RUN` `9141bc3`.

## Objetivo único

Separar la eliminación de relaciones históricas de referidos de prueba del borrado físico de partners/leads, permitiendo limpiar `jairo-pinto-test` sin tocar partners publicados.

## Corrección requerida

El `DRY_RUN` actual bloquea toda operación porque los partners referidos tienen targets publicados. Eso es demasiado amplio para el objetivo: se deben eliminar únicamente las filas/relaciones de referral cuyo referente es el site exacto `jairo-pinto-test`, conservando intactos los leads referidos, pagos, dominios y páginas publicadas.

## Reglas de seguridad

1. El alcance de `APPLY_REFERRAL_RELATIONS` incluye solo relaciones de referido asociadas exactamente a `jairo-pinto-test`.
2. No borrar ni modificar los leads `claudia-calero`, `blanca-ruiz` o `jenny-varela`.
3. No borrar ni modificar pagos, targets, dominios, publicaciones ni onboarding de los referidos.
4. El borrado físico del lead `jairo-pinto-test` debe continuar siendo una operación separada y bloqueada si existen dependencias protegidas.
5. El comando debe imprimir UUID completos, código referente, siteId referente, siteId referido y motivo de protección.
6. `DRY_RUN` es el modo predeterminado; `APPLY_REFERRAL_RELATIONS` exige una confirmación literal distinta de `--apply` genérico.
7. La operación debe ser transaccional e idempotente.
8. Después de eliminar las relaciones de prueba, el código real debe poder asignarse a `jairo-pinto` sin colisión.

## Contrato de salida

Debe distinguir claramente:

- `referralRelationsCandidates`.
- `referralRelationsDeletable`.
- `referralRelationsBlocked`.
- `leadDeletionBlocked`.
- `protectedDependencies`.
- `codeReleaseCandidate`.

## Fuera de alcance

- Borrado físico de partners reales.
- Cambios frontend.
- Pagos, Wompi, ledger, DNS o publicación.
- Limpieza general de otros sites de prueba.

## Aceptación

- `DRY_RUN` muestra los tres registros históricos con UUID completos.
- La existencia de targets publicados en los referidos no bloquea el borrado de la relación histórica.
- Un `APPLY_REFERRAL_RELATIONS` elimina solo esas relaciones.
- Los tres partners referidos permanecen intactos.
- El lead `jairo-pinto-test` continúa protegido si tiene dependencias.
- El código queda disponible para asignarlo a `jairo-pinto`.
- Pruebas, ESLint backend, build y `git diff --check` aprobados.
