# CDX-20260902-004 — Durable publication jobs

Owner: Codex
Model tier: Premium
Dependency: CDX-20260902-003 merged in PR #186

## Single outcome

Create a durable, idempotent and authenticated backend job contract for one
partner ecosystem publication request, ready for a later worker to execute the
generic guarded publisher.

## Allowed files/modules

- New focused publication job services and tests under `app/web/server/`
- New authenticated routes under `app/web/app/api/internal/publication-jobs/`
- `app/web/package.json` only for a focused test command if needed
- This request and matching report

## Excluded files/modules

- UI, React, Tailwind and navigation
- SFTP execution and remote writes
- Package generation, capability probing and guarded publication execution
- Activation, payments, grants, entitlement or PublishingTarget mutation
- Backfill execution and automatic enqueue hooks
- Prisma migrations

## Required behavior

- Enqueue by `siteId` only and derive immutable owner, ecosystem, base domain,
  public host, source hash and PublishingTarget hash server-side.
- Accept only canonical partner site IDs/hosts with a PublishingTarget v2 in
  `READY` provisioning state and an exact matching saved source.
- Produce a deterministic job ID from the immutable publication intent so
  retries/double clicks cannot create duplicate work.
- Persist one JSON record per job using exclusive, crash-resistant creation and
  atomic updates on the existing durable data volume.
- Store only a hash of the Cloudflare Access subject; never persist JWTs,
  emails, SFTP credentials or raw lease tokens.
- Provide exclusive expiring worker leases, monotonic phases, safe failure
  codes, retry/cancel rules and terminal success state.
- Authenticate every API operation with Cloudflare Access.
- Return a redacted API representation.

## Verification

- Enqueue/deduplication and canonical identity tests.
- Cross-site/cross-ecosystem/source-target mismatch rejection tests.
- Exclusive lease, phase transition, completion, failure, retry, cancellation
  and stale lease recovery tests.
- Cloudflare-authenticated route/build coverage.
- Focused ESLint, production build and `git diff --check`.

## Parallel safety

Not parallel-safe with other work editing publication job services/routes.
Parallel-safe with frontend-only work and existing SFTP maintenance scripts.

## Integration note

CDX-20260902-005 will implement the worker that consumes these jobs and invokes
package preparation, capability renewal, guarded publication and verification.
