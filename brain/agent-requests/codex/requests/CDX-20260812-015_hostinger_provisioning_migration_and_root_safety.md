# CDX-20260812-015 — Hostinger provisioning migration and root safety

## Owner

Codex — backend and infrastructure follow-up on the existing `CDX-20260812-014` branch.

## Scope

Resolve the two audit blockers in Hostinger-only provisioning:

1. Safely read and migrate persisted publishing targets from version 1 to version 2, adding an explicit immutable `rootEcosystemType`. Ambiguous legacy identities must stop with a migration conflict. `ganomaster.pro` must never be migrated.
2. Refuse provisioning when an already persisted remote root differs from the current `root_directory` returned by Hostinger. Roots continue to come only from Hostinger responses and are never derived locally.

## Allowed files/modules

- `app/web/server/integrations/hostingerSubdomainClient.ts` and related tests.
- `app/web/server/integrations/hostingerDnsClient.ts` and related tests.
- `app/web/server/services/subdomainProvisioningService.ts` and related tests.
- `app/web/server/services/publicationTargetResolver.ts` and related tests when required.
- Backend test scripts and this request/report documentation.

## Excluded

- Frontend, React, Payments, Wompi, onboarding, dashboard, offer catalog.
- Real Hostinger/MCP calls or real domain changes.
- `ganomaster.pro` and its subdomains.

## Dependencies and parallel safety

- Depends on `CDX-20260812-014` commit `ddbb6f1`.
- Executes on branch `codex/CDX-20260812-014-hostinger-only-domain-provisioning` by explicit follow-up authorization.
- Not parallel-safe with other work editing the Hostinger clients or provisioning/target resolver services.
- Parallel-safe with Wompi and frontend tickets that do not touch these modules.

## Acceptance

- Tests cover v1→v2 migration, ambiguous/identity conflicts, document-root conflicts, DNS/SSL retries, provider failure and safe error persistence, master-domain protection, and hosting/DNS idempotency.
- Focused tests, backend ESLint, production build, and `git diff --check` pass.
- Completion report, commit, and push are produced; no PR is opened.
