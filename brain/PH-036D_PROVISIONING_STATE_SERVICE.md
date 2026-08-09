# PH-036D - Provisioning state service

Status: Completed
Date: 2026-08-07
Owner: Codex
Model tier: Balanced

## Objective

Coordinate the PH-036B Hostinger client and PH-036C Cloudflare client behind explicit confirmation, persist resumable per-target state, and observe DNS/HTTPS readiness without publishing files.

## Scope

- File-backed PublishingTarget store with atomic writes.
- Explicit immutable ownership, ecosystem, hostname, and site identity.
- `PROVISION_SUBDOMAIN` confirmation gate.
- Hostinger then DNS orchestration using injected clients.
- DNS and HTTPS readiness probes.
- Resumable FAILED, DNS_PENDING, and SSL_PENDING states.
- Safe stable error codes without provider secrets or raw responses.
- Mocked tests only.

## Explicit exclusions

- No API route, dashboard button, or Antigravity request.
- No live Hostinger, Cloudflare, DNS, or HTTPS operation.
- No SFTP publication or public page verification.
- No Prisma or migration.
- No automatic delete, rollback, update, or overwrite at either provider.

## Acceptance criteria

- [x] Missing confirmation prevents all provider calls.
- [x] A complete mocked run reaches READY and is persisted.
- [x] DNS/SSL pending states can resume safely.
- [x] A provider failure persists FAILED with a safe error code and can retry.
- [x] Immutable target conflicts stop before provider mutation.
- [x] One owner cannot receive two active targets for the same ecosystem.
- [x] Tests, targeted lint, and production build pass.

## Verification

- `npm.cmd run test:provisioning`: 5/5 tests passed.
- Targeted ESLint for the service and its tests: passed.
- `npm.cmd run build`: passed with the pre-existing workspace lockfile and NFT trace warnings.
- No provider, DNS, HTTPS, SFTP, or production mutation was executed.
