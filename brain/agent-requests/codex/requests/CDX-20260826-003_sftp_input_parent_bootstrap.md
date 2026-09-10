# CDX-20260826-003 — SFTP input parent bootstrap

## Owner

Codex — Backend Lead.

## Objective

Make the app-owned Jairo Business SFTP capability PREVIEW create its fixed local input parent when that directory is absent in production.

## Scope

- Create only the configured local input parent with restrictive permissions.
- Preserve all target validation, staging collision and manifest safety gates.
- Add a regression test for the production condition.

## Excluded scope

- No SFTP connection, provider call, remote mutation, capability PROBE or publication.
- No cleanup or overwrite of existing inputs.

## Dependency

CDX-20260826-002 production attempt failed before staging creation with `ENOENT` because the fixed parent was absent; `providerCallsMade:false`.

## File boundaries

Only the preparation script/test and this request/report.
