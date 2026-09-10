# CDX-20260825-007 — DONE

Implemented a guarded dynamic recovery contract for the retained Jairo Business provisioning operation.

- PREVIEW binds the current target bytes, original retained claim, source and entitlement into a new deterministic plan hash.
- APPLY remains separate and requires the exact recovery mode, confirmation and reviewed plan hash.
- Provider failures expose only a normalized provider code and numeric HTTP status; response bodies and secrets are never returned.
- Provider rejection and DNS/SSL propagation preserve the retained claim and require a fresh PREVIEW against current target bytes.
- Only a verified `READY/PENDING` target receives a terminal journal and owned-claim cleanup.
- SFTP, content publication, apex and other ecosystems remain outside scope.

Verification:

- Dynamic recovery contract: PASS 5/5.
- Original guarded resume regression: PASS 2/2.
- Guarded provisioning regression: PASS 12/12.
- Hostinger/provisioning/target regression: PASS 27/27.
- Focused ESLint `--no-ignore --max-warnings=0`: PASS.
- Next.js production build: PASS, 36 routes; pre-existing workspace/NFT warning only.
- `git diff --check`: PASS.
- Dependency audit reported 12 pre-existing findings; dependencies were not changed.

Branch: `codex/CDX-20260825-007-dynamic-provisioning-recovery`.

No EasyPanel, Hostinger write, DNS mutation, provisioning recovery, SFTP or publication was executed from this ticket.

## Production outcome — 2026-08-26

- Recovery plan: `7a21a55aa54f5c620feadc12f56ca29b70b0678d3c68d0d410daa0bbd1272ea3`.
- Outcome: `APPLIED`, `changed:true`, `blocked:false`.
- Final target hash: `1534dcf35cf7b4d7b2f6ea97aefa87a9db195545bcc7002d8eef5a3b8f04ae5b`.
- Final state: `READY/PENDING`; provider-derived remote root present.
- Retained claim removed only after terminal verification.
- Terminal journal applied at `2026-08-26T14:12:56.026Z`.
- The accepted route is the exact Hostinger-managed ALIAS contract delivered by PR #176; no ALIAS deletion or replacement occurred.
