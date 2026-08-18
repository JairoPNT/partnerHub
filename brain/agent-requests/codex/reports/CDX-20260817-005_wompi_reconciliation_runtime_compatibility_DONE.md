# CDX-20260817-005 — DONE

## Request ID

`CDX-20260817-005`

## Resumen

El comando de conciliación fue convertido de TypeScript ejecutado con un flag experimental a un artefacto `.mjs` autocontenido. El comando ahora usa únicamente `node scripts/wompi-reconcile-sandbox.mjs`, se empaqueta en ambos runners Docker y conserva exactamente los controles de CDX-004.

## Runtime confirmado

- Dockerfiles de producción: `FROM node:20-alpine`.
- Reproducción con binario oficial Node 20: `node -v` devolvió `v20.20.2`.
- El artefacto y sus pruebas pasaron con `v20.20.2` sin flags experimentales.
- Docker/Easypanel no está disponible desde este host para consultar el patch exacto del contenedor vivo; el major desplegado queda confirmado por los Dockerfiles y por el error operativo reportado.

## Archivos modificados

- `app/web/scripts/wompi-reconcile-sandbox.mjs`
- `app/web/scripts/wompi-reconcile-sandbox.test.mjs`
- Eliminado `app/web/scripts/wompi-reconcile-sandbox.ts`
- `app/web/package.json`
- `app/web/scripts/README.md`
- `Dockerfile`
- `app/web/Dockerfile`
- Request y reporte DONE de `CDX-20260817-005`

## Contrato preservado

- `DRY_RUN` predeterminado.
- `--reference` obligatorio.
- Allowlist de las dos referencias autorizadas y referencia bloqueada.
- `APPLY` imposible sin `--apply` explícito y defensa adicional en el núcleo.
- Cero ejecución automática.
- Validaciones de intención, referencia, estado, monto, moneda y transactionId.
- Idempotencia por payment confirmado existente.

## Comando DRY_RUN compatible

```sh
npm run maintenance:wompi-reconcile -- --reference PH-640eb48c-a676-48ca-baec-455b2170397e
```

La segunda referencia autorizada se ejecuta reemplazando únicamente el valor por `PH-881d27b5-c757-491d-b46e-fa4ff7c80b4f`.

## Verificación

- Artefacto con Node `v20.20.2`: PASS, 3/3.
- DRY_RUN simulado con ambas referencias autorizadas: PASS, sin llamadas reales.
- APPLY bloqueado sin flag: PASS.
- Pruebas focalizadas y regresiones: PASS, 35/35.
- ESLint backend y artefacto `.mjs`: PASS, cero warnings.
- `npm run build`: PASS.
- `git diff --check`: PASS.

## Seguridad operativa

- No se ejecutó `APPLY`.
- No se consultó Wompi.
- No se leyeron ni modificaron datos reales.
- No se modificaron frontend, webhook, ledger, Prisma ni migraciones.

## Git

- Rama: `codex/CDX-20260817-005-wompi-reconciliation-runtime`
- Base: `origin/codex/CDX-20260817-004-wompi-reconciliation-command`.
- Commit de implementación: `ba2b555`.
- PR: no creado; requiere auditoría.

## Riesgos y follow-up

- Tras despliegue, ejecutar primero `node -v` y luego únicamente DRY_RUN para confirmar el patch del contenedor vivo y la disponibilidad del archivo copiado.
- No requiere cambios adicionales de código antes de auditoría.
