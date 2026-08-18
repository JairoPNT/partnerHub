# CDX-20260817-003 — Observabilidad y conciliación segura de Wompi

## Owner

Codex (backend/payments, premium-risk scope).

## Scope

Añadir observabilidad sanitizada al webhook Wompi Sandbox y un servicio interno de conciliación idempotente, con `DRY_RUN` como modo predeterminado, sin ejecutar conciliaciones reales.

## Allowed files/modules

- `app/web/app/api/webhooks/wompi/route.ts`
- Servicios y pruebas backend Wompi/ledger bajo `app/web/server/services/`
- `app/web/package.json`
- Request y reporte DONE de este ticket.

## Excluded files/modules

- Frontend, React, UI y contratos públicos ajenos al webhook.
- Prisma y migraciones.
- Leads y datos desplegados.
- Ejecución de conciliación real o llamadas Wompi durante pruebas.

## Dependencies

- CDX-20260812-011.
- CDX-20260817-001.
- Diagnóstico CDX-20260817-002.

## Parallel-safe with

Tickets que no modifiquen el webhook, servicios Wompi, ledger ni `app/web/package.json`.

## Integration notes

El servicio debe quedar preparado para una ejecución posterior auditada. Este ticket solo valida `DRY_RUN` con clientes mockeados y no crea pagos reales.

## Acceptance criteria

- Logs JSONL sanitizados sin payloads, firmas, secretos ni PII.
- Etapas diferenciadas para firma, intent, validación, duplicado y ledger.
- Conciliación GET Sandbox con validación exacta e idempotencia.
- Referencia sin transacción explícitamente protegida.
- Pruebas focalizadas, regresión ledger, ESLint backend, build y diff-check.
- DONE, commit y push; sin PR.
