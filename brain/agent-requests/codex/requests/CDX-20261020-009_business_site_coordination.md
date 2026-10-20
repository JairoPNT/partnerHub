# CDX-20261020-009 — Business site coordination

- Owner: Codex, Backend Lead.
- Status: implementation / independent review gate.
- Outcome: shared filesystem exclusion for Business source/package/publication mutations.
- Base: `d9b737a793f27c8fc9ec8a861717e03e5206872f`.
- Branch: `codex/CDX-20261020-009-business-site-coordination`.
- Worktree: `C:\Users\jairo\.codex\worktrees\cdx-20261019-004-lineage\PartnerHub`.
- Allowed: new `app/web/server/services/businessPublicationSiteCoordinator.ts` and test; minimal hooks in generation, source, legacy publication, job service and worker; dedicated integration/child-process tests under `app/web/scripts`; this request and matching report.
- Excluded: frontend/UI, auth, DTO/routes, manual preview/command implementation, providers, production, infrastructure, environment files, migrations, shared generated output.
- Dependencies: approved manual Business delivery design CDX-20261020-006 / Task 3 brief.
- Parallel safe: CDX-20261020-007, CDX-20261020-008, AGR-20261020-001; manual commands CDX-20261020-010 consume this after independent review.
- Model tier: current assigned engineering model; heightened verification justified by cross-process publication integrity and ownership risk. No subagents.

## Constraints and accepted interpretation

Preserve all existing automatic triggers and master-refresh gates/job leases. Acquire site before short job metadata locks, never wait for a site while holding a job mutex. Worker acquires after claimNext and holds until execution/recovery/complete/fail finish. Contention is DEFERRED/QUEUED with validated lease and restored reserved attempt, not FAILED.

Controller ruling 2026-10-20: supported Business identities are canonical `<ownerSiteId>-business` and `ganomaster-business`. Explicit BUSINESS generation/save with unsupported identity fails `BUSINESS_SITE_IDENTITY_INVALID` before writes. Generic noncanonical regenerate/legacy publication may inspect a source only to reject unsupported Business; no migration. Ordinary Product/Brand operation semantics remain; a canonical Business-shaped slug is serialized without changing its content ecosystem.

Filesystem claims have no TTL stealing. Orphans stay closed and require explicit operator recovery. Internal async scopes alone can reenter, with verified ownership and lifetime tracking. A background worker must not inherit a manual caller's ownership.

## Verification

Real temporary directories, IPC barriers and multiple Node processes; direct save, generation/regeneration, legacy publication, enqueue/enqueueReviewed; independent sites; error/token-owned cleanup; expired lease and stale context; real before-swap and recovery-journal barriers. Existing publication jobs, worker, events, Business generation/CTA and master-refresh regressions; lint, build, diff check. No provider access.
