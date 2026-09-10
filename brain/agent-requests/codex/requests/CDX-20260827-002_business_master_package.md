# CDX-20260827-002 — Guarded Business master package

Owner: Codex  
Model tier: Balanced  
Dependency: CDX-20260827-001 and production evidence `BUSINESS_MASTER_PACKAGE_MISSING`

## Single outcome

Create the missing local `ganomaster-business` package deterministically from
the canonical Business template through a read-only PREVIEW and a separately
authorized guarded APPLY.

## Allowed files/modules

- `Dockerfile`
- `app/web/package.json`
- `app/web/scripts/jairo-business-master-package.mjs`
- `app/web/scripts/jairo-business-master-package.test.mjs`
- This request and its matching report

## Excluded files/modules

- UI and frontend components
- Partner, Product or Personal Brand sources/packages
- PublishingTarget, DNS, SSL, SFTP publication and provider APIs
- Payments, entitlement, database and authentication contracts
- Canonical Business template content

## Required behavior

- PREVIEW is read-only and reports a deterministic plan hash.
- Validate the canonical Business template identity and empty master contact/CTA
  fields before planning.
- Bind the canonical template inventory, destination state and deterministic
  expected package hash into the plan.
- APPLY requires exact mode, confirmation and reviewed plan hash.
- Install only `/data/generated-sites/ganomaster-business` through an owned
  claim, private sibling staging directory and atomic rename.
- Preserve an exact existing valid package as `ALREADY_APPLIED`; block any
  destination or journal drift.
- Package the canonical Business runtime assets in the production image.
- Never call SFTP, Hostinger, DNS, HTTPS or another provider.

## Verification

- Focused tests cover PREVIEW, authorization, apply, idempotency, drift,
  invalid canonical config and claim collision.
- Focused ESLint, Docker runtime asset check, production build and diff-check.

## Parallel safety

Parallel-safe with documentation-only work that does not edit the allowed
files. Not parallel-safe with other Docker/package.json or publication
maintenance changes.

## Integration note

After deployment and authorized APPLY, CDX-20260827-001 must obtain a fresh
SFTP capability and rerun `PACKAGE_PREPARATION_PREVIEW`; this ticket does not
prepare or publish Jairo's partner package.
