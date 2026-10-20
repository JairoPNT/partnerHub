# CDX-20261020-023 — Product mutation coordination

Date: 2026-10-20. Owner: Codex Backend Lead. Model tier: Premium (concurrent filesystem, tenant isolation and audit risk).

Status: independent premium delta review approved for source8a76cc5; ready for GitHub integration. This is not deployment readiness or authorization for022 APPLY.

Controller release evidence: independently reran114/114 combined Product/worker/provisioner tests, lint/build exit0 (39pages), clean whole-branch diff. Premium reviewer approved after original root-binding P1 fix:43/43 direct publisher,8/8 selected root/recovery/worker integration and legitimate nested publication/release passed; no remaining Critical/Important/Minor findings. Trusted-namespace assumption accepted explicitly; no unconditional guarantee against hostile same-UID concurrent namespace replacement. Existing nine baseline failures remain disclosed, not a full-suite-green claim. Deployment and022 integrated evidence/APPLY gates remain pending.

Branch: `codex/CDX-20261020-023-product-mutation-coordination`.
Reviewed021 base: `a049da04680529a392a7fab836aea123237bec22` (PR219).
Source freeze: `8a76cc5c8f15a4c643916a2f4b1afcf2124a9362`.
Rebased coordinator/adapters commits: `4f081b9`, `85c5f6c`.
022-owned import mapping integrated separately: `364874c` (original `a5f3a2d`). No023 PR/push/merge/deployment was performed by this implementer.

## Result and boundaries

- Added `product-mutation-v1`: an atomic mkdir-based Product claim beneath the exact output root at `.product-mutation-claims/<sha256(siteId)>/owner.json`. Validated legacy unsuffixed site IDs remain supported. Module-private async capability permits legitimate nested saves/generation; active nested scopes hold references and expired inherited scopes cannot reenter.
- No TTL stealing, PID guessing, automatic orphan deletion, synthetic Business IDs or Business-coordinator refactor. A busy Product raises the stable `PRODUCT_MUTATION_BUSY` code. Static unsafe, non-file, hardlinked, replaced or symlinked owner/namespace paths fail closed; release verifies token and inode/device identity.
- Source save holds the gate across write/rename. Generate owns it before package deletion and source work; regenerate owns it before source read. Normal and reviewed enqueue share the gate before intent reads and persistence.
- Explicit Product provisioning holds the gate across reads, target writes, provider calls and readiness. Legacy Product target version migration rereads under the gate and rejects a payload whose siteId differs from its storage key, so migration cannot write a foreign target under the wrong claim. Existing IDs and source contents are not migrated by023.
- Product worker owns the claim across initial pinned reads, recovery, generation, provider effects and complete/fail metadata. It clears inherited ownership before starting a claimed job. Ordinary contention defers with lease-token validation, does not consume an attempt, and uses the bounded exclusion scan so other sites progress. Business-only master-refresh defer remains restricted to Business.
- After reviewed021 handoff, direct publisher now owns the Product gate before its first source read through all SFTP effects/cleanup, activation-lead publication state, verification and final history. The021 source-context/destination/tenant checks were not changed.
- Explicit Brand/master source paths remain independent; unknown pre-read IDs are conservatively gated unless canonical Business/master. No Product inference solely by suffix, no new auto-trigger, no removal of a trigger, no job/source-ID migration, frontend/auth/payment/DTO change or provider operation.

## Root-binding review correction

Independent checkpoint review demonstrated real recovery succeeding with job-store claim rootA and execution rootB. Three real-store/real-execution tests reproduced SUCCEEDED for mismatched execution output, execution source, and default-generator process root; all now fail safely before provider access with a storage-binding error.

Job stores and real executions expose immutable source/output bindings through read-only getters. Product worker compares them before invoking execution. Product execution additionally compares its roots to process-root adapters before any pinned read, including recovery and injected-generator paths, and checks again immediately before generation. Custom roots must be aligned across these components; inconsistency is a configuration failure, not a busy-site deferral. One existing Product execution fixture was updated to explicitly configure its intended process roots, preserving its real publication/recovery assertions.

## Files

- `app/web/server/services/productMutationCoordinator.ts` and `.test.ts`.
- `app/web/scripts/product-mutation-coordinator-child.mjs`.
- `app/web/scripts/product-mutation-coordination.integration.test.mjs`.
- `app/web/server/services/productPageSourceService.ts`.
- `app/web/server/services/productPageGenerationService.ts`.
- `app/web/server/services/productPagePublicationService.ts` and `.test.ts` (after explicit021 handoff).
- `app/web/server/services/publicationJobService.ts`.
- `app/web/server/services/publicationJobWorkerService.ts` and `.test.ts`.
- `app/web/server/services/subdomainProvisioningService.ts`.
- This report and the023 request. Ignored working report: `.superpowers/sdd/2026-10-20-product-destination-reconcile/task-3-report.md`.

