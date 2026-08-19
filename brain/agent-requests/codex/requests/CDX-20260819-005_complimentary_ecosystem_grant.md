# CDX-20260819-005 — Asignación gratuita de ecosistemas

## Owner

Codex (Backend Lead).

## Objetivo

Permitir asignar uno o varios ecosistemas a un partner sin crear un pago, afectar Revenue ni usar un registro de valor cero.

## Alcance

- Operación interna autenticada e idempotente.
- Persistencia comercial separada y auditable.
- Ecosistemas, motivo, fecha efectiva, fecha de corte futura, notas y operador.
- Integración de grants activos en el entitlement de solo lectura.
- `regenerationRequired` cuando se agregan ecosistemas.

## Exclusiones

- Frontend.
- Payments, Revenue, Wompi y pagos históricos.
- DNS, Hostinger y publicación automática.
- Asignaciones reales para Claudia o Blanca.

## Aceptación

- Pruebas de creación, validación, idempotencia, corte e invariancia financiera.
- ESLint backend, build y `git diff --check`.
- Reporte DONE, commit y push; no abrir PR.
