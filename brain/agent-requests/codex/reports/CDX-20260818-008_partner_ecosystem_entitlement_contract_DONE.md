# CDX-20260818-008 — DONE

## Request ID

`CDX-20260818-008`

## Resumen

Se implementó un contrato backend de solo lectura que expone el entitlement comercial de un partner desde el snapshot de oferta persistido. El cálculo separa targets esperados, existentes y faltantes, determina la raíz vigente y reporta razones determinísticas de regeneración sin publicar, provisionar ni modificar datos.

Los partners legacy sin un snapshot válido responden `commercialState: UNKNOWN`; no se infiere una oferta ni ecosistemas desde dominios, IDs o targets. La lectura técnica acepta únicamente targets persistidos versión 2 y no ejecuta migraciones durante la consulta.

## Endpoint

`GET /api/internal/partner-ecosystem-entitlement`

- Autenticación: Cloudflare Access interna.
- Query: exactamente uno de `activationLeadId=<uuid>` o `siteId=<slug>`.
- Respuestas: `200`, `400 INVALID_PARTNER_ENTITLEMENT_QUERY`, `401`, `404 PARTNER_ENTITLEMENT_NOT_FOUND` o `500 PARTNER_ENTITLEMENT_FAILED`.
- Cache: `no-store`.

Ejemplo conocido (resumido):

```json
{
  "activationLeadId": "e905919b-9654-42d4-a7e7-9e6dc55966be",
  "commercialState": "KNOWN",
  "offerCode": "PLAN_360",
  "offerSnapshot": { "amountCop": 997000, "currency": "COP" },
  "includedEcosystems": ["PRODUCT", "BUSINESS", "PERSONAL_BRAND"],
  "rootEcosystem": "PERSONAL_BRAND",
  "expectedTargets": [
    { "ecosystemType": "PRODUCT", "role": "SUBDOMAIN", "publicHost": "producto.partner.pro" },
    { "ecosystemType": "BUSINESS", "role": "SUBDOMAIN", "publicHost": "negocio.partner.pro" },
    { "ecosystemType": "PERSONAL_BRAND", "role": "ROOT", "publicHost": "partner.pro" }
  ],
  "existingTargets": [],
  "missingTargets": [
    { "ecosystemType": "PRODUCT", "role": "SUBDOMAIN", "publicHost": "producto.partner.pro" },
    { "ecosystemType": "BUSINESS", "role": "SUBDOMAIN", "publicHost": "negocio.partner.pro" },
    { "ecosystemType": "PERSONAL_BRAND", "role": "ROOT", "publicHost": "partner.pro" }
  ],
  "regenerationRequired": true,
  "regenerationReasons": [
    "TARGET_MISSING:PRODUCT",
    "TARGET_MISSING:BUSINESS",
    "TARGET_MISSING:PERSONAL_BRAND"
  ]
}
```

Ejemplo legacy (resumido):

```json
{
  "commercialState": "UNKNOWN",
  "offerCode": null,
  "offerSnapshot": null,
  "includedEcosystems": [],
  "expectedTargets": [],
  "missingTargets": [],
  "regenerationRequired": false,
  "regenerationReasons": ["COMMERCIAL_STATE_UNKNOWN"]
}
```

## Archivos modificados

- `app/web/app/api/internal/partner-ecosystem-entitlement/route.ts`
- `app/web/server/services/partnerEcosystemEntitlementCore.ts`
- `app/web/server/services/partnerEcosystemEntitlementService.ts`
- `app/web/server/services/partnerEcosystemTargetReader.ts`
- `app/web/server/services/partnerEcosystemEntitlementCore.test.ts`
- `app/web/package.json`
- `brain/agent-requests/codex/requests/CDX-20260818-008_partner_ecosystem_entitlement_contract.md`
- `brain/agent-requests/codex/reports/CDX-20260818-008_partner_ecosystem_entitlement_contract_DONE.md`

## Verificación

- Pruebas focalizadas entitlement: 6/6 aprobadas.
- Regresión del catálogo/snapshot: 12/12 aprobadas.
- ESLint backend (`server` y `app/api`): aprobado, cero warnings.
- `npm run build`: aprobado.
- `git diff --check`: aprobado.

## Riesgos pendientes

- El estado de regeneración se deriva del snapshot actual frente a los targets persistidos; no existe todavía un historial comercial que distinga el instante exacto de un cambio de oferta.
- Los targets legacy versión 1 se omiten deliberadamente en este endpoint para conservar la garantía de solo lectura. Su migración corresponde al flujo explícito de provisioning, no a esta consulta.
- El contrato no regenera ni publica páginas automáticamente.

## Siguiente ticket

Crear un request Antigravity independiente para mostrar el estado de entitlement y regeneración en UI, consumiendo este endpoint sin alterar su contrato. La regeneración explícita debe permanecer en un ticket de integración separado.

## Rama y PR

- Rama: `codex/CDX-20260818-008-partner-ecosystem-entitlement`
- PR: no creado; pendiente de auditoría.

## Follow-up

Sí: UI Antigravity y posterior integración de regeneración explícita, en tickets separados.
