# CDX-20260826-002 — Jairo Business SFTP capability PREVIEW

## Owner

Codex — Backend Lead.

## Objective

Replace the previous multi-step operator runbook with one app-owned command that atomically prepares and previews the isolated SFTP sibling-rename capability probe for the now-provisioned Jairo Business target.

## Allowed scope

- Read and validate the exact `READY/PENDING` PublishingTarget v2.
- Create or safely reuse one fixed local manifest directory.
- Generate random probe token/canary and four sibling paths outside the real target.
- Execute PREVIEW only, without creating an SFTP adapter or provider call.
- Return the reviewable plan hash and non-secret connection binding.

## Excluded scope

- No SFTP connection, remote write, capability PROBE, publication, DNS, provisioning or source mutation.
- No shell heredocs, cookies, secrets or operator-supplied paths.

## Dependencies

- CDX-20260826-001 merged and deployed.
- Production recovery completed with target `READY/PENDING`, remote root present and terminal journal.
- CDX-20260824-006 probe contract already merged and deployed.

## File boundaries

Allowed: one new preparation script/test, package/Docker transport, production checkpoint documentation and this request/report.

Excluded: frontend, database, auth, payments, provider clients and publication implementation.

## Parallel safety

Not parallel-safe with another ticket editing SFTP capability inputs for Jairo Business. Safe beside unrelated frontend or payment tickets.
