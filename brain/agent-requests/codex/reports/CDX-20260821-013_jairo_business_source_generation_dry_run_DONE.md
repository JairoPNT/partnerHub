# CDX-20260821-013 — Jairo Business source generation DRY_RUN — DONE

## Resultado

Se implementó un comando exclusivamente `DRY_RUN` que proyecta
`jairo-pinto-business.json` desde el config Business canónico empaquetado en el
runtime y tres snapshots SHA-256 pinned. Siempre devuelve `changed:false`, no
incluye ruta APPLY y solo escribe evidencia bajo `.migration-audits`.

El entitlement no se infiere de nombres, fuentes o reportes históricos. El
comando exige el resultado actual del contrato
`partnerEcosystemEntitlementService` para el activationLead exacto y valida:

- `activationLeadId=f403f29e-95c8-4825-9320-967376443020`;
- `commercialState=KNOWN`;
- `includedEcosystems` contiene `BUSINESS`;
- `expectedTargets` contiene `BUSINESS`, rol `SUBDOMAIN` y
  `negocio.jairopinto.pro`.

## Identidad y preservación

- Business: `jairo-pinto-business` / `BUSINESS` /
  `negocio.jairopinto.pro`.
- Base domain: `jairopinto.pro`.
- Apex: preservado, `isPublishingTarget:false`.
- Brand `jairo-pinto.json` y Product `jairo-pinto-product.json` se leen,
  hashean y respaldan; nunca se escriben.
- Una fuente Business existente bloquea `BUSINESS_SOURCE_COLLISION`.

## Datos requeridos

Junto al manifest deben existir:

1. `activation-lead.json`: snapshot real con `id`, `siteId`, `fullName`,
   `brandName`, `whatsapp` y `onboardingData.domain`; puede aportar phone,
   analytics, Meta Pixel, Google Ads y theme.
2. `entitlement.json`: respuesta actual del endpoint/servicio de entitlement.
3. `business-profile.json`: datos autorizados que onboarding no modela:
   `role`, `siteTitle`, `ogTitle`, `ogDescription`, `metaDescription`,
   `defaultMessage`; hero (`badge`, `headline`, `subheadline`,
   `desktopBgUrl`, `mobileBgUrl`); VSL (`provider`, `embedUrl`, `videoTitle`,
   `thumbnailUrl`, `durationText`, opcional `autoPlay`); CTA (`primaryText`,
   `directRegisterUrl`, `secondaryText`, `guaranteeText`).

URLs visuales, VSL y registro deben ser HTTPS. Estos campos no se sustituyen
por Product. Si falta cualquiera, se emite `BUSINESS_DATA_MISSING:<campo>` y no
se crea archivo proyectado.

## Protección contra contenido demostrativo

La plantilla contiene valores de master que no pueden publicarse como datos de
Jairo (teléfono demo, video demo, equipo/testimonios y enlace demo). La
proyección reemplaza identidad, contacto, hero, VSL y CTA con inputs autorizados,
desactiva social proof/testimonios demostrativos y escanea marcadores conocidos.
Si queda alguno, bloquea `PLACEHOLDER_PRESENT:<ruta>` y no escribe la proyección.
Una prueba usa el `plantillas-de-pagina/business/config.js` real completo.

## Manifest

```json
{
  "confirmation": "DRY_RUN_JAIRO_BUSINESS_SOURCE",
  "allowlist": [{
    "activationLeadId": "f403f29e-95c8-4825-9320-967376443020",
    "ownerSiteId": "jairo-pinto",
    "productSiteId": "jairo-pinto-product",
    "businessSiteId": "jairo-pinto-business",
    "ecosystemType": "BUSINESS",
    "baseDomain": "jairopinto.pro",
    "publicHost": "negocio.jairopinto.pro",
    "expectedActivationLeadHash": "<SHA256 activation-lead.json>",
    "expectedEntitlementHash": "<SHA256 entitlement.json>",
    "expectedBusinessProfileHash": "<SHA256 business-profile.json>",
    "expectedBrandSourceHash": "<SHA256 .sources/jairo-pinto.json>",
    "expectedProductSourceHash": "<SHA256 .sources/jairo-pinto-product.json>",
    "expectedCanonicalTemplateHash": "<SHA256 /app/runtime-assets/business-config.js>"
  }]
}
```

## Comando futuro exacto

Después de deploy y preparación/auditoría de inputs, desde `/app`:

```sh
npm run maintenance:jairo-business-source-dry-run -- --manifest=/data/generated-sites/.migration-inputs/CDX-20260821-013/manifest.json
```

No existe ni se debe solicitar comando APPLY en este ticket.

## Archivos

- `app/web/scripts/jairo-business-source-generation-dry-run.mjs`
- `app/web/scripts/jairo-business-source-generation-dry-run.test.mjs`
- `app/web/package.json`
- `Dockerfile` (solo transporta config Business mínimo y script al runner)
- request/reporte CDX-013.

## Verificación

- Tests focalizados: PASS 6/6.
- ESLint focalizado real con `--no-ignore --max-warnings=0`: PASS.
- Build: PASS.
- `git diff --check`: PASS.

## Riesgos y dependencias

- Los tres snapshots productivos y seis hashes todavía deben ser preparados y
  auditados; no se accedió a EasyPanel.
- Onboarding no posee campos Business suficientes. El profile autorizado es una
  dependencia deliberada; el comando bloquea en vez de publicar defaults.
- Una futura materialización de la fuente, generación o correlación de VSL con
  Product requiere ticket separado y revisión del contrato de generación; este
  ticket no guarda ni regenera la fuente.
- Persiste el warning preexistente Next.js NFT/múltiples lockfiles. `npm ci`
  informó 12 vulnerabilidades existentes; no se cambiaron dependencias.

## Límites

No EasyPanel, APPLY, fuentes reales, PublishingTargets, DNS, Hostinger, SSL,
publicación, regeneración, redirects, UI, pagos o ledger. PR/deploy no ejecutados.
