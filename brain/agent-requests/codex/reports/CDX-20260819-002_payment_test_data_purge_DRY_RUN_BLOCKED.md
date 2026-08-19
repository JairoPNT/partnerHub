# CDX-20260819-002 — Reporte DRY_RUN bloqueado

## Estado

`DRY_RUN_BLOCKED` — no se ejecutó APPLY y no se borró ningún pago ni snapshot.

## Diagnóstico operativo

El ledger productivo vive fuera del repositorio en `${PRODUCT_PAGE_PAYMENT_DIR}/payments.json`. El worktree no dispone de ese volumen, de una exportación del ledger ni de una sesión autenticada abierta que exponga los UUID completos. La evidencia anterior solo confirma cinco movimientos visibles (tres `CONFIRMED` y dos `VOIDED`), pero no identifica sus UUID ni constituye una allowlist suficiente.

Por seguridad no se infirieron candidatos por estado, método, monto, fecha, referencia o apariencia en Payments. En consecuencia:

- IDs inventariados: 0.
- Pagos autorizados para APPLY: 0.
- Pagos eliminados: 0.
- Snapshots eliminados: 0.
- Partners, leads, dominios y publicaciones modificados: 0.
- Logs técnicos e intents Wompi modificados: 0.

## Implementación preparada

Se añadió `payment-test-data-purge.mjs` con:

- allowlist cerrada de UUIDs mediante manifiesto confirmado por el operador;
- `DRY_RUN` predeterminado con ID, partner, monto, fecha, estado, método y referencia;
- respaldo JSON del ledger completo, manifiesto e inventario;
- hash SHA-256 que vincula APPLY al ledger revisado;
- modo literal `APPLY_PAYMENT_TEST_DATA_PURGE`, sin `--apply` genérico;
- bloqueo por UUID faltante, inválido o duplicado y por cambios posteriores al DRY_RUN;
- reemplazo atómico del único ledger afectado;
- verificación posterior de pagos, snapshots y monto confirmado derivados de la allowlist;
- exclusión total de intents y logs técnicos Wompi.

## Validación

- Pruebas de purga: PASS, 5/5.
- Regresión ledger/entitlements: PASS, 22/22.
- Regresión métricas: PASS, 3/3.
- ESLint backend: PASS.
- Build: PASS, con advertencia NFT preexistente del workspace.
- `git diff --check`: PASS.

## Condición para continuar

Se requiere una de estas dos entradas, sin datos sensibles ni secretos:

1. acceso al volumen donde `${PRODUCT_PAGE_PAYMENT_DIR}/payments.json` está montado; o
2. una exportación JSON actual del ledger y la lista exacta de UUIDs confirmada por el operador.

Con esa evidencia se ejecutará primero DRY_RUN, se entregarán el inventario completo y el hash, y solo después podrá ejecutarse APPLY contra el mismo ledger revisado.

## Rama

`codex/CDX-20260819-002-payment-test-data-purge`

## PR

No abierto.
