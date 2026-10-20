# CDX-20261020-007 — Master Sites Business operator contract

- Owner: Codex, Backend Lead. Auth-sensitive work under the approved CDX-20261020-006 design; no new architecture decision.
- Scope: freeze client-safe Business DTOs and a server-verified human Super Admin authorization helper. No route dispatch or publication work.
- Branch: `codex/CDX-20261020-007-master-sites-operator-contract`.
- Isolated checkout: `C:/Users/jairo/.codex/worktrees/cdx-20261019-005-drift-integration/PartnerHub`; base `d9b737a793f27c8fc9ec8a861717e03e5206872f`.
- Allowed files: `app/web/server/auth/masterSitesOperatorAuth.ts` and `.test.ts`; `app/web/shared/master-sites-business-contract.ts` and `.test.ts`; blank allowlist documentation in `app/web/.env.example`; this request and matching report; `.superpowers/sdd/2026-10-20-business-master-sites-manual-delivery/task-1-report.md`.
- Excluded files/modules: UI/React/Tailwind; existing Cloudflare verifier changes; routes; generation/provisioning/publication services; Prisma/migrations; provider/prod/Access configuration; root dirty checkout; other agent reports; dependency or tooling changes.
- Dependencies: CDX-20261020-006 approved design and task-1 brief. Production remains denied with a blank allowlist.
- Parallel-safe with: AGR-20261020-001 interaction work; CDX-20261020-009 non-overlapping publication exclusion work. CDX-20261020-008/010 consume this frozen contract after review and must not edit it.
- Integration notes: use the existing administrative `CLOUDFLARE_ACCESS_AUD`, never broaden Access; HUMAN JWT email only; strict one-partner commands; POST exact approved Origin and JSON. New helper returns typed safe errors before dispatch. Shared DTO must have no private server imports. Final cross-module verification belongs to CDX-20261020-011.
- Verification: TDD RED before implementation, focused auth/DTO + existing Access tests, targeted and full lint, production build, self-review; independent review remains with controller before consumers integrate.
- Status: implemented; see matching report for evidence and review/integration gates.
