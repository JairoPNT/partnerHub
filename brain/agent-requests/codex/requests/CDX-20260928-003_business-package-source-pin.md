# CDX-20260928-003 — Align Business package-preparation source pin

- **Owner:** Codex (Backend)
- **Scope:** Update the source pin in the existing Jairo Business package-preparation preview workflow to the exact source hash already approved and published; retain fail-closed behavior for every other source.
- **Allowed files:** `app/web/scripts/prepare-jairo-business-publication-preview.mjs`, its focused test, this request, and its matching DONE report.
- **Excluded files/modules:** Other source-hash pins (including the provisioning preview and publication preflight), source content, package generator/output, manifests or persistent production inputs, entitlement/auth reader, target/claim/journal state, package preparation execution mode, SFTP probe, publication/apply code, provider clients, API/database/frontend, deployment configuration, and `.project-status/status.json`.
- **Dependencies:** CDX-20260928-002 merged as PR #206; EasyPanel returned `CDX-20260922-002` PREVIEW `READY` with no calls or secret exposure. The chosen source hash `1cf347064989fefcebb0fbe61c1cf8444f3865f354ab16ff07cf667154c0355c` is the exact hash in the previously Jairo-authorized, completed publication backfill.
- **Parallel-safe with:** None; the pin and its source-comparison behavior are a single cohesive change.
- **Integration notes:** Must receive a separate read-only review before PR. User handles deployment. This ticket does not authorize executing the workflow's `PREPARE_AND_PREVIEW` mode, SFTP, provider calls, or publication.

## Requirements

1. Change the package-preparation workflow's compiled `EXPECTED.sourceHash` pin to `1cf347064989fefcebb0fbe61c1cf8444f3865f354ab16ff07cf667154c0355c`. If needed for a non-brittle test, expose that same literal as a named module constant used by `EXPECTED`; it must not become an environment, CLI, or caller-controlled runtime override.
2. Use test-first workflow. Preserve and test the real fail-closed source comparison: a mismatching source must still report `SOURCE_HASH_DRIFT`; a matching injected fixture contract must not. Because the approved source bytes are not available as a fixture, include a narrow assertion that binds the compiled pin to the independently supplied approved digest; do not grep source text, use Node inspector tricks, or expose a runtime override.
3. Keep the source and generation logic, target/claim/journal, plan schema, package contents, and all other pins unchanged.
4. Tests must use local fixtures only. Do not read live entitlement, connect to SFTP/provider, create/persist capability, run PREPARE mode, or publish anything.
5. Update the matching DONE report with verification, limitations, branch/commit/PR, and the separate EasyPanel deploy gate.

## Acceptance

- The compiled source pin equals the previously authorized/published hash.
- A test demonstrates unrelated source bytes remain blocked, and the source comparison accepts a matching fixture contract.
- No package generation, local production input mutation, SFTP, provider, DNS, publication, deployment, or unrelated pin update occurs.
