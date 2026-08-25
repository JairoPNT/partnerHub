# CDX-20260825-002 — DONE

## Result

Corrected supported provisioning to use Hostinger DNS for `jairopinto.pro`, whose authoritative nameservers are Hostinger-managed. Both the internal API and the in-process maintenance runtime now inject the existing `HostingerDnsClient`.

## Changes

- Removed Cloudflare DNS client injection from provisioning.
- Hostinger DNS uses `HOSTINGER_API_TOKEN` and optional `HOSTINGER_API_BASE_URL`.
- Removed `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ZONE_ID` from guarded APPLY readiness.
- Cloudflare Access authentication remains independent and unchanged.

## Files

- `app/web/app/api/internal/publishing-targets/route.ts`
- `app/web/server/runtime/jairoBusinessInProcessProvisioner.ts`
- `app/web/scripts/jairo-business-guarded-provisioning.mjs`
- focused guarded test
- request/report CDX-20260825-002

## Verification

- Guarded provisioning: PASS 12/12.
- Hostinger-only DNS/subdomain/provisioning/resolver: PASS 26/26.
- Provisioning API: PASS 3/3.
- Total: PASS 41/41.
- Focused ESLint: PASS.
- Next.js build: PASS, 36 routes; pre-existing workspace/NFT warning only.
- `git diff --check`: PASS.

## Operational status

No EasyPanel command, APPLY, provider request, DNS change, SFTP or publication was executed.

## Next gate

Merge/deploy, then rerun only guarded PREVIEW against the already-created manifest. Expected APPLY readiness is true using the existing Hostinger credentials and configured authoritative IPv4. Readiness does not enter plan material, so the previously reviewed planHash should remain stable; exact output must still be reviewed before APPLY.
