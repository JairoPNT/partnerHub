# CDX-20261020-008 — Authoritative Business preview and input

- Owner: Codex / Backend Lead. Model tier: balanced engineering; independent controller review for tenant/publication safety.
- Scope: read-only Master Sites Business overview, fresh internal partner snapshot and validated generation input. Approved task 2 of `docs/superpowers/plans/2026-10-20-business-master-sites-manual-delivery.md` and its approved design spec.
- Branch: `codex/CDX-20261020-008-master-sites-business-preview`; isolated worktree, base `b84c942906837464933dc723bf55e329e894fa48`.
- Allowed: new `app/web/server/services/masterSitesBusinessPreviewService{,.test}.ts`, `masterSitesBusinessInput{,.test}.ts`, this request and its matching DONE report.
- Excluded: auth, shared DTO, generator/source/worker/job services, adapters, frontend, schema, infrastructure, production data and provider operations.
- Dependencies: reviewed CDX-20261020-007 shared contract (PR #213).
- Parallel-safe with: CDX-20261020-009 coordinator/adapters and AGR-20261020-001 frontend, in separate worktrees and non-overlapping files.
- Integration: CDX-20261020-010 consumes `createMasterSitesBusinessPreviewService(overrides).get/getPartner`, internal `BusinessPartnerSnapshot`, and `buildMasterSitesBusinessInput(snapshot)`. Only `get()` returns the shared safe DTO. Commands must re-read under site exclusion, compare `reviewRevision`, honor action/status gates, and require explicit `updateExisting` for CURRENT. Routes must set `Cache-Control: no-store`.

## Acceptance

- BUSINESS_ONLY and active courtesy recipients appear without Product or Business source requirements.
- Fresh commercial proof: paid activation offer, confirmed manual ledger snapshots, or currently active Business grant; unconfirmed offers, revoked grants without independent payment, cancelled and archived partners block.
- Full local inventory is read without dropping invalid identities/JSON. Ownership, assigned domain, WhatsApp and remote-root conflicts fail closed.
- Stable revision covers effective partner input, entitlement, master, source/absence and target/absence; changed effective values change revision.
- CURRENT requires matching current source/master/identity plus succeeded job and terminal verified journal, including final target hash after READY metadata. Historical READY alone does not establish CURRENT.
- Inputs use the approved local Business VSL and existing poster fallback; no Product checkout, master identity or master tracking.
- Focused RED/GREEN, entitlement and Business generation/poster suites, lint/build, diff/isolation review. CDX-20261020-011 owns final full-script regression and production gate; no production/push/merge here.
