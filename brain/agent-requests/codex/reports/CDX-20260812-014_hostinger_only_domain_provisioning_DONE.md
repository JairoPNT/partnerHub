# CDX-20260812-014 — Hostinger-only domain provisioning — DONE

## Request ID

`CDX-20260812-014`

## Summary

Implemented the backend provisioning core for partner domains using Hostinger hosting and Hostinger DNS contracts only. No provider call was executed during development; all behavior was verified through injected mock clients.

The persisted target schema is version 2 and records `rootEcosystemType`, ecosystem identity, public hostname, the exact `root_directory` returned by Hostinger, hosting/DNS/SSL/publication states, safe error codes, and timestamps.

Routing contract:

- Plan 360: root → `PERSONAL_BRAND`, `producto.<domain>` → `PRODUCT`, `negocio.<domain>` → `BUSINESS`.
- Individual PRODUCT, BUSINESS, or PERSONAL_BRAND: the selected ecosystem uses the root when it equals the persisted `rootEcosystemType`.
- `ganomaster.pro` and every hostname below it are rejected before any provider call.

No `.htaccess` routing is used. Document roots are never derived locally: root hosting uses the Hostinger website response, while subdomains use the Hostinger subdomain response.

## Files changed

- `app/web/server/integrations/hostingerSubdomainClient.ts`
- `app/web/server/integrations/hostingerSubdomainClient.test.ts`
- `app/web/server/integrations/hostingerDnsClient.ts`
- `app/web/server/integrations/hostingerDnsClient.test.ts`
- `app/web/server/services/subdomainProvisioningService.ts`
- `app/web/server/services/subdomainProvisioningService.test.ts`
- `app/web/server/services/publicationTargetResolver.ts`
- `app/web/package.json`
- `brain/agent-requests/codex/reports/CDX-20260812-014_hostinger_only_domain_provisioning_DONE.md`

## Idempotency, conflicts, and retries

- Existing matching hosting and DNS resources return `EXISTING` without mutation.
- Multiple or mismatched A records fail as conflicts without mutation.
- Hostnames outside the requested Hostinger zone are rejected.
- Immutable target identity includes owner, site, ecosystem, persisted root fallback, base domain, and public host.
- `DNS_PENDING`, `SSL_PENDING`, and `FAILED` records can be retried safely; provider `ensure` operations remain idempotent.
- Provider details and secrets are reduced to safe error codes before persistence or outward errors.

## Verification

- `npm.cmd run test:hostinger-only`: PASS, 20/20 mocked tests.
- Ticket-scoped backend ESLint with `--max-warnings=0`: PASS.
- `npm.cmd run build`: PASS.
- `git diff --check`: PASS.

The build retains the existing Turbopack workspace-root/NFT warning for the product-page preview route; it is outside this ticket and does not fail the build.

## OPS dry-run procedure for `jairopinto.pro`

This procedure belongs to follow-up `OPS-20260812-004` and must not be executed from this implementation ticket.

1. Confirm the deployed commit and a durable `PRODUCT_PAGE_SOURCE_DIR` volume. Confirm the required Hostinger server-side variables exist without printing their values.
2. Confirm `jairopinto.pro` is owned by Hostinger account `u658137804`. Do not include `ganomaster.pro` in any request or fixture.
3. Perform read-only Hostinger queries for the root website, current subdomains, and DNS zone. Capture only hostnames, returned document roots, record IDs/targets, and safe correlation IDs—never tokens or passwords.
4. Build the expected Plan 360 plan without mutations:
   - `jairo-personal-brand`: `PERSONAL_BRAND`, `rootEcosystemType=PERSONAL_BRAND`, host `jairopinto.pro`;
   - `jairo-product`: `PRODUCT`, same root fallback, host `producto.jairopinto.pro`;
   - `jairo-business`: `BUSINESS`, same root fallback, host `negocio.jairopinto.pro`.
5. Compare the read-only inventory with expected identities. Stop on any conflicting root owner, document root, duplicate A record, mismatched A target, or hostname outside `jairopinto.pro`.
6. Verify that each planned `remoteRoot` comes from a Hostinger response. If a root is absent, stop; do not synthesize `/home/...` paths and do not introduce `.htaccess` routing.
7. Run the service with mocked/in-memory mutation clients populated from the read-only responses. Confirm the projected states and exact intended create/no-op calls. This is the dry-run artifact for approval.
8. Obtain explicit CEO/OPS authorization for the exact mutation plan. Only then may `OPS-20260812-004` execute real Hostinger operations, one hostname at a time, followed by DNS and HTTPS readiness checks.
9. After any authorized execution, retry only targets persisted as `DNS_PENDING`, `SSL_PENDING`, or `FAILED`; never delete legacy records automatically.

## Branch and PR

- Branch: `codex/CDX-20260812-014-hostinger-only-domain-provisioning`
- Base: `origin/main` at `c53b3dc`.
- PR: not opened; Codex audit is required first.

## Risks and follow-up

- Real Hostinger response shapes and endpoint permissions must be confirmed read-only during OPS dry-run before mutations are authorized.
- The existing HTTP provisioning route is outside this ticket's allowed file list; OPS/integration must instantiate the Hostinger DNS client before any real run rather than the legacy Cloudflare dependency.
- Next: `OPS-20260812-004` performs the authorized read-only dry-run and, only after explicit approval, the first real provisioning for `jairopinto.pro`.
