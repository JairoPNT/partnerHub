# CDX-20260902-003 — Generic guarded publication service

Owner: Codex
Model tier: Premium
Dependency: CDX-20260902-002 merged; Jairo Business guarded publication
completed and verified in production

## Single outcome

Convert the guarded publication planner and executor from a Jairo Business
allowlist into a reusable, fail-closed contract for any valid PartnerHub
PublishingTarget and ecosystem package, without adding an API, queue or UI.

## Allowed files/modules

- `app/web/scripts/guarded-ecosystem-publication.mjs`
- `app/web/scripts/guarded-ecosystem-publication.test.mjs`
- New focused service/contract helpers under `app/web/server/services/` only if
  required to keep identity validation testable and reusable
- This request and its matching report

## Excluded files/modules

- Product, Business or Personal Brand UI and templates
- API routes and frontend controls
- Publication job queue, scheduler and backfill execution
- Prisma/database migrations
- Payments, grants, activation and entitlement mutation
- Hostinger DNS/provisioning clients and production operations
- Generated packages, PublishingTargets, capabilities and remote files

## Required behavior

- Remove the build-time Jairo identity allowlist from the guarded publisher.
- Validate manifest identity against the exact saved source, PublishingTarget
  and package configuration for one site and ecosystem.
- Continue to require an exact target hash, package hash, capability hash,
  remote baseline hash and protected-artifact hashes.
- Support PRODUCT, BUSINESS and PERSONAL_BRAND without cross-ecosystem master
  or package substitution.
- Preserve remoteRoot isolation, sibling staging, claim ownership, exact plan
  hash, host-key binding, atomic swap, rollback, HTTPS verification, journal
  idempotency and secret-free output.
- Preserve the already published Jairo Business behavior as a regression case.

## Verification

- Existing guarded publication suite remains green.
- New multi-tenant identity, ecosystem, path escape and protected-artifact
  regression tests.
- Focused ESLint, production build and `git diff --check`.

## Parallel safety

Not parallel-safe with work editing the guarded publisher or its tests.
Parallel-safe with frontend-only tickets and backend work outside publication.

## Integration note

CDX-20260902-004 may consume the exported generic planner/executor to implement
durable PublicationJobs. No API or user-facing action is introduced here.
