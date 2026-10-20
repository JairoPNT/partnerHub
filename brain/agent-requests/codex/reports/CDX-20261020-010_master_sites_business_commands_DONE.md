# CDX-20261020-010 — Business manual commands and HTTP routes

## Outcome and boundary

- Owner: Codex, backend. Approved task 4 implemented and locally verified; independent security/isolation review remains required.
- Branch: `codex/CDX-20261020-010-master-sites-business-commands`.
- Checkout: `C:/Users/jairo/.codex/worktrees/cdx-20261019-005-drift-integration/PartnerHub`.
- Implementer base: `d1dcf52c79a3ade5f717a3024f086dd74a5b2610`.
- Code/request commit: `04a1d6435aae32e68795967a788858f06c392b2e`. This report and request-status update are a subsequent docs-only commit.
- Review-remediation source commit: `54a5bcb0c0c3053f063301ab5e1d0b8f708e1c93`; latest evidence and recovery semantics are in the addendum below.
- Reviewed foundation base: `262c1ebea6536f41e371e7eca19047bd38978e27`; the intervening controller docs-only execution split was preserved.
- No push, merge, PR, frontend/config/shared-status edit, provider call, production/customer write or allowlist configuration.

## Files

Only new backend command/test, injectable route adapter/test, the three wrappers and this ticket's request/report:

- `app/web/server/services/masterSitesBusinessCommandService.ts`
- `app/web/server/services/masterSitesBusinessCommandService.test.ts`
- `app/web/server/services/masterSitesBusinessRouteHandlers.ts`
- `app/web/server/services/masterSitesBusinessRoutes.test.ts`
- `app/web/app/api/internal/master-sites/business/route.ts`
- `app/web/app/api/internal/master-sites/business/prepare-target/route.ts`
- `app/web/app/api/internal/master-sites/business/publish/route.ts`
- `brain/agent-requests/codex/requests/CDX-20261020-010_master_sites_business_commands.md`
- This report.

Reviewed 007/008/009/012 modules, generator/source/provisioner/jobs/worker/events, shared DTO, UI, templates, Prisma, infrastructure and environment files are unchanged.

## Exact server API and dependency contract

`createMasterSitesBusinessCommandService(dependencies?: MasterSitesBusinessCommandDependencies)` returns:

```typescript
prepareTarget(command: MasterSitesBusinessPrepareTargetRequest,
  operator: CloudflareAccessIdentity): Promise<MasterSitesBusinessCommandResult>
publish(command: MasterSitesBusinessPublishRequest,
  operator: CloudflareAccessIdentity): Promise<MasterSitesBusinessCommandResult>
```

Exported dependency type has optional trusted backend fields:

- `outputDirectory`, `sourceDirectory`: resolved server storage configuration, never HTTP input.
- `preview`: `ReturnType<typeof createMasterSitesBusinessPreviewService>`.
- `jobs`: `ReturnType<typeof createPublicationJobService>`.
- `operations`: reviewed `MasterSitesBusinessOperationStore`.
- `generate`: `typeof productPageGenerationService.generate`.
- `provision`: existing provisioning service's `provision` method.
- `wake`: `() => Promise<unknown>`.

Defaults bind job service/coordinator and operation directory to the same resolved output root; snapshot job IO uses that bound job service. Generator/source still use existing process configuration, so commands assert its resolved source/output roots equal their captured roots before entry and every effect. Custom dependency consumers must bind preview/jobs/store to those same trusted roots. Tests set all source/output/activation/payment/grant/journal roots to an owned temporary directory.

Default provisioning is lazy and Hostinger-only: existing subdomain client/config, existing Hostinger DNS client, existing provisioning service, server `PARTNERHUB_PROVISIONING_IPV4`. No credentials are read or clients created on GET/READY no-op/unauthorized requests. Owner/site/domain derive from the authoritative snapshot; existing root metadata is preserved, new Business subdomain uses BUSINESS metadata. Existing hostname policy continues serving `negocio.<baseDomain>`, never an apex. No domain purchase or Product operation exists here.

