# CDX-20261021-006 — Offline Business consent integration

- Owner: Codex integration; branch `codex/CDX-20261021-006-business-consent-integration`.
- Code commit: `24bf0234216ebeaff8f1d87019e84b468d6ff71f`; task BASE `7f1e542`. Controller integrated reviewed AGR008 config correction at `bb020cc` during this task; that frontend fix is not attributed to integration.
- Status: implemented and locally verified; independent integration/security review remains controller-owned. No publication or provider activation.
- Build: PASS, exit0. Lint and diff checks: PASS. Existing build warnings: workspace-root/multiple lockfiles and6 NFT tracing warnings; service tests show experimental-loader/MODULE_TYPELESS_PACKAGE_JSON warnings.

## Changes and evidence

Created the four allowed browser/harness/rehearsal/readiness scripts; registered the exact reviewed committed LF asset digests with **GA4=false, Meta=false**. Actual server preparer and generator produce the full browser package; isolated installed Chrome uses deny-by-default interception, fake SDKs only, ephemeral profiles/native input and real two-tab BroadcastChannel. Node20 actual create/refresh CLI modules receive explicit mkdtemp template/output/jobs options; no defaults targeting real data.

Final commands (cwd `app/web`; complete logs under `.local-secrets/sdd/CDX-20261021-006/`):

| Command group | Result | Log |
|---|---|---|
| Node20 `--test scripts/business-consent-browser.test.mjs scripts/business-consent-release-rehearsal.test.mjs` | 38/38,0fail,0skip | final-integration.log |
| Node24 TS loader: Business measurement HTML/authority/generation, master-content/legacy ingress/editor-content generation, CTA and Claudia generation suites | 57/57,0fail,0skip | final-services.log |
| Node20 measurement/master packaging, master create/refresh, template, runtime/UI and AGR008 canonical-readiness suites, existing Chrome enabled | 125/125,0fail,0skip | final-components-with-browser.log |
| `npm run lint`, `npm run build`, `git diff --check`, staged diff check | exit0 | final-lint.log / final-build.log |

Total220 final tests pass; no aggregate npm test script exists. Earlier missing-harness RED is distinguished from genuine empty-registry rejection. Missing neutral `directRegisterUrl:''` was escalated to AGR008, never sanitized away. Earlier optional-browser skip and harness/native-reload/video-interaction failures remain documented; corrected final runs have zero skips. No additional Prisma generation or DB connection.

## Requirement status

- PASS offline: no-choice/reject/no-JS zero tracking; selective consented fake-ready categories; repeat acceptance/double init; one loader/PageView; no click replay; distinct/nested/keyboard trusted clicks; minimal payload/no seed PII; fresh-denied document/storage failure/recovery; withdrawal before/during/onload/after; preview/wrong identity/origin/IDs/providersfalse; sensitive-context blocking; SDK failure leaves native video/contact interactions; focus/tab/Escape/cancel/reopen/withdraw and missing/late/error authority; native two-tab negative-only revoke/no echo/no regrant during browser-dismissed reload quarantine.
- PASS local UI:1440x900 and390x844, equal initial action salience;320px/CSS125% no horizontal overflow after interactions. Narrow-zoom captures are scrolled-page images, not open-dialog captures at that size.
- PASS packaging: actual committed assets, unreviewed/CRLF byte rejection, forged master/source/HTTP metadata cannot enable providers, unchanged prior package/source/history/effects on byte rejection, literal historical archive/journal/inventory preserved, runtime/script/cache/manifest included, stale authorization fails and same-approved assets reused. Existing Product/Brand real-generation HTML/config/manifest regressions pass.
- BLOCKED activation: query/hash/referrer are conservatively denied, not measurement-ready paid contexts. Real SDK automatic collection, account settings/privacy and external receipt are not established by fake adapters.
- BLOCKED/NOT_RUN native BFCache restoration; browser-simulated `pageshow.persisted` reset/draft invalidation passes, not claimed native.
- BLOCKED/NOT_RUN Linux: installed Docker client cannot connect to missing dockerDesktopLinuxEngine pipe; no engine started.
- `providers={ga4:'BLOCKED',meta:'BLOCKED'}`, `publicVerification='NOT_RUN'` in readiness API. No public fetch, SDK/account/event, DNS/SFTP, source/master or publication mutation.

## Reviewed committed asset binding

| Asset | SHA256 |
|---|---|
| index.html | 39c387e623e8bd030e504a0c38fb5b792f8b9783a1c96693a27b589dff83ccfb |
| app.js | a8844b5d9daf89083adb55293bc16e7f558ccf9afd87aaa0f2926ad17375313b |
| measurement-runtime.js | 497d0f954435101910ae6dee049feca65b44bd3050cb3e14b9c5640e70c07706 |
| styles.css | 302a738124f72f99973e041d8219f801ea748cdcf4380e07e5ac33612db25f59 |

Version1; both flags false. Git LF blobs materialized as Buffer; raw Windows CRLF/changed bytes reject. No broader normalizer, alternate approval or build change. Readiness full generated fixture package hash in final log: `6c0652d41a970e1c820de39967b12bd016812f72bf8beb062b3ec92c532d3e3d`; generated timestamps mean this is evidence for that fixture, not all future packages.

## Captures and detailed handoff

Absolute capture directory: `C:/Users/jairo/.codex/worktrees/business-paid-traffic-followups/PartnerHub/.local-secrets/sdd/CDX-20261021-006/screenshots/`.

Files: `desktop-initial.png`, `desktop-preferences.png`, `mobile-initial.png`, `mobile-preferences.png`, `desktop-narrow-zoom.png`, `mobile-narrow-zoom.png`. Captured once batched with final generated package; external media intentionally denied. Root inspected all6; no redesign/polish loop.

Full detailed implementation report with exact commands/output paths, RED/GREEN distinctions, per-check matrix, component heads, screenshots, self-review and cutover gates:
`C:/Users/jairo/.codex/worktrees/business-paid-traffic-followups/PartnerHub/.local-secrets/sdd/CDX-20261021-006/task-1-report.md`.

Follow-up required: independent final review; native BFCache/Linux evidence; separately authorized master/source cutover/publication with fresh preview/hash pins; provider-specific SDK/account privacy and paid-context validation before any reviewed flag change; public consent and external receipt verification. Artifact/code approval does not constitute provider/account/Ads/public readiness. No push/PR/merge by implementer.
