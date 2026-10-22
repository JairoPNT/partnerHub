# AGR-20261021-009 — Quarantine withdrawal UI

- Request ID: AGR-20261021-009. Owner: delegated frontend/Antigravity role, balanced tier.
- Status: implementation complete and locally verified; scoped review and CDX006 integration remain separate gates. This report does not approve release, merge, deployment or providers.
- Branch: `codex/AGR-20261021-009-consent-withdrawal-ui`, assigned isolated worktree, base `595b208cb7c68904a21d3f1edcf2e7e9db7488a1`.
- Code/test commit: `20f0bee1236c5a879917a8bc6d8deec887b6f238`. No push, PR or merge.

## Changes

`plantillas-de-pagina/business/app.js` now confirms a withdrawal with both categories denied and runtime enabled when its validated snapshot requires a clean reload, including `persistence: 'none'`. The existing clean-reload guidance remains authoritative in both dialog and banner, grants remain disabled, and explicit withdrawal remains reachable. Non-quarantined responses still require session persistence. No runtime persistence semantics, state validation, copy, styling or layout changed.

`plantillas-de-pagina/business/consent-ui.test.mjs` adds an explicit withdrawal-result boundary fixture and two behavioral tests executing actual `app.js` in the existing VM/DOM harness. The positive regression starts from acceptance, receives a reset to denied quarantine, then withdraws twice while checking guidance, control reachability, disabled regrant and denied categories. The negative matrix rejects disabled runtime, either positive category, malformed boolean/reload/persistence fields and unconfirmed non-quarantine `none` persistence. Expected behavior is asserted from observable UI, not source text.

Own request and this report are the only brain files changed; parallel AGR010 runtime/test ownership remains untouched.

## Verification and build

- RED: `node --test plantillas-de-pagina/business/consent-ui.test.mjs` — exit 1, 13 pass / 1 fail / 0 skips. The new quarantine regression fails because the status becomes unavailable instead of keeping clean-reload guidance; not a setup or syntax failure.
- GREEN: `node --test plantillas-de-pagina/business/consent-ui.test.mjs plantillas-de-pagina/business/measurement-runtime.test.mjs` — exit 0, 47 pass / 0 fail / 0 skips (45 existing plus 2 new).
- `node --check plantillas-de-pagina/business/app.js` — exit 0.
- `node --check plantillas-de-pagina/business/consent-ui.test.mjs` — exit 0.
- `git diff --check` — exit 0.
- Build status: standalone JavaScript syntax checks PASS; application/global build NOT_RUN, as this narrow request explicitly excludes redundant global suites. No claim of full application build or native browser/BFCache verification.
- Full local evidence, ignored and not committed: `.local-secrets/sdd/AGR-20261021-009/red.log`, `green.log`, `verification.log` in this worktree.

## Risks and handoff

No open implementation gap identified within AGR009. Scoped reviewer should verify P3 and the two behavioral regressions. The harness stubs the runtime API boundary; it does not certify native two-tab/BFCache restoration or real SDK behavior. The integration owner retains responsibility for browser/harness assertions and rebind of exact committed LF app artifact digests after scoped approval; this owner did not edit registry, runtime, index, styles, config, backend or integration harness.

Follow-up: no new frontend request needed for the stated fix unless review finds a new issue. Existing CDX006 integration/review gates still required. No providers, network SDKs, source/master/public pages, account settings, publication or deployment were accessed or modified; provider/public readiness remains BLOCKED / NOT_RUN.
