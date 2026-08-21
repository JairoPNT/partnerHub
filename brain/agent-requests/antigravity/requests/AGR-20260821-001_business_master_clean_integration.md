# AGR-20260821-001 - Business Master Clean Integration

## Status

Superseded by AGR-20260821-002.

## Owner

Antigravity.

## Context

The Business Master template (plantillas-de-pagina/business/) was previously updated on a separate branch with production media CDN URLs and refined UI styling (modern dashed-grid cards for the 4 pillars, SVG grid pattern overlays, color variable mapping, and placeholder-free media assets from https://media.partnerhub.club). This request cleanly integrates those assets and UI refinements into the latest main line, ensuring alignment with generation contracts and existing dry-run tests.

## Objective

Cleanly integrate the Business/VSL master template updates into the mainline branch without regressing backend/generation contracts or leaving demonstration image URLs, while verifying all build and test constraints.

## Scope

- Routes: plantillas-de-pagina/business/**
- Components: Business/VSL Template (app.js, config.js, index.html, styles.css)
- Files:
  - plantillas-de-pagina/business/config.js
  - plantillas-de-pagina/business/index.html
  - plantillas-de-pagina/business/styles.css
  - plantillas-de-pagina/business/app.js

## Requirements

- Update asset URLs in config.js and index.html to official CDN assets (https://media.partnerhub.club/...) instead of third-party Unsplash placeholders.
- Apply modern dashed grid layout and card design in styles.css and dynamic card generator in app.js for the 4 pillars / benefits section.
- Ensure npm run test:jairo-business-source-dry-run and all related test suites continue to pass.
- Ensure npm run build passes cleanly.

## Out of Scope

- Backend logic, database schemas, auth, Docker, or API routes.
- Publishing to production or modifying live DNS/Hostinger targets.

## Acceptance Criteria

- plantillas-de-pagina/business/ contains official CDN media links for hero background, social proof avatars, VSL thumbnail, and testimonial avatars.
- Dashed grid feature cards render correctly with SVG background overlays and themed highlights.
- All relevant node tests and next build pass with 0 errors.

## Verification Plan

- Run npm run test:jairo-business-source-dry-run.
- Run npm run test:business-vsl-correlation.
- Run npm run test:business-vsl-poster.
- Run npm run test:ecosystem-templates.
- Run npm run test:ecosystem-generation-contract.
- Run npm run build.

## Required Completion Report

Write the completion report to:

brain/agent-requests/antigravity/reports/AGR-20260821-001_business_master_clean_integration_DONE.md
