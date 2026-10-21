# CDX-20261021-009 — Offline consent master migration tooling

Status: implementation/testing delivered; independent review pending. Production APPLY remains intentionally BLOCKED. No deployment, production mutation, publication, provider calls, push, PR or merge.

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

Independent spec/quality and premium integrity/concurrency reviews remain pending. Before any productive migration: separately reviewed all-Business-writer barrier/maintenance integration and actual current-profile execution wiring, fresh actual lineage/plan authorization, Linux rehearsal, exact reviewed staged candidate and coordinated code/master cutover. No productive permission is inferred.

The two directory renames are NOT crash-atomic or zero-downtime. Pre-install rollback requires owned proven paths; post-install/journal/cleanup uncertainty retains claim/evidence. No automatic public-site downgrade exists. Current filesystem audit validation is not a signed attestation, nor an abrupt-crash durability guarantee.

Branch: codex/CDX-20261021-009-business-consent-master-migration. Base: 06ec38f9b6c16c124cd69f3e48b1a5856cccfb30 (main236 plus approved contract). Commit: the commit containing this report; no push/PR/merge.
