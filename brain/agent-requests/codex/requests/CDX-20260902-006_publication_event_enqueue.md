# CDX-20260902-006 — Publication event enqueue

Owner: Codex
Model tier: Premium (production publication authorization and tenant isolation)
Dependencies: CDX-20260902-005 merged and deployed

## Single outcome

Automatically enqueue durable publication jobs after an approved activation or
an explicit saved-source generation/update, without requiring an operator to
call the publication-job API.

## Allowed files/modules

- A focused publication-event orchestration service and tests under
  `app/web/server/services/`
- Internal activation-lead and product-page generation/update routes only for
  post-commit enqueue hooks and safe response metadata
- Package test commands only if required
- This request, matching report and current project-state documentation

## Excluded files/modules

- UI, React, Tailwind and navigation
- Provisioning, DNS, SFTP implementation and templates
- Payment, grant or entitlement mutation
- Database/schema/migrations and authentication contracts
- Existing-customer backfill execution or production data mutation
- Deployment, merge or production publication

## Required behavior

- Treat only ACTIVE leads in PAID or CONVERTED state as activation-approved.
- Recompute current entitlement and enqueue only entitled, READY targets whose
  exact saved source and canonical master package already exist.
- On an approved activation update, evaluate every existing target owned by the
  activation lead; on a source generation/update, evaluate only that site.
- Use the durable queue's existing hash identity and wake the worker only when
  at least one job is eligible.
- Never make a successful activation/source persistence depend on worker
  availability; return bounded safe outcome codes without secrets or paths.
- Master sites, archived/cancelled/unpaid leads, unentitled ecosystems and
  missing/not-ready artifacts must not enqueue.
- The worker's own regeneration path must not recursively enqueue another job.

## Verification

- Focused orchestration tests for approval, entitlement, tenant ownership,
  idempotency, source-only scope and safe failure behavior.
- Route regressions, focused ESLint, production build and `git diff --check`.

## Parallel safety

Not parallel-safe with tickets editing activation/product-page routes or
publication-job orchestration. Parallel-safe with frontend-only work and
unrelated infrastructure modules.

## Release note

Merging triggers EasyPanel autodeploy and enables automatic publication for
future eligible events. Existing customers are not scanned or enqueued by this
ticket; their backfill preview remains a separate ticket.
