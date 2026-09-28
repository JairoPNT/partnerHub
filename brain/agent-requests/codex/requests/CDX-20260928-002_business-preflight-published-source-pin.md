# CDX-20260928-002 — Align Business preflight source pin with published source

- **Owner:** Codex (Backend)
- **Scope:** Update the two source-hash pins used by the active app-owned Jairo Business preflight to the source hash already approved and published, while preserving fail-closed behavior for any other source content.
- **Allowed files:** `app/web/scripts/jairo-business-app-owned-preflight.mjs`, `app/web/scripts/jairo-business-app-owned-preflight.test.mjs`, `app/web/scripts/jairo-business-publishing-preflight.mjs`, `app/web/scripts/jairo-business-publishing-preflight.test.mjs`, this request, and its matching DONE report.
- **Excluded files/modules:** `prepare-jairo-business-provisioning-preview.mjs`, `prepare-jairo-business-publication-preview.mjs`, source content, entitlement/auth reader, target/claim/journal state, publication/apply code, APIs, DNS/SFTP/provider clients, frontend, database, production/deployment configuration.
- **Dependencies:** CDX-20260928-001 and PR #205 merged; Jairo supplied a deployed preflight result with `SOURCE_HASH_DRIFT` and source hash `1cf347064989fefcebb0fbe61c1cf8444f3865f354ab16ff07cf667154c0355c`. That exact hash was in the previously authorized publication-backfill preview (plan `95d328a1…`) and the corresponding publication job later reported `SUCCEEDED` / `COMPLETE` (job `ddc390e…`).
- **Parallel-safe with:** None; the two active preflight modules and tests are one cohesive contract.
- **Integration notes:** Independent read-only review required before PR. User deploys from EasyPanel after merge. No publication, provider, DNS, SFTP, or deployment operation is part of this ticket.

## Requirements

1. Change only the active app-owned preflight manifest pin and the native preflight's compiled expected-source pin from the old source hash to `1cf347064989fefcebb0fbe61c1cf8444f3865f354ab16ff07cf667154c0355c`.
2. Add/update focused tests first. Verify the generated ephemeral manifest carries this exact approved hash, the native preflight accepts only that compiled pin in its manifest, and unrelated hashes remain blocked as `SOURCE_HASH_DRIFT` or invalid manifest. Preserve all existing redaction, cleanup, entitlement, target isolation, and read-only behavior.
3. Do not modify either legacy provisioning/publication preview script or the source itself.
4. No live entitlement read, provider call, DNS/SFTP operation, publication, or production mutation. This ticket only makes a local code change to the preflight pin.
5. Update the matching DONE report with changed files, verification, branch/commit/PR, and operational limitations.

## Acceptance

- Both active preflight pins exactly match the previously approved/published source hash.
- Focused tests pass and include evidence that a different source hash does not pass.
- No unrelated pin, source bytes, environment, target state, or external system is modified.
