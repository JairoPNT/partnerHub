# AGR-20260807-003 - Fusion de plantillas Marca Personal

## Owner

Antigravity (Lead Product Designer & Frontend Lead).

## Contexto

Jairo quiere trabajar la plantilla de Marca Personal reciclando elementos de dos previews existentes:

- Base original de Jairo: `plantillas-de-pagina/brand`
- Base nueva creada por Codex/PartnerHub: `plantillas-de-pagina/personal-brand`

La direccion de producto es conservar la riqueza visual y narrativa de `brand`, pero mantener la estructura configurable, modular y replicable de `personal-brand`.

## Scope

Crear una version consolidada de la plantilla estatica de Marca Personal que integre lo mejor de ambas previews sin romper el contrato configurable existente.

Resultado esperado:

- `plantillas-de-pagina/personal-brand` queda como plantilla maestra consolidada.
- `plantillas-de-pagina/brand` se conserva como referencia historica y no se elimina.
- La plantilla final se puede abrir como sitio estatico y sigue leyendo datos desde `config.js`.
- La experiencia debe sentirse premium, personal, profesional y orientada a marca personal, no como una landing generica.

## Allowed files/modules

Antigravity puede modificar:

- `plantillas-de-pagina/personal-brand/index.html`
- `plantillas-de-pagina/personal-brand/styles.css`
- `plantillas-de-pagina/personal-brand/app.js`
- `plantillas-de-pagina/personal-brand/config.js`
- `plantillas-de-pagina/personal-brand/favicon.svg`

Antigravity puede leer y tomar referencia de:

- `plantillas-de-pagina/brand/index.html`
- `plantillas-de-pagina/brand/styles.css`
- `plantillas-de-pagina/brand/app.js`

## Excluded files/modules

No modificar:

- `plantillas-de-pagina/brand/**`
- `plantillas-de-pagina/business/**`
- `plantillas-de-pagina/business.old/**`
- `plantillas-de-pagina/producto/**`
- `app/web/**`
- `app/web/prisma/**`
- `app/web/server/**`
- Docker, auth, endpoints, migrations, package dependencies, generated output under `tmp/`.

## Dependencies

- Completed context: `AGR-20260806-002` and `AGR-20260806-003`.
- No dependency on `AGR-20260807-004`; both can run in parallel because file boundaries do not overlap.

## Parallel-safe with

- `AGR-20260807-004_business_vsl_template_merge`

## Product and UX direction

Use `personal-brand` as the structural base because it already has:

- `config.js`
- `ecosystemType: PERSONAL_BRAND`
- modular blocks for profile, bio, services, links, events and contact
- PH-025 theme presets

Use `brand` as visual/narrative inspiration for:

- stronger first viewport presence
- more polished personal-brand composition
- richer section rhythm
- better visual hierarchy for profile, value proposition, services/businesses, links, events and contact
- premium personal brand feel

Do not convert the template into an unlimited builder. Keep the bounded block model:

- up to 4 services/businesses
- up to 8 external links
- up to 6 events/agenda links

## Acceptance Criteria

- The page renders correctly from `plantillas-de-pagina/personal-brand/index.html`.
- All variable identity/contact/content fields continue to come from `config.js`.
- No real entrepreneur data is hardcoded.
- No free HTML editor behavior is introduced.
- Blocks can remain enabled/disabled through `config.js`.
- Visual design works on desktop and mobile.
- CTA and WhatsApp links still resolve from configuration.
- Theme fields `theme.fontPreset` and `theme.palettePreset` continue to affect the main visual surface where currently supported.

## Verification Required

- Open locally as static HTML or serve the folder locally.
- Verify desktop and mobile responsive behavior.
- Verify no console errors in browser.
- Run syntax checks for JavaScript where applicable.
- If this touches any Next.js app files unexpectedly, stop and report conflict instead of continuing.

## Required Report

Create:

`brain/agent-requests/antigravity/reports/AGR-20260807-003_personal_brand_template_merge_DONE.md`

Report must include:

- Request ID
- Summary of changes
- Files modified
- Verification performed
- Build/syntax status
- Branch/commit/PR if applicable
- Risks or follow-up needed

## Branch

Use:

`antigravity/AGR-20260807-003-personal-brand-template-merge`
