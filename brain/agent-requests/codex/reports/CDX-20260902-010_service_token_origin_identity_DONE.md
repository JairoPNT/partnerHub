# CDX-20260902-010 — DONE

## Request ID

CDX-20260902-010

## Result

Cloudflare Access assertions now preserve strict cryptographic validation while
recognizing the signed machine-identity shape emitted for Service Tokens:
empty `sub`, `type: "app"` and non-empty `common_name`.

Human identities still require a non-empty `sub`. Service identities receive a
stable opaque subject derived from a SHA-256 hash of `common_name`; the original
credential name is not returned or logged. Empty-sub assertions missing any
required machine claim remain rejected.

## Files/modules

- `app/web/server/auth/cloudflareAccessAuth.ts`
- `app/web/server/auth/cloudflareAccessAuth.test.ts`
- Request and completion report for CDX-20260902-010

## Verification

- Cloudflare Access authentication: 10/10 PASS
- Backfill executor regression: 6/6 PASS
- Backfill preview regression: 5/5 PASS
- Durable publication queue regression: 11/11 PASS
- Total focused/regression tests: 32/32 PASS
- Focused ESLint: PASS with zero warnings
- Next.js production build: PASS (39 routes/pages)
- `git diff --check`: pending final check

The build retains the pre-existing Turbopack workspace/NFT tracing warnings;
compilation, TypeScript, page-data collection and static generation pass.

## Security

- RS256 signature, exact issuer, exact route audience and expiry checks remain
  mandatory.
- An empty subject alone is not accepted as an identity.
- No token, JWT, audience, service credential name or environment value is
  logged or embedded.
- No Cloudflare, EasyPanel, queue, SFTP or publication mutation was performed
  by this code ticket.

## Git

- Branch: `codex/CDX-20260902-010-service-token-origin-identity`
- Commit/PR: pending at report creation

## Follow-up

Deploy the merged change, verify the Service Token against the dedicated
publication audience, confirm that the reviewed backfill plan is unchanged,
and only then execute the separately authorized backfill.
