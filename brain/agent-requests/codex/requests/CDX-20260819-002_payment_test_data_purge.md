# CDX-20260819-002 — Purga controlada de pagos de prueba

## Owner

Codex.

## Scope

Crear una operación backend de mantenimiento para eliminar exclusivamente pagos de prueba confirmados por el operador mediante una allowlist explícita. La operación debe generar un respaldo JSON y ejecutar primero un `DRY_RUN` detallado.

## Allowed files/modules

- `app/web/scripts/payment-test-data-purge.mjs`
- `app/web/scripts/payment-test-data-purge.test.mjs`
- `app/web/package.json`
- Request y reporte de este ticket.

## Excluded files/modules

- Frontend y React.
- Wompi intents, webhooks y logs técnicos.
- Partners y activation leads.
- DNS, dominios, targets y publicación.
- Contabilidad externa y cualquier almacenamiento distinto al ledger de Payments.

## Dependencies

- Ledger manual de Payments desplegado.
- Lista cerrada de UUIDs confirmada por el operador.

## Parallel-safe with

Tickets que no modifiquen `app/web/scripts/payment-test-data-purge.*` ni `app/web/package.json`.

## Contract

- `DRY_RUN` es el modo predeterminado y requiere un manifiesto JSON con UUIDs explícitos.
- El inventario muestra ID, partner, monto, fecha, estado, método y referencia.
- El respaldo conserva el ledger completo y el inventario candidato antes de cualquier borrado.
- `APPLY_PAYMENT_TEST_DATA_PURGE` requiere confirmación literal y el hash obtenido en el DRY_RUN.
- Si falta un ID, hay duplicados, el ledger cambió o aparece un registro no autorizado, APPLY se bloquea sin escribir.
- La escritura del ledger usa archivo temporal y `rename` atómico.
- Los snapshots comerciales embebidos desaparecen únicamente junto con sus pagos.
- La verificación posterior exige cero pagos seleccionados, cero snapshots seleccionados y cero monto confirmado derivado de esos IDs.

## Acceptance criteria

- Pruebas de DRY_RUN, respaldo, allowlist, drift, APPLY, idempotencia y preservación de registros protegidos.
- Regresión del ledger y métricas focalizadas.
- ESLint backend, build y `git diff --check` aprobados.
- No abrir PR hasta auditoría.
