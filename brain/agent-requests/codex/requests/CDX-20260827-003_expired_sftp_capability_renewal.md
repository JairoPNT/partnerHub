# CDX-20260827-003 — Expired SFTP capability renewal

Owner: Codex
Model tier: Balanced
Dependency: CDX-20260827-002 production outcome `APPLIED`

## Single outcome

Archive the exact expired SFTP capability used by CDX-20260827-001 through a
read-only PREVIEW and separately authorized guarded APPLY, leaving its probe
manifest reusable for a new capability probe.

## Allowed files/modules

- `Dockerfile`
- `app/web/package.json`
- `app/web/scripts/jairo-business-sftp-capability-renewal.mjs`
- `app/web/scripts/jairo-business-sftp-capability-renewal.test.mjs`
- This request and its matching report

## Excluded files/modules

- UI and frontend components
- Partner sources and generated packages
- PublishingTarget, DNS, SSL and provider APIs
- SFTP connection, remote paths and publication
- Master Business package and canonical templates

## Required behavior

- PREVIEW is read-only and validates the exact capability hash, probe manifest,
  target/connection binding, verified cleanup evidence and expiration.
- APPLY requires exact mode, confirmation and reviewed plan hash.
- Preserve the expired capability byte-for-byte in an immutable local archive.
- Remove it from the active input only through an owned local claim and guarded
  rename; restore it on any pre-commit failure.
- Return the next provider-free SFTP probe PREVIEW after archival.
- Never connect to SFTP or mutate the PublishingTarget or generated packages.

## Verification

- Focused tests cover PREVIEW, unexpired/drift blocking, authorization, archive,
  idempotency and collision behavior.
- Focused ESLint, regression tests, production build and diff-check.

## Parallel safety

Not parallel-safe with other Docker/package.json or Business publication
maintenance changes. Parallel-safe with documentation-only tickets outside
the allowed files.

## Integration note

After deployment and authorized archival, Jairo reviews and authorizes the
fresh SFTP probe plan. CDX-20260827-001 then resumes package preparation.
