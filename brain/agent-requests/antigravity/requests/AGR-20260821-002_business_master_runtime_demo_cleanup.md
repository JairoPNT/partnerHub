# AGR-20260821-002 — Business Master Runtime Demo Cleanup

## Status

Completed.

## Owner

Antigravity.

## Context

The audit of `AGR-20260821-001` at commit `7d1c256` found that the runtime Business master still contains demonstration values even though its DONE report says the integration is clean:

- `plantillas-de-pagina/business/config.js` still uses YouTube demo ID `dQw4w9WgXcQ`.
- `plantillas-de-pagina/business/app.js` still hardcodes the same YouTube demo as fallback.
- The canonical master still links to `GrupoMomentumStarter`.
- The VSL poster path does not match the uploaded pilot asset.
- `git diff --check origin/main...HEAD` reports trailing whitespace in the request, report, and `index.html`.

The approved temporary Business VSL assets are:

- Video: `https://media.partnerhub.club/comunes/business/v1/vsl/business-vsl-pilot-v1.mp4`
- Poster: `https://media.partnerhub.club/comunes/business/v1/vsl/business-vsl-pilot-v1.webp`

The approved Business hero assets remain:

- Desktop: `https://media.partnerhub.club/comunes/business/v1/hero-desktop.webp`
- Mobile: `https://media.partnerhub.club/comunes/business/v1/hero-mobile.webp`

## Objective

Produce a clean runtime Business master on top of `AGR-20260821-001`, with the real temporary VSL, no executable demo video or partner-specific registration URL, and a clean diff that can safely unblock `CDX-20260821-013`.

## Branch Contract

- Create `antigravity/AGR-20260821-002-business-master-runtime-cleanup` from commit `7d1c256` plus this request file.
- The previous `AGR-20260821-001` branch is superseded and must not be merged separately.

## Allowed Files

- `plantillas-de-pagina/business/config.js`
- `plantillas-de-pagina/business/app.js`
- `plantillas-de-pagina/business/index.html`
- `plantillas-de-pagina/business/styles.css` only if required for the native video behavior
- `brain/agent-requests/antigravity/requests/AGR-20260821-001_business_master_clean_integration.md` only to repair malformed whitespace/control characters
- `brain/agent-requests/antigravity/reports/AGR-20260821-001_business_master_clean_integration_DONE.md` only to repair malformed whitespace/control characters and accurately mark it superseded
- This request file
- Matching DONE report for this request

## Excluded Files and Systems

- `plantillas-de-pagina/business/starter/**`
- Backend, APIs, Docker, auth, payments, Wompi, DNS, Hostinger, publishing, generated partner sources, and production data
- `app/web/scripts/jairo-business-source-generation-dry-run.mjs` and its tests

## Requirements

1. Configure the Business VSL as a native/custom MP4 using the approved pilot video URL.
2. Use the approved pilot poster URL in both `config.js` and the initial HTML fallback.
3. Support the configured native/custom video in `app.js` without retaining a hardcoded YouTube demo fallback.
4. Remove `dQw4w9WgXcQ` from all runtime files allowed above.
5. Remove `GrupoMomentumStarter` from the canonical runtime config. Empty or neutral defaults must fail safely and must never navigate to a different partner. Preserve the ability for generated partner configuration to inject its authorized registration URL.
6. Do not reintroduce Unsplash or any third-party demo media in the runtime files.
7. Preserve the dashed-grid work from `AGR-20260821-001`.
8. Repair trailing whitespace and malformed control characters so `git diff --check origin/main...HEAD` passes.
9. Keep the Business poster correlation contract intact: generated Business sources still derive their final VSL poster from Product hero via the backend contract. This master poster is only the canonical initial fallback.

## Acceptance Checks

- `git grep` over `config.js`, `app.js`, and `index.html` finds none of:
  - `dQw4w9WgXcQ`
  - `GrupoMomentumStarter`
  - `images.unsplash.com`
- Runtime files contain the approved MP4 and poster URLs.
- A missing generated registration URL does not produce a link to another partner.
- `npm run test:jairo-business-source-dry-run` passes.
- `npm run test:business-vsl-correlation` passes.
- `npm run test:business-vsl-poster` passes.
- `npm run test:ecosystem-templates` passes.
- `npm run test:ecosystem-generation-contract` passes.
- Focused ESLint, if applicable, passes.
- `npm run build` passes.
- `git diff --check origin/main...HEAD` passes.

## Completion Protocol

Create:

`brain/agent-requests/antigravity/reports/AGR-20260821-002_business_master_runtime_demo_cleanup_DONE.md`

Commit and push the new branch. Do not open a PR. Return the request ID, report path, branch, full commit SHA, test/build results, and any remaining risk directly to the orchestrator thread for audit.
