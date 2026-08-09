# PH-038A - Domain inventory read model API

Status: Completed
Date: 2026-08-07
Owner: Codex
Model tier: Balanced

## Objective

Expose one truthful, read-only inventory for the Domains module without live DNS checks or invented partner subdomains.

## Scope

- `GET /api/internal/domains`, protected by PH-036G Cloudflare Access validation.
- Three canonical master domain entries.
- Legacy partner domains only when an active linked lead has a configured root domain.
- Explicit partner subdomains only when a PublishingTarget exists.
- Separate assignment, provisioning, hosting, DNS, SSL, publication, and verification fields.
- Safe partner identity limited to internal ID, full name, and brand name.

## Explicit exclusions

- No live DNS, HTTPS, Cloudflare, Hostinger, or SFTP operation.
- No arbitrary hostname input.
- No POST, provisioning, publication, frontend, or registrar guidance.
- No email, phone, owner key, remote path, provider record ID, or raw provider response.

## Acceptance criteria

- [x] Exactly three canonical master entries are present.
- [x] Missing partner subdomains are not invented.
- [x] Legacy and explicit-target entries remain distinguishable.
- [x] Operational states are not collapsed into one misleading status.
- [x] Orphan targets remain visible without leaking ownership/infrastructure details.
- [x] Access validation runs before inventory reads.
- [x] Focused tests, targeted lint, and production build pass.

## Verification

- `npm.cmd run test:domain-inventory`: 3/3 tests passed.
- Targeted ESLint for the builder, test, service, route, and target-store change: passed.
- `npm.cmd run build`: passed with the pre-existing workspace lockfile and NFT trace warnings.
- No live DNS, HTTPS, Cloudflare, Hostinger, SFTP, or production operation was executed.
