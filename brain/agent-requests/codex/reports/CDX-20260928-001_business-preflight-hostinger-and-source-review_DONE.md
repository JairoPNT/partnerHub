# CDX-20260928-001 — DONE

- **Request ID:** CDX-20260928-001
- **Owner:** Codex (Backend)
- **Branch:** `codex/CDX-20260928-001-business-preflight-hostinger-and-source-review`
- **Commit:** Recorded in the commit containing this report.
- **PR:** None; separate review required before integration.

## Changes

- Removed only the two Cloudflare variables from the Business publication preflight's required configuration. Hostinger and authoritative IPv4 validation remain.
- Kept source-hash drift blocked. The app-owned PREVIEW now includes `sourceHash` only when the native blocked result contains `SOURCE_HASH_DRIFT` and `source.sha256` is exactly 64 lowercase hexadecimal characters. All other native source, entitlement, manifest, and error details remain excluded.
- Did not change the pinned source hash or approve current source bytes.

## Files

- `app/web/scripts/jairo-business-publishing-preflight.mjs`
- `app/web/scripts/jairo-business-publishing-preflight.test.mjs`
- `app/web/scripts/jairo-business-app-owned-preflight.mjs`
- `app/web/scripts/jairo-business-app-owned-preflight.test.mjs`
- This report; the matching request is included in the ticket commit.

## Verification and limitations

- Test-first verification: two new focused expectations failed for the intended missing behaviors before implementation.
- `node --test scripts/jairo-business-publishing-preflight.test.mjs scripts/jairo-business-app-owned-preflight.test.mjs`: 23 passed, 0 failed.
- `git diff --check`: no whitespace errors.
- Focused ESLint check using the project config and dependency-equipped root checkout: passed with exit code 0, 0 warnings.
- `npm run build`: unavailable because `next` is not installed in this isolated checkout.
- No full project suite was run: there is no aggregate `test` script and this checkout lacks installed dependencies for the broader application tests.

## Risks and follow-up

- Lint/build and broader suite require a dependency-equipped review environment before integration.
- Source drift remains a blocker; an authorized source review/approval is a separate decision. No entitlement fallback was added.
- No live HTTP, provider, DNS, SFTP, publication, deployment, push, PR, or merge action was performed. Tests used fixture/fake adapters only.
- **Follow-up:** Separate review and integration ticket as specified by the request.