Generator receives the real validated Business input and `{templateSource:"master",masterSiteId:"ganomaster-business"}`. It is invoked once inside the site's reviewed coordinator. The explicit queue call is the existing `enqueueReviewed` with a freshly pinned exact intent, not an additional automatic source-change event. No `afterSourceChange` invocation or existing automation modification. Wake happens after releasing manual site ownership, through the existing independent-context helper; durable jobs survive an asynchronous wake rejection.

`MasterSitesBusinessCommandError` exposes safe `code`, `status`, `blockedReasons`. Command codes are `MASTER_SITES_FORBIDDEN`, `MASTER_SITES_REVIEW_CONFLICT`, `MASTER_SITES_BUSINESS_BLOCKED`, `MASTER_SITES_OPERATION_CONFLICT`, `MASTER_SITES_STORAGE_CONFIGURATION_INVALID`, `MASTER_SITES_PROVISIONING_NOT_CONFIGURED`, `MASTER_SITES_PACKAGE_INVALID`. Retry results carry `MASTER_SITES_REVIEW_REQUIRED`, never raw failures.

## HTTP adapter

`createMasterSitesBusinessRouteHandlers(options?: MasterSitesBusinessRouteHandlerOptions)` returns `{GET, prepareTarget, publish}`. Options are `authorize?: typeof authorizeMasterSitesOperator` and `services?: () => {preview,commands}`. This optional factory is backend-only; Next wrappers export only supported `runtime`, `dynamic`, and GET/POST fields.

- GET `/api/internal/master-sites/business`.
- POST `/api/internal/master-sites/business/prepare-target`.
- POST `/api/internal/master-sites/business/publish`.

Real verified-human authorization precedes method dispatch, business body parsing and dependency creation. POST then parses strict shared single-partner schemas before creating services. Returned read/result/error shapes pass shared schemas; snapshots, identity payloads, private jobs, operation records and provider exceptions are never serialized. Every handled response includes `Cache-Control: no-store`.

Statuses: auth's 401/403 (and JSON-media 400); invalid body 400; partner missing 404; review/blocked/busy/store/retry/provisioning conflict 409; new ENQUEUED or TARGET_PENDING 202; ready/current/already-scheduled 200. Explicit invalid handler method 405; unknown internal exceptions generic `MASTER_SITES_INTERNAL_ERROR` 500. Known publication busy/corrupt/reviewed-intent/master-refresh/idempotency errors are allowlisted to 409. No raw-error string reflection.

## Durable operation and recovery

Request binding is immutable actor subject SHA-256, action, partner, site, template, original expected revision and updateExisting. Prepare binds false. Request reuse for another actor/action/partner/revision/update flag rejects before reading a different partner.

Initial review/eligibility and identity are rebuilt under the bound site coordinator. A further fresh read after each durable pre-effect checkpoint catches authority edits during the checkpoint, before provider/generation/enqueue. READY target is not reprovisioned or reset to PENDING. Active jobs return ALREADY_SCHEDULED without generation; verified CURRENT returns ALREADY_CURRENT unless updateExisting explicitly requests generation.

The existing store's hash-only pins have these command meanings:

- `sourceHash`, `targetHash`, `masterPackageHash`: exact artifact hashes; absent source/target is SHA-256 of canonical JSON null.
- `reviewedRevision`: internal stable authority hash covering owner/site/domain, partner data/onboarding, current commercial provenance and master revision. The exact browser-reviewed revision remains in immutable `binding.expectedRevision`. This separate authority pin permits only owned source/target progression, not domain/contact/entitlement/master edits.
- `generationInputHash`: normalized effective Business input with master inheritance, suitable for comparing the actual generated source and fresh authoritative input.
- `packageHash`: generated package inventory hash; `jobId`: exact reviewed publication intent hash.

`PREPARING_TARGET` or `GENERATING` is durable before the effect. Completion must be reread and checkpointed as `TARGET_PREPARED` or `GENERATED`. An interrupted/uncheckpointed effect is uncertain: replay returns RETRY_REQUIRED, never guesses success or regenerates. A new explicit review/request is required; stale orphan site/store claims still need separately authorized evidence-preserving reconciliation, never automatic deletion.

