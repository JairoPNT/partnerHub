# AGR-20260811-001 - Partner source photos visibility

## Owner

Antigravity (Lead Product Designer and Frontend Lead).

## Parent decision

`PH-043_INTERNAL_AI_HERO_GENERATION_PLAN.md` establishes that onboarding source photos and final hero assets are different resources. This ticket exposes the already persisted source photos before any generation automation is implemented.

## Single outcome

Display the original onboarding source photos in the selected partner's administrative record so an operator can confirm which usable inputs exist for future hero generation.

## Current contract

- `GET /api/internal/activation-leads` already returns `onboardingData.sourcePhotos?: string[]`.
- Source photos are public R2 HTTPS URLs under `media.partnerhub.club`.
- No backend or endpoint change is required for this ticket.
- `heroDesktopUrl` and `heroMobileUrl` are final assets and must remain visually and semantically separate.

## Required behavior

1. Extend the local `OnboardingData` frontend type with `sourcePhotos?: string[]`.
2. In the selected-partner details modal, add a section named `Fotografías fuente del onboarding` near the existing visual/onboarding information.
3. Render a responsive thumbnail gallery for every non-empty HTTPS source URL.
4. Each thumbnail must support opening the original image in a new tab with safe link attributes.
5. Show the number of available source photos.
6. If the array is absent or empty, show a neutral empty state: `No hay fotografías fuente cargadas`.
7. Clearly label these images as source material; do not label them as desktop or mobile heroes.
8. Do not add generation, selection, approval, deletion, upload or publication controls.
9. Do not change the existing onboarding-completeness calculation in this request.
10. Broken thumbnails must not collapse the layout; provide an accessible fallback or stable placeholder treatment.

## Allowed files/modules

- `app/web/components/entrepreneur-operations-view.tsx`
- Matching completion report.

## Excluded files/modules

- `app/web/server/**`
- `app/web/app/api/**`
- `app/web/app/onboarding/**`
- `app/web/components/product-page-generator-view.tsx`
- Prisma, database, R2 services, OpenAI, Python, Docker and EasyPanel.
- Hero completeness logic.
- Upload, generation and publication behavior.
- Unrelated styling or refactors.

## Dependencies

- None. The read contract already exists.

## Parallel safety

- Not safe beside another task editing `entrepreneur-operations-view.tsx`.
- Safe beside backend-only planning or implementation that does not modify the activation-lead response contract.

## Acceptance criteria

1. A partner with `onboardingData.sourcePhotos` shows every stored photo and the correct count.
2. Clicking a thumbnail opens its original R2 asset safely.
3. A partner without source photos shows the neutral empty state.
4. Source photos are not presented as completed heroes.
5. Existing hero fields, onboarding completeness, editing and publication behavior remain unchanged.
6. Mobile and desktop layouts remain usable without horizontal overflow.
7. Diff is limited to the allowed component and completion report.

## Verification

- Targeted ESLint for `components/entrepreneur-operations-view.tsx`.
- `npm run build` from `app/web`.
- `git diff --check`.
- Browser validation with one partner that has source photos and one that does not.
- Confirm the browser network panel makes no new API request solely for the gallery.

## Required report and branch

- Report: `brain/agent-requests/antigravity/reports/AGR-20260811-001_partner_source_photos_visibility_DONE.md`.
- Suggested branch: `antigravity/AGR-20260811-001-partner-source-photos-visibility`.
- PR target: `main`.

