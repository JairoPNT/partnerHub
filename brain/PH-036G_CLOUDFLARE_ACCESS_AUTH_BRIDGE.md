# PH-036G - Cloudflare Access authentication bridge

Status: Completed
Date: 2026-08-07
Owner: Codex
Model tier: Premium (authentication/security)

## Decision

Cloudflare Access is the application authentication boundary for `app.partnerhub.club`. The hostname is protected by a self-hosted Access application and reaches the origin through the proxied `partnerhub-vps-prod` Cloudflare Tunnel.

PartnerHub must still validate the `Cf-Access-Jwt-Assertion` signature, issuer, audience, algorithm, and expiration at the origin before allowing provisioning operations.

## Runtime configuration

- `CLOUDFLARE_ACCESS_TEAM_DOMAIN` — the HTTPS team origin.
- `CLOUDFLARE_ACCESS_AUD` — the Access application audience tag.
- Values remain deployment environment variables and are not embedded in source code.

## Scope

- Validate Access JWTs using Cloudflare's rotating remote JWKS.
- Cache the remote JWKS resolver in the application process.
- Protect GET and POST `/api/internal/publishing-targets`.
- Return stable authentication errors without JWT details.
- Test valid, missing, wrong-audience, and expired tokens using local test keys.

## Explicit exclusions

- No Cloudflare dashboard, policy, DNS, or Tunnel mutation.
- No custom login UI or second identity provider.
- No frontend changes or browser-held infrastructure secrets.
- No live provider or provisioning calls.

## Acceptance criteria

- [x] Missing assertion is rejected.
- [x] Invalid audience is rejected.
- [x] Expired token is rejected.
- [x] Valid signed assertion returns the Access identity.
- [x] Provisioning API validates Access before service/provider configuration.
- [x] Focused tests, targeted lint, and production build pass.

## Verification

- `npm.cmd run test:cloudflare-access`: 4/4 tests passed with locally generated RS256 keys.
- `npm.cmd run test:provisioning-api`: 3/3 safe-contract tests passed.
- Targeted ESLint: passed.
- `npm.cmd run build`: passed with the pre-existing workspace lockfile and NFT trace warnings.
- No Cloudflare, Hostinger, DNS, Tunnel, or production mutation was executed.

## Deployment gate

Production must receive `CLOUDFLARE_ACCESS_TEAM_DOMAIN` and `CLOUDFLARE_ACCESS_AUD` through its environment before this protected route is used. Neither value is embedded in source code.
