# AGR-20260910-002 — GuardedRunResult Contract Adjustment

## Dependencia

`AGR-20260910-001` (PR #197).

## Objetivo

Ajustar el contrato tipado en `app/web/server/types/publication-runtime-modules.d.ts` para que `GuardedRunResult` defina `packageHash`, `capabilityHash` y `journalHash` como opcionales (`?: string`), reflejando con exactitud que `runGuardedPublication` no siempre los devuelve en el nivel superior. Mantener `planHash` y `blockedReasons` requeridos según el retorno real.

## Alcance

- `app/web/server/types/publication-runtime-modules.d.ts`

## Fuera de Alcance

- Prohibido modificar runtime, `server/services/**`, frontend, APIs o infraestructura.

## Criterios de Aceptación

- `npm run lint` en `app/web` retorna 0 errores y 0 warnings.
- `npm run build` en `app/web` compila con éxito.
- `git diff --check` limpio.
- PR de seguimiento abierto sin merge.
