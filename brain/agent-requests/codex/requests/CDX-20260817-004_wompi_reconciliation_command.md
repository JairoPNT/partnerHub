# CDX-20260817-004 — Comando controlado de conciliación Wompi Sandbox

## Owner

Codex — backend, pagos y operación segura.

## Objetivo único

Crear un comando interno de mantenimiento para consultar y conciliar de forma segura transacciones Wompi Sandbox aprobadas remotamente. El modo predeterminado debe ser `DRY_RUN`.

## Referencias autorizadas

- `PH-640eb48c-a676-48ca-baec-455b2170397e`
- `PH-881d27b5-c757-491d-b46e-fa4ff7c80b4f`

## Referencia bloqueada

- `PH-a456d9c3-f7e5-488c-b52f-003dd3625300`

No tiene transacción Wompi y no debe conciliarse.

## Alcance

- Comando backend con referencia explícita y `DRY_RUN` predeterminado.
- Consulta Wompi Sandbox únicamente con credenciales server-side.
- Salida sanitizada con referencia, transactionId, estado, monto, moneda, activationLeadId, validación y acción.
- `APPLY` solo detrás de opción explícita; valida estado `APPROVED`, referencia, monto, COP, intención y transactionId.
- Creación o reutilización idempotente del pago y actualización de la intención a `APPROVED` con `paymentRecorded=true`.
- Rechazo de estados no aprobados, referencias no autorizadas, referencia bloqueada y ausencia de transacción.
- Pruebas focalizadas y regresión de ledger/webhook.

## Exclusiones

- No frontend, endpoints públicos, webhook, Prisma ni migraciones.
- No conciliación automática.
- No secretos, firmas ni payloads completos en logs.
- No ejecutar `APPLY` durante este ticket.

## Dependencias

- `CDX-20260817-003` desplegado.
- Webhook y observabilidad verificados.

## Verificación requerida

- Pruebas del comando, ledger, webhook y reconciliación existente.
- ESLint backend, build y `git diff --check`.
- Documentación del comando exacto para `DRY_RUN`.

## Entrega

- Rama `codex/CDX-20260817-004-wompi-reconciliation-command`.
- Commit y push.
- Reporte DONE.
- No abrir PR hasta auditoría.
