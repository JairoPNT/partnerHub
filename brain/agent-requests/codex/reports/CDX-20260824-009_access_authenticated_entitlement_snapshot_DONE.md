# CDX-20260824-009 — Access-authenticated entitlement snapshot — DONE

## Result

Removed human-cookie reuse from the proposed runbook architecture. Added one
fail-closed snapshot preparer with two explicit modes: recommended Access
Service Token and operator-authenticated browser JSON export.

## Files

- `app/web/scripts/prepare-jairo-business-entitlement-snapshot.mjs`
- `app/web/scripts/prepare-jairo-business-entitlement-snapshot.test.mjs`
- `app/web/package.json`
- `Dockerfile`
- matching request/report docs.

## Security properties

- no cookie or Binding Cookie input;
- no service-token persistence/stdout;
- HTTPS, redirect, HTTP status and JSON checks;
- exact entitlement identity and canonical hash;
- atomic restrictive local output;
- collision/residue fail-closed; explicit empty-staging resume only.

## Verification

- snapshot contract: 6/6 PASS;
- CDX-007/008 guarded provisioning regression: 10/10 PASS;
- ESLint `--no-ignore` on both new files: PASS;
- production build: PASS (existing Turbopack trace warning only);
- `git diff --check`: PASS.

## Operations

No Cloudflare write, EasyPanel, provider, DNS, production snapshot, PREVIEW or
APPLY. Branch/commit/push pending final verification; PR unopened.
