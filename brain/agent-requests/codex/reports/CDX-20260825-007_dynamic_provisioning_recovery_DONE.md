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
