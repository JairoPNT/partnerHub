# PH-036F - Provisioning API contract

Status: Completed
Date: 2026-08-07
Owner: Codex
Model tier: Balanced

## Objective

Expose the stable provisioning service through one narrowly protected internal API contract suitable for a later Antigravity server-side integration.

## Contract

- `GET /api/internal/publishing-targets`
- `GET /api/internal/publishing-targets?siteId=<siteId>`
- `POST /api/internal/publishing-targets`
- Authentication was initially delivered as a service bearer boundary and was superseded by PH-036G Cloudflare Access JWT validation before frontend handoff.
- POST infrastructure address comes only from server-side `PARTNERHUB_PROVISIONING_IPV4`.
- POST body: `ownerKey`, `siteId`, `ecosystemType`, `baseDomain`, and exact confirmation `PROVISION_SUBDOMAIN`.
- Responses omit owner keys, provider record IDs, remote roots, tokens, and raw provider messages.

## Explicit exclusions

- No UI, browser token storage, or Antigravity implementation.
- No live provider calls or production provisioning.
- No publish action and no combined provision/publish endpoint.
- No Prisma or authentication-system replacement.

## Acceptance criteria

- [x] Missing or incorrect authorization returns 401 (superseded by PH-036G Access JWT validation).
- [x] Safe DTO omits ownership and infrastructure details.
- [x] Server, not request body, supplies the target IPv4.
- [x] Validation, conflict, provider, and unknown failures use stable safe responses.
- [x] Focused contract tests, targeted lint, and production build pass.

## Verification

- `npm.cmd run test:provisioning-api`: 4/4 tests passed.
- Targeted ESLint for the route, contract, and tests: passed.
- `npm.cmd run build`: passed with the pre-existing workspace lockfile and NFT trace warnings.
- No production secret was configured and no provider or infrastructure request was executed.

## Frontend handoff gate

PH-036G selected Cloudflare Access as the dashboard identity boundary. The provisioning API now validates the signed Access assertion at the origin; no infrastructure bearer is sent to browser code.
