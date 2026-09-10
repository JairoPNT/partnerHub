# CDX-20260902-010 — Cloudflare Access Service Token origin identity

Owner: Codex
Model tier: Premium (production authentication boundary)
Dependencies: CDX-20260902-009 merged and deployed

## Single outcome

Accept Cloudflare Access Service Token assertions after full signature,
issuer, audience and expiry verification when Cloudflare represents the
machine identity with an empty `sub`, `type: "app"` and a non-empty
`common_name`.

## Allowed files/modules

- `app/web/server/auth/cloudflareAccessAuth.ts`
- `app/web/server/auth/cloudflareAccessAuth.test.ts`
- This request and its matching completion report

## Excluded files/modules

- Cloudflare and EasyPanel configuration
- Access policies, audiences or service-token credentials
- Publication queue, worker, backfill plan and SFTP behavior
- UI, database, payment and provisioning modules

## Required behavior

- Keep RS256 signature, issuer, exact audience and expiry validation.
- Preserve normal human identities with a non-empty `sub`.
- Accept only the documented machine shape: empty `sub`, `type: "app"`
  and non-empty `common_name`.
- Derive a stable opaque subject by hashing `common_name`; never expose the
  service credential name.
- Reject an empty subject when any required machine-identity claim is absent.

## Verification

- Focused authentication tests for human, valid service and malformed empty
  subject assertions.
- Publication backfill regressions, focused ESLint, production build and
  `git diff --check`.

## Parallel safety

Not parallel-safe with tasks editing Cloudflare Access authentication.
Parallel-safe with frontend-only work and unrelated provider modules.
