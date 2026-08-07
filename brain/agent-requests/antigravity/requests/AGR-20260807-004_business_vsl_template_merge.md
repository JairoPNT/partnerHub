# AGR-20260807-004 - Fusion de plantillas Business / VSL

## Owner

Antigravity (Lead Product Designer & Frontend Lead).

## Contexto

Jairo quiere trabajar la plantilla VSL / Negocio reciclando elementos de dos previews existentes:

- Base original de Jairo: `plantillas-de-pagina/business.old`
- Base nueva creada por Codex/PartnerHub: `plantillas-de-pagina/business`

La direccion de producto es integrar lo mejor de ambas: conservar el impacto visual y assets de la version antigua, pero mantener la plantilla nueva como estructura configurable, ligera y replicable para el ecosistema BUSINESS.

## Scope

Crear una version consolidada de la plantilla estatica Business / VSL.

Resultado esperado:

- `plantillas-de-pagina/business` queda como plantilla maestra consolidada.
- `plantillas-de-pagina/business.old` se conserva como referencia historica y no se elimina.
- La plantilla final se puede abrir como sitio estatico y sigue leyendo datos desde `config.js`.
- La experiencia debe sentirse como una VSL de negocio premium: clara, persuasiva, con video como centro y CTA hacia sesion/WhatsApp.

## Allowed files/modules

Antigravity puede modificar:

- `plantillas-de-pagina/business/index.html`
- `plantillas-de-pagina/business/styles.css`
- `plantillas-de-pagina/business/app.js`
- `plantillas-de-pagina/business/config.js`
- `plantillas-de-pagina/business/favicon.svg`
- `plantillas-de-pagina/business/starter/**` solo si decide mantenerlo sincronizado como starter/demo estatico de la misma plantilla.

Antigravity puede leer y tomar referencia de:

- `plantillas-de-pagina/business.old/index.html`
- `plantillas-de-pagina/business.old/styles.css`
- `plantillas-de-pagina/business.old/styles-negocio.css`
- `plantillas-de-pagina/business.old/app.js`
- `plantillas-de-pagina/business.old/images/**`
- `plantillas-de-pagina/business.old/tipografia/**`

## Excluded files/modules

No modificar:

- `plantillas-de-pagina/business.old/**`
- `plantillas-de-pagina/brand/**`
- `plantillas-de-pagina/personal-brand/**`
- `plantillas-de-pagina/producto/**`
- `app/web/**`
- `app/web/prisma/**`
- `app/web/server/**`
- Docker, auth, endpoints, migrations, package dependencies, generated output under `tmp/`.

## Dependencies

- Completed context: `AGR-20260806-002`.
- No dependency on `AGR-20260807-003`; both can run in parallel because file boundaries do not overlap.

## Parallel-safe with

- `AGR-20260807-003_personal_brand_template_merge`

## Product and UX direction

Use `business` as the structural base because it already has:

- `config.js`
- `ecosystemType: BUSINESS`
- configurable distributor data
- configurable hero
- configurable VSL embed
- configurable benefits and CTA
- PH-025 theme presets

Use `business.old` as visual/narrative inspiration for:

- stronger VSL atmosphere
- richer business opportunity storytelling
- more premium video presentation area
- sections that make the opportunity feel tangible and aspirational
- visual assets and typographic rhythm where useful

Keep the VSL focused:

- first viewport should clarify the opportunity and invite watching the video
- video should be central and prominent
- benefits should support the business model, not distract from the VSL
- CTA should route to WhatsApp/session from configuration

## Acceptance Criteria

- The page renders correctly from `plantillas-de-pagina/business/index.html`.
- All variable identity/contact/VSL/CTA fields continue to come from `config.js`.
- No real entrepreneur data is hardcoded.
- VSL embed remains configurable through `config.js`.
- WhatsApp/session CTA continues to resolve from configuration.
- The page works on desktop and mobile.
- Theme fields `theme.fontPreset` and `theme.palettePreset` continue to affect the main visual surface where currently supported.
- Assets copied from `business.old` must live inside `plantillas-de-pagina/business` if needed; do not reference `../business.old` from the final template.

## Verification Required

- Open locally as static HTML or serve the folder locally.
- Verify desktop and mobile responsive behavior.
- Verify no console errors in browser.
- Run syntax checks for JavaScript where applicable.
- If this touches any Next.js app files unexpectedly, stop and report conflict instead of continuing.

## Required Report

Create:

`brain/agent-requests/antigravity/reports/AGR-20260807-004_business_vsl_template_merge_DONE.md`

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

`antigravity/AGR-20260807-004-business-vsl-template-merge`
