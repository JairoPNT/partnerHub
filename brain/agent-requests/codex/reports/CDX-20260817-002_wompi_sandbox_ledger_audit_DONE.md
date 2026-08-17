# CDX-20260817-002 — Auditoría Wompi Sandbox y asentamiento del ledger — DONE

## Resultado ejecutivo

La persistencia desplegada contiene tres intenciones recientes. Dos referencias tienen una transacción `APPROVED` por Wompi Sandbox, pero ninguna de las tres intenciones recibió un evento válido: permanecen `PENDING`, sin `transactionId`, con cero checksums procesados, `paymentRecorded=false`, lead `NEW` y sin pago WOMPI confirmado en Payments.

El bloqueo comprobado está antes del asentamiento del ledger: el webhook no fue recibido **o no superó la validación antes de persistir**. No hay evidencia de error de persistencia del ledger porque `processEvent` solo intenta crear el pago después de una firma válida y una referencia/monto/moneda coincidentes, y ninguna intención alcanzó ese punto.

## Diagnóstico por lead

| activationLeadId | intentId / reference | Estado real Wompi Sandbox | Estado backend | Payments | Diagnóstico |
| --- | --- | --- | --- | --- | --- |
| `a8798ad0-49c1-49b3-8a44-cebe9a61ff97` | `640eb48c-a676-48ca-baec-455b2170397e` / `PH-640eb48c-a676-48ca-baec-455b2170397e` | `APPROVED`; transactionId `129168-1786995484-65678`; COP 35,000,000 cents | `PENDING`; transactionId ausente; 0 eventos | `paymentRecorded=false`; sin WOMPI confirmado; lead `NEW` | Aprobación remota no entregada o rechazada antes de persistir el evento. |
| `36910e28-51ba-4991-99a5-03f5e9508676` | `a456d9c3-f7e5-488c-b52f-003dd3625300` / `PH-a456d9c3-f7e5-488c-b52f-003dd3625300` | Referencia sin transacción en Sandbox | `PENDING`; transactionId ausente; 0 eventos | `paymentRecorded=false`; sin WOMPI confirmado; lead `NEW` | Checkout no creó/finalizó una transacción; no corresponde asentar pago. |
| `a925c821-2205-4006-a312-b9958fc88e4c` | `881d27b5-c757-491d-b46e-fa4ff7c80b4f` / `PH-881d27b5-c757-491d-b46e-fa4ff7c80b4f` | `APPROVED`; transactionId `129168-1787006876-39189`; COP 35,000,000 cents | `PENDING`; transactionId ausente; 0 eventos | `paymentRecorded=false`; sin WOMPI confirmado; lead `NEW` | Aprobación remota no entregada o rechazada antes de persistir el evento. |

## Matriz de causas

- **Webhook no recibido:** compatible con la evidencia y causa principal más probable para las dos aprobadas. La aplicación actual no conserva un log de recepción previo a la validación, por lo que no se puede distinguir de un rechazo temprano usando solo la persistencia.
- **Cloudflare Access:** descartado como bloqueo general de la ruta. Un POST anónimo alcanza el origin y obtiene `400` de la propia ruta Wompi, no una pantalla/respuesta de Access.
- **Firma inválida:** posible, pero no demostrable sin el payload/log de entrega de Wompi. Cero checksums indica que ningún evento pasó la firma.
- **Referencia no coincidente:** no observada en Wompi; las dos transacciones remotas tienen exactamente las referencias persistidas. Solo podría ocurrir si llegó al webhook un payload distinto.
- **Transacción Sandbox no aprobada:** descartada en los leads `a879...` y `a925...`; aplicable al lead `369...` porque no existe transacción para su referencia.
- **Error de persistencia del ledger:** sin evidencia. El flujo no llegó a la etapa de ledger; tampoco existe una intención `APPROVED` sin su pago correspondiente.

## Evidencia y método

- Lectura directa, sanitizada y de solo lectura de `wompi-sandbox-intents.json`, `payments.json` y `leads.json` en el volumen desplegado.
- Consultas GET a `https://sandbox.wompi.co/v1/transactions?reference=...` usando exclusivamente la credencial Sandbox del servidor; no se imprimieron llaves.
- Revisión del despliegue de los PR #115, #120 y #121.
- No se reenviaron webhooks, no se crearon pagos y no se modificaron datos.

## Recomendación de follow-up

Crear un ticket separado para observabilidad y recuperación controlada: registrar código de resultado del webhook sin payload sensible, confirmar en el dashboard Sandbox la URL de eventos, y diseñar una conciliación idempotente GET-remoto → validación → ledger para transacciones `APPROVED`. No ejecutar conciliación dentro de esta auditoría.

## Archivos modificados

- `brain/agent-requests/codex/requests/CDX-20260817-002_wompi_sandbox_ledger_audit.md`
- `brain/agent-requests/codex/reports/CDX-20260817-002_wompi_sandbox_ledger_audit_DONE.md`

No se modificó código de backend, frontend, contratos ni datos persistidos.

## Verificación

- `npm.cmd run test:wompi-sandbox`: PASS, 7/7.
- `npm.cmd run test:wompi-status`: PASS, 6/6.
- `npm.cmd run test:manual-payments`: PASS, 7/7.
- `npx.cmd eslint server app/api --max-warnings=0`: PASS.
- `npm.cmd run build`: PASS. Conserva el warning preexistente de workspace root/NFT en la ruta de preview; no bloqueante y fuera del alcance.
- `git diff --check`: PASS.

## Rama y commit

- Rama: `codex/CDX-20260817-002-wompi-sandbox-ledger-audit`.
- Base: `origin/main` en `5d5c808`.
- Commit: el commit HEAD de este reporte; hash comunicado al cierre.
- PR: no abierto por instrucción.