`ENQUEUEING` pins the exact job ID before enqueueReviewed. A lost enqueue response recovers the matching job; a failure before enqueue resumes only with exact source/target/master/package and fresh authority/input. No code edits job/journal records. Failed/cancelled work requires fresh review rather than returning prior ENQUEUED success.

Successful worker progression can legitimately change the target hash and regenerate package bytes. Replay accepts that exception only when the same pinned job is the preview's CURRENT job with verified journal/evidence and matching owner/source/master authority. Fresh CURRENT commands remain no-ops; explicit update is separately enqueued. Historical target READY alone never proves publication.

Store STORAGE_ERROR after rename is handled by rereading and accepting only the exact expected binding/version/phase/merged pins/result. A missing/old/mismatching record is not rollback permission. Ownership-lost, busy/corrupt/orphan claims remain closed, without retries that delete locks.

## TDD and verification

Initial six command tests against explicit NOT_IMPLEMENTED scaffolds: **0/6**; initial three route tests against 501 scaffold: **0/3**. Failures were missing behavior, not broken imports.

Additional observed RED/GREEN:

- Lost enqueue response plus altered package incorrectly returned ALREADY_SCHEDULED; exact package pin guard fixed it.
- Failed worker replay incorrectly returned ENQUEUED; now RETRY_REQUIRED without changing job state.
- HTTP completed-request replay initially returned 202; active replay now ALREADY_SCHEDULED/200.
- Late authority changes at PREPARING_TARGET/GENERATING/ENQUEUEING checkpoints initially allowed their respective effects; fresh effect-boundary reads prevent all three.
- Early builds exposed nullable public DTO vs non-null store-result typing and TypeScript control-flow narrowing around a never helper; fixed only own annotations/helper declaration, without contract/config changes.

Final combined command, run under `app/web`:

```powershell
node --conditions=react-server --experimental-strip-types --experimental-loader ./scripts/node-test-alias-loader.mjs --test shared/master-sites-business-contract.test.ts server/auth/masterSitesOperatorAuth.test.ts server/auth/cloudflareAccessAuth.test.ts server/services/masterSitesBusinessPreviewService.test.ts server/services/masterSitesBusinessInput.test.ts server/services/businessPublicationSiteCoordinator.test.ts server/services/masterSitesBusinessOperationStore.test.ts server/services/masterSitesBusinessCommandService.test.ts server/services/masterSitesBusinessRoutes.test.ts server/services/publicationJobService.test.ts server/services/publicationJobWorkerService.test.ts server/services/publicationEventEnqueueService.test.ts scripts/business-publication-site-coordination.integration.test.mjs scripts/business-master-package-drift-recovery.integration.test.mjs scripts/claudia-business-generation.integration.test.mjs server/services/businessWhatsappCta.test.ts server/services/productPageGenerationBusinessCta.test.ts server/services/businessProductHeroCorrelation.test.ts server/services/businessVslPoster.test.ts server/services/partnerEcosystemEntitlementCore.test.ts server/integrations/hostingerSubdomainClient.test.ts server/integrations/hostingerDnsClient.test.ts server/services/subdomainProvisioningService.test.ts server/services/publicationTargetResolver.test.ts
```

Result: **220/220, exit 0**, including **32 new command/route checks**. Local full log: `.superpowers/sdd/2026-10-20-business-master-sites-manual-delivery/task-4-tests.log`. Tests run actual preview, entitlement, generator/source/history, store, coordinator, provisioning, jobs and worker metadata using temporary files; only external hosting/DNS/readiness/publication and wake are modeled. Fault-injection wrappers retain real services. The worker terminal test models its publication/verification journal and changed package, not actual SFTP; existing guarded integration suites cover their own adapters. Signed local RS256 JWTs exercise the actual auth chain. Tests preserve Product-source/apex bytes and selected-site-only provisioning.

- Exact ESLint for seven new code files: exit 0.
- Final `npm.cmd run lint`: exit 0.
- Final `npm.cmd run build`: exit 0, TypeScript complete, 39 static pages, three new dynamic API routes.
- `git diff --cached --check`: exit 0 before code commit.
- Known Node experimental-loader/module-type warnings and Next multiple-lockfile/NFT trace warnings remain. The new routes expose the store in an NFT trace; no warning suppression/config edit.

