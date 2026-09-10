# CDX-20260902-008 — Publication backfill executor

Owner: Codex
Model tier: Premium (production publication authorization and tenant isolation)
Dependencies: CDX-20260902-007 merged, deployed and its authenticated preview reviewed

## Single outcome

Provide an authenticated, hash-pinned executor that can enqueue only the exact
existing-customer publication candidates contained in a reviewed backfill
preview. Implement and verify the executor without invoking its production
APPLY.

## Allowed files/modules

- Publication job service reviewed-intent enqueue guard and focused tests
- A focused backfill executor service and tests under `app/web/server/services/`
- An authenticated internal POST route dedicated to backfill execution
- Package test commands only if required
- This request, matching report and project-state documentation

## Excluded files/modules

- UI, React, Tailwind and navigation
- Activation, payment, grant, entitlement, source or target mutation
- Retry/cancel behavior for existing FAILED/CANCELLED jobs
- Provisioning, DNS, SFTP implementation or direct provider operations
- Database/schema/migrations and authentication contract changes
- Calling the production executor without a separate explicit CEO
  authorization quoting the exact reviewed `planHash`

## Required behavior

- Require authenticated Cloudflare Access identity plus exact mode,
  confirmation phrase and 64-character `expectedPlanHash`.
- Recompute the full CDX-20260902-007 preview immediately before writing and
  reject any plan drift before creating a job.
- Enqueue only entries in the reviewed `candidates` set; bind every write to
  the candidate's exact immutable `intentHash`.
- Preserve publication-job idempotency under concurrent or repeated requests.
- Never retry FAILED/CANCELLED jobs as part of backfill.
- Wake the existing worker only after at least one authorized job is safely
  present; do not perform SFTP, DNS or direct publication in the executor.
- Return only safe target metadata, counts, bounded outcome/reason codes and
  the reviewed plan hash. Never expose owner IDs, paths, request subjects,
  credentials, tokens or raw errors.
- If a multi-candidate enqueue is partial, stop safely and require a fresh
  preview and new explicit authorization for the remaining state.

## Verification

- Focused tests for exact authorization, plan drift, intent drift,
  idempotency, partial failure, safe output and worker wake behavior.
- Existing preview, queue, event and worker regressions; focused ESLint,
  production build and `git diff --check`.

## Parallel safety

Not parallel-safe with tickets editing publication job/backfill services or
internal publication-job routes. Parallel-safe with frontend-only work and
unrelated infrastructure modules.

## Release note

Merging deploys the dormant executor but does not enqueue or publish any
customer. Production APPLY remains blocked until Jairo explicitly authorizes
the exact reviewed plan hash.
