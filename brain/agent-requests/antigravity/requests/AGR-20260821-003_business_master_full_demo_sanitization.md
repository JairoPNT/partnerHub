# AGR-20260821-003 — Business Master Full Demo Sanitization

## Status

In Progress.

## Owner

Antigravity — Lead Product Designer & Frontend Lead.

## Context

Following the runtime demo cleanup in `AGR-20260821-002` and the Jairo Business clean master alignment in `CDX-20260821-014`, the raw master Business configuration in `plantillas-de-pagina/business/config.js` still contains demonstration identities, placeholder phone numbers, testimonials, and avatar URLs:
- `distributor.brandName`: 'Nexus Team'
- `distributor.whatsappNumber`: '573000000000' and derived wa.me links
- `testimonials.items`: 'Diana Ramos', 'Carlos Mendoza'
- `socialProof.avatars` / `testimonials.items[].avatarUrl`: `/comunes/placeholders/avatar-*.webp`

To prevent any demo or placeholder data leakage into production or downstream partner generation projections, the raw master Business template must be fully sanitized:
- Retaining approved canonical media (Hero desktop/mobile, pilot VSL MP4, and pilot poster).
- Setting neutral/empty defaults for partner-injected fields.
- Deactivating `socialProof` and `testimonials` with empty arrays (`avatars: []`, `items: []`).
- Sanitizing secondary CTA / WhatsApp URL to safe anchor `#contacto` when no partner number exists.
- Ensuring `app.js` and `index.html` render resiliently without broken links or blank redirects when optional fields are empty.

## Objective

Sanitize the raw master Business template (`plantillas-de-pagina/business/config.js`) and ensure runtime scripts/HTML handle empty distributor, social proof, and testimonial fields cleanly with safe `#contacto` fallbacks, without modifying approved canonical media, copy, or dashed-grid styles, and strictly preserving compatibility with `CDX-013`/`CDX-014`.

## Scope

- Routes / Templates: `plantillas-de-pagina/business/**`
- Allowed Files:
  - `plantillas-de-pagina/business/config.js`
  - `plantillas-de-pagina/business/app.js` (only if indispensable for safe fallbacks)
  - `plantillas-de-pagina/business/index.html` / `styles.css` (only if indispensable)
  - `brain/agent-requests/antigravity/requests/AGR-20260821-003_business_master_full_demo_sanitization.md`
  - `brain/agent-requests/antigravity/reports/AGR-20260821-003_business_master_full_demo_sanitization_DONE.md`

## Out of Scope

- Backend logic, database schemas, auth, Docker, payments, Wompi, DNS, Hostinger, publishing, or production data.
- Unrelated files, worktrees, or untracked repository files.

## Requirements

1. **Preserve Canonical Media Assets**:
   - Hero desktop: `https://media.partnerhub.club/comunes/business/v1/hero-desktop.webp`
   - Hero mobile: `https://media.partnerhub.club/comunes/business/v1/hero-mobile.webp`
   - VSL video (custom): `https://media.partnerhub.club/comunes/business/v1/vsl/business-vsl-pilot-v1.mp4`
   - VSL poster: `https://media.partnerhub.club/comunes/business/v1/vsl/business-vsl-pilot-v1.webp`
2. **Purge Demo Identities & Contacts**:
   - In `config.js`, set empty strings for `brandName`, `firstName`, `fullName`, `role`, `whatsappNumber`, `phoneNumber`, `displayPhone`, `ctaUrl`, and `defaultMessage`.
   - Remove `573000000000` and all hardcoded demo `wa.me` links.
   - Remove `Nexus Team`.
   - Remove `Diana Ramos` and `Carlos Mendoza`.
   - Remove `/comunes/placeholders/avatar-*.webp` from `config.js`.
3. **Deactivate Optional Demo Sections**:
   - `socialProof`: set `enabled: false` and `avatars: []`.
   - `testimonials`: set `enabled: false` and `items: []`.
4. **Safe Fallbacks in Controller / HTML**:
   - Secondary CTA and WhatsApp links must fall back safely to `#contacto` (or hide/be neutral) when no valid WhatsApp number is provided.
   - When `socialProof.enabled` is false, hide the social proof bar or handle empty gracefully.
   - When `testimonials.enabled` is false or items empty, hide the testimonials section or handle gracefully.
   - Brand name / distributor elements in header and footer must handle empty strings without rendering undefined or broken artifacts.
5. **Forbidden Tokens Absence**:
   - Zero occurrences of:
     - `Nexus Team`
     - `573000000000`
     - `Diana Ramos`
     - `Carlos Mendoza`
     - `avatar-1.webp`, `avatar-2.webp`, `avatar-3.webp`, `avatar-4.webp` in `config.js`
     - `dQw4w9WgXcQ`
     - `GrupoMomentumStarter`
     - `images.unsplash.com`

## Acceptance Criteria

- `git grep` over `plantillas-de-pagina/business/config.js`, `app.js`, and `index.html` yields 0 matches for forbidden tokens.
- `plantillas-de-pagina/business/config.js` has SHA-256 computable and verified.
- `npm run test:jairo-business-source-dry-run` PASS.
- `npm run test:business-vsl-correlation` PASS.
- `npm run test:business-vsl-poster` PASS.
- `npm run test:ecosystem-templates` PASS.
- `npm run test:ecosystem-generation-contract` PASS.
- `npm run build` PASS.
- `git diff --check origin/main...HEAD` PASS.

## Completion Report

Write completion report to:
`brain/agent-requests/antigravity/reports/AGR-20260821-003_business_master_full_demo_sanitization_DONE.md`
