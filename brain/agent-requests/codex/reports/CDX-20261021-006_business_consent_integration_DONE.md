# CDX-20261021-006 — Offline Business consent integration

- Owner: Codex integration; branch `codex/CDX-20261021-006-business-consent-integration`.
- Code commit: `24bf0234216ebeaff8f1d87019e84b468d6ff71f`; task BASE `7f1e542`. Controller integrated reviewed AGR008 config correction at `bb020cc` during this task; that frontend fix is not attributed to integration.
- Status: approved for offline code integration by independent task review and final security review/scoped re-review on `88c003d`. P2/P3 closed; compatible main merge/deploy and provider/public activation remain unapproved. No publication or provider activation.
- Build: PASS, exit0. Lint and diff checks: PASS. Existing build warnings: workspace-root/multiple lockfiles and6 NFT tracing warnings; service tests show experimental-loader/MODULE_TYPELESS_PACKAGE_JSON warnings.

## Fresh release continuation after PR236

- Integrated main `6d3dc6d` (Business master host negocio.ganomaster.pro) at `9ffccbc`; only LIVE_PROJECT_STATE had a textual merge conflict, resolved preserving both checkpoints. No consent assets changed.
- Fresh after that merge:39/39 actual generated-browser/rehearsal,6/6 master-host contract and17/17 related host/inventory/verification tests; lint/build exit0 (39routes; same6NFT/workspace warnings). Logs `main236-integration.log`, `main236-lint.log`, `main236-build.log` retained ignored under the same CDX006 audit directory. Not a repeat of all prior224 cases or a new Linux certificate.
- Jairo supplied actual EasyPanel/sh read-only old-refresh PREVIEW: current master hash `9760e017b284e76ff6cbae5d128265cc89fa6b8bd2f03882d4ff4b0de0e1d046` equals that deployed command's expected package; it rejects because it only accepts original `e9a2...` plus unused old archive/journal paths. Existing archive/journal are occupied, no claim or RUNNING Business job at that snapshot. This is consistent with the previous refresh, not evidence of corrupt files. Does NOT prove the occupied refresh journal or archive contents valid.
- That deployed template still has five pre-consent source assets, no measurement-runtime; target identity printed by the historical command is business.ganomaster.pro. It does not validate the new PR235 package or migrate its current canonical identity. Do not execute its APPLY, delete/overwrite old audits, add arbitrary hash approval or reuse plan `c9f7cf1f...` for new bytes.
- New-code Linux, exact persistent-master compatibility/versioned-cutover and native BFCache gates remain unresolved. Docker local has no Linux engine; both browser-control kernels failed os error3, so no live console/source/master action was performed by Codex. Bounded assessment of shortest supported migration path requested before any new implementation or actual cutover. PR remains DRAFT/unmerged, both provider flags false; public site unchanged.

## Final bounded fix wave (current; supersedes original binding/counts)

Whole-release review returned WITH FIXES for actual header CTA measurement (P2) and valid reload-quarantine withdrawal UI (P3). Separate owners corrected app/runtime: AGR009 code `20f0bee`/report `238f8a2`; AGR010 code `0121ca0`/report `072f570`. Controller locally merged for validation at `cfb1e2e`; final scoped independent re-review of the combined corrections/regressions/rebind is **APPROVED** on `88c003d`, both findings closed. Own integration fix-wave code commit: `f9c810394f418e1c99c6c179628bd9db98742e9b`. Full immutable reviews retained locally in `.local-secrets/sdd/CDX-20261021-006/task-1-review.md`, `final-review.md` and `final-rereview.md`; the last supersedes the WITH FIXES code verdict only, not deployment/activation gates.

Genuine actual-browser RED before merges: header first trusted click count0 instead of1; quarantine withdrawal displayed unavailable instead of clean-reload guidance (`final-fixes-browser-red.log`,2 failures/29 pattern exclusions). New header regression uses generated `#btnNavContact`, real nested span and Enter, one exact minimal header payload per provider/activation, no pre-consent replay/synthetic/wrong-destination event. Extended real-two-tab/BFCache-event case asserts authoritative denied `persistence:none` quarantine UI stays accurate and withdrawal enabled after explicit withdrawal on both documents. No app/runtime edits by integration.

Current committed LF binding, independently hashed from owner-integrated Git blobs:

| Asset | Current SHA256 |
|---|---|
| index.html (unchanged) | 39c387e623e8bd030e504a0c38fb5b792f8b9783a1c96693a27b589dff83ccfb |
| app.js | fca1eb4fda4c7602ca1ab5448b81323b7b1af55ee2a3a2a537c85b2f625546de |
| measurement-runtime.js | 78db567bbd5e6ab30aa9e2402bfa421aa043a7bad11ea046d56ef79df0dccf42 |
| styles.css (unchanged) | 302a738124f72f99973e041d8219f801ea748cdcf4380e07e5ac33612db25f59 |

Registry/harness hashes only rebound; version1 and GA4/Meta false unchanged. Final fresh rerun using same full command groups below, no screenshot env:39/39 browser+rehearsal (`fixwave-final-integration.log`),128/128 components including3 new owner regressions (`fixwave-final-components.log`), lint/build exit0 (`fixwave-final-lint.log`, `fixwave-final-build.log`), staged/unstaged diff checks exit0.167 fresh cases,0fail,0skip. Backend services57/57 retained from original log, not rerun because no backend service implementation changed; actual preparer/generator/binding are freshly exercised. Current evidence pool224 cases =167 fresh +57 retained, versus original220 checkpoint. No claim of224 fresh executions.

Current generated fixture package readiness digest: `f0010101c3e241b659bff804a30710d715ba75a482b2c804464e76f94fff7668`; generated timestamp/package specific. Both providers BLOCKED, publicVerification NOT_RUN. Native BFCache/Linux/provider/account/paid-context/public receipt and persistent-master compatibility/cutover/main-merge gates remain open. No new screenshots/layout changes; earlier6 captures retained only for unchanged layout. Warnings remain disclosed; no external action, source/master mutation, publication or push/PR/main operation.

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

## Original reviewed committed asset binding (historical; superseded above)

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

Independent task/final reviews and the one scoped correction re-review are now complete and approved as recorded above. Follow-up required: native BFCache/Linux evidence; separately authorized master/source cutover/publication with fresh preview/hash pins; provider-specific SDK/account privacy and paid-context validation before any reviewed flag change; public consent and external receipt verification. Artifact/code approval does not constitute provider/account/Ads/public readiness. No push/PR/merge by implementer; controller may preserve this complete set in one DRAFT PR, not merge an incompatible partial release.
