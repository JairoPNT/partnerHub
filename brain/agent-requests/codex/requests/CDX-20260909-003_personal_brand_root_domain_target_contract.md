# CDX-20260909-003 — Personal Brand root-domain target contract

## Owner

Codex (Backend Lead Engineer)

## Single outcome

Replace the subdomain-only partner hostname assumption with a deterministic
route contract in which Personal Brand can own the partner apex and Product /
Business retain their fixed subdomains.

## Allowed areas

- Backend hostname, target-resolution, provisioning-contract, and publication
  identity modules with focused tests.
- This request, the approved architecture spec, and completion report.

## Excluded areas

- React, Tailwind, visual templates, UX, or identity-design implementation.
- DNS, Hostinger, Cloudflare, SFTP, EasyPanel, remote publication, and
  production data mutation.
- New commercial ecosystem implementation beyond the three existing types.

## Dependencies

- CDX-20260909-002 readiness diagnostic.
- Approved routing policy from Jairo on 2026-09-09.

## Parallel-safe with

- An Antigravity visual-identity request that does not touch backend route,
  provisioning, publication, or target modules.

## Integration notes

The contract must keep current target identities stable. A later ticket owns
Personal Brand master-package preparation; another later, explicitly approved
operation owns DNS/SFTP/publication.
