# CDX-20260818-009 — DONE

## Request ID

`CDX-20260818-009`

## Resumen

Se corrigió el contrato backend de entitlement sobre la rama de CDX-008. Todos los ecosistemas se exponen ahora exclusivamente como targets `SUBDOMAIN` con hosts canónicos en inglés:

- `product.<dominio>` para `PRODUCT`.
- `business.<dominio>` para `BUSINESS`.
- `brand.<dominio>` para `PERSONAL_BRAND`.

El dominio raíz dejó de representarse como target de ecosistema. El nuevo campo `rootRedirectTarget` identifica únicamente el ecosistema y host de destino del redirect. `rootEcosystem` se conserva como alias semántico de ese destino.

## Reglas implementadas

- Oferta individual: redirect al único subdominio contratado.
- Dos o más ecosistemas con Marca Personal: redirect a `brand.<dominio>`.
- Dos o más ecosistemas sin Marca Personal: fallback estable a `product.<dominio>`.
- Legacy sin snapshot: `commercialState: UNKNOWN`, `rootRedirectTarget: null` y ningún ecosistema inferido.
- No se implementaron redirects físicos, DNS, provisioning ni publicación.

## Archivos modificados

- `app/web/server/services/partnerEcosystemEntitlementCore.ts`
- `app/web/server/services/partnerEcosystemEntitlementCore.test.ts`
- `brain/agent-requests/codex/requests/CDX-20260818-009_partner_ecosystem_root_redirect_correction.md`
- `brain/agent-requests/codex/reports/CDX-20260818-009_partner_ecosystem_root_redirect_correction_DONE.md`

## Verificación

- Pruebas focalizadas del entitlement: 7/7 aprobadas.
- ESLint backend (`server` y `app/api`): aprobado, cero warnings.
- `npm run build`: aprobado.
- `git diff --check`: aprobado.

## Rama y PR

- Rama: `codex/CDX-20260818-008-partner-ecosystem-entitlement`.
- Base del follow-up: `eb43609`.
- PR: no creado; pendiente de nueva auditoría.

## Riesgos pendientes

- Este ticket define el contrato, pero no crea los subdominios ni materializa el redirect del dominio raíz.
- Los consumidores futuros deben tratar `rootRedirectTarget` como destino declarativo, no como evidencia de infraestructura existente.

## Follow-up

No dentro del backend de este ticket. La implementación física del redirect y cualquier consumo frontend requieren tickets independientes.
