# CDX-20260902-005 — Publication job worker

Owner: Codex
Model tier: Premium
Dependencies: CDX-20260902-003 and CDX-20260902-004 merged

## Single outcome

Connect the durable publication queue to one automatic, fail-closed worker that
regenerates the exact partner package from its canonical master, proves SFTP
rename capability, executes the guarded atomic publication and records terminal
evidence without operator shell commands.

This is an integration ticket because generation, capability proof and guarded
publication are technically inseparable phases of one leased publication job;
each phase remains independently pinned and journaled.

## Allowed files/modules

- Publication worker runtime, lifecycle bootstrap and focused tests under
  `app/web/server/`
- Existing generic SFTP capability probe, guarded publisher and focused tests
- Publication job route only to wake the durable worker after enqueue
- Root Dockerfile and `app/web/package.json` for the worker runtime/test contract
- This request and matching report

## Excluded files/modules

- UI, React, Tailwind and navigation
- Provisioning, DNS, payments, grants, entitlements and migrations
- Changes to product templates or partner source content
- Backfill execution against current customers
- Deployment or production publication

## Required behavior

- Consume one durable job under its exclusive expiring lease and preserve its
  monotonic phase transitions.
- Revalidate the exact source and PublishingTarget hashes before any work.
- Regenerate the package from the canonical master for the job ecosystem.
- Generalize the rename-capability probe to canonical PRODUCT, BUSINESS and
  PERSONAL_BRAND identities; never use a customer-specific allowlist.
- Generate fresh, job-scoped probe paths and capability evidence immediately
  before publication so customers never require manual SFTP windows.
- Pin package, source, target, capability, protected sibling artifacts and the
  observed remote baseline in the guarded publication manifest.
- Publish through the existing recoverable two-rename commit, HTTPS verification
  and terminal journal; never use the legacy per-file publisher.
- Preserve one immutable journal per publication plan and safely support later
  master-template republications when a target is already `READY`.
- Start a single in-process worker loop at application boot and wake it after an
  authenticated enqueue. Multiple replicas must remain safe through job leases.
- Persist only redacted error codes/evidence; never log or store SFTP passwords,
  usernames, access tokens or raw lease tokens.
- Recover a publication already committed by the guarded journal after a crash.

## Verification

- Generic SFTP probe tests across every ecosystem and cross-tenant rejection.
- Worker success, failure, lease ownership, drift and no-secret-output tests.
- Queue/API regression tests.
- SFTP runtime packaging test, focused ESLint, production build and
  `git diff --check`.

## Parallel safety

Not parallel-safe with work editing publication jobs, SFTP probe, guarded
publication runtime packaging or publication-job routes. Parallel-safe with
frontend-only work and unrelated payment/onboarding modules.

## Release note

Merging triggers EasyPanel autodeploy. No existing customer is enqueued or
published by this ticket; backfill remains a separate explicitly authorized
operation.
