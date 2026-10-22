# CDX-20261021-009 — Offline consent master migration tooling

Status: implementation/testing and independent task/final reviews complete for offline code handoff. Final-review findings F1–F3 fixed in 3690aa669fdeb280b7d665f9c4edfc2fb029ba3d; scoped re-review PASS, no findings open. Production APPLY remains intentionally BLOCKED. No deployment, production mutation, publication, provider calls, push, PR or merge.

## Delivery and fixed authority

- Dedicated standalone JS PREVIEW/READBACK CLI and named plan/read/apply APIs; fixed request/site/BUSINESS identity, canonical successor host negocio.ganomaster.pro, immutable new archive/audit locations.
- Exact 9760 predecessor, original e9a2 archive, strict original apply and prior refresh writer schemas (refresh has no outcome field), actual previous journal raw hashes/path linkage, complete files/directories and ancestor identities enter the deterministic plan.
- Successor is the exact six committed LF runtime assets from reviewed 88c003d8cbb419522c20c084dc4a019a22d33155. Full template hash 0a7fdec9a7d51c022db7dc5d1e2eeca4cce1f1d3aea7a00ebc1cf358b1e0f63e; tests bind the executable/presentation pins to that commit's actual businessMeasurementArtifacts registry. Providers remain false.
- Artifact and operational gates are separate. Correct bytes can be certified while running jobs/claims and missing all-writer exclusion still block operation.
- Public APPLY always fails closed at WRITER_EXCLUSION_UNPROVEN, before any write. No caller boolean, environment value, proof-looking file, test hook, CLI flag or profile/hash/identity override supplies authority.
- Production has NO current-profile capture/install adapter or fixture capability. The shared transaction primitive has no default output root or release-approval authority. A test-only constructor drives it with explicit mkdtemp paths, captured public-plan evidence and fixture bytes; this is mechanical lifecycle proof, NOT public current-profile APPLY end-to-end certification.
- CLI defaults to PREVIEW. Read-only --template-dir selects an explicitly staged, exact six-file candidate for PREVIEW/READBACK only; APPLY rejects this read-only flag. It does not approve hashes or identity. Main236/default old template is expected to remain artifact-blocked. No actual candidate staging was performed outside disposable tests.

## Changed areas

- New business-consent-master-package-migration.mjs/.test.mjs and private fixed business-consent-master-release.mjs.
- One extraction into business-master-transition-lifecycle.mjs: existing filesystem/job/claim helpers and the actual archive/stage/two-renames/journal/cleanup/rollback lifecycle. Historical refresh now delegates through its fixed legacy adapter; historical modes, confirmation, paths, inventories, manifest host and journal bytes/schema stay unchanged.
- The shared claim reader now rejects extra owner fields; backup occupancy is rechecked; failed stage cleanup retains claim. Additional capture/rollback callbacks are exercised only by disposable fixtures; there is no production current-profile adapter.
- Docker bundles the new CLI using existing esbuild and ships the helper for the historical standalone entrypoint. New maintenance/test npm aliases; no dependencies or lockfile changes.

## Verification

Real Node20: C:/Users/jairo/.codex/worktrees/business-paid-traffic-followups/PartnerHub/.local-secrets/tooling/node20/node-v20.20.2-win-x64/node.exe (v20.20.2).

