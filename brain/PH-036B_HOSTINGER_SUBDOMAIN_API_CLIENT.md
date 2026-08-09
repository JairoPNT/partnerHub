# PH-036B - Hostinger subdomain API client

Status: Completed
Date: 2026-08-07
Owner: Codex
Model tier: Balanced

## Objective

Implement a narrow, testable Hostinger API client that can inspect and create one website subdomain without connecting the operation to onboarding, DNS, publication, UI, or production.

## Provider contract

Official Hostinger API endpoints:

- `GET /api/hosting/v1/accounts/{username}/websites/{domain}/subdomains`
- `POST /api/hosting/v1/accounts/{username}/websites/{domain}/subdomains`

Reference: `https://developers.hostinger.com/` OpenAPI version 1.30.0, consulted 2026-08-07.

The POST operation uses an isolated document root by sending:

```json
{
  "subdomain": "producto",
  "directory": null,
  "is_using_public_directory": false
}
```

## Scope

- Environment-backed configuration with a bearer token.
- Get/list subdomains for one parent website.
- Ensure one subdomain with get-before-create idempotency.
- Reject an existing hostname whose parent or root directory conflicts.
- Normalize provider authentication, rate-limit, validation, and generic errors.
- Dependency-injected fetch and mocked tests.

## Explicit exclusions

- No API route.
- No dashboard action.
- No Cloudflare or DNS calls.
- No orchestration or persisted PublishingTarget.
- No SFTP upload or public verification.
- No live Hostinger mutation.
- No Prisma change.

## Acceptance criteria

- [x] Existing matching subdomain returns success without POST.
- [x] Missing subdomain executes one POST and confirms the created resource with GET.
- [x] Invalid token produces a stable authentication error.
- [x] Provider failure exposes a safe error code and optional correlation ID, never the token.
- [x] Conflicting root directory is rejected without mutation.
- [x] Tests and production build pass.

## Verification

- `npm.cmd run test:hostinger`: 5/5 passing.
- Targeted ESLint for the client and its tests: passing with zero warnings.
- `npm.cmd run build`: passing, 30 routes generated.
- Global lint remains blocked by 5 errors and 30 warnings in pre-existing frontend files outside PH-036B; this ticket did not modify those files.
- No live Hostinger request or mutation was executed.

## Result

The client is dependency-injected and not exposed through an API route. It supports list, find, and idempotent ensure behavior for Hostinger's default isolated subdomain document root. Provider conflicts stop safely without POST.
