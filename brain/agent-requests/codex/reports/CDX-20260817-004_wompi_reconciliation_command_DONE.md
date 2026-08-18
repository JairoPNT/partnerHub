# CDX-20260817-004 — DONE

## Request ID

`CDX-20260817-004`

## Resumen

Se creó un comando interno controlado para consultar y conciliar referencias Wompi Sandbox. `DRY_RUN` es el modo predeterminado, exige referencia explícita, usa únicamente credenciales server-side y produce salida JSON sanitizada. `APPLY` queda detrás de `--apply`, tiene una segunda defensa en el núcleo y no fue ejecutado durante el ticket.

## Archivos modificados

- `app/web/server/services/wompiReconciliationCommandCore.ts`
- `app/web/server/services/wompiReconciliationCommandCore.test.ts`
- `app/web/server/services/wompiSandboxCore.ts`
- `app/web/scripts/wompi-reconcile-sandbox.ts`
- `app/web/scripts/README.md`
- `app/web/package.json`
- Request y reporte DONE de `CDX-20260817-004`

## Controles implementados

- Allowlist cerrada para las dos referencias autorizadas.
- Bloqueo explícito de `PH-a456d9c3-f7e5-488c-b52f-003dd3625300` antes de consultar Wompi.
- Validación de intención, referencia exacta, transacción única, `APPROVED`, monto exacto en centavos, `COP` y transactionId.
- Rechazo sin escritura de `PENDING`, `DECLINED`, `VOIDED`, `EXPIRED`, `ERROR`, monto/moneda incorrectos y transacción ausente.
- Idempotencia por payment existente y verificación fresca del ledger antes de escribir.
- Transición de intención a `APPROVED` con `transactionId` y `paymentRecorded=true`.
- Sin endpoint público, webhook nuevo, Prisma, migraciones, frontend ni automatización.

## Comando exacto de DRY_RUN

Desde `app/web` en el servidor configurado para Sandbox:

```powershell
npm.cmd run maintenance:wompi-reconcile -- --reference PH-640eb48c-a676-48ca-baec-455b2170397e
```

Para la segunda referencia autorizada, reemplazar únicamente el valor por:

`PH-881d27b5-c757-491d-b46e-fa4ff7c80b4f`

Sin `--apply`, el comando no escribe intenciones, leads, payments ni ledger.

## Verificación

- Pruebas focalizadas y regresiones: PASS, 32/32.
- Incluye comando, reconciliación existente, ledger, núcleo Wompi y webhook/observabilidad.
- Typecheck aislado del script: PASS.
- ESLint backend y script controlado: PASS, cero warnings.
- `npm run build`: PASS.
- `git diff --check`: PASS.
- Carga segura sin referencia: PASS; falla antes de cualquier consulta o escritura.

## Seguridad operativa

- No se ejecutó `APPLY`.
- No se consultaron referencias reales durante el desarrollo/pruebas.
- No se leyó ni modificó `/data/generated-sites/.payments`.
- No se registran claves, secretos, firmas ni payloads completos.

## Git

- Rama: `codex/CDX-20260817-004-wompi-reconciliation-command`
- Commit de implementación: `8b39b67`.
- PR: no creado; requiere auditoría previa.

## Riesgos y follow-up

- `APPLY` debe habilitarse operativamente solo después de auditoría y autorización explícita.
- La persistencia sigue el modelo JSON existente; ante fallo después de crear el payment y antes de guardar la intención, una repetición reutiliza el payment idempotentemente y completa la intención.
- No requiere follow-up técnico adicional antes de auditoría.
