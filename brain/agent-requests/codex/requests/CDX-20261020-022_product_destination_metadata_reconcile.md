# CDX-20261020-022 — Reviewed Product source/target metadata reconciliation

Owner: Codex backend/operations. Status: APPROVED by Jairo; implementation and independent review authorized. Production APPLY gated by reviewed/deployed prevention and writer exclusion.

Implementation checkpoint 2026-10-20: source frozen at `62d42b02965eb7cb26616547a28be5a43268149d` after the two round-1 fixes and bounded source-classification follow-up, ready for independent re-review; not deployed and no production APPLY performed. See matching DONE report. Controller narrowed actual migration to ABSENT targets only; all existing targets block except an exact completed receipt. Final production integration depends on reviewed/deployed CDX-20261020-021 and CDX-20261020-023.

Goal: reconcile the six sources observed in020 with provider-confirmed Producto destinations, without generating or publishing content. This is not provisioning and must not delete/recreate identity safeguards.

Allowed areas: new single-tenant preview/apply maintenance script, tests and own report. Separate branch/worktree; no edits to021 modules, UI, Prisma, commercial data, jobs/journals or existing generalized identity migrations. Safe to plan/test independently of021; production APPLY depends on reviewed021 deployed and a writer-safe maintenance gate.

Inventory binds exact siteId, owner, base domain, source/target hashes or absence, canonical publichost, provider-confirmedroot/account and protected data. Preserve IDs (including legacy IDs without -product), onboarding/baseDomain, content/contact/tracking, payment/grants, history and existing jobs. Stop on duplicate/colliding identity, unexpected target/root, running jobs/claims, drift or inability to exclude concurrent publication/source writers. No silent Product-ID migration, no Brand creation and no inferred VERIFIED flag.

Preview is nonmutating. APPLY is per reviewed tenant with exact plan hash, durable audit/backups, exclusive gate, atomic replace/rollback and idempotent replay; no provider/SFTP/publication calls. Source changes only effective Product site.domain; target creation/rebind requires exact provider evidence and immutable identity review. Preserve original verification as historical, not proof of new-host publication. Read back all pins and protected hashes after apply. Six applies sequentially, not a blind batch.

Evidence: blanca-ruiz/blancastella.pro; claudia-calero/claudiacalero.pro; dorian-higuita/dorianhiguita.pro; jairo-pinto-product/jairopinto.pro; lida-castaneda/lidacastaneda.pro; yenny-garcia/yennygarcia.pro. All six provider Producto roots are /home/u708491435/domains/<base>/public_html/producto. Read fresh evidence before use; do not treat this report as a runtime authority.

Tests: zero-write preview; exact plan binding; tenant/source drift and collisions rejected; active writers rejected; absent target creation versus reviewed old target; partial-failure rollback; idempotency; protected bytes unchanged; no generation/queue/provision callbacks. Independent review before deployment or APPLY. No secrets in manifests/output.
