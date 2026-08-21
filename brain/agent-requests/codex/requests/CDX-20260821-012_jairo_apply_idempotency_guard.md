# CDX-20260821-012 — Jairo APPLY fail-closed idempotency guard

## Owner

Codex — Backend Lead.

## Incident context

CDX-011 completed once in production with `changed:true`, `blocked:false`,
`postVerification:PASSED` and a persisted `apply.json`. A second invocation was
reported with output resembling the first run. A sequential rerun after the
completed state cannot reach `changed:true` in the current implementation, but
the preflight contains a time-of-check/time-of-use window: two concurrently
started processes can both observe an absent journal before either mutates data.

## Scope

Make the CDX-011 APPLY entry point fail closed and concurrency-safe without
changing the completed Jairo identities or introducing a new migration.

## Allowed files/modules

- `app/web/scripts/jairo-source-identity-guarded-apply.mjs`
- `app/web/scripts/jairo-source-identity-guarded-apply.test.mjs`
- The matching CDX-012 request/report documentation.

## Required contract

1. Acquire an exclusive, atomic execution claim before any source, verification,
   history, rollback, or journal mutation. A second process must fail with a
   stable explicit reason and must not enter rollback for work owned by the first.
2. Treat an existing valid `apply.json` as terminal success already recorded:
   APPLY must return or fail with an auditable `ALREADY_APPLIED` outcome and
   `changed:false`; it must never report a new change.
3. Validate the completed identities and the approved Product, Brand,
   verification and history hashes when recognizing the terminal state. Drift
   must fail closed with explicit reasons rather than being labeled idempotent.
4. Make execution-claim creation atomic across processes (for example exclusive
   file creation or an atomic lock directory) and define stale/incomplete claim
   handling without automatic destructive recovery.
5. Preserve the existing plan-hash, manifest, audit-package, allowlist, backup,
   atomic-write, post-verification and rollback protections for the first APPLY.
6. Add tests for a sequential rerun, two concurrent APPLY attempts, existing
   journal with drift, stale/incomplete claim, and rollback ownership.

## Excluded

- No production command execution, data repair, rollback, APPLY or migration.
- No changes to current `.sources`, `.verifications`, `.history`, audit packages
  or PublishingTargets.
- No DNS, Hostinger, publication, regeneration, BUSINESS, UI, payments, ledger,
  Docker or deploy changes.

## Dependencies

- CDX-011 merged and deployed.
- The production incident evidence and read-only inspection output must be
  retained for audit.

## Parallel-safe with

Only tickets that do not edit the two CDX-011 script files or its runtime command.

## Verification

- Focused Node tests, including a deterministic concurrency race test.
- Focused ESLint.
- Build.
- `git diff --check`.

## Release gate

No PR, deploy, production preview, APPLY or rollback until explicit orchestrator
audit and authorization.
