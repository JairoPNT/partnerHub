# CDX-20260821-010 — Reporte DONE

## Contrato implementado

El entitlement resuelve el redirect del apex únicamente contra PublishingTargets del mismo owner con `publicationState: READY` y hostname canónico esperado.

- Un ecosistema: usa su target publicado.
- Múltiples: prefiere PERSONAL_BRAND.
- Si Brand no está publicado o no está entitulado: fallback determinista PRODUCT, luego BUSINESS.
- Sin target publicado: redirect bloqueado y host `null`; nunca se inventa un hostname.
- El fallback no añade PERSONAL_BRAND a `includedEcosystems`.
- Apex: `rootRedirectApex: { preserved: true, isPublishingTarget: false }`.

## Campos auditables

- `redirectStatus`: `READY_PRIMARY`, `READY_FALLBACK` o `BLOCKED_NO_PUBLISHED_TARGET`.
- `rootRedirectFallbackReason`:
  - `null` para target primario;
  - `PERSONAL_BRAND_TARGET_UNAVAILABLE`;
  - `PERSONAL_BRAND_NOT_ENTITLED`;
  - `NO_PUBLISHED_TARGET_AVAILABLE`;
  - `COMMERCIAL_STATE_UNKNOWN` para estado comercial desconocido.
- `rootRedirectTarget`: solo target publicado existente o `null`.
- `rootEcosystem`: ecosistema realmente seleccionado o `null`.

## Casos cubiertos

- Brand publicado disponible.
- Brand ausente y Product publicado.
- Brand/Product ausentes y Business publicado.
- Ningún target publicado.
- Ofertas individuales con target publicado.
- Preservación del apex y ausencia de target apex.
- Estado comercial desconocido.
- No mutación de inputs.

## Verificación

- `npm run test:partner-entitlement`: PASS, 11/11.
- ESLint focalizado: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.
- Warning NFT/Turbopack preexistente.

## Archivos

- `app/web/server/services/partnerEcosystemEntitlementCore.ts`
- `app/web/server/services/partnerEcosystemEntitlementCore.test.ts`
- request y reporte CDX-20260821-010.

## Riesgos

- Cambio intencional de comportamiento: antes podía devolverse un redirect esperado aunque no existiera target; ahora queda bloqueado hasta que haya un target `READY`.
- Consumidores deben tratar `rootRedirectTarget` como nullable y usar `redirectStatus`/razón para auditoría.
- No se exige aquí readiness DNS/SSL; `publicationState: READY` es la frontera contractual actual. Elevar ese gate requiere otro ticket.

## Límites y Git

- Rama: `codex/CDX-20260821-010-root-redirect-fallback-contract`.
- Sin UI, DNS, Hostinger, publicación, provisioning ni datos productivos.
- PR/deploy: no ejecutados.
