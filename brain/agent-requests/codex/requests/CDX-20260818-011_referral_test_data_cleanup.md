# CDX-20260818-011 — Limpieza segura de referidos y leads de prueba

## Owner

Codex (Backend Lead).

## Objetivo único

Eliminar de forma controlada los registros de prueba asociados a `jairo-pinto-test` y liberar el código de referente para asignarlo a `jairo-pinto`, sin afectar partners reales, pagos confirmados ni publicaciones.

## Alcance

- Servicio/script backend de limpieza con modo `DRY_RUN` por defecto.
- Eliminación de relaciones de referidos claramente asociadas al site de prueba.
- Liberación transaccional del código para su reasignación al partner real.
- Endpoint o comando interno autenticado con confirmación explícita para ejecutar `APPLY`.
- Pruebas y reporte DONE.

## Reglas de seguridad

1. El selector principal de prueba es el `siteId` exacto `jairo-pinto-test`; no borrar por coincidencia parcial del código.
2. No eliminar leads con pagos `CONFIRMED`/`APPROVED`, targets publicados, dominios vinculados o datos que tengan dependencia real.
3. Si existe cualquier dependencia protegida, detener el registro y reportarlo como `BLOCKED`, sin borrado parcial.
4. La reasignación del código referente debe ser transaccional y verificar que `jairo-pinto` sea el único destino nuevo.
5. `DRY_RUN` debe listar conteos, IDs y motivos; `APPLY` exige una confirmación literal específica.
6. No ejecutar borrado físico en producción sin respaldo/registro de auditoría generado previamente.

## Fuera de alcance

- Limpieza general de todos los partners.
- Borrado de partners reales.
- Cambios visuales del módulo Partners.
- Cambios en pagos, Wompi, ledger o catálogo.

## Aceptación

- Identifica exactamente los tres referidos históricos de prueba mostrados en Partners.
- No elimina partners reales ni pagos confirmados.
- Libera el código sin violar unicidad.
- `DRY_RUN` y `APPLY` son idempotentes.
- Pruebas de bloqueo por pago, target publicado y dependencia real.
- ESLint backend, build y `git diff --check` aprobados.
