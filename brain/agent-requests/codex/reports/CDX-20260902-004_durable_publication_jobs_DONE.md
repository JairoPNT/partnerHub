# CDX-20260902-004 — Durable publication jobs — DONE

## Request ID

`CDX-20260902-004`

## Outcome

PartnerHub now has a durable backend publication-job contract for one partner
ecosystem site. An authenticated application action can enqueue, inspect,
cancel or retry publication work without running shell commands or submitting
owner, ecosystem, domain, target hash or source hash from the browser.

This ticket intentionally does not execute package generation or SFTP. The
worker that consumes the queue is the next isolated ticket.

## Changes

- Added deterministic, idempotent publication jobs derived server-side from:
  - saved source bytes and SHA-256;
  - PublishingTarget v2 bytes and SHA-256;
  - canonical owner/site/ecosystem/domain/public-host identity.
- Added strict support for `PRODUCT`, `BUSINESS` and `PERSONAL_BRAND`.
- Added crash-resistant exclusive creation and atomic record replacement on the
  existing durable application volume.
- Added exclusive expiring worker leases with stale-lease recovery.
- Added short atomic transition locks so an expired worker cannot race the
  worker that recovers its job.
- Added monotonic phases, safe failure codes, retry/cancel rules and terminal
  success invariants.
- Persisted only a SHA-256 of the Cloudflare Access subject. JWTs, emails,
  credentials and raw lease tokens are not persisted or returned.
- Added Cloudflare Access-authenticated endpoints:
  - `GET/POST /api/internal/publication-jobs`
  - `GET/DELETE /api/internal/publication-jobs/[jobId]`
  - `POST /api/internal/publication-jobs/[jobId]/retry`
- API representations omit owner keys, source/target hashes, requestor hashes
  and lease internals.

## Files modified

- `app/web/server/services/publicationJobService.ts`
- `app/web/server/services/publicationJobService.test.ts`
- `app/web/app/api/internal/publication-jobs/route.ts`
- `app/web/app/api/internal/publication-jobs/[jobId]/route.ts`
- `app/web/app/api/internal/publication-jobs/[jobId]/retry/route.ts`
- `app/web/package.json`
- Request and report for `CDX-20260902-004`

## Verification

- Publication job tests: **8/8 PASS**.
- Exact-intent deduplication: **PASS**.
- Three-ecosystem canonical identity: **PASS**.
- Source/target substitution and non-READY rejection: **PASS**.
- Exclusive lease, concurrent transition serialization and stale recovery:
  **PASS**.
- Failure, retry, cancel and terminal-state invariants: **PASS**.
- Focused ESLint with zero warnings: **PASS**.
- Next.js production build: **PASS**.
- `git diff --check`: **PASS**.

The build retains the pre-existing Turbopack NFT tracing warning; compilation,
TypeScript and static route generation pass.

## Branch

`codex/CDX-20260902-004-durable-publication-jobs`

Base: `origin/main` at merge commit
`a7bcdc9e7921c6776c8dfeb64f0e948951da56e0`.

## Security and residual risks

- The filesystem store assumes the configured publication-job directory is on
  the same durable shared volume used by the application. Moving it to an
  ephemeral container filesystem would remove durability.
- No worker is deployed yet, so queued records remain inert and cannot mutate
  SFTP or public pages.
- An automatic enqueue hook and active-client backfill remain separate tickets
  to avoid mixing payment/activation mutations with queue semantics.

## Follow-up

Required: `CDX-20260902-005` will implement the controlled worker that claims a
job, prepares the package, obtains/validates scoped SFTP capability evidence,
creates the exact publication plan, applies it and records verification.

Frontend controls remain Antigravity-owned and require their own request.
