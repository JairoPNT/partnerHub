# CDX-20261020-009 — implementation report

## Status and ownership

- Owner: Codex, backend.
- Result: implemented and locally verified; independent review remains mandatory before manual-command integration.
- Branch: `codex/CDX-20261020-009-business-site-coordination`.
- Base: `d9b737a793f27c8fc9ec8a861717e03e5206872f`.
- Implementation commit: `97f6bf40d9e7ccd218b2db8c4604039215bd991d`.
- No push, merge, provider operation, production mutation, UI/auth/DTO/environment/migration change.
- Parallel boundaries: only the coordinator, five assigned service adapters, dedicated tests and request/report009 changed. CDX-007/008 and Antigravity areas were untouched.

## Changed files

- `app/web/server/services/businessPublicationSiteCoordinator.ts` and `.test.ts`.
- `app/web/server/services/productPageGenerationService.ts`.
- `app/web/server/services/productPageSourceService.ts`.
- `app/web/server/services/productPagePublicationService.ts`.
- `app/web/server/services/publicationJobService.ts`.
- `app/web/server/services/publicationJobWorkerService.ts`.
- `app/web/scripts/business-publication-site-coordination.integration.test.mjs`.
- `app/web/scripts/business-publication-site-coordinator-child.mjs`.
- Matching request and this report under `brain/agent-requests/codex/`.

## Contract for CDX-20261020-010

`withBusinessPublicationSite<T>(siteId: string, action: () => Promise<T>): Promise<T>` is the normal command boundary. It validates a canonical Business-shaped ID, claims atomically with filesystem `mkdir`, and runs the entire review/recheck/generate/enqueue action under ownership. `BusinessSiteBusyError` has the safe message `BUSINESS_SITE_BUSY`; map it to a conflict/retryable response, never publication success.

Other exports:

- `createBusinessPublicationSiteCoordinator({ outputDirectory?: string })`: returns the same generic callback function bound to an explicit output root.
- `isBusinessPublicationSiteId(siteId: string): boolean`.
- `assertBusinessPublicationSiteIdentity(siteId: string, ecosystemType: unknown): void`.
- `withoutBusinessPublicationSiteOwnership<T>(action: () => Promise<T>): Promise<T>`: internal worker-boundary helper; clears inherited async ownership so a background worker woken from a manual action is a separate contender.
- Job service adds `deferClaimedJob(id: string, leaseToken: string)` and its root-bound `withBusinessPublicationSite`. Existing `deferClaimedBusinessJob` remains for master-refresh compatibility. Deferral validates the lease, restores QUEUED/QUEUED, removes only the owned lease claim and subtracts only the attempt reserved by claimNext.

Root contract: the default coordinator reads `PRODUCT_PAGE_OUTPUT_DIR` (fallback `/data/generated-sites`) and stores claims in `.business-publication-site-claims/<sha256(siteId)>/owner.json` beneath that root. All app instances must share the SAME filesystem and output root. Job-service factories bind their coordinator to their resolved `outputDirectory`; workers use that exact binding. A consumer using custom job/output directories must use the bound coordinator and configure generator/source environment to the corresponding source/package directories. Do not mix a custom factory root with an unrelated default root, or pass roots/capabilities from HTTP JSON. Production configuration is unchanged.

The controller approved canonical `<ownerSiteId>-business` and reserved `ganomaster-business` only. Explicit BUSINESS generate/save calls with noncanonical IDs fail `BUSINESS_SITE_IDENTITY_INVALID` before mutation. Generic noncanonical regeneration/legacy publication can inspect a source only to reject unsupported Business identities. No sources are migrated. Product/Brand content, generation logic, triggers and master-refresh gates are unchanged; a Product slug ending `-business` is conservatively serialized without changing its ecosystem.

## Safety and lock ordering

- Generation and regeneration lock before saved-input reads/removal; direct source saves, legacy publication, enqueue and enqueueReviewed participate.
- Worker claims a job first (its short metadata mutex is released), then claims the site and retains it across execution, existing-journal recovery, complete/fail and executor cleanup.
- Order is site -> short job metadata mutex. No code waits for a site while holding a job mutex; busy acquisition fails immediately.
- Site claims never expire or steal based on timestamp, PID or RUNNING lease expiry. The existing job-lease/master-refresh contracts are retained.
- Async-local reentry is module-private, validates the persisted ownership token, and is scoped to an active internal callback. Every already-entered nested callback retains a reference until completion; expired parent contexts cannot start new reentrant work. This also protects detached work started before its enclosing callback returns.
- Background worker entry explicitly drops inherited manual ownership. Worker -> regenerate -> generate -> save remains reentrant within the new worker scope.
- Release is token-owned and non-recursive. Corrupt/replaced/incomplete claims stay closed rather than being deleted by a former owner.

## Verification

All commands ran locally under `app/web` unless specified. Real source writes and package generation remain in integration tests; only external SFTP/public verification and unrelated lead/history dependencies are replaced.

RED evidence:

