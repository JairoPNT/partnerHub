# CDX-20260824-008 — Provisioning PREVIEW / APPLY readiness separation — DONE

## Result

PREVIEW now calculates the exact read-only plan without provider credentials or
IPv4. It reports missing/invalid values only in `applyReadiness`. APPLY rejects
that same state before claim creation and before any provider call.

## Files

- `app/web/scripts/jairo-business-guarded-provisioning.mjs`
- `app/web/scripts/jairo-business-guarded-provisioning.test.mjs`
- matching request/report documentation.

## Verification

- guarded provisioning: 10/10 PASS;
- provisioning service regression: 11/11 PASS;
- provisioning API contract: 3/3 PASS;
- ESLint `--no-ignore` on changed runtime/test files: PASS;
- production build: PASS (existing Turbopack trace warning only);
- `git diff --check`: PASS.

## Operations and risk

No EasyPanel, production, provider, DNS, PREVIEW or APPLY ran. APPLY keeps all
CDX-007 claim/journal/recovery behavior. PR remains unopened.
