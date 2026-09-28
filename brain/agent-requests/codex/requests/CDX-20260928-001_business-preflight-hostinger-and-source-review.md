# CDX-20260928-001 — Align Business preflight with Hostinger and source review

- **Owner:** Codex (Backend)
- **Scope:** Correct the existing app-owned Jairo Business PREVIEW contract so it does not demand unused Cloudflare DNS credentials and exposes a safe current-source fingerprint when source drift blocks the preview.
- **Allowed files/modules:** `app/web/scripts/jairo-business-publishing-preflight.mjs`, its focused test, `app/web/scripts/jairo-business-app-owned-preflight.mjs`, its focused test, this request, and its matching DONE report.
- **Excluded files/modules:** source content and pinned source hash, entitlement/auth reader, publication/apply code, DNS/SFTP/provider clients, APIs, frontend, database, credentials, production state, deployment configuration.
- **Dependencies:** PR #204 merged; CDX-20260922-002C returned `SOURCE_HASH_DRIFT` and missing Cloudflare token/zone variables with no provider calls.
- **Parallel-safe with:** None; all code changes are one cohesive preflight contract touching shared modules.
- **Integration notes:** A separate review is required before any PR integration. No provider, DNS, SFTP, publication, or deployment operation is part of this ticket.

## Requirements

1. Remove `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ZONE_ID` from the Jairo Business publication preflight's required configuration. Keep the Hostinger and authoritative IPv4 requirements unchanged. The PREVIEW remains read-only and must not contact Hostinger or Cloudflare.
2. Keep `SOURCE_HASH_DRIFT` fail-closed. Do not rewrite, refresh, or infer approval of the pinned source hash.
3. When the native preflight reports `SOURCE_HASH_DRIFT`, pass through only its actual source SHA-256 digest as `sourceHash`, and only if it is exactly 64 lowercase hexadecimal characters. Never pass through a source path, source bytes, manifest, entitlement, native object, or arbitrary error text.
4. A missing or malformed native digest must leave the preflight `BLOCKED` and omit `sourceHash`.
5. Focused tests must prove both configuration behavior and digest redaction/validation. Tests use fixture/fake adapters; no live endpoint or provider calls.
6. Update the matching DONE report with changed files, verification and deployment/operational limitations. Do not update the approved source hash.

## Acceptance

- With Cloudflare variables absent and all existing Hostinger/IPv4 values present, neither Cloudflare variable appears in `configuration.missing` or `blockedReasons`.
- If a required Hostinger setting is absent, that Hostinger blocker remains.
- `SOURCE_HASH_DRIFT` remains in `blockedReasons`; a valid source digest is surfaced without any path or source content.
- Malformed digest, secret-looking string, source path, and missing digest are never surfaced.
- No provider call, DNS mutation, SFTP connection, publication, entitlement fallback, or source approval occurs.
