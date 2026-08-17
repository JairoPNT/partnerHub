# CDX-20260817-003 — Observabilidad y conciliación segura de Wompi — DONE

## Request ID

`CDX-20260817-003`

## Resumen

Se añadió observabilidad sanitizada al webhook Wompi y un servicio interno de conciliación Sandbox. No se ejecutaron consultas ni conciliaciones reales durante la implementación; las pruebas usan transacciones en memoria/clientes controlados.

## Observabilidad del webhook

Cada intento de entrega que alcanza `/api/webhooks/wompi` agrega una línea JSON a `wompi-webhook-observability.jsonl` en el directorio persistente de Payments. Solo contiene:

- `timestamp`;
- `reference`, si el payload ofrece un string;
- `activationLeadId`, cuando la referencia coincide con una intención persistida;
- `transactionId`, si existe;
- `httpStatus`;
- `stage`;
- `outcome`;
- `reason` sanitizado y enumerado.

No se guardan payloads, firmas, checksums, secretos, credenciales, datos de cliente ni mensajes arbitrarios de excepciones. Un error del logger no cambia la respuesta ni el asentamiento del webhook.

Las etapas distinguen validación del evento, configuración, firma, búsqueda de intención, validación de referencia/monto/moneda, persistencia del ledger, persistencia de intención y finalización. Los resultados exitosos distinguen evento aceptado, duplicado y ledger persistido. La ausencia de cualquier línea para una transacción confirma que la entrega no alcanzó la ruta; una línea rechazada identifica la etapa exacta.

## Conciliación

`wompiReconciliationService.reconcileReference()`:

1. localiza la intención persistida por referencia exacta;
2. protege sin consulta la referencia `PH-a456d9c3-f7e5-488c-b52f-003dd3625300`;
3. consulta exclusivamente `https://sandbox.wompi.co/v1/transactions?reference=...` con la llave privada Sandbox mantenida en servidor;
4. exige una sola transacción con referencia, monto en centavos y moneda exactos;
5. rechaza el asentamiento si el estado remoto no es `APPROVED`;
6. en `DRY_RUN` devuelve `VALIDATED_DRY_RUN` sin invocar el ledger ni modificar la intención;
7. en una ejecución futura explícita `APPLY`, usa `wompi:<transactionId>` y la referencia WOMPI para idempotencia, crea/reutiliza el pago y actualiza la intención a `APPROVED`.

El modo predeterminado es `DRY_RUN`. No se añadió endpoint ni job automático, por lo que no existe activación accidental desde contratos públicos.

Las referencias aprobadas quedan preparadas para revisión posterior, pero no fueron conciliadas:

- `PH-640eb48c-a676-48ca-baec-455b2170397e`
- `PH-881d27b5-c757-491d-b46e-fa4ff7c80b4f`

## Idempotencia

El ledger ahora reconoce como el mismo pago WOMPI tanto una idempotency key repetida como la misma combinación `activationLeadId + reference + WOMPI`. Las creaciones también se serializan dentro del proceso para cerrar carreras entre webhook y conciliación en la instancia única actual. Esto impide que otra transacción o un retry para la misma referencia cree un segundo registro. En `APPLY`, un pago ya existente todavía permite reparar el estado de la intención sin duplicarlo.

## Archivos modificados

- `app/web/app/api/webhooks/wompi/route.ts`
- `app/web/package.json`
- `app/web/server/services/manualPaymentLedgerCore.ts`
- `app/web/server/services/manualPaymentLedgerCore.test.ts`
- `app/web/server/services/manualPaymentLedgerService.ts`
- `app/web/server/services/wompiSandboxCore.ts`
- `app/web/server/services/wompiSandboxCore.test.ts`
- `app/web/server/services/wompiSandboxService.ts`
- `app/web/server/services/wompiWebhookObservabilityCore.ts`
- `app/web/server/services/wompiWebhookObservabilityCore.test.ts`
- `app/web/server/services/wompiWebhookObservabilityService.ts`
- `app/web/server/services/wompiReconciliationCore.ts`
- `app/web/server/services/wompiReconciliationCore.test.ts`
- `app/web/server/services/wompiReconciliationService.ts`
- `brain/agent-requests/codex/requests/CDX-20260817-003_wompi_observability_reconciliation.md`
- `brain/agent-requests/codex/reports/CDX-20260817-003_wompi_observability_reconciliation_DONE.md`

No se modificaron frontend, React, Prisma, migraciones, leads ni datos desplegados.

## Verificación

- Observabilidad: PASS, 3/3.
- Conciliación DRY_RUN/guardas: PASS, 5/5.
- Wompi Sandbox: PASS, 7/7.
- Estado Wompi: PASS, 6/6.
- Ledger: PASS, 8/8.
- Total focalizado: PASS, 29/29.
- ESLint backend: PASS.
- Build: PASS; conserva únicamente el warning preexistente de workspace root/NFT del preview.
- `git diff --check`: PASS.

## Rama y entrega

- Rama: `codex/CDX-20260817-003-wompi-observability-reconciliation`.
- Base: `origin/main` (`5d5c808`).
- Commit: HEAD de este reporte; hash comunicado al cierre.
- PR: no abierto por instrucción.

## Riesgo y follow-up

Antes de usar `APPLY` debe realizarse una auditoría específica del diff y una ejecución OPS controlada, primero en `DRY_RUN`, para las dos referencias aprobadas. La persistencia actual usa archivos y el despliegue opera como una sola instancia; una futura operación multi-réplica debe añadir coordinación distribuida antes de habilitar asentamientos concurrentes.