The `#product-mutation-coordinator` package import mapping was authored by022 and integrated by controller;023 made no package/Docker edits.

## Verification

Commands ran from `app/web`:

```powershell
node --conditions=react-server --experimental-strip-types --experimental-loader ./scripts/node-test-alias-loader.mjs --test server/services/productMutationCoordinator.test.ts server/services/productPagePublicationService.test.ts server/services/publicationJobService.test.ts server/services/publicationJobWorkerService.test.ts server/services/subdomainProvisioningService.test.ts server/services/productPublicationDestinationPolicy.test.ts scripts/product-mutation-coordination.integration.test.mjs scripts/business-publication-site-coordination.integration.test.mjs
npm run lint
npm run build
git diff a049da0..HEAD --check
```

- Combined focused run: **128/128 PASS**, no skipped/cancelled tests. Includes two real worker processes, an ancient live cross-process owner, real source/job/generator adapters, publication/recovery with network fakes, valid nested calls, detached/stale contexts, unsafe/static marker cases, custom-root rejection, lease checks, finite busy scans and unrelated-site progress.
- Publisher suite: **43/43 PASS**, including four new ownership-boundary tests before source reads and during upload/verification/history, plus every021 destination test.
- Product integration suite: **21/21 PASS**. Coordinator: **10/10 PASS**. Existing provisioner: **14/14 PASS**. Existing Business coordinator+adapter suites at initial checkpoint: **19/19 PASS**; the14 adapter cases were rerun in the128 combined run.
- `npm run lint`: **PASS**. Build: **PASS**, TypeScript and39 generated static pages complete. `git diff --check` and full-branch diff check: **PASS**.
- `npm test` is unavailable (no generic package test script). All70 declared `test:*` scripts were executed at both the initial checkpoint and final post-handoff source freeze: **67 PASS /3 failed** in each run, exactly the same nine historical baseline cases below.
- TDD RED observed for missing source guard, Product contention incorrectly FAILED, Business-only defer leaving Product RUNNING, legacy target write under the wrong site's claim, all three real recovery root mismatches, and direct publisher reaching reads/transport under another owner. GREEN reruns exercised the actual adapters.
- Node typeless-module/experimental-loader warnings and Next multiple-lockfile/NFT trace warnings remain; they do not change successful lint/build exit status.

### Known baseline failures (not hidden or fixed in this ticket)

Controller independently reproduced these on the base; implementer observed the same nine failures:

1. `test:jairo-business-source-dry-run`: repository canonical Business artifact produces a placeholder-free partner projection.
2. `test:jairo-business-publication-preview`: creates one fresh capability manifest and returns a provider-free PREVIEW.
3. Same script: isolates generator side effects, installs the package and returns unblocked publication PREVIEW.
4. Same script: rolls back the previous package when installed PREVIEW detects drift.
5. `test:jairo-business-sftp-capability-renewal`: PREVIEW binds exact expired evidence and performs no provider operation.
6. Same script: APPLY archives bytes exactly and returns next provider-free probe PREVIEW.
7. Same script: rerunning the same authorized APPLY is idempotent.
8. Same script: PREVIEW ignores immutable archives owned by the historical renewal request.
9. Same script: two successive capabilities archive independently by their exact content hashes.

## Trust model and remaining gates

The namespace is private application state for cooperating writers, with0700 directories and0600 marker permissions where supported. Static checks preserve foreign/unsafe markers observed before release. Node pathname APIs do **not** provide an atomic validate-and-unlink guarantee against a privileged or same-UID actor replacing the namespace between those calls; no protection against arbitrary out-of-protocol privileged mutation is claimed. Keep the volume trusted and do not introduce writers that bypass the coordinator.

Independent delta review is still required before merge. Deployment/readiness and022 dry-run/APPLY remain controller-owned separate gates. No actual migration, DNS, SFTP, provider call, production write, forced lock cleanup or orphan recovery was performed. Existing orphan claims require explicitly authorized recovery after proving the owner has stopped, outside this request.

Frozen coordinator API remains `product-mutation-v1`; the last change to its implementation file was the threat-model comment only. Canonical git LF SHA256: `3b6a52deb6136393756bf90a8137006088459cbcada04128d4a354081019e7ae`. 022 has been notified to update its packaging pin to this source freeze.