There is no generic npm test. No standalone raw tsc or full all-test-script sweep was claimed. CDX-011 owns that final gate. The nine baseline legacy failures documented/proven by 009 remain historical context, not failures of this passing targeted run and not repaired here.

## Review, rulings and remaining gates

Author self-review covered every task-4 item, strict projection, auth ordering, root binding, site→short-metadata lock order, provider scope, pre-effect durability, exact recovery pins, CURRENT progression, actor binding and no-overlap. No remaining implementation issue identified within this bounded task; this is not independent review approval.

Rulings within the approved brief: use enqueueReviewed for exact reviewed-intent protection; distinguish immutable browser revision from the stable internal recovery-authority pin; fail closed rather than infer completion of uncheckpointed generation/provisioning. Cost: uncertain effects require explicit reconciliation/review and cannot be transparently retried. No architecture expansion, new automatic trigger, DTO change or delegated subagent.

Required next gates: controller independent review; CDX-011 complete script/integration sweep and Antigravity contract integration; separately authorized real operator allowlist and selected-partner production operation. Opening Master Sites must remain read-only. No assertion that the feature is productively enabled or that any customer was published by this ticket.

## Review remediation — 2026-10-20

Independent review identified two P2 findings after the initial report. Both were reproduced with real queue/store fixtures and corrected only in the owned command service/test; receiving-code-review and TDD guided the bounded changes.

- A fresh publication request with the same approved normalized input and exact terminal intent now calls existing `jobs.retry` for FAILED or CANCELLED under the site lock, without regenerating source/package or provisioning. Fresh authority, source/target/master, input and package pins are checked at the effect boundary. Current actor audit stays in the new operation; original job actor audit is retained by the existing retry API. Both updateExisting values work.
- Before retry, ENQUEUEING persists a safe internal RETRY_REQUIRED result carrying `MASTER_SITES_RETRY_PENDING` and the exact job/artifact pins. This marker is never success. Replay can reconcile a matching active job (or verified CURRENT progression) but never repeats retry or falls through to enqueue when terminal/missing. After successful retry, ENQUEUED clears the internal marker and COMPLETE stores the public result. No store/schema/DTO or job/journal implementation edits.
- Missing pinned job in durable ENQUEUED or COMPLETE now returns RETRY_REQUIRED, including when the final result was never checkpointed. It cannot recreate lost queue evidence.

Observed RED: missing-job ENQUEUED and COMPLETE-without-result recreated a job; four explicit terminal retries returned RETRY_REQUIRED; five retry effect-fault cases failed to reach the retry transition. GREEN adds preserved manifest/source/target and actor audit assertions, lost response and post-effect checkpoint faults, terminal/missing replay, stale authority/source/target/master/package before effect and after response loss, and actual worker progression after explicit retry.

Final same combined command above: **249/249, exit 0** (command/routes now 61 checks, 29 additional checks including subtests). Full local log: `.superpowers/sdd/2026-10-20-business-master-sites-manual-delivery/task-4-review-fixes-tests.log`. `npm.cmd run lint`, `npm.cmd run build` (39 pages) and `git diff --check` all exit 0. Existing Node/Next warnings unchanged. Source frozen at `54a5bcb0c0c3053f063301ab5e1d0b8f708e1c93` for scoped independent rereview. APIs, route factory and public error/status contract unchanged. No push/merge/providers/production; final 011 and productive enablement gates remain open.

## Independent acceptance

Scoped security/spec/quality rereview approved at `dbeffe9c9f1eb3b371577059e33a95cbc6aef8cf` (source `54a5bcb`): both P2 findings closed, no new actionable findings. Reviewer independently ran 109/109 focused checks plus 2/2 original reproductions, exact modified-file ESLint and diff check. Controller independently reran all 61 command/route checks, exit 0. No duplicate reviewer build or claim of global CI readiness.

Accepted declined-to-judge boundaries remain assigned: frontend/UX AGR-001; all-script and full-flow integration CDX-011; signed administrative identity/allowlist configuration and selected production operations at the release gate. These are pending dependencies, not waived requirements. This acceptance covers the bounded backend slice only; it does not enable UI controls, assert deployment, or publish customers.
