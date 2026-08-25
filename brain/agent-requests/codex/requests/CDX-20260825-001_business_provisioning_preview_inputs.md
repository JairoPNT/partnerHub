# CDX-20260825-001 — Business provisioning PREVIEW inputs

## Owner

Codex (Backend Lead).

## Scope

Provide one app-owned maintenance command that reuses the exact, previously audited Jairo entitlement snapshot, creates the provisioning input package atomically, and executes only the guarded provisioning PREVIEW.

## Allowed files/modules

- New focused maintenance script and tests under `app/web/scripts/`.
- `app/web/package.json`, `Dockerfile`.
- This request and matching report.

## Excluded

- APPLY and provider calls.
- Cloudflare Access, cookies, service tokens, UI/frontend, DNS, SFTP and publication.
- Reconstruction of entitlement from grants, leads or memory.
- Changes to the guarded provisioning contract.

## Dependencies

- CDX-013 merged/deployed.
- Approved source hash `795ede...`.
- Approved entitlement bytes/hash from CDX-20260821-013: `da4162...`.

## Acceptance

- One short, non-interactive command; no pasted JSON, URL, heredoc or shell feature dependency.
- Exact allowlist and hashes are compiled into the script.
- Existing non-empty staging, final input, target or provisioning audit blocks without cleanup.
- Absent staging or an existing empty staging is accepted.
- Writes only entitlement + manifest under fixed provisioning inputs, then atomic local rename.
- Executes PREVIEW with `changed:false` and never calls provider.
- Tests, ESLint, build and diff-check pass.
