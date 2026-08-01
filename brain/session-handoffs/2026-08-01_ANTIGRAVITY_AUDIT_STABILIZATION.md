# 2026-08-01 - Antigravity Change Audit And Stabilization

## Context

Jairo requested an audit of the changes made on 2026-07-31 while Codex was unavailable and work was delegated to Antigravity.

The review found useful PH-025 / product-page improvements mixed with backend and deployment patches that crossed role boundaries and weakened some contracts.

## Changes Stabilized By Codex

- Restored `POST /api/internal/product-pages/verify` to read-only behavior.
- Removed verification-time source synthesis from `productPageVerificationService`.
- Added onboarding token validation before public photo uploads reach Cloudflare R2.
- Changed proxy host resolution to prefer the actual `Host` header before `x-forwarded-host`.
- Unified the new font presets across frontend selection, onboarding schema, lead sync, and product page generation:
  - `serif-chic`
  - `romantic-serif`
  - `luxury-serif`
- Removed invalid `@next/next/no-img-element` lint directives introduced in onboarding photo UI.

## Verification

- `npx tsc --noEmit` passes.
- `npm run build` passes.
- `npm run lint` still fails due to pre-existing lint debt outside this stabilization:
  - unused imports in beta landing / topbar files.
  - `no-explicit-any` in `partners-referrals-view.tsx` and `sidebar.tsx`.

## Remaining Known Risks

- Public onboarding upload is now token-gated, but still lacks rate limiting.
- Proxy host behavior should be validated in EasyPanel after deployment.
- Product page template contains a master-only floating style switcher; confirm it does not appear on client domains except intended master contexts.
- Some files contain mojibake text from earlier changes. No mass encoding cleanup was attempted in this stabilization pass.

## Recommended Next Step

Run one operational 0-to-100 test with `jairopinto.pro`:

1. Onboarding data entry.
2. Photo upload.
3. Admin lead review.
4. Landing builder hydration.
5. Generate preview.
6. Publish.
7. Verify.
8. Confirm no verification-time source mutation.

