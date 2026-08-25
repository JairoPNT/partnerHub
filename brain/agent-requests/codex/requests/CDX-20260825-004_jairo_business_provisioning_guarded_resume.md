# CDX-20260825-004 — Jairo Business guarded provisioning resume

- Owner: Codex
- Scope: produce a read-only PREVIEW and separately guarded resume for the exact retained target/claim from CDX-007.
- Allowed: one maintenance script/test, Docker/package transport, request/report.
- Excluded: automatic execution, cleanup, publication, SFTP, UI, other partners.
- Dependency: CDX-003 diagnostic and target hash `030014...12eca`.
- Integration: deploy, run PREVIEW only, audit planHash, request explicit authorization before RESUME.
