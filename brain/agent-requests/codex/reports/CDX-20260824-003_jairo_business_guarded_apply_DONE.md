# CDX-20260824-003 — Jairo Business guarded APPLY — DONE

## Result

Implemented a dedicated preview and guarded APPLY for the single approved
Business projection. No generic APPLY flag is accepted. The live Brand and
Product sources, approved inputs, canonical runtime and audit backups are
hash-checked but never written.

Preview verifies the pinned audit package, all reviewed artifacts, approved
DRY_RUN state, projected identity/host and absence of the destination. It emits
one operation and a deterministic planHash with `changed:false`.

## Transaction and idempotency

- Exclusive `mkdir` claim with owner UUID, PID and acquisition timestamp.
- Active, incomplete and stale claims block without cleanup.
- Re-preflight under the owned claim before any source mutation.
- Projected source written to an owner-tagged temporary, then atomically renamed.
- Destination hash/identity and unchanged Brand/Product hashes post-verified.
- Journal written atomically before claim release.
- Pre-commit failure rolls back only with the current owner token.
- Ownership loss never removes a foreign winner artifact.
- Post-journal failure preserves committed state and claim for audit; it never
  triggers rollback.
- Valid rerun checks journal, final hash/identity and claim absence, then returns
  `ALREADY_APPLIED`, `changed:false`.
- Journal or final-state drift returns a blocked terminal state.

## Files

- `app/web/scripts/jairo-business-source-guarded-apply.mjs`
- `app/web/scripts/jairo-business-source-guarded-apply.test.mjs`
- `app/web/package.json`
- `Dockerfile` (only packages the maintenance command)
- this request/report

## Verification

- Focused guarded Business tests: PASS 11/11.
- Existing Business DRY_RUN regression: PASS.
- ESLint focalized with `--no-ignore --max-warnings=0`: PASS.
- Next.js production build: PASS.
- `git diff --check`: PASS.

Covered: unchanged preview, drift/collision, explicit confirmation/planHash,
atomic creation, Brand/Product preservation, sequential idempotency, journal and
final-state drift, deterministic concurrency, incomplete/stale claims,
owner-only rollback, ownership loss after mutation and post-journal failure.

## Limits and pending authorization

No EasyPanel, production preview, APPLY, source mutation, PublishingTarget, DNS,
Hostinger, publication or regeneration was executed. PR/deploy remain pending
orchestrator audit. Exact production values and commands are intentionally absent
from GitHub documentation and belong only in the restricted audit response.
