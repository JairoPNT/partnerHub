# PH-036E - Publication target integration

Status: Completed
Date: 2026-08-07
Owner: Codex
Model tier: Balanced

## Objective

Use a provisioned PublishingTarget for SFTP destination and public verification while preserving the current publication behavior for legacy pages without a target.

## Scope

- Resolve the explicit target by `siteId` before upload.
- Allow explicit targets only when `provisioningState` is `READY`.
- Use the target's persisted `remoteRoot` for SFTP publication.
- Use the target's `publicHost` for public verification.
- Preserve the legacy resolver when no PublishingTarget exists.
- Add focused resolver tests without live SFTP, DNS, HTTPS, or provider operations.

## Explicit exclusions

- No provisioning endpoint or dashboard action.
- No frontend or Antigravity request.
- No provider mutation or live publication.
- No changes to generation, Prisma, auth, or activation-lead ownership.

## Acceptance criteria

- [x] A legacy site without a target retains its resolved remote root.
- [x] A READY target uses its isolated remote root and public host.
- [x] A non-READY target is blocked before SFTP connection.
- [x] An invalid READY target is rejected safely.
- [x] Public verification prefers the explicit target hostname.
- [x] Focused tests, targeted lint, and production build pass.

## Verification

- `npm.cmd run test:publication-target`: 5/5 tests passed.
- Targeted ESLint for all touched services and the focused test: passed.
- `npm.cmd run build`: passed with the pre-existing workspace lockfile and NFT trace warnings.
- No SFTP connection, provider call, DNS request, live HTTPS verification, or production mutation was executed.
