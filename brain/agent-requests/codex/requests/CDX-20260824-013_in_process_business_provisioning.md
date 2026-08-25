# CDX-20260824-013 — In-process Business provisioning

## Owner

Codex (Backend Lead).

## Scope

Replace the EasyPanel maintenance command's Cloudflare-protected HTTP callback with a bundled, in-process adapter to the existing supported provisioning service. Preserve the guarded PREVIEW/APPLY contract and fail closed before provider mutation when APPLY configuration is incomplete.

## Allowed files/modules

- `app/web/scripts/jairo-business-guarded-provisioning.mjs`
- its focused tests
- `app/web/server/runtime/jairoBusinessInProcessProvisioner.ts` and focused tests
- `Dockerfile`
- `app/web/package.json` and lockfile only for the runtime bundler
- this request and matching DONE report

## Excluded

- UI/frontend
- entitlement/auth contracts
- provider APIs or database schemas
- production data, DNS, SFTP and publication
- the paused CDX-012 worktree

## Dependencies

- CDX-007 and CDX-008 merged.
- Existing `subdomainProvisioningService`, Hostinger client and Cloudflare DNS client remain authoritative.

## Parallel safety

Not safe with another task editing provisioning scripts, Docker runtime packaging, or the same provider integrations.

## Acceptance

- PREVIEW performs no import/provider call and remains independent from APPLY secrets.
- APPLY imports only the compiled runtime path, calls the supported service in process, and receives the exact final target.
- Runtime derives IPv4 only from `PARTNERHUB_PROVISIONING_IPV4` and uses existing provider configuration helpers.
- Missing/invalid APPLY configuration blocks before claim/provider.
- Focused tests, provisioning regressions, ESLint, build and diff-check pass.
- No production operation is executed.
