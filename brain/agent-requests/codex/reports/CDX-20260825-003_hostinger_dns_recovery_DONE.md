# CDX-20260825-003 — DONE

- Request: CDX-20260825-003_hostinger_dns_recovery
- Result: corrected the Hostinger DNS adapter from the unsupported `/records` + POST contract to the official zone `GET/PUT /api/dns/v1/zones/{domain}` contract.
- Write behavior: `overwrite:false`, one A-record zone entry, followed by mandatory GET/readback before returning CREATED.
- Recovery diagnostic: added an app-owned, read-only command for the retained Jairo Business target/claim/journal. It never calls providers, never writes and never emits the claim token.
- Production: no diagnostic, resume, APPLY, DNS or provider operation executed by this ticket.

## Files

- `app/web/server/integrations/hostingerDnsClient.ts`
- `app/web/server/integrations/hostingerDnsClient.test.ts`
- `app/web/scripts/jairo-business-provisioning-recovery-diagnostic.mjs`
- diagnostic test, package scripts and Docker transport
- request/report documentation

## Verification

- Hostinger-only suite: PASS 26/26.
- Guarded provisioning regression: PASS 12/12.
- Recovery diagnostic: PASS 1/1.
- Focused ESLint: PASS, zero warnings.
- Next.js build: PASS; pre-existing workspace/NFT warning only.
- Bundled in-process runtime: PASS; official zone path present and legacy `/records` path absent.
- `git diff --check`: PASS.

## Next gate

After merge/deploy, execute only `npm run maintenance:jairo-business-provisioning-recovery-diagnostic`. Review the structured output before implementing or authorizing a guarded resume. Do not delete the retained claim/target and do not rerun APPLY.
