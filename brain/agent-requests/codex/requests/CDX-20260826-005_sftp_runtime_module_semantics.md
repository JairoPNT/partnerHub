# CDX-20260826-005 — SFTP runtime module semantics

## Owner

Codex — Backend Lead.

## Objective

Replace the incompatible SFTP bundle with an isolated, lockfile-pinned production dependency tree that preserves the CommonJS module semantics required by `ssh2`.

## Scope

- Install exactly `ssh2-sftp-client@12.1.1` and its required dependency closure in a dedicated Docker stage.
- Omit development and optional dependencies and disable install scripts.
- Copy the isolated dependency tree under `/app/scripts/node_modules`, separate from the Next.js standalone runtime.
- Restore the original unbundled maintenance scripts and direct-execution guards.
- Execute a non-connecting module-load/instantiation smoke test during image build.
- Correct the operational record for CDX-004.

## Excluded scope

- No SFTP connection, remote mutation, capability evidence or publication.
- No credential, manifest, target or production data changes.
- No application dependency upgrades.

## Dependency

The post-CDX-004 production PROBE failed during `ssh2` module initialization with `__dirname is not defined`; the bundle was incompatible with library path semantics. The approved plan was not executed remotely.

## File boundaries

Docker packaging, isolated SFTP runtime manifest/lock/smoke, restoration of the two CLI guards, focused packaging test, CDX-004 correction note, and this request/report.
