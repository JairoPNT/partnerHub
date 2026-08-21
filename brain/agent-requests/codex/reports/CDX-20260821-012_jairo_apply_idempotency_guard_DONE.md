# CDX-20260821-012 — Jairo APPLY fail-closed idempotency guard — DONE

## Request ID

`CDX-20260821-012`

## Resultado

El APPLY de identidad de Jairo ahora adquiere un claim exclusivo mediante
`mkdir` atómico antes de crear temporales o mutar fuentes. El proceso vuelve a
evaluar el preflight bajo el claim. Un contendiente recibe un código estable y
no entra al bloque de mutación/rollback.

Un journal existente se trata como estado terminal solo después de validar:

- forma, fecha, modo, planHash y hashes del journal;
- hashes e identidades finales Product y Personal Brand;
- hashes finales de verificación e historial Product;
- ausencia de verificación/historial bajo la identidad antigua;
- ausencia de un claim activo, stale o incompleto.

El rerun válido devuelve `outcome:ALREADY_APPLIED`, `changed:false` y
`blocked:false`. Journal, identidad o hashes divergentes devuelven
`BLOCKED_APPLIED_STATE` con razones explícitas.

## Concurrencia y ownership

- Claim: `.apply-claim/`, creado exclusivamente; `owner.json` contiene token UUID,
  PID y timestamp.
- Claims activos, stale (15 minutos) o incompletos bloquean sin limpieza
  automática.
- Temporales y rollback incluyen el token del propietario.
- El proceso comprueba el token antes de mutar y antes de retirar el claim.
- Solo el propietario revierte sus pasos registrados; el perdedor del claim no
  crea temporales ni ejecuta rollback.

## Archivos

- `app/web/scripts/jairo-source-identity-guarded-apply.mjs`
- `app/web/scripts/jairo-source-identity-guarded-apply.test.mjs`
- `brain/agent-requests/codex/requests/CDX-20260821-012_jairo_apply_idempotency_guard.md`
- `brain/agent-requests/codex/reports/CDX-20260821-012_jairo_apply_idempotency_guard_DONE.md`

## Verificación

- `npm run test:jairo-source-identity-guarded-apply`: PASS, 11/11.
- ESLint focalizado sobre script y prueba con `--max-warnings=0`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.

Casos focalizados: preview, drift/colisiones, confirmación/planHash, APPLY
atómico, rerun secuencial, drift final, drift del journal, concurrencia
determinista, claim incompleto/stale, pérdida de ownership y rollback inyectado.

## Advertencias no bloqueantes

- Next.js conserva el warning existente de inferencia de workspace/múltiples
  lockfiles y trazado NFT; el build termina correctamente.
- `npm ci` reportó 12 vulnerabilidades de dependencias (2 moderadas, 10 altas).
  No se modificaron dependencias ni lockfiles en este ticket.
- Un claim stale/incompleto exige auditoría y autorización separada; el comando
  no lo elimina automáticamente.

## Límites confirmados

No se ejecutó APPLY, preview productivo, EasyPanel, rollback, DNS, Hostinger,
publicación, regeneración ni modificación de datos reales. No se modificaron UI,
Docker, pagos, ledger, PublishingTargets o BUSINESS. PR y deploy permanecen sin
ejecutar hasta auditoría del orquestador.
