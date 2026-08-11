# CDX-20260811-003 - Partner hero configuration sync

- Owner: Codex
- Model tier: Balanced
- Scope: Synchronize final saved Landing Builder hero URLs to the activation lead linked by `siteId` after successful configuration persistence.
- Allowed files/modules: product-page generation backend services, activation-lead persistence service, focused backend tests, `app/web/package.json`, and this ticket/report documentation.
- Excluded files/modules: frontend components, styles, navigation, templates, publication, domains, verification, analytics, tracking integrations, migrations, production data, and historical reconciliation.
- Dependencies: Current Landing Builder configuration persistence and activation-lead `siteId` linkage on `origin/main`.
- Parallel-safe with: Tickets that do not modify the allowed backend services or shared generated output.
- Integration notes: This ticket writes only `onboardingData.heroDesktopUrl` and `onboardingData.heroMobileUrl`; historical records require a separate reconciliation ticket.

## Contract

- `configuration.hero.desktop` -> `onboardingData.heroDesktopUrl`
- `configuration.hero.mobile` -> `onboardingData.heroMobileUrl`

Only non-empty, valid HTTPS URLs are synchronized. Missing or invalid values never overwrite existing hero fields. All other activation-lead and onboarding fields remain unchanged.

## Persistence semantics

The synchronization runs only after the normalized configuration has been validated and `productPageSourceService.save` succeeds. A missing lead is an expected secondary condition: generation succeeds and returns a controlled warning. Invalid hero values are ignored and reported as a controlled warning when none remain. Activation storage read/write or validation failures propagate and are not hidden.

The reverse synchronization writes the activation record directly and does not call lead-to-source synchronization or product-page generation, preventing a lead/configuration cycle and a second generation.

## Acceptance checks

- Both valid heroes synchronize.
- Either hero can synchronize independently.
- Empty or invalid values do not erase existing heroes.
- Non-HTTPS URLs are ignored.
- `sourcePhotos`, consent, agreements, analytics, and every unrelated onboarding field remain intact.
- A missing linked lead does not invalidate a successful generation.
- Persistence errors remain visible.
- No recursion, publication, production generation, historical reconciliation, or frontend changes occur.