1. New module initially absent; after adding only a pass-through signature, `node --conditions=react-server --experimental-strip-types --experimental-loader ./scripts/node-test-alias-loader.mjs --test --test-name-pattern='same site excludes' server/services/businessPublicationSiteCoordinator.test.ts` failed because the contender entered.
2. Integration pattern `all Business|noncanonical|holds site ownership|busy deferral` failed: direct save did not reject, unsupported Business identity did not reject, and the second worker executed/returned FAILED instead of DEFERRED. The absent deferral implementation also failed the lease test.
3. After adapters, the explicit execution-contention test failed FAILED vs DEFERRED; fixed classification and reran.
4. Pattern `already running retains|worker started inside` failed: a nested active action lost ownership when its parent returned, and a background worker inherited manual ownership. Reference-counted scopes and an independent worker boundary made both pass.
5. During fixture stabilization, regeneration exposed an existing normalizer/schema mismatch when descriptions were omitted (saved empty description fails min-length). The fixture now supplies a valid description, as the existing Business generation integration does; no production normalization change. Separate fake enqueue timestamps were made distinct instead of relying on hash-file order.

GREEN:

- `node --conditions=react-server --experimental-strip-types --experimental-loader ./scripts/node-test-alias-loader.mjs --test server/services/businessPublicationSiteCoordinator.test.ts scripts/business-publication-site-coordination.integration.test.mjs`: **15/15**.
- `npm run test:publication-jobs`: **17/17**.
- `npm run test:publication-job-worker`: **9/9**.
- `npm run test:publication-events`: **7/7**.
- `npm run test:business-whatsapp-cta`: **5/5**.
- `npm run test:jairo-business-master-package-drift-recovery-integration`: **1/1**.
- `node --conditions=react-server --experimental-strip-types --experimental-loader ./scripts/node-test-alias-loader.mjs --test scripts/claudia-business-generation.integration.test.mjs`: **1/1**.
- `npm run lint`: exit **0**.
- `git diff --check`: exit **0**.
- Initial `npm run build`: compilation succeeded, type-check stopped at unchanged `server/db.ts` because the local generated Prisma client lacked `PrismaClient`. Controller authorized local `npx prisma generate` (no DB access/migration), which succeeded with Prisma 6.19.3. Final `npm run build`: exit **0**, TypeScript and 39 static pages succeeded.
- Warnings retained: Node experimental loader/module-type notices; Next multiple-lockfile root inference and broad NFT tracing warnings. No suppressions/config changes.

IPC tests use independent Node processes and explicit entered/release messages, not sleep-based races. They cover two workers of different intents for the same site, live owner age, direct generator rejection while a child worker owns the site, and normal release. The real guarded executor pauses immediately before the remote directory swap and proves a concurrent generator cannot delete its source/package. Existing-journal recovery pauses during inventory and likewise rejects source/generation mutation. Busy deferral, expired RUNNING lease, independent sites, reentry, failure release and replaced-token preservation are covered.

## Broad-suite baseline, not hidden failures

There is no aggregate `npm test` script. The broad command was:

`node --conditions=react-server --experimental-strip-types --experimental-loader ./scripts/node-test-alias-loader.mjs --test --test-concurrency=4 "server/**/*.test.ts" "scripts/**/*.test.mjs" "shared/**/*.test.mjs"`

Result: **632 tests, 623 passed, 9 failed**. All nine are unchanged legacy failures:

1. `jairo-business-sftp-capability-renewal.test.mjs`: “PREVIEW binds exact expired evidence and performs no provider operation”.
2. Same file: “APPLY archives bytes exactly and returns the next provider-free probe PREVIEW”.
3. Same file: “rerunning the same authorized APPLY is idempotent”.
4. Same file: “PREVIEW ignores immutable archives owned by the historical renewal request”.
5. Same file: “two successive capabilities archive independently by their exact content hashes”.
6. `jairo-business-source-generation-dry-run.test.mjs`: “the repository canonical Business artifact produces a placeholder-free partner projection”.
7. `prepare-jairo-business-publication-preview.test.mjs`: “creates one fresh capability manifest and returns a provider-free PREVIEW”.
8. Same file: “isolates generator side effects, installs the package and returns unblocked publication PREVIEW”.
9. Same file: “rolls back the previous package when the installed PREVIEW detects drift”.

Baseline proof: exported only `app/web/scripts`, `app/web/shared`, `app/web/package.json` and `plantillas-de-pagina/business` from base `d9b737a793f27c8fc9ec8a861717e03e5206872f` using `git archive`, extracted into `C:\Users\jairo\AppData\Local\Temp\partnerhub-009-baseline-13cff366477c4f4a92e150c02043e0bf`, then ran:

`node --test scripts/jairo-business-sftp-capability-renewal.test.mjs scripts/jairo-business-source-generation-dry-run.test.mjs scripts/prepare-jairo-business-publication-preview.test.mjs`

Baseline result: **32 tests, 23 passed, same 9 failures** with identical names and error classes/codes (`TARGET_IDENTITY_OR_STATE_INVALID`, `PUBLISHING_TARGET_IDENTITY_INVALID`, blocked-vs-unblocked canonical artifact expectations). No HEAD switch, fixture change or unrelated fix.

## Risks and follow-up

- Independent review and CDX-010 integration are still required; do not represent this as a manual publication command or production delivery.
- A dead process leaves a fail-closed site claim. Recovery is deliberately explicit: stop/verify all possible owning app/worker processes for that shared root, preserve the exact claim and source/target/job/journal evidence, reconcile partial publication, and only then obtain authorization to remove that exact orphan claim. Never infer safety from PID alone, elapsed time, an expired job lease or a missing/corrupt owner file. This ticket adds no automatic recovery/delete endpoint.
- Source/package scripts that mutate files outside these app service adapters remain outside the mutex contract; do not run such maintenance operations concurrently with app publication without a separately coordinated operational gate.
- The nine reproduced legacy failures and optional-description normalization discrepancy need separately owned follow-up if scheduled. They were not expanded into this coordination ticket.
