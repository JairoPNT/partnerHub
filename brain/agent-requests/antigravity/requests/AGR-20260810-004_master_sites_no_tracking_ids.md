# AGR-20260810-004 - Master Sites without tracking IDs

## Owner

Antigravity (Lead Product Designer and Frontend Lead).

## Product decision

Canonical master sites and reusable templates must contain tracking capability but no real GA4, Meta Pixel, Google Ads, or partner-specific tracking IDs. Tracking IDs belong only to generated partner pages.

## Dependency

- PR #100 is merged.
- Product master now uses `ganomaster / product.ganomaster.pro`.
- The backend generator already treats analytics and Meta integration fields as optional.

## Single outcome

Remove GA4/tracking-ID submission from the Master Sites Product editor while preserving conditional tracking support in generated partner pages.

## Current evidence

- `master-site-management-view.tsx` initializes `measurementId` with `G-7F24PBZPDM`.
- It reloads `cfg.analytics.measurementId` into the master form.
- It submits `analytics.measurementId` in the master generation payload.
- The public Product master therefore currently contains a real GA4 ID.
- The public Product master correctly contains no Meta Pixel ID.

## Required behavior

1. Remove `measurementId` from the Master Sites form state and initial values.
2. Do not load a stored analytics ID into the master form.
3. Remove the GA4 Measurement ID input from the Product master editor.
4. Master generation payloads must omit `analytics` and must not introduce `integrations.analytics`, `integrations.meta`, Google Ads IDs, or placeholder IDs.
5. Keep template event hooks and partner tracking behavior untouched. This request must not remove conditional GA4/Meta support from generated partner pages.
6. Business and Personal Brand remain truthful shells and must not receive tracking controls.
7. Do not publish or regenerate any production master during implementation.

## Tracking contract after this request

- Master/template: generic event code may exist; tracking IDs are absent.
- Partner without configured tracking: no provider script is injected.
- Partner with configured tracking: its validated IDs are injected by the existing partner generation flow.
- No literal placeholders such as `{{META_PIXEL_ID}}` or fake IDs are emitted publicly.

## Allowed files/modules

- `app/web/components/master-site-management-view.tsx`
- Matching completion report.

## Excluded files/modules

- `app/web/server/**`
- `app/web/app/api/**`
- `app/web/lib/ecosystem-contracts.ts`
- `plantillas-de-pagina/**`
- Analytics and Metrics module.
- Partner generation, activation leads, database, Prisma, Docker, Easypanel, provider configuration, generated files and production data.
- Unrelated visual cleanup.

## Parallel safety

- Safe beside AGR-20260810-003 because that request edits only `oferta-beta` and `components/beta-landing/**`.
- Not safe beside any task editing `master-site-management-view.tsx`.

## Acceptance criteria

1. No GA4, Meta Pixel, Google Ads or placeholder tracking ID is present in a Master Sites generation payload.
2. The Product master editor no longer displays a GA4 Measurement ID field.
3. Existing Product generation, publication labels, canonical domain, history, approval and replication UI remain unchanged.
4. Partner analytics configuration and generation code are untouched.
5. Diff is limited to the allowed component and completion report.

## Verification

- Targeted ESLint for `components/master-site-management-view.tsx`.
- `npm run build` from `app/web`.
- `git diff --check`.
- Inspect a Product master generation request in the browser network panel without completing publication; payload must contain no `analytics` or tracking `integrations` fields.
- Confirm Product master labels still use `product.ganomaster.pro`.
- Confirm no partner analytics file or route appears in the diff.

## Production follow-up after merge and deploy

1. Regenerate and publish only `product.ganomaster.pro`.
2. Confirm its public `config.js` contains neither `measurementId` nor `pixelId`.
3. Generate one controlled partner page and confirm its configured GA4/Meta IDs are still injected.

## Required report and branch

- Report: `brain/agent-requests/antigravity/reports/AGR-20260810-004_master_sites_no_tracking_ids_DONE.md`.
- Suggested branch: `antigravity/AGR-20260810-004-master-sites-no-tracking-ids`.
- PR target: `main`.
