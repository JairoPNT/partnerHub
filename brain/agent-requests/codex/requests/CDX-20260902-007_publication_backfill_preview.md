# CDX-20260902-007 — Publication backfill preview

Owner: Codex
Model tier: Premium (production publication selection and tenant isolation)
Dependencies: CDX-20260902-006 merged and deployed

## Single outcome

Provide an authenticated, deterministic and strictly non-mutating preview that
identifies which existing active customer ecosystems are eligible for durable
publication backfill and binds the inventory to a `planHash`.

## Allowed files/modules

- Publication job service read-only intent planning and focused tests
- A focused backfill preview service and tests under `app/web/server/services/`
- A read-only authenticated internal backfill-preview route
- Package test commands only if required
- This request, matching report and project-state documentation

## Excluded files/modules

- UI, React, Tailwind and navigation
- Activation, payment, grant, entitlement, target or source mutation
- Job enqueue/retry/cancel and worker wakeup
- Provisioning, DNS, SFTP connections or remote writes
- Database/schema/migrations and authentication contract changes
- Production backfill execution, deployment or merge

## Required behavior

- Read all current valid PublishingTarget v2 records and classify each one.
- A candidate must belong to an ACTIVE PAID/CONVERTED lead, be currently
  entitled, have provisioning state READY and pass the publication job's exact
  source/target/canonical-master intent validation.
- Classify current successful jobs, already scheduled jobs, retry-required jobs
  and blocked targets separately; never duplicate a current intent.
- Sort every output deterministically and compute a stable `planHash` over
  hashed approval state plus exact source, target and master intent hashes.
- Return only site/ecosystem/public-host metadata, hashes, counts and bounded
  reason codes. Never expose lead PII, owner UUIDs, credentials, paths, tokens
  or raw provider errors.
- The preview must not create directories/files, jobs, leases or worker wakes.

## Verification

- Focused tests for eligible, cross-tenant, unapproved, unentitled, incomplete,
  scheduled, succeeded, retry-required and determinism cases.
- Existing publication queue/worker regressions, focused ESLint, production
  build and `git diff --check`.

## Parallel safety

Not parallel-safe with tickets editing publicationJobService or internal
publication-job routes. Parallel-safe with frontend-only work and unrelated
infrastructure modules.

## Release note

Merging triggers EasyPanel autodeploy but does not enqueue or publish anyone.
The production backfill executor remains a separate ticket and requires an
explicit CEO authorization for an exact reviewed plan hash.
