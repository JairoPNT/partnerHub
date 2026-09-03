# CDX-20260903-001 - Publication backfill conflict diagnostic

Owner: Codex
Model tier: Premium (production publication authorization and tenant isolation)
Dependencies: CDX-20260902-008, CDX-20260902-009 and CDX-20260902-010 merged and deployed

## Single outcome

Diagnose and harden the backfill executor path that returned HTTP 409 before
creating the second authorized job, so future blocked responses expose a
bounded, non-secret reason code and a safe next action without retrying or
publishing.

## Allowed files/modules

- `app/web/server/services/publicationBackfillExecutorService.ts`
- Focused tests for the backfill executor and route behavior
- `app/web/app/api/internal/publication-jobs/backfill/route.ts` only if needed
- Package scripts only if needed
- This request, matching report and project-state documentation

## Excluded files/modules

- UI, React, Tailwind and navigation
- SFTP, DNS, provisioning, provider clients or direct publication logic
- Activation, payment, entitlement, source or target mutation
- Worker execution semantics outside the backfill enqueue boundary
- Production POST/APPLY, retry, cancel or publication without a new exact CEO authorization

## Required behavior

- Preserve the existing hash-pinned authorization contract.
- Do not enqueue, retry, cancel or publish anything while implementing.
- Classify enqueue failures into safe bounded codes instead of a generic partial
  enqueue when no candidate has been processed.
- Keep raw dependency errors, operator identity, owner IDs, paths, credentials
  and tokens out of responses.
- Preserve partial multi-candidate behavior: if at least one job was created or
  reused, require a fresh preview and authorization before continuing.
- Provide tests that reproduce the no-job 409 shape and verify the returned
  diagnostic is actionable.

## Verification

- Focused backfill executor tests.
- Publication job and preview regression tests where relevant.
- Focused ESLint and production build if the implementation touches compiled
  app code.
- `git diff --check`.

## Parallel safety

Not parallel-safe with tickets editing publication job/backfill services or
internal publication-job routes. Parallel-safe with frontend-only work and
unrelated backend modules.

## Release note

Deploying this ticket should improve diagnostics only. It must not enqueue or
publish any customer by itself.
