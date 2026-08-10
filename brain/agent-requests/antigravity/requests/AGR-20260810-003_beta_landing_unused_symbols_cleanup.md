# AGR-20260810-003 - Beta landing unused symbols cleanup

## Owner

Antigravity (Lead Product Designer and Frontend Lead).

## Dependency

- PR #100 is merged into `main`.
- Start from current `origin/main`.

## Single outcome

Remove only the eleven ESLint warnings caused by unused imports/components in the public `oferta-beta` landing and its `beta-landing` components, without changing rendered output or behavior.

## Evidence

The global lint currently reports eleven `@typescript-eslint/no-unused-vars` warnings in this bounded module:

- `app/web/app/oferta-beta/page.tsx`: `ReferralSection`, `ShieldCheck`.
- `app/web/components/beta-landing/ActiveDemosSection.tsx`: `ShieldCheck`.
- `app/web/components/beta-landing/BetaOfferSection.tsx`: `Sparkles`, `ShieldCheck`.
- `app/web/components/beta-landing/FaqSection.tsx`: `ShieldCheck`.
- `app/web/components/beta-landing/IncludesSection.tsx`: `CheckCircle2`.
- `app/web/components/beta-landing/PaymentModal.tsx`: `Zap`, `QrCode`.
- `app/web/components/beta-landing/PaymentSection.tsx`: `Zap`, `QrCode`.

## Required work

1. Remove only the unused imports or unused local declarations listed above.
2. Do not remove rendered sections, components, content, analytics, payment behavior, links, responsive behavior, or styling.
3. Do not introduce replacement icons or redesign the landing.
4. If any listed symbol is intentionally reserved for unfinished UI, remove the unused import now; future work may reintroduce it when actually rendered.

## Allowed files/modules

- `app/web/app/oferta-beta/page.tsx`
- The seven specifically listed files under `app/web/components/beta-landing/`.
- Matching completion report.

## Excluded files/modules

- All backend, API, Prisma, auth, infrastructure, templates, generated sites, and production data.
- Other frontend modules, including Partners, referrals, Master Sites, Domains, dashboard and navigation.
- Dependency upgrades, formatting sweeps, component deletion and visual redesign.

## Parallel safety

- Safe beside backend or referral work that does not edit `oferta-beta` or `components/beta-landing/**`.
- Not safe beside another task editing the same landing files.

## Acceptance criteria

1. The eleven named warnings are absent.
2. The `oferta-beta` rendered structure and behavior are unchanged.
3. No files outside the allowed list and matching report are changed.
4. No broad formatting diff is introduced.

## Verification

- Run targeted ESLint on the eight allowed source files with zero warnings/errors.
- Run `npm run build` from `app/web`.
- Run `git diff --check`.
- Manually smoke-check `/oferta-beta` on desktop and mobile widths.

## Required report and branch

- Report: `brain/agent-requests/antigravity/reports/AGR-20260810-003_beta_landing_unused_symbols_cleanup_DONE.md`.
- Suggested branch: `antigravity/AGR-20260810-003-beta-landing-unused-symbols-cleanup`.
- PR target: `main`.
