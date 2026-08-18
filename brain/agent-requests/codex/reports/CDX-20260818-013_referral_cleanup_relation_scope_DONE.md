# CDX-20260818-013 — DONE

## Resumen

Se corrigió el comando para que el alcance de limpieza incluya exclusivamente relaciones cuyo `referrerSiteId` sea exactamente `jairo-pinto-test`. Ya no selecciona registros solo porque compartan el código y no inspecciona, elimina ni modifica los partners referidos.

El modo predeterminado continúa siendo `DRY_RUN`. El modo de escritura quedó separado como `APPLY_REFERRAL_RELATIONS`, rechaza `--apply` genérico y exige la confirmación literal:

`APPLY_REFERRAL_RELATIONS:jairo-pinto-test->jairo-pinto`

No se ejecutó ese modo sobre datos reales.

## DRY_RUN operativo

Ejecutado en el contenedor de PartnerHub mediante lectura directa de `codes.json` y `referrals.json`, sin escrituras.

- `referralRelationsCandidates`: 3.
- `referralRelationsDeletable`: 3.
- `referralRelationsBlocked`: 0.
- `leadDeletionBlocked`: `true`.
- Código candidato: `7417984`.
- Origen exacto: `jairo-pinto-test`.
- Destino previsto: `jairo-pinto`.

| UUID completo | Referente | Referido | Estado | Resultado |
| --- | --- | --- | --- | --- |
| `fbf6cab2-495b-4786-ad04-d05245a80418` | `jairo-pinto-test` | `jenny-varela` | `CANCELLED` | `DELETABLE_RELATION_ONLY` |
| `977aec27-9dc2-46a1-bbbd-7268b3c7ae34` | `jairo-pinto-test` | `claudia-calero` | `CANCELLED` | `DELETABLE_RELATION_ONLY` |
| `33317315-c585-4930-8e1c-d1377d79e78a` | `jairo-pinto-test` | `blanca-ruiz` | `CANCELLED` | `DELETABLE_RELATION_ONLY` |

Los targets, dominios o publicaciones de los partners referidos no bloquean esta operación porque no forman parte de la mutación. El borrado físico del lead `jairo-pinto-test` permanece bloqueado y fuera de alcance hasta una auditoría independiente de dependencias.

## Seguridad e idempotencia

- Selector por igualdad exacta de `referrerSiteId`.
- UUID obligatorio para toda relación borrable.
- Relaciones de otros referentes se preservan incluso si comparten el código.
- Backup de `codes.json`, `referrals.json` y plan de auditoría antes de escribir.
- Escritura coordinada de ambos archivos con restauración si falla el segundo reemplazo.
- Segunda ejecución sin candidatos devuelve `changed: false`.
- El código del site de prueba se libera en la misma operación; no se asigna automáticamente ni se modifica otro partner.
- `leadDeletionBlocked` permanece siempre explícito dentro de este comando de alcance relacional.

## Verificación

- Pruebas focalizadas: 6/6 aprobadas.
- Las pruebas de escritura usan exclusivamente directorios temporales; no tocaron datos reales.
- ESLint backend (`server` y `app/api`): aprobado.
- Sintaxis de ambos scripts: aprobada con `node --check`.
- Build: aprobado.
- `git diff --check`: aprobado.

## Archivos modificados

- `app/web/scripts/cleanup-jairo-pinto-test-referrals.mjs`
- `app/web/scripts/cleanup-jairo-pinto-test-referrals.test.mjs`
- `brain/agent-requests/codex/requests/CDX-20260818-013_referral_cleanup_relation_scope.md`
- `brain/agent-requests/codex/reports/CDX-20260818-013_referral_cleanup_relation_scope_DONE.md`

## Operación real

`APPLY_REFERRAL_RELATIONS` no ejecutado. Requiere nueva autorización después de auditoría.

## Rama

`codex/CDX-20260818-011-referral-test-data-cleanup`
