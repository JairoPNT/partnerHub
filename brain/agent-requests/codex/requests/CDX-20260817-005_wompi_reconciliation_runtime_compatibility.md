# CDX-20260817-005 — Compatibilidad del comando de conciliación con runtime desplegado

## Owner

Codex — backend e infraestructura de mantenimiento.

## Objetivo único

Adaptar el comando `maintenance:wompi-reconcile` al runtime Node desplegado, que no soporta `--experimental-strip-types`, sin alterar su contrato operativo.

## Alcance

- Confirmar la versión/major real definida para el contenedor.
- Convertir `wompi-reconcile-sandbox.ts` en un artefacto `.mjs` sin sintaxis TypeScript.
- Ejecutar el comando sin flags experimentales.
- Empaquetar el artefacto en los runners Docker.
- Mantener `DRY_RUN` predeterminado, referencia explícita, allowlist, bloqueo, `--apply` explícito e idempotencia.
- Agregar prueba de ejecución del artefacto con Node 20 y ambas referencias autorizadas simuladas.

## Exclusiones

- No frontend, webhook, ledger, Prisma, migraciones ni datos.
- No consultas Wompi reales.
- No ejecutar `APPLY`.
- No conciliación automática.

## Dependencia

- Rama `codex/CDX-20260817-004-wompi-reconciliation-command`.

## Verificación

- `node -v` con Node 20.
- DRY_RUN simulado para ambas referencias.
- APPLY bloqueado sin flag.
- Pruebas focalizadas y regresiones.
- ESLint backend/artefacto, build y `git diff --check`.
