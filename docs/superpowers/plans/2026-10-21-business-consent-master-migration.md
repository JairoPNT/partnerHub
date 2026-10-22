# Business Consent Master Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver and test fixed-profile tooling for the observed9760 predecessor to the reviewed consent master, with no production execution.

**Architecture:** Extend the existing guarded refresh lifecycle privately, retaining the historical entry point unchanged. A thin dedicated CLI chooses the immutable consent-release profile; all lineage/current/successor bytes bind a deterministic plan and a new immutable archive/journal. No frontend or application writer/coordinator changes. This is backward-compatible tooling based on main236, not a merge/deploy of235.

**Tech Stack:** Node20 ESM, filesystem/crypto, existing Node tests and esbuild packaging only; PowerShell/Node locally and sh operations documentation. No dependencies or network/provider calls.

**Spec:** `brain/agent-requests/codex/requests/CDX-20261021-009_business_consent_master_migration.md`, expressly approved by Jairo2026-10-21 for code/tests only. Detailed prior assessment remains at controller worktree `.local-secrets/sdd/CDX-20261021-006/current-master-assessment.md`.

## Global Constraints

- No production APPLY, master/source/target/client writes, providers, DNS/SFTP, campaigns, secrets, main merge or deploy. Tests use explicit disposable roots, never /data defaults.
- Exact predecessor package9760e017b284e76ff6cbae5d128265cc89fa6b8bd2f03882d4ff4b0de0e1d046 and templateb3b08191d32535540b8108cbe02dca302b36c9f4ecc407023b935ac10a87fc99; original archivee9a2f7339f80110ceb13f01499298a6e9caff2fb4ab2dffa7b35fb9f76f26a76, original template5aabc5e2a4402efd97ba8a6e33700e25ad338417143e6a84e97d5187d85a7e31.
- Successor exact committed LF assets/config/favicon from reviewed235 head88c003d8cbb419522c20c084dc4a019a22d33155. Four executable/presentation hashes must match that commit's actual businessMeasurementArtifacts registry; production code is standalone JS, not dependent on that TS module. Pin full template; no configurable hash/identity approval or CRLF alternatives. Host negocio.ganomaster.pro, siteId ganomaster-business, providers never promoted.
- Preserve historical modes/paths/manifest host business.ganomaster.pro, literal inventories, original apply and prior refresh audit/archive bytes. New audit/archive paths use CDX-20261021-009. No800line lifecycle copy or exported arbitrary-profile factory.
- Writer exclusion is NOT proven by jobs=[], a claim-presence check, NODE_ENV, caller boolean or a proof-looking JSON file. No coordinator handshake is approved in this ticket. Production APPLY must fail closed with explicit writer-exclusion-unproven gate until separately reviewed proof/integration exists. PREVIEW may certify bytes/lineage separately, never operational readiness. Offline successful lifecycle/rollback tests require narrowly isolated disposable-fixture context and must not introduce an environment/CLI/default-path bypass into real APPLY. Raise a concern rather than invent a production witness.
- Existing two-renames lifecycle is not crash-atomic; ambiguous post-install states retain owned claim/evidence. No automatic downgrade of a public site. Product/Brand/client packages unchanged.

## Review Focus

1. Already-refreshed9760 with merely occupied/forged lineage must not be treated as validated predecessor.
2. Altered successor or CRLF byte after plan/capture cannot be installed from an old authorization.
3. Empty extra dirs/symlinks/special files or replaced ancestors cannot hide outside the hashed file inventory.
4. Post-install/journal/cleanup uncertainty must preserve recovery evidence, not report success or overwrite an unexpected occupant.
5. Runtime packaging must execute without TS/development dependencies; a local test-only fixture context must not authorize real production writes.

### Task1: Fixed-profile lifecycle, thin CLI and executable runtime packaging

One owner/outcome: a working locally testable standalone migration tool. Lifecycle and its packaging are technically inseparable; no actual infrastructure deployment is included. No parallel implementation because both consume the same lifecycle/fixture contract. Independent review follows implementation.

