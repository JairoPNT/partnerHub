# CDX-20260826-004 — SFTP runtime dependency packaging

## Owner

Codex — Backend Lead.

## Objective

Package the guarded SFTP capability probe and ecosystem publisher as self-contained production maintenance entrypoints so the Docker runner does not depend on omitted workspace `node_modules`.

## Scope

- Bundle both SFTP maintenance entrypoints and their locked runtime dependency graph during the existing builder stage.
- Preserve direct-execution and import behavior for the source and bundled entrypoints.
- Add a packaging regression that rejects unresolved non-Node runtime imports and duplicate CLI execution.

## Excluded scope

- No SFTP connection, remote mutation, capability evidence, publication or provider operation.
- No credential, manifest, target or production data changes.
- No dependency version changes.

## Dependency

Production PROBE for approved plan `c7bed2e...` failed before adapter creation because the runner could not resolve `ssh2-sftp-client`.

## File boundaries

Docker packaging, the two SFTP CLI direct-execution guards, one focused packaging test, package test command, and this request/report.
