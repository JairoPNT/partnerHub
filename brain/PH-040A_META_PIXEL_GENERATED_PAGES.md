# PH-040A - Meta Pixel in generated pages

Status: Completed
Date: 2026-08-09
Owner: Codex
Model tier: Balanced

## Single outcome

Generated PartnerHub pages include the configured Meta Pixel base code in a safe, deterministic way.

## Dependencies

- PH-005A / PH-005B static page generation.
- PH-024 integrations configuration contract.

## Allowed files and modules

- `app/web/server/services/productPageGenerationService.ts`
- A focused Meta Pixel HTML helper and its tests under `app/web/server/services/`
- `app/web/package.json`
- This ticket documentation and current status after completion

## Excluded scope

- Dashboard or other frontend implementation.
- Meta Events Manager automation or API credentials.
- Conversions API.
- Google Ads.
- Custom conversion events beyond the base `PageView`.
- Consent-management UI.
- Publication, provisioning, DNS, authentication, database, or infrastructure changes.
- Live production publication or provider calls.

## Contract

- Input remains `integrations.meta.pixelId`.
- Pixel IDs contain digits only and have a bounded length.
- PartnerHub generates the fixed base script; operators cannot supply executable code.
- The managed script is placed before `</head>` and initializes `PageView`.
- The managed `noscript` image is placed immediately after the opening `<body>`.
- Existing PartnerHub-managed Pixel blocks are removed before generation so a partner never inherits the master site's Pixel.
- A page without a Pixel ID contains no PartnerHub-managed Meta Pixel block.

## Acceptance criteria

- [x] A valid Pixel ID is normalized and injected once.
- [x] Invalid IDs are rejected by the generation schema.
- [x] The script is present inside `<head>` and emits `PageView`.
- [x] The fallback image is present inside `<body>`.
- [x] Regeneration does not duplicate either block.
- [x] A child page replaces the master Pixel instead of inheriting it.
- [x] A child page without a Pixel removes an inherited managed Pixel.
- [x] Focused tests, targeted lint, and production build pass.

## Verification

- `npm.cmd run test:meta-pixel`: 5/5 passing.
- Targeted ESLint for the helper, its tests, and the generation service: passing with zero warnings.
- `npm.cmd run build`: passing with 31 routes generated.
- The build retains the two pre-existing workspace-root/NFT trace warnings.
- No page was published and no request was sent to Meta or another provider.

## Result

The generation service now owns a marked Meta Pixel block in each generated `index.html`. Generation always removes an inherited PartnerHub-managed block before optionally adding the current site's numeric Pixel ID, which prevents cross-site Pixel leakage when partner packages use a generated master as their template.

## Follow-ups

- PH-040B must add read-only public verification of the expected Pixel after publication.
- A separate Antigravity request may expose the existing `metaPixelId` field and lifecycle state in Analytics and Metrics after the backend contract is merged.
- Consent management, additional browser events, Google Ads, and Conversions API remain separate tickets.
