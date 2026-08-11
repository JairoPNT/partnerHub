# CDX-20260811-005 - Reconciliation runtime packaging

- Owner: Codex
- Model tier: Balanced
- Scope: Include the already-tested Claudia hero reconciliation script in both production runner image variants.
- Allowed files/modules: root `Dockerfile`, `app/web/Dockerfile`, and this ticket/report documentation.
- Excluded files/modules: application logic, frontend, persisted data, generation, publication, and unrelated deployment settings.
- Dependencies: `CDX-20260811-004` merged.
- Parallel-safe with: tickets that do not modify either Dockerfile.
- Integration notes: this makes the existing npm maintenance command callable in the deployed container; it does not execute it.

## Acceptance checks

- Both runner stages copy `scripts/reconcile-claudia-heroes.mjs` to `/app/scripts/`.
- The npm command and source script exist on `main`.
- `git diff --check` passes.
- No production data is changed during build or deployment.
