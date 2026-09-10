# CDX-20260902-009 — Dedicated Cloudflare Access audience for publication jobs

Owner: Codex
Model tier: Premium (production authentication boundary)
Dependencies: CDX-20260902-008 merged and deployed

## Single outcome

Require every internal publication-job route to validate a dedicated
Cloudflare Access audience supplied through
`CLOUDFLARE_ACCESS_PUBLICATION_AUD`, without accepting the broad
administration audience as fallback.

## Allowed files/modules

- `app/web/server/auth/cloudflareAccessAuth.ts` and focused tests
- Internal routes under `app/web/app/api/internal/publication-jobs/`
- This request and its matching completion report

## Excluded files/modules

- Cloudflare or EasyPanel configuration changes
- Service-token creation or rotation
- Publication queue, worker, backfill-plan or SFTP behavior
- UI, database, payment, entitlement and provisioning modules
- Production backfill execution

## Required behavior

- Resolve the publication audience only from
  `CLOUDFLARE_ACCESS_PUBLICATION_AUD`.
- Reject JWTs issued for the broad administration audience.
- Keep signature, issuer, expiry and subject validation unchanged.
- Apply the dedicated authenticator consistently to list, enqueue, read,
  cancel, retry, preview and backfill execution routes.
- Do not log or return JWTs, credentials, subjects or environment values.

## Verification

- Focused authentication tests proving publication-audience acceptance and
  broad-audience rejection.
- Existing Cloudflare Access tests, focused ESLint, production build and
  `git diff --check`.

## Parallel safety

Not parallel-safe with tasks editing Cloudflare Access authentication or
internal publication-job routes. Parallel-safe with frontend-only work and
unrelated provider modules.

## Integration note

After deployment, CDX-20260902-010 must create a path-specific Cloudflare
Access application for `/api/internal/publication-jobs/*`, configure its AUD
in EasyPanel, verify a fresh preview and only then execute the already
authorized exact backfill plan if the hash remains unchanged.