- Baseline old refresh/create/packaging: 61 pass, 0 fail/skip.
- Initial missing-module RED retained separately; behavioral RED after stub: 1 pass/11 fail.
- Targeted RED/GREEN covered archive shape, installed mutate/revert, non-string lineage hash, rollback shape/ownership/cleanup, complete readback proof, no exported install adapter, separate gates and staged CLI.
- Final named Node20 group: business-consent-master-package-migration.test.mjs, jairo-business-master-package-drift-recovery.test.mjs, jairo-business-master-package.test.mjs, business-master-runtime-packaging.test.mjs: **150 pass, 0 fail, 0 skipped**.
- First final run was 149 pass/1 fail: extra-archive-dir test incorrectly expected restored destination despite uncertain archive proof. Corrected the test to require absent destination, exact retained predecessor backup and claim; did NOT relax recovery safety. Final rerun above passed.
- Bundled runtime smoke is included: PREVIEW/READBACK/blocked APPLY and exact staged-candidate selection execute from disposable runtime with no node_modules/TS sources. Historical entrypoint plus extracted helper also runs.
- Existing TS integration command, Node24.16.0: node --conditions=react-server --experimental-strip-types --experimental-loader ./scripts/node-test-alias-loader.mjs --test scripts/business-master-package-drift-recovery.integration.test.mjs: **1 pass, 0 fail/skip**. Existing experimental-loader and MODULE_TYPELESS_PACKAGE_JSON warnings retained.
- Global npm run lint: pass. Repository ESLint configuration intentionally ignores scripts/**; executable tests/bundling cover the changed .mjs files.
- npm run build under Node20: **PASS on final retry** (exit0, TypeScript and39 static pages complete). Initial attempt compiled, then failed at server/db.ts because the isolated installed dependencies lacked generated PrismaClient. Controller restored an existing compatible generated client offline into the absent ignored node_modules/.prisma/client; no schema/dependency/network/DB change or new Prisma generation. Worker verified source/copied index.js hashes identical. Final warnings: multiple lockfiles/inferred workspace root and two unexpected NFT traces through next.config.mjs -> activationLeadService.ts (one instrumentation output trace). Both attempts retained.
- git diff --check: pass.
- New-code Linux/container execution: **BLOCKED**, Docker Desktop Linux API pipe unavailable. Windows tests are not Linux evidence. Native BFCache/browser suites not run: no consent frontend/assets changed.

Detailed commands, RED/GREEN evidence, rulings and logs retained ignored at .local-secrets/sdd/CDX-20261021-009/task-1-report.md.

## Remaining gates and limitations

Independent task spec/quality reviews passed. Premium final integrity/concurrency review initially identified F1–F3; all were corrected in one fix wave and independently verified by scoped final re-review, with no introduced findings. Before any productive migration: separately reviewed all-Business-writer barrier/maintenance integration and actual current-profile execution wiring, fresh actual lineage/plan authorization, Linux rehearsal, exact reviewed staged candidate and coordinated code/master cutover. No productive permission is inferred.

The two directory renames are NOT crash-atomic or zero-downtime. Pre-install rollback requires owned proven paths; post-install/journal/cleanup uncertainty retains claim/evidence. No automatic public-site downgrade exists. Current filesystem audit validation is not a signed attestation, nor an abrupt-crash durability guarantee.

Branch: codex/CDX-20261021-009-business-consent-master-migration. Base: 06ec38f9b6c16c124cd69f3e48b1a5856cccfb30 (main236 plus approved contract). Commit: the commit containing this report; no push/PR/merge.

## Final-review fix wave F1–F3 (BASE9b5d538)

- F1: retain exact committed journal bytes, physical file identity/change clocks and ancestor identities after no-replace commit; revalidate before consuming backup/stage/reservation/claim. Removal, identical replacement, mutate/revert or journal-parent replacement now rejects without deleting backup/claim or overwriting the journal.
- F2: private in-process WeakMap evidence binds the acquired claim directory/owner file, reservation and stage marker to their bytes/objects/clocks/ancestors. Copied markers are not ownership. Recheck before rename, rollback, destructive cleanup and release; uncertain ownership retains recovery evidence. Serialized legacy marker/journal schemas remain unchanged, and no current-profile install capability was added.
- F3: predecessor proof requires literal boolean true, canonical decimal metadata, native file/directory mode semantics and uint64 device/inode bounds. Each recorded file size must match the exact predecessor archive. Copied archive inode/timestamps are deliberately NOT required to equal original predecessor metadata; journals remain unsigned filesystem evidence.
- Observed RED: F1 six failures; isolated F2 fifteen failures plus one stage-ownership failure; F3 eight malformed-proof failures with one valid control, then two native-width failures. Corresponding focused GREEN runs are retained in ignored task evidence.
- Fresh final command: Node20 --test scripts/business-consent-master-package-migration.test.mjs scripts/jairo-business-master-package-drift-recovery.test.mjs scripts/jairo-business-master-package.test.mjs scripts/business-master-runtime-packaging.test.mjs (from app/web; equivalent repository-root-prefixed invocation used): **183 pass, 0 fail/skip, exit0**. Existing TS integration Node24: **1 pass, 0 fail/skip, exit0**, same experimental-loader/module-type warnings.
- No Next app/TS/dependency/packaging-config changes in this fix wave. Global lint ignores scripts and application build does not consume these standalone modules, so app lint/build were not repeated; prior successful app build remains historical evidence. The affected runtime bundle was freshly rebuilt and executed in the passing packaging suite. git diff --check passes.
- Fix changes are limited to shared lifecycle, fixed readback schema, new/legacy regression tests and own reports. Linux and productive exclusion/current-profile APPLY integration remain unverified/BLOCKED. The fix commit is the commit updating this section; exact hash is recorded in ignored task report/ledger after commit.

## Urgent Claudia publication checkpoint

Direct read-only HTTPS of https://negocio.claudiacalero.pro/ returned HTTP200 but still contains `Quiero Participar y Registrarme` and `10 minutos`, and no `measurement-runtime.js` reference. This is served-HTML evidence only, not browser/video/event validation. Approved changes are not publicly delivered. Read-only route discovery found that supported Business command/worker generation remains coupled to the persisted master; no existing isolated Claudia release path avoids its compatibility gate. Disabling only the worker does not exclude direct generation/replication or explicit wakes. A proven exclusive maintenance execution/cutover mechanism is still required; no raw SFTP patch, audit deletion, arbitrary source override or claim of campaign readiness is authorized by this report.
