# CDX-20260817-002 — Auditoría Wompi Sandbox y asentamiento del ledger

## Owner

Codex.

## Scope

Auditar, sin mutaciones, las intenciones Wompi Sandbox de los leads de prueba recientes, contrastarlas con Wompi y determinar por qué los pagos aprobados no llegaron al ledger.

## Allowed files/modules

- Backend Wompi y ledger: lectura y pruebas focalizadas.
- Persistencia desplegada de leads, intenciones y pagos: lectura únicamente.
- Wompi Sandbox: consultas GET únicamente.
- Este request y su reporte DONE.

## Excluded files/modules

- Frontend, UI, React y contratos públicos.
- Borrado o modificación de leads, intenciones o pagos.
- Reenvío de webhooks, conciliación con escritura o cambios de infraestructura.

## Dependencies

- CDX-20260812-011 desplegado.
- CDX-20260817-001 desplegado.

## Parallel-safe with

Tickets que no modifiquen el backend Wompi, el ledger ni estos archivos de request/reporte.

## Integration notes

El resultado es diagnóstico. Cualquier corrección o conciliación de pagos debe ejecutarse mediante un follow-up separado y auditado.

## Acceptance criteria

- Diagnóstico por lead con IDs y estados seguros.
- Confirmación de evidencia de webhook, `paymentRecorded` y Payments.
- Clasificación de la causa sin exponer secretos ni datos personales.
- Pruebas focalizadas, ESLint backend, build y `git diff --check`.
- Reporte DONE, commit y push; sin PR.
