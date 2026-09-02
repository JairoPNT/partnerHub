# CDX-20260902-003 — Generic guarded publication service — DONE

## Request ID

`CDX-20260902-003`

## Outcome

The guarded publication planner/executor is no longer compiled for the Jairo
Business identity. It now accepts one strictly validated partner publication
manifest for `PRODUCT`, `BUSINESS` or `PERSONAL_BRAND` and preserves the same
fail-closed publication protocol that was verified with Jairo Business.

This ticket does not add a route, UI, queue, scheduler or production mutation.

## Changes

- Removed the hard-coded Jairo owner/site/domain allowlist.
- Added canonical partner identity validation:
  - UUID owner key;
  - lowercase owner/site slugs;
  - owner-to-site naming contract;
  - exact ecosystem enum;
  - canonical partner hosts `producto.`, `negocio.` and `brand.`.
- Added generic source/package identity checks for all three ecosystems.
- Preserved the stricter Business VSL, poster and WhatsApp-only CTA checks.
- Bound owner, base domain and every protected sibling artifact hash into the
  authorized `planHash`.
- Kept exact source, target, package, capability and remote-baseline hashes.
- Preserved PublishingTarget v2 `remoteRoot` isolation, SFTP host-key binding,
  exclusive claims, sibling staging, two-rename commit, rollback, HTTPS
  verification, final journal and idempotent replay.
- Added explicit regression coverage that PREVIEW output does not expose SFTP
  username or password.

## Files modified

- `app/web/scripts/guarded-ecosystem-publication.mjs`
- `app/web/scripts/guarded-ecosystem-publication.test.mjs`
- `brain/agent-requests/codex/requests/CDX-20260902-003_generic_guarded_publication_service.md`
- `brain/agent-requests/codex/reports/CDX-20260902-003_generic_guarded_publication_service_DONE.md`

## Verification

- Guarded publication tests: **23/23 PASS**.
- PRODUCT guarded APPLY simulation: **PASS**.
- PERSONAL_BRAND guarded APPLY simulation: **PASS**.
- Existing Jairo Business guarded publication and rollback/idempotency suite:
  **PASS**.
- Focused ESLint with zero warnings: **PASS**.
- Next.js production build: **PASS**.
- `git diff --check`: **PASS**.

The build emitted the existing Turbopack NFT tracing warning for the internal
preview route; compilation, TypeScript and static generation completed.

## Branch

`codex/CDX-20260902-003-generic-guarded-publication-service`

Base: `origin/main` at `e8c5ff120e2e3d8e741f987cbb37a99ee7c9a30b`.

Commit and PR are recorded after creation.

## Security and residual risks

- No secrets, generated packages, PublishingTargets, SFTP capabilities or
  remote files were changed by this ticket.
- The publisher remains an operator-facing maintenance primitive until a
  durable job/orchestration layer owns manifest preparation and authorization.
- Capability renewal remains required by the current short-lived evidence
  policy; a later ticket may automate renewal without weakening host-key and
  scope validation.
- Production merge now triggers EasyPanel autodeploy and therefore requires an
  explicit integration decision after PR review.

## Follow-up

Required: `CDX-20260902-004` should implement durable PublicationJobs and use
this generic planner/executor. A separate backfill ticket should enqueue active
clients only after the job contract is audited. Frontend controls remain an
Antigravity-owned request.
