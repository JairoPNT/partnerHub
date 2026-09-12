# AGR-20260912-002 — Guard against cross-partner readiness render

## Owner

Antigravity (Lead Product Designer and Frontend Lead; balanced model tier).

## Scope boundary

- Single outcome: prevent any Business readiness result belonging to partner A from rendering while partner B is selected.
- Allowed files/modules: `app/web/components/entrepreneur-operations-view.tsx`, `app/web/components/businessCommercialReadinessHelpers.ts`, focused frontend tests for this exact behavior, and this request/completion report.
- Excluded files/modules: `app/web/server/**`, `app/web/app/api/**`, Prisma, auth, Docker, templates, worker/enqueue services, provider/DNS/SFTP configuration, credentials, deployment configuration, and backend endpoint contracts.
- Dependencies: `CDX-20260911-002` merged; `AGR-20260911-001` and `AGR-20260912-001` exist on the unmerged branch `antigravity/AGR-20260911-001-business-commercial-readiness-view` / PR #201.
- Parallel-safe with: backend work that does not change the readiness endpoint contract.
- Integration notes: amend PR #201; do not merge it before this request is complete and reviewed.

## Root cause

`businessReadiness` is stored without the activation-lead identity. On a selection transition, React may render the newly selected partner before the passive `useEffect` cleanup clears the prior partner’s data. The current request cancellation prevents late responses, but it does not prevent that already-resolved value from appearing during this transition.

## Required behavior

1. Associate any readiness data/error rendered by the view with the activation lead ID for which it was received.
2. Render readiness data or an error only when its associated lead ID exactly matches `selectedLead.id`. If they differ, show the loading/empty state, never the prior partner’s data.
3. Keep the existing AbortController cancellation and cleanup; this is a render identity guard in addition to cancellation, not a replacement.
4. Add a focused automated test exercising the actual identity-guard behavior used by the view, not only an unused helper/session manager. The test must demonstrate that a resolved A result cannot be displayed for selected B.
5. Do not expose hashes, add mutation controls, change the endpoint, or modify courtesy-grant behavior.
6. Correct the AGR-20260912-001 report’s implementation-commit metadata. It must reference `3061821655c36552c933736b9d44376b89ee7138` as the implementation commit and distinguish it from report-only updates if applicable.

## Verification

- Targeted test covering the actual render identity guard.
- Targeted ESLint for all modified frontend files.
- `npm run lint` and `npm run build` from `app/web`.
- `git diff --check origin/main...HEAD` clean.
- Code search/diff confirms readiness remains selected-partner `GET` only and never renders hashes.

## Required report

- Report: `brain/agent-requests/antigravity/reports/AGR-20260912-002_business_readiness_render_identity_guard_DONE.md`.
- Branch: amend `antigravity/AGR-20260911-001-business-commercial-readiness-view` and PR #201.
- PR target: `main`.
