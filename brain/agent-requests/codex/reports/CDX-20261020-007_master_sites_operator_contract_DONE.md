# CDX-20261020-007 — Master Sites operator contract

- Request ID: CDX-20261020-007.
- Status: implementation and self-review complete; independent controller review and integration gates remain.
- Branch: `codex/CDX-20261020-007-master-sites-operator-contract`.
- Main code commit: `958f8b3ad30a60a937f3764a7a410f12ee8576f2`; initial report `8b8ebe0e440281f04bcf9b72784fee28ef8146ed`; final follow-up adds preview-path regression/correction and updates this report. Base `d9b737a793f27c8fc9ec8a861717e03e5206872f`. No PR, push or merge.
- Changes: existing administrative Access verifier reused; HUMAN JWT email normalized against a server CSV allowlist, blank denies; exact POST Origin and JSON guards; safe typed auth errors; strict client-safe one-partner Business DTOs and safe read/result/job shapes; blank environment example only.
- Changed areas: `app/web/server/auth/masterSitesOperatorAuth.ts` and `.test.ts`; `app/web/shared/master-sites-business-contract.ts` and `.test.ts`; `app/web/.env.example`; request007 and this report; task-1 report under `.superpowers/sdd/2026-10-20-business-master-sites-manual-delivery/`. No routes/publication/UI/Prisma/prod changes.
- Verification: initial RED 7 failures/1 pass against importable nonimplemented scaffolds; self-review preview-path RED 1 failure/3 pass, corrected schema to accept same-origin preview paths. Final auth+DTO 9/9 and original Access 10/10; targeted lint and full lint passed. Build initially caught TS5097 in the new production import; corrected to existing alias convention, then focused tests/targeted lint and build passed (39/39 static pages). Final build was rerun after the preview-path correction.
- Warning scope: existing Node module/loader warnings and Next workspace-lockfile/NFT tracing warnings remain. Ancillary Codex capture-ref lock warning during commit did not prevent the successful commit; no lock touched. Full repository scripts are deferred by controller instruction to CDX-20261020-011; this is not full-suite verification.
- Contracts produced: 10 Zod/type pairs in client-safe `shared/master-sites-business-contract.ts`; `authorizeMasterSitesOperator`, injectable `createMasterSitesOperatorAuthorizer`, typed auth error class/code/options in server auth. Detailed commands/output/TDD evidence are in local ignored `.superpowers/sdd/2026-10-20-business-master-sites-manual-delivery/task-1-report.md` (not force-added).
- Risks/follow-up: controller independent review before 008/010/AGR consume the frozen DTO; route producers must safely project internal fields and set `no-store`, and 008/010 own semantic/currentness/revision/exclusion/idempotency enforcement. 011 must perform final regression/integration. Production allowlist remains unconfigured/deny-by-default; no Access-policy changes authorized or performed.
- Integration: safe alongside non-overlapping AGR-20261020-001 and CDX-20261020-009 work; downstream consumers must not rewrite these owned contract files. No additional implementation follow-up needed inside 007 scope at handoff.

## Frozen exports for 008/010/AGR

Client-safe `app/web/shared/master-sites-business-contract.ts` (Zod only; strict shapes):

| Schema | Inferred output type |
| --- | --- |
| `masterSitesBusinessStatusSchema` | `MasterSitesBusinessStatus` |
| `masterSitesBusinessOutcomeSchema` | `MasterSitesBusinessOutcome` |
| `masterSitesSafeJobSchema` | `MasterSitesSafeJob` |
| `masterSitesBusinessTemplateSchema` | `MasterSitesBusinessTemplate` |
| `masterSitesBusinessPartnerSchema` | `MasterSitesBusinessPartner` |
| `masterSitesBusinessReadResponseSchema` | `MasterSitesBusinessReadResponse` |
| `masterSitesBusinessPrepareTargetRequestSchema` | `MasterSitesBusinessPrepareTargetRequest` |
| `masterSitesBusinessPublishRequestSchema` | `MasterSitesBusinessPublishRequest` |
| `masterSitesBusinessCommandResultSchema` | `MasterSitesBusinessCommandResult` |
| `masterSitesErrorResponseSchema` | `MasterSitesErrorResponse` |

Server auth exports: `authorizeMasterSitesOperator(request: Request): Promise<CloudflareAccessIdentity>`; factory `createMasterSitesOperatorAuthorizer(options?: MasterSitesOperatorAuthorizerOptions)` with `{source?: NodeJS.ProcessEnv, keyResolver?: JWTVerifyGetKey}`; `MasterSitesOperatorAuthError` class; `MasterSitesOperatorAuthErrorCode` and `MasterSitesOperatorAuthorizerOptions` types. No frontend import of server auth.

Safe route mapping: `MasterSitesOperatorAuthError.status` and `{error: error.code}`. `ACCESS_TOKEN_MISSING`/`ACCESS_TOKEN_INVALID`:401; `MASTER_SITES_FORBIDDEN`/`MASTER_SITES_ORIGIN_FORBIDDEN`/`MASTER_SITES_AUTH_CONFIGURATION_INVALID`:403; `MASTER_SITES_JSON_REQUIRED`:400. Never serialize errors or identity payloads.

SafeJob.id is lowercase hex64, matching existing durable publication jobs; optional completedAt/lastErrorCode are omitted, not null. Other absent site/host/revision/job fields are nullable. Publish input may omit updateExisting (parsed output defaults false). Prepare forbids it. Preview URL supports relative paths. Errors/reasons are safe codes, not raw prose. Commands are one-partner only; UI's max-10 group is not a server bulk API.

Reproduce from `app/web`: `node --experimental-strip-types --experimental-loader ./scripts/node-test-alias-loader.mjs --test server/auth/masterSitesOperatorAuth.test.ts shared/master-sites-business-contract.test.ts`; `npm.cmd run test:cloudflare-access`; `npm.cmd run lint`; `npm.cmd run build`.
