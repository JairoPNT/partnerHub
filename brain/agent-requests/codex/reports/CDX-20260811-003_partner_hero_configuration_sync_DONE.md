# CDX-20260811-003 - Completion report

- Request ID: `CDX-20260811-003`
- Owner: Codex
- Branch: `codex/CDX-20260811-003-partner-hero-configuration-sync`
- Commit: closing `HEAD` for this report; final hash is delivered with the ticket handoff.

## Final contract

- `configuration.hero.desktop` -> `onboardingData.heroDesktopUrl`
- `configuration.hero.mobile` -> `onboardingData.heroMobileUrl`

Synchronization runs immediately after validated configuration persistence. Only non-empty HTTPS URLs are eligible. Missing or invalid values never replace stored heroes. A missing linked activation lead returns a controlled response warning and does not fail generation. Activation persistence and validation errors propagate instead of being swallowed.

The configuration-to-lead operation performs one direct activation-store update. It does not invoke `productPageLeadSyncService`, source saving, generation, regeneration, or publication, so no reverse cycle or second generation is introduced.

## Files modified

- `app/web/server/services/productPageGenerationService.ts`
- `app/web/server/services/activationLeadService.ts`
- `app/web/server/services/productPageHeroSyncService.ts`
- `app/web/server/services/productPageHeroSyncService.test.ts`
- `app/web/package.json`
- `brain/agent-requests/codex/requests/CDX-20260811-003_partner_hero_configuration_sync.md`
- `brain/agent-requests/codex/reports/CDX-20260811-003_partner_hero_configuration_sync_DONE.md`

No file under `app/web/components/**`, no styles, navigation, Business template, or dashboard file was modified.

## Verification

- Focused backend tests: `npm.cmd run test:hero-sync` - PASS, 6/6.
- Production build from `app/web`: `npm.cmd run build` - PASS.
- `git diff --check` - PASS.
- Tests use fakes plus an isolated operating-system temporary directory that is removed after the test; they never access the configured activation store. The build does not execute generation. No production directory or production data was read or written.

Covered behavior:

- both valid heroes;
- one hero independently;
- preservation of existing heroes for absent input;
- rejection of empty, malformed, and non-HTTPS input;
- preservation of `sourcePhotos`, `imageUseConsent`, `agreementAccepted`, analytics, and unrelated onboarding data;
- missing lead warning without generation failure;
- persistence-error propagation;
- exactly one store call and no generation callback/recursion.

## Build notes

Build completed successfully with existing Next.js warnings about inferred workspace root and broad NFT tracing in `next.config.mjs`; neither warning was introduced by this ticket.

## Risks and follow-up

- The source configuration save precedes the secondary activation write by contract. A real activation persistence failure is surfaced to the caller, but the already-saved source configuration is not rolled back because these file stores do not share a transaction.
- Existing partners are intentionally unchanged. A separate historical reconciliation ticket is still required, including for Claudia Calero.
- No page was generated, regenerated, published, or verified during this ticket.
- No production data was modified.
