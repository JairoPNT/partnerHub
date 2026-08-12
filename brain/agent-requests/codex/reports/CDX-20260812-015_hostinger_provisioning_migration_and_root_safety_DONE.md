# CDX-20260812-015 — Hostinger provisioning migration and root safety — DONE

## Request ID

`CDX-20260812-015`

## Summary

Resolved both audit blockers on top of `CDX-20260812-014`.

Persisted publishing targets now support safe version 1 reads and atomic version 2 migration. Migration preserves identity, timestamps, provider states, DNS record IDs, safe errors, and the previously persisted remote root. `rootEcosystemType` is added only when the root identity is demonstrable:

- A legacy target already serving its base domain has an unambiguous root equal to its ecosystem.
- A legacy subdomain requires the caller's explicit persisted root selection and must remain a different ecosystem from that root.
- Missing, contradictory, or malformed root identity stops with `PROVISIONING_MIGRATION_CONFLICT`; no file is rewritten.
- `ganomaster.pro` and its subdomains are never migrated.

Provisioning now compares any persisted `remoteRoot` with the current `root_directory` returned by Hostinger before updating state. A mismatch stops the run, retains the old remote root, persists only `HOSTINGER_SUBDOMAIN_CONFLICT`, and never publishes to the unexpected path. No root path is derived locally.

## Files changed

- `app/web/server/services/subdomainProvisioningService.ts`
- `app/web/server/services/subdomainProvisioningService.test.ts`
- `brain/agent-requests/codex/requests/CDX-20260812-015_hostinger_provisioning_migration_and_root_safety.md`
- `brain/agent-requests/codex/reports/CDX-20260812-015_hostinger_provisioning_migration_and_root_safety_DONE.md`

## Test coverage

The focused Hostinger-only suite now covers:

- unambiguous root v1→v2 migration;
- explicit subdomain v1→v2 migration;
- ambiguous and immutable identity conflicts;
- persisted/Hostinger document-root conflict;
- retries from `DNS_PENDING`, `SSL_PENDING`, and `FAILED`;
- provider failure and safe persisted error codes;
- `ganomaster.pro` request and migration protection;
- Hostinger hosting and DNS idempotency/conflicts;
- Plan 360 and individual root fallback behavior.

## Verification

- `npm.cmd run test:hostinger-only`: PASS, 24/24.
- Ticket-scoped backend ESLint with `--max-warnings=0`: PASS.
- `npm.cmd run build`: PASS.
- `git diff --check`: PASS.

The build retains the existing Turbopack workspace-root/NFT warning for the product-page preview route. It is unrelated and non-blocking.

## Safety

- No MCP call or real Hostinger request was executed.
- No real domain, DNS record, subdomain, SSL state, or document root was changed.
- No frontend, Payments, Wompi, onboarding, dashboard, or offer catalog file was modified.

## Branch and PR

- Branch: `codex/CDX-20260812-014-hostinger-only-domain-provisioning`
- Parent implementation commit: `ddbb6f1`.
- PR: not opened; audit remains required.

## Follow-up

Re-audit the combined `014 + 015` branch. After approval, the previously documented `OPS-20260812-004` dry-run remains the next real-provider gate.
