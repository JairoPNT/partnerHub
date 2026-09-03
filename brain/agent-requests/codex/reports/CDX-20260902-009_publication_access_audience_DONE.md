# CDX-20260902-009 — DONE

## Request ID

CDX-20260902-009

## Result

All internal publication-job routes now authenticate against a dedicated
Cloudflare Access audience resolved only from
`CLOUDFLARE_ACCESS_PUBLICATION_AUD`. The broad administration audience is not
accepted as fallback.

The dedicated boundary covers list, enqueue, read, cancel, retry, backfill
preview and reviewed backfill execution. Signature, issuer, expiry and subject
validation continue to use the existing Cloudflare Access verifier.

## Files/modules

- `app/web/server/auth/cloudflareAccessAuth.ts`
- `app/web/server/auth/cloudflareAccessAuth.test.ts`
- Internal publication-job routes under
  `app/web/app/api/internal/publication-jobs/`
- Request and completion report for CDX-20260902-009

## Verification

- Cloudflare Access authentication: 8/8 PASS
- Backfill executor regression: 6/6 PASS
- Backfill preview regression: 5/5 PASS
- Durable publication queue regression: 11/11 PASS
- Total focused/regression tests: 30/30 PASS
- Focused ESLint: PASS with zero warnings
- Next.js production build: PASS (39 routes/pages)
- `git diff --check`: PASS

The build retains the pre-existing Turbopack workspace/NFT tracing warnings;
compilation, TypeScript, page-data collection and static generation pass.

## Security

- No token, JWT, AUD value, subject or credential is logged or embedded.
- A JWT issued for the broad administration application is explicitly rejected
  by the publication authenticator.
- Missing or invalid publication AUD configuration remains fail-closed.
- No Cloudflare, EasyPanel, queue, worker, SFTP or publication mutation was
  performed by this ticket.

## Git

- Branch: `codex/CDX-20260902-009-publication-access-audience`
- Commit/PR: pending at report creation

## Follow-up

CDX-20260902-010 must create a path-specific Cloudflare Access application,
attach human-admin and Service Auth policies, set the resulting AUD in
EasyPanel, verify deployment and execute the backfill only if the fresh preview
still matches the explicitly authorized plan hash.
