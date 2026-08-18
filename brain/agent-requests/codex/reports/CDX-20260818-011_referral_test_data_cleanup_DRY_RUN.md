# CDX-20260818-011 — Reporte DRY_RUN

## Estado

`DRY_RUN_BLOCKED` — no se ejecutó `APPLY`, no se borraron datos y no se reasignó el código.

## Alcance observado

- Selector exacto: `jairo-pinto-test`.
- Código asociado visible: `7417984`.
- Destino propuesto: `jairo-pinto`.
- Relaciones candidatas encontradas: 3.
- Relaciones autorizadas para borrado: 0.
- Relaciones bloqueadas: 2.
- Relaciones pendientes de identidad técnica completa: 1.
- Leads borrados: 0.
- Pagos modificados: 0.
- Targets o dominios modificados: 0.
- Códigos reasignados: 0.

## Diagnóstico por relación

| Referral record ID | referredSiteId | Estado visible | Dependencias | Resultado |
| --- | --- | --- | --- | --- |
| No expuesto por la UI | `jenny-varela` | `CANCELLED` | No aparece entre los seis activation leads ni entre los seis dominios registrados actuales | `PENDING_ID_VERIFICATION` |
| No expuesto por la UI | `claudia-calero` | `CANCELLED` | Activation lead `PAGADO`; dominio `claudiacalero.pro` vinculado; publicación y verificación `VERIFIED` | `BLOCKED_PUBLISHED_TARGET` |
| No expuesto por la UI | `blanca-ruiz` | `CANCELLED` | Activation lead `PAGADO`; dominio `blancastella.pro` vinculado; publicación y verificación `VERIFIED` | `BLOCKED_PUBLISHED_TARGET` |

Las tres relaciones muestran como referente `Jairo Pinto (jairo-pinto-test)`, código `7417984`, y fecha de registro del 28 de julio de 2026.

## Cruce de Payments

El ledger visible contiene cinco movimientos: tres `CONFIRMED` y dos `VOIDED`. No se observó un pago `CONFIRMED` asociado por `siteId` a `jenny-varela`, `claudia-calero` o `blanca-ruiz`. Esto no elimina los bloqueos de Claudia y Blanca: sus dominios y publicaciones verificadas son dependencias protegidas suficientes según el request.

No se modificó Payments, Wompi ni ledger.

## Bloqueos de seguridad

1. El endpoint autenticado de referidos no pudo abrirse como JSON desde la superficie disponible; la UI no expone los UUID internos de las relaciones. No se autoriza `APPLY` sin esos IDs.
2. El comando existente `cleanup-jairo-pinto-test-referrals.mjs` no valida pagos, leads, targets publicados ni dominios antes de escribir. No cumple todavía las reglas de este request y no se ejecutó contra producción.
3. Dos relaciones apuntan a partners con dominios publicados/verificados. El request exige detener esos registros sin borrado parcial.
4. La liberación/reasignación del código `7417984` no puede autorizarse mientras existan relaciones bloqueadas y no se demuestre transaccionalidad y unicidad del destino `jairo-pinto`.
5. No existe en este worktree acceso directo configurado a `PRODUCT_PAGE_REFERRAL_DIR`; por tanto no se pudo producir un inventario de UUIDs desde el almacenamiento persistente.

## Evidencia consultada

- Partners / Programa de Referidos: 3 registros visibles para `jairo-pinto-test`.
- Activation Leads: 6 registros; Claudia y Blanca figuran `PAGADO` y publicados/verificados.
- Domains: 6 dominios; `claudiacalero.pro` y `blancastella.pro` figuran vinculados y `VERIFIED`.
- Payments: 5 movimientos; lectura únicamente.

## Condición antes de APPLY

Implementar y auditar primero un DRY_RUN backend que lea los almacenes persistentes, entregue los UUID completos, aplique los bloqueos por pago/target/dominio y genere respaldo/auditoría. Después debe repetirse el DRY_RUN y requerirse aprobación explícita separada. Este reporte no autoriza `APPLY`.

## Rama

`codex/CDX-20260818-011-referral-test-data-cleanup`
