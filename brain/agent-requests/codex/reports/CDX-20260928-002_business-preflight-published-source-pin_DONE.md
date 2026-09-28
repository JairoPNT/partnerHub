# CDX-20260928-002 — DONE

- **Request ID:** CDX-20260928-002
- **Owner:** Codex (Backend)
- **Branch:** `codex/CDX-20260928-002-business-preflight-published-source-pin`
- **Commit:** To be recorded with the ticket commit.
- **PR:** To be recorded after creation.

## Changes and files

- Changed only the active app-owned manifest pin and native preflight compiled pin to the approved/published SHA-256 `1cf347064989fefcebb0fbe61c1cf8444f3865f354ab16ff07cf667154c0355c`.
- Updated focused tests for the emitted ephemeral manifest and native manifest validation. The native test rejects the former pin and another unrelated 64-character hash; a distinct fixture source still yields `SOURCE_HASH_DRIFT`.
- Modified `app/web/scripts/jairo-business-app-owned-preflight.mjs`, `app/web/scripts/jairo-business-app-owned-preflight.test.mjs`, `app/web/scripts/jairo-business-publishing-preflight.mjs`, `app/web/scripts/jairo-business-publishing-preflight.test.mjs`, and this report. The matching request is present as an untracked ticket file and was not edited during implementation.

## Verification

- Red, before production edits: `node --test app/web/scripts/jairo-business-app-owned-preflight.test.mjs app/web/scripts/jairo-business-publishing-preflight.test.mjs` from repository root: **24 tests; 15 passed, 9 failed, exit 1**. Failures were the old app-owned manifest pin and native rejection of the new fixture pin.
- Green, after the two production pin edits: same command: **24 tests; 24 passed, 0 failed, exit 0**.
- `git diff --check`: **exit 0**, no whitespace errors (Git printed only CRLF-conversion warnings).
- Focused ESLint command against all four touched code/test files: **exit 1** on three existing `no-undef` errors (`Buffer` and `URL`) in unchanged lines. The same errors reproduce against the corresponding base-commit versions, so they are pre-existing and were not expanded into this ticket.
- Build: **not run**. The ticket requires focused local Node tests only, and no application dependencies or deployment operations were invoked.
- Full project suite: **not run**; `app/web/package.json` has no aggregate `test` script. The focused test files cover the two changed scripts.
- Independent read-only review: **APPROVE**, no Critical/Important/Minor findings. Reviewer verified both pins, fail-closed manifest checks, unchanged legacy pins, scoped diff, 24/24 focused tests, and `git diff --check`. The fixture bytes intentionally remain different from the approved hash, so a source-drift result remains expected in local tests; live accepted-source verification remains after deployment.

## Risks and follow-up

- The approved source bytes were not available as a local fixture. The tests prove exact manifest pin acceptance and fail-closed behavior for different bytes/hashes, not a live source read or deployed readiness result.
- No source content, legacy prepare scripts, publication/apply flow, target state, status JSON, API, provider, DNS/SFTP, deployment, or frontend file was changed. No live operation was run.
- **Follow-up:** Create and merge the reviewed PR; Jairo must deploy it, then rerun the read-only PREVIEW with POSIX `sh`. A READY result will permit review of the next gate only; it does not authorize APPLY or publication.
