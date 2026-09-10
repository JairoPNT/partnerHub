# CDX-20260827-001 — Jairo Business guarded package preparation and publication preview

## Owner

Codex (Backend Lead).

## Objective

Provide one app-owned maintenance workflow that plans and, only after an exact
authorization, prepares the local `jairo-pinto-business` package with the
supported generator and returns the generic guarded-publication PREVIEW. The
workflow must never publish through SFTP.

The package preparation and publication PREVIEW are technically inseparable in
this pilot because the publication plan hash includes the generated package
hash. The local generation step therefore belongs to the same bounded workflow,
but remains separately gated by mode, confirmation and reviewed preparation
plan hash.

## Dependencies

- CDX-20260824-003: approved Business source exists.
- CDX-20260824-005: generic guarded publisher exists.
- CDX-20260824-006: SFTP capability contract exists.
- CDX-20260826-005: production SFTP runtime packaging is valid.
- PublishingTarget `jairo-pinto-business` is v2 `READY/PENDING`.

## Allowed files/modules

- `app/web/server/runtime/jairoBusinessPackageGenerator.ts` (new)
- `app/web/server/runtime/serverOnlyRuntimeShim.mjs` (new, standalone bundle only)
- `app/web/scripts/prepare-jairo-business-publication-preview.mjs` (new)
- `app/web/scripts/prepare-jairo-business-publication-preview.test.mjs` (new)
- `app/web/package.json`
- `Dockerfile` (runtime/script packaging only)
- This request and its matching DONE report

## Excluded files/modules

- Existing generation, publication, provisioning, DNS and SFTP contracts
- API routes
- Database/schema/auth/payments
- Frontend, React, Tailwind and Landing Builder UI
- Product, Brand, apex, provider targets and remote SFTP content

## Contract

### PREVIEW (default)

- Read-only.
- Validates the exact Jairo Business source, target, protected Brand/Product
  sources, current capability and master Business package.
- Reports whether an existing local package is absent or replaceable.
- Returns a deterministic preparation plan hash.
- Makes no local writes and no provider/SFTP calls.

### PREPARE_AND_PREVIEW (explicit)

- Requires exact mode, confirmation and reviewed preparation plan hash.
- Revalidates every input before writes.
- Acquires an atomic local claim.
- Runs the supported generator in an isolated temporary workspace containing
  copies of the required sources, target, activation snapshot and master
  package, so generator side effects cannot mutate authoritative sources,
  activation leads, history or targets.
- Installs the complete generated package locally using staging plus a
  recoverable rename/backup sequence.
- Creates the publication manifest atomically beside a current
  `sftp-capability.json`.
- Calls only `planGuardedPublication` and returns its PREVIEW.
- Never creates an SFTP adapter and never contacts or mutates the provider.
- On any pre-completion failure, restores the prior local package when owned and
  preserves foreign state fail-closed.

## Verification

- Focused unit tests for read-only PREVIEW, confirmation/plan hash, isolation,
  local install rollback, capability/target/source drift, manifest binding and
  successful guarded-publication PREVIEW.
- Existing guarded-publication and generation regressions.
- Focused ESLint, production build and `git diff --check`.

## Parallel safety

- Parallel-safe only with tickets that do not edit the allowed files above.
- Any overlap in Dockerfile/package scripts or generated-site runtime packaging
  stops this ticket until the conflicting work is integrated.

## Production authorization

This ticket authorizes implementation and tests only. It does not authorize
EasyPanel execution, local production package replacement, SFTP, publication,
DNS or public-site changes.
