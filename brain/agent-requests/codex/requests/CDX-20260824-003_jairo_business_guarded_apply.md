# CDX-20260824-003 — Jairo Business guarded APPLY

Owner: Codex Backend.

## Objective

Prepare, but do not execute, a preview/planHash and guarded APPLY that creates
exactly one Business source from the approved CDX-013 audit projection.

## Boundaries

- Allowed: one maintenance script, focused tests, npm/runtime packaging and this
  ticket's request/report.
- Destination: one allowlisted Business source only.
- Read-only dependencies: approved activation, entitlement, profile, Brand,
  Product, runtime and projected Business audit artifacts.
- Excluded: changes to Brand/Product, PublishingTargets, DNS, Hostinger,
  publication, regeneration, UI, payments and production execution.
- Dependency: approved unblocked CDX-013 DRY_RUN audit package.
- Parallel-safe only with tickets that do not edit the same source destination,
  audit package, Dockerfile or package scripts.

## Safety contract

The manifest pins one partner/target, one audit package and all reviewed hashes.
Preview is `changed:false`. APPLY requires an explicit mode, confirmation and
reviewed planHash. It uses an exclusive atomic claim, locked re-preflight,
temporary write plus atomic rename, post-verification, journal, owner-only
rollback and terminal-state idempotency.

Repository documentation is redacted. Exact IDs, paths, hashes and operator
commands are delivered only in the restricted orchestrator thread.
