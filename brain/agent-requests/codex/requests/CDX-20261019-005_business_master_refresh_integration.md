# CDX-20261019-005 — Business master refresh lifecycle integration

- **Owner:** Codex (Backend)
- **Scope:** Integrate and verify the independently implemented guard, recovery writer, and historical lineage checks for safely refreshing the canonical Business master package when the installed package has drifted.
- **Allowed files:** `Dockerfile`, `app/web/package.json`, the Business master package and drift-recovery scripts/tests, publication job and worker services/tests, and this request with its matching DONE report.
- **Excluded files/modules:** Frontend/UI, Prisma/database schema, auth, customer package inputs, production target files, credentials, runtime configuration, provider APIs, DNS/SSL, SFTP, remote publication, deployment, and merge to `main`.
- **Dependencies:** CDX-20261019-002 (refresh/job guards), CDX-20261019-003 (guarded refresh writer), and CDX-20261019-004 (historical lineage validation); all reviewed before integration.
- **Parallel-safe with:** None during integration; the shared publication services and master refresh entrypoint are owned by this ticket for final reconciliation.
- **Integration notes:** Execute tests only with local temporary fixtures. Keep `sh` instructions for EasyPanel users; local development commands may use PowerShell. Open a PR after independent review. PR merge, deploy, and any production APPLY remain separate gates.

## Requirements

1. Add a deterministic integration test covering preview, guarded refresh, archive/journal preservation, stale preview behavior, enqueue with the refreshed package hash, and the worker-claim race without contacting providers.
2. Verify Business jobs cannot start, enqueue, or retry across the refresh window, while unrelated Product jobs remain available.
3. Fail closed on historical package, manifest, journal, destination-tree, claim, or job-state drift; do not overwrite unknown state or release a claim not owned by this execution.
4. Package the refresh entrypoint and its runtime assets for the production image and provide focused npm test commands.
5. Run focused tests, lint, build, `git diff --check`, and an independent review. Record the outcome and remaining release gates in the matching report.

## Acceptance

- Local recovery, lifecycle integration, publication-job, and worker tests pass; lint and build succeed.
- Independent review approves the complete integrated diff.
- No provider calls, SFTP, DNS/SSL changes, production writes, publication, merge, or deployment occurs in this ticket.
