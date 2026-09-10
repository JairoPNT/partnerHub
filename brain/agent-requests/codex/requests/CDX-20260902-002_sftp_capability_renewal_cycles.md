# CDX-20260902-002 — SFTP capability renewal cycles

Owner: Codex
Model tier: Balanced
Dependency: CDX-20260902-001 merged and deployed; production renewal PREVIEW
blocked by an active/archive collision and a stale fixed capability hash

## Single outcome

Allow the guarded Jairo Business SFTP capability renewal command to archive
successive expired, validated capabilities without treating immutable archives
from earlier cycles as collisions.

## Allowed files/modules

- `app/web/scripts/jairo-business-sftp-capability-renewal.mjs`
- `app/web/scripts/jairo-business-sftp-capability-renewal.test.mjs`
- This request and its matching report

## Excluded files/modules

- SFTP probe execution and remote filesystem operations
- Generated publication inputs, capabilities and archives
- PublishingTarget, partner sources and generated packages
- Hostinger, DNS, SSL, EasyPanel and provider clients
- UI, React, Tailwind, database, auth, payments and entitlements

## Required behavior

- Derive the reviewed capability hash from the current active evidence instead
  of a build-time constant.
- Bind the plan hash to the exact active bytes, validated scope, connection,
  probe manifest and expiry.
- Store every archived capability under its own immutable content hash.
- Ignore valid archives from earlier hashes when a different active capability
  is reviewed, while blocking a duplicate active/archive hash collision.
- Preserve guarded mode, confirmation, exact plan hash, claim ownership,
  rollback and provider-free PREVIEW behavior.
- Keep APPLY idempotent by validating the journal and archived bytes for the
  exact previously authorized plan.

## Verification

- Focused renewal tests, including two complete renewal cycles.
- Regression for coexistence with the historical CDX-20260827-003 archive.
- Collision, hash drift, freshness, authorization and idempotency tests.
- Focused ESLint, production build and `git diff --check`.

## Parallel safety

Not parallel-safe with work editing the SFTP capability renewal script or its
test. Parallel-safe with frontend and unrelated backend tickets.

## Integration note

After merge/autodeploy, run a new provider-free renewal PREVIEW. Archiving the
expired capability and executing the next SFTP probe remain separately gated.