**Files:** new `app/web/scripts/business-consent-master-package-migration.mjs` and `.test.mjs`; minimally modify `app/web/scripts/jairo-business-master-package-drift-recovery.mjs` or extract a focused shared JS lifecycle module once; optionally private fixed-profile JS module; `Dockerfile`, `app/web/package.json`, `app/web/scripts/business-master-runtime-packaging.test.mjs` only for shipping/smoke. Own request/report. Do not edit235 components/registry, coordinator, React, templates or saved outputs.

**Interfaces:** named `planBusinessConsentMasterMigration(options={})`, `readBusinessConsentMasterMigration(options={})`, `applyBusinessConsentMasterMigration(options={})`; options retain explicit outputRoot/templateDirectory/businessJobsDirectory/now/testHooks for fixtures as appropriate, but reject identity/hash/profile overrides. CLI default PREVIEW, explicit READBACK; apply mode `APPLY_GUARDED_BUSINESS_CONSENT_MASTER_MIGRATION`, confirmation `MIGRATE_REVIEWED_BUSINESS_CONSENT_MASTER`. No arbitrary profile selection. Fixed requestId CDX-20261021-009. Return changed/blocked/blockedReasons/planHash/planMaterial with separate artifact and operational gates, truthful no-provider safety fields; readback ALREADY_APPLIED only exact complete matching tuple. Build CLI via the existing runtime packaging pattern, not a new framework.

- [ ] Step1 RED: reconstruct real9760 bytes from historical commita8d547c1cf9d754573bf20eb5cc154a03f9f5c60, originale9a2 archive using existing fixture pattern, exact old journal schema/path/hash linkage. Materialize reviewed successor from Git88c003d, NOT Windows checkout. Assert deterministic read-only plan, exact canonical successor host/runtime inventory and truthful writer gate; missing lineage/journal/archive/extra fields or wrong hash/host/path blocks. Keep initial missing module vs genuine behavioral RED distinct.
- [ ] Step2 Implement minimal fixed-profile validation/reuse. Hash and pin raw old journals, archive, predecessor tree, full successor and claims/jobs. Strict full old refresh writer schema has NO invented outcome field. Revalidate all captured proof after owned claim/before destructive steps. Do not change historical exports' behavior.
- [ ] Step3 RED/GREEN lifecycle: in disposable isolated fixture only, stale/wrong mode/confirmation/plan, byte/capture-mutate-revert, extra dirs/path/symlink, concurrent migration/claims/jobs/expiredlease, foreign occupied new paths, changed lineage after claim/archive fail safely. Prove exact preserved historical tree, new9760 archive/new linked journal, repeat complete readback, partial installed/journal states fail closed. New registry pins tied to actual reviewed commit; production false flags untouched.
- [ ] Step4 RED/GREEN failure injection across archive and both renames, ownership loss, journal write and cleanup; restore only ownership+hash proven predecessor before install; ambiguity retains claim/evidence. Test production writer gate cannot be lifted by caller/env/CLI values or by default roots. If successful shared-lifecycle fixture isolation cannot be made narrow, stop and report, do not weaken this requirement.
- [ ] Step5 Runtime packaging smoke: bundled CLI PREVIEW/READBACK/blocked APPLY runs Node20 from disposable runtime without node_modules/TS source. Verify imported shared modules shipped/bundled; old entrypoints remain usable; new maintenance npm alias. No extra dependency install/lock change.
- [ ] Step6 Run new tests and old refresh/create/runtime packaging regressions, then lint/build/diff. No aggregate npm test exists; give exact scope/counts and skips. Linux unavailable is BLOCKED, not fake success. No browser suites unless a real integration question involves them (no consent asset edited here).
- [ ] Step7 Commit only allowed files. Report RED/GREEN commands/counts, source/fixture refs, changed modules, warnings, Node20/platform limits, prototype/ownership findings, gate semantics and exact pending proof. Independent spec+quality task review then premium final integrity/concurrency review; no push/PR/merge by implementer.

## Self-review and rulings

Spec covered by Task1's lineage/byte/tree/transaction/readback/runtime tests. Only one component, no independent writer to parallelize. Profile isn't authority; plan binds bytes. Production maintenance exclusion intentionally remains BLOCKED because the approved scope excludes the missing application handshake; fixture success is mechanical lifecycle evidence only. No new business choice or productive mutation is inferred. Actual lineage readback/Linux and operator exact-hash/window authorization remain later gates.
