# PH-036C - Cloudflare DNS client

Status: Completed
Date: 2026-08-07
Owner: Codex
Model tier: Balanced

## Objective

Implement a narrow Cloudflare DNS client that can inspect and create one DNS-only `A` record without connecting it to Hostinger, provisioning orchestration, UI, publication, or production.

## Provider contract

- `GET /client/v4/zones/{zone_id}/dns_records?type=A&name={hostname}`
- `POST /client/v4/zones/{zone_id}/dns_records`

Reference: official Cloudflare DNS API documentation consulted 2026-08-07.

## Scope

- Environment-backed API token and zone ID.
- Exact lookup of one `A` record.
- Get-before-create idempotency.
- DNS-only creation (`proxied: false`) with automatic TTL.
- Conflict detection without update or delete.
- Safe provider error normalization.
- Dependency-injected fetch and mocked tests.

## Explicit exclusions

- No DNS record update or deletion.
- No proxied records.
- No Hostinger client orchestration.
- No API route or dashboard action.
- No persisted PublishingTarget.
- No live Cloudflare request or mutation.
- No Prisma, publication, or verification changes.

## Acceptance criteria

- [x] Existing exact `A` record returns success without POST.
- [x] Missing record executes one POST with `proxied: false`.
- [x] Conflicting content, proxy mode, duplicate records, or another record type stops without mutation.
- [x] Authentication and provider errors never expose the token.
- [x] Invalid response envelopes fail safely.
- [x] Tests, targeted lint, and production build pass.

## Verification

- `npm.cmd run test:dns`: 6/6 passing.
- Targeted ESLint for the client and its tests: passing with zero warnings.
- `npm.cmd run build`: passing, 30 routes generated.
- No live Cloudflare request or mutation was executed.

## Result

The client is dependency-injected and not exposed through an API route. It performs an exact hostname lookup before creation, creates only DNS-only `A` records, and refuses to mutate when the hostname is occupied by different content, a proxied record, multiple records, or another DNS record type.
