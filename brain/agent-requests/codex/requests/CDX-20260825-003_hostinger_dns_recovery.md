# CDX-20260825-003 — Hostinger DNS recovery

- Owner: Codex
- Scope: correct the Hostinger DNS adapter to the official zone contract and add a read-only diagnostic for the retained Jairo Business provisioning claim/target.
- Allowed: Hostinger DNS integration/tests, one diagnostic maintenance command, Docker/package wiring, request/report.
- Excluded: production writes, claim cleanup, provisioning resume/APPLY, publication, DNS execution, UI.
- Dependency: CDX-20260825-002 and retained fail-closed state from plan `7c3c7447792130c8380c5c4c1587b90418e6f609b17db642be8a8103dd78eccf`.
- Parallel-safe: no active ticket may edit the same integration or provisioning maintenance modules.
- Integration: deploy first; run only the diagnostic; design an explicit guarded resume after reviewing its output.

## Acceptance

- DNS uses `GET/PUT /api/dns/v1/zones/{domain}` with `overwrite:false` and readback verification.
- No `/records` suffix or per-record POST.
- Diagnostic performs no writes/provider calls and redacts the claim owner token.
- No automatic cleanup or retry.
