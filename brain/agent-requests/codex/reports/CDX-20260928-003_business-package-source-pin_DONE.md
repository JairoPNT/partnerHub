# CDX-20260928-003 — Implementation ready for independent review

- **Request ID:** CDX-20260928-003
- **Owner:** Codex (Backend)
- **Branch:** `codex/CDX-20260928-003-business-package-source-pin`
- **Commit:** None (not staged or committed).
- **PR:** None; independent read-only review is required before PR.

## Changes

- `app/web/scripts/prepare-jairo-business-publication-preview.mjs`: bound `EXPECTED.sourceHash` to a read-only named module constant equal to the previously approved and published SHA-256 `1cf347064989fefcebb0fbe61c1cf8444f3865f354ab16ff07cf667154c0355c`. No environment, CLI, or caller override was added.
- `app/web/scripts/prepare-jairo-business-publication-preview.test.mjs`: asserted the exported compiled pin against an independent literal; exercised local fixture bytes against the default contract (`SOURCE_HASH_DRIFT`) and a matching injected fixture contract (not drift).
- This report records the results and release gate. The request file was amended by the coordinator to permit the narrow named export; it was not edited by this implementation.

## Verification

- Test-first red, before the production edit: `node --test scripts/prepare-jairo-business-publication-preview.test.mjs` from `app/web`: **9 tests; 5 passed, 4 failed, exit 1**. The new pin assertion failed as expected (`undefined` versus approved digest). Three existing tests also failed before the production edit (capability preview and two package-generation paths).
- Green for the pin and read-only comparison paths, after the production edit: `node --test --test-name-pattern "compiled package-preparation source pin|source comparison blocks unrelated bytes|package preparation PREVIEW is read-only|blocks expired capability" scripts/prepare-jairo-business-publication-preview.test.mjs`: **4 passed, 0 failed, exit 0**.
- Full focused file after edit: `node --test scripts/prepare-jairo-business-publication-preview.test.mjs`: **9 tests; 6 passed, 3 failed, exit 1**. The same three failures from the pre-edit run remain: capability preview expected `blocked:false` but got `true`; two package-generation cases hit `PUBLICATION_PREVIEW_BLOCKED:PUBLISHING_TARGET_IDENTITY_INVALID`. These were not changed or fixed within this pin-only ticket.
- `git diff --check`: **exit 0**; Git emitted only LF/CRLF conversion warnings.
- Build: **not run**; no application code outside the backend maintenance script was changed, and the focused file already has three pre-existing failing cases on this Windows checkout.
- Full project suite: **not run**; `app/web/package.json` defines no aggregate `test` script.

## Limits and next gate

- The approved production source bytes are unavailable as a local fixture. The literal assertion binds the compiled pin, while the fixture tests prove fail-closed comparison behavior; no live accepted-source result is claimed.
- No live entitlement read, SFTP/provider connection, capability persistence, PREPARE mode, publication, DNS, deployment, status JSON, or production package/input mutation was performed.
- Independent read-only review: **APPROVED**. Reviewer confirmed the exact digest, the fixed named export is not caller-controlled, fail-closed source comparison remains intact, and the three full-file test failures are in unchanged paths and match the implementer's pre-edit run. Reviewer did not independently rerun baseline.
- Only after PR/merge may Jairo deploy and run the EasyPanel read-only preview gate. A READY preview does not authorize PREPARE, APPLY, or publication. No cross-ticket integration work was done here.
