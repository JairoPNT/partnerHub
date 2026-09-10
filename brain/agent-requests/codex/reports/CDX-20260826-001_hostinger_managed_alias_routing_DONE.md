# CDX-20260826-001 — DONE

Implemented a fail-closed Hostinger-managed ALIAS routing contract for subdomain provisioning.

## Result

- One exact `ALIAS` entry is accepted only when it has exactly one enabled record, zero disabled records and no additional entry at the hostname.
- An accepted ALIAS produces `HOSTINGER_ALIAS` and makes no DNS write.
- Existing and newly created `A` records retain the `DIRECT_A` contract.
- CNAME, AAAA, TXT, disabled, multiple, mixed and malformed hostname occupancy remains blocked.
- ALIAS readiness requires at least one public IPv4 answer plus HTTPS status 2xx/3xx served by Hostinger CDN (`hcdn`).
- The exact Hostinger subdomain identity and provider-derived remote root remain mandatory before DNS readiness.
- No DNS deletion, overwrite, SFTP, publication, apex, Product or Brand mutation was added.

## Files

- `app/web/server/integrations/hostingerDnsClient.ts`
- `app/web/server/integrations/hostingerDnsClient.test.ts`
- `app/web/server/services/subdomainProvisioningService.ts`
- `app/web/server/services/subdomainProvisioningService.test.ts`
- request and this report

## Verification

- Hostinger-only integration/service suite: PASS 31/31.
- Dynamic recovery regression: PASS 5/5.
- Guarded provisioning regression: PASS 12/12.
- Focused ESLint `--no-ignore --max-warnings=0`: PASS.
- Next.js production build: PASS, 36 routes; pre-existing workspace/NFT warning only.
- In-process provisioning runtime esbuild bundle: PASS.
- `git diff --check`: PASS.

## Delivery and production gate

- Branch: `codex/CDX-20260826-001-hostinger-managed-alias-routing`.
- Production recovery was not executed from this ticket.
- After merge/deploy, rerun the dynamic recovery PREVIEW because the retained target hash changed during the previous failed attempt.
- A new exact plan hash and explicit CEO authorization are required before recovery APPLY.

## Remaining risk

SFTP capability and Business package publication remain separate gated tickets after provisioning reaches `READY/PENDING`.
