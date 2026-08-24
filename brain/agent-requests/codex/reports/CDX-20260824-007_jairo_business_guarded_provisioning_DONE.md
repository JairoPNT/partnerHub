# CDX-20260824-007 — Jairo Business guarded provisioning — DONE

## Outcome

Implemented the exact allowlisted PREVIEW/APPLY contract using the existing
authenticated PublishingTargets endpoint and supported provisioning service.
No EasyPanel, provider, DNS, production, publication or CDX-006 operation ran.

## Changed files

- `app/web/scripts/jairo-business-guarded-provisioning.mjs`
- `app/web/scripts/jairo-business-guarded-provisioning.test.mjs`
- `app/web/package.json`
- `Dockerfile`
- matching request/report documentation.

## Safety result

The service can safely ensure/resume this target, but cannot promise atomic
rollback across Hostinger and DNS. The wrapper therefore owns concurrency,
drift checks and a success journal locally while retaining any post-provider
partial state fail-closed for audit. It does not improvise direct provider calls.

## Verification

- guarded provisioning: 8/8 PASS;
- `subdomainProvisioningService` regression: 11/11 PASS;
- provisioning API contract: 3/3 PASS;
- Jairo Business publishing preflight regression: 7/7 PASS;
- ESLint `--no-ignore` on both new files: PASS, zero warnings;
- production build: PASS (existing Turbopack trace warning only);
- `git diff --check`: PASS.

## Branch / PR / operations

- Branch: `codex/CDX-20260824-007-jairo-business-guarded-provisioning`
- Commit/push: pending final verification.
- PR: not opened.
- Production operations: none.

## Remaining gates

Audit, PR/merge/deploy, production PREVIEW and separate APPLY authorization.
