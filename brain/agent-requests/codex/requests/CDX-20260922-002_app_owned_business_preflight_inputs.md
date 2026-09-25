# CDX-20260922-002 — App-owned Business preflight inputs

- Owner: Codex Backend.
- Outcome: an app-owned Jairo Business `PREVIEW` accepts only the exact site ID `jairo-pinto-business`, obtains fresh entitlement on each invocation, and hides local manifest paths from the caller and result.
- Scope: the fresh-entitlement reader, app-owned preflight entrypoint, their focused tests, and package script declarations from reviewed Tasks 1 and 2; this request and DONE report record the contract and verification.
- Allowed files/modules: `app/web/scripts/lib/jairo-business-fresh-entitlement.mjs`, its test, `app/web/scripts/jairo-business-app-owned-preflight.mjs`, its test, `app/web/package.json`, and this request/report pair.
- Excluded files/modules: routes and UI; provider, DNS, SFTP, publication, generation and enqueue modules; deploy configuration. No live runtime validation or external operation is authorized.
- Dependencies: CDX-20260922-001 and reviewed Task 1/2 commits `6bc5df0` and `03a3e87`.
- Parallel-safe with: tickets that do not edit the allowed files or shared contracts.
- Integration notes: this `PREVIEW` keeps the existing publishing preflight as its read-only downstream contract. The CLI accepts only `--site-id`; caller-controlled manifest, endpoint, source and output paths are forbidden. The fresh reader uses only the compiled endpoint `https://app.partnerhub.club/api/internal/partner-ecosystem-entitlement?activationLeadId=f403f29e-95c8-4825-9320-967376443020`. The application compiles the fixed identity and source expectation with the fresh entitlement fingerprint into an ephemeral private bundle, removes the bundle on completion, and returns only redacted status and safe reason codes. Entitlement refresh has no stored-data fallback.

## Verification and authorization boundary

Focused tests use fake fetch and preflight adapters. No live HTTP, provider, DNS, SFTP, publication, or other external operation is part of this ticket. The separate CDX-20260922-002C controlled runtime validation remains unexecuted and requires fresh explicit authorization.
