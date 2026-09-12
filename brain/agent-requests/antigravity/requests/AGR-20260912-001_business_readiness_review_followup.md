# AGR-20260912-001 — Corrective follow-up: Business readiness panel

## Owner

Antigravity (Lead Product Designer and Frontend Lead; balanced model tier).

## Scope boundary

- Single outcome: bring the unmerged `AGR-20260911-001` Business readiness panel into compliance with its approved read-only and privacy requirements.
- Allowed files/modules: `app/web/components/entrepreneur-operations-view.tsx`, `app/web/components/businessCommercialReadinessHelpers.ts`, frontend tests directly covering this behavior, and this request/completion report.
- Excluded files/modules: `app/web/server/**`, `app/web/app/api/**`, Prisma, auth, Docker, templates, publication worker/enqueue services, provider/DNS/SFTP configuration, credentials, deployment configuration, and all backend endpoint contracts.
- Dependencies: `CDX-20260911-002` merged in `main`; `AGR-20260911-001` implementation commit `8ee21188120ab8bb7facf9755d4f3bd207121c89` is local-only and must be amended, not merged as-is.
- Parallel-safe with: backend tickets that do not modify `GET /api/internal/activation-leads/{activationLeadId}/business-commercial-readiness`.
- Integration notes: preserve the existing endpoint contract and the courtesy-grant readback. This is frontend-only; it does not make any publication action available.

## Required corrections

1. Remove the newly introduced `<details>` diagnostic block that renders `sourceHash`, `targetHash`, `masterPackageHash`, or `intentHash`. The panel must display only human-readable status and bounded blocker explanations. Do not display internal hashes anywhere in the readiness UI.
2. Fix stale cross-partner state. When the selected activation lead changes or the component unmounts, cancel/ignore the pending readiness request and clear old readiness/error state before loading the next partner. A delayed response for partner A must never render while partner B is selected.
3. Add a focused automated test that demonstrates the out-of-order/change-of-selection protection, using the project’s established frontend test pattern. Keep tests scoped to the readiness behavior.
4. Keep the request a `GET` only. Do not add upload, queue, publish, retry, DNS, SFTP, or other mutation controls.
5. Preserve the Spanish status distinctions and the 401 copy requiring the official PartnerHub Cloudflare Access session.
6. Correct the completion report: remove trailing whitespace, report the actual final commit, and only claim commands that were run successfully on the final commit.

## Verification

- Targeted ESLint for every changed frontend file.
- Focused readiness helper/integration test(s), including the stale-response case.
- `npm run lint` and `npm run build` from `app/web`.
- `git diff --check origin/main...HEAD` clean.
- Confirm the readiness fetch remains a single selected-partner `GET` and no hashes are rendered by the panel.

## Required report

- Report: `brain/agent-requests/antigravity/reports/AGR-20260912-001_business_readiness_review_followup_DONE.md`.
- Use the existing unmerged branch `antigravity/AGR-20260911-001-business-commercial-readiness-view` unless a clean rebase requires a documented replacement branch.
- PR target: `main`.
