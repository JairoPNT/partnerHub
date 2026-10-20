# CDX-20261020-008 — Business preview/input DONE

## Outcome and scope

- Owner: Codex / Backend Lead. Code commit `42eb2ab`; branch `codex/CDX-20261020-008-master-sites-business-preview`, base `b84c942906837464933dc723bf55e329e894fa48` (reviewed 007/PR #213).
- New authoritative read-only overview/internal snapshot and Business input assembler. Existing automatic behavior is unchanged. No routes were added; HTTP auth, no-store and commands remain 010.
- Modified only the four assigned new service/test files, request and this report. No frontend, auth, shared DTO, generator/source service, worker/job service, adapters, schema or infrastructure edits. No production/provider calls, pushes, PRs or merges. Controller owns independent review and integration.
- Read AGENTS, brain current/model/parallel/request policies, approved design/plan and task brief plus reviewed 007 exports. Used TDD, test-hygiene and verification skills. Self-review completed; did not spawn subagents.

## Behavior

Partners come from fresh activation records, including blocked/archived rows, not existing sources. BUSINESS_ONLY needs neither Product nor any saved source. Inputs omit checkout/purchaseUrl and master identity/tracking; retain authorized Business presentation and partner integrations, force fresh partner name/brand/domain/WhatsApp, use nonempty Business SEO and the locally approved Business VSL (current canonical v2). Poster uses the existing safe fallback; the unchanged generator resolves optional same-owner Product heroes later.

Commercial defaults mirror existing grant-service provenance: include activation offer only for PAID/CONVERTED, confirmed manual ledger commercial snapshots regardless of lead status, and active Business grants evaluated by the existing service. NEW plus unpaid offer is blocked; NEW plus confirmed Business ledger payment or active Business courtesy is eligible. Revocation removes grant eligibility unless an independent payment still supports Business. CANCELLED/ARCHIVED always block. No payment or converted-state writes occur.

All local target/source JSON identities are inventoried before selecting a record. Invalid/malformed entries, duplicate identities, foreign owner/domain, unsafe/colliding/nested remote roots and known hosting/migration conflicts fail closed. Valid target PENDING/null remoteRoot stays TARGET_PENDING and may be explicitly resumed. No `.find()` selects an ambiguous inventory match.

Review hash is stable over sorted material: template revision/package hash, effective partner input, identity/status, effective commercial snapshots/grants/ecosystems, Business source/absence and target/absence plus blockers. No query timestamp. Local canonical and generated master inventory both affect revision; package hash uses the publication job's inventory algorithm. Source/target hashes retain exact stored bytes.

CURRENT requires current identity/source hash/master package, fresh effective identity/WhatsApp/tracking/VSL, SUCCEEDED job and COMPLETE evidence matching a unique terminal journal with verified success. Journal initial target hash matches the job and final target hash matches current bytes: metadata changes during PENDING -> READY do not falsely mark a verified publication unpublished. GA4 stored only under `analytics` is normalized by effective value. READY on a target or historical lead label alone does not prove CURRENT. Duplicate committed journal/job evidence blocks. Active jobs block all input mutation actions even if their intent/source is stale.

## Frozen integration exports for 010

`app/web/server/services/masterSitesBusinessPreviewService.ts` (server-only):

- `createMasterSitesBusinessPreviewService(overrides?: Partial<MasterSitesBusinessDependencies>)` -> `{get(): Promise<MasterSitesBusinessReadResponse>, getPartner(activationLeadId: string): Promise<BusinessPartnerSnapshot>}`.
- `masterSitesBusinessPreviewService`: default read-only instance.
- Types: `BusinessPartnerSnapshot`, `MasterSitesBusinessDependencies`, `MasterSitesBusinessLead`, `MasterSitesBusinessInventoryEntry`, `MasterSitesBusinessJournalEntry`, `MasterSitesBusinessMaster`.

Dependency contract (tests can inject all IO; omitted members use local production readers):

```typescript
listLeads(): Promise<MasterSitesBusinessLead[]>;
getEntitlement({activationLeadId}: {activationLeadId: string}): Promise<unknown>;
readTargets(): Promise<{siteId: string; hash: string; value: unknown}[]>;
readSources(): Promise<{siteId: string; hash: string; value: unknown}[]>;
readMaster(): Promise<MasterSitesBusinessMaster>;
listJobs(): Promise<unknown[]>;
readJournals(siteId: string): Promise<{hash: string; value: unknown}[]>;
```

`MasterSitesBusinessMaster` = `{revision, packageHash, previewUrl: string|null, content: {vsl, hero?, theme?}}`; vsl/theme/hero use generation-input field types. Revision/hash are lowercase hex64. Production master reads canonical Business content plus generated master package inventory; preview is same-origin `/api/internal/product-pages/preview/ganomaster-business`, not a fabricated published URL. Importing creates no writes/provider calls.

Snapshot fields: `activationLeadId`, `ownerKey`, `ownerSiteId`, `siteId`, `baseDomain`, `publicHost`, `reviewRevision`, `partner`, `template`, `lead`, `entitlement`, `master`, `source`, `sourceHash`, `target`, `targetHash`, `input`, `jobs`. Identity/hash material is nullable when absent; reviewRevision always exists. **Never serialize the snapshot.** Only `get()` or the snapshot's `partner`/`template` projections are UI-safe. The snapshot includes private job and target evidence.

`app/web/server/services/masterSitesBusinessInput.ts` (server-only):

- `buildMasterSitesBusinessInput(snapshot: BusinessPartnerSnapshot): ProductPageGenerationInput`: returns a newly parsed/validated copy; throws `MASTER_SITES_BUSINESS_INPUT_BLOCKED` for BLOCKED/busy/no input.
- `assembleMasterSitesBusinessInput({lead,siteId,publicHost,whatsapp,master,source})`: internal pure assembly primitive used by preview, not an authorization gate. Commands should use the snapshot builder, not call this primitive with browser material.

010 must get a fresh snapshot **under exclusion**, compare expectedRevision, check `partner.canPrepareTarget/canPublish`, and explicitly require updateExisting for CURRENT (`canPublish=true` indicates eligibility, not consent to update). TARGET_PENDING has canPrepareTarget=true for explicit retry/resume, canPublish=false. The builder can form valid material before a target exists; that does not authorize publication. Missing partner throws safe `MASTER_SITES_PARTNER_NOT_FOUND`; map it to 404 without serializing exceptions. HTTP routes must authorize and set `Cache-Control: no-store`. Snapshot reads perform no generation, provisioning or enqueue.

## Verification

Working directory `app/web`:

1. Initial Node tests against explicit NOT_IMPLEMENTED scaffolds: RED, 0/10; after confirmed-manual test, RED 0/11, no missing-import error. GREEN followed implementation.
2. Self-review regressions watched RED -> GREEN: analytics-only effective tracking / pending null-root / unsafe and nested root / hosting conflict / duplicate terminal evidence. Real-reader canonical-v2 test first exposed missing partial-default support, then produced semantic RED (BLOCKED rather than TARGET_REQUIRED) against historical-v1 validation; fixed to use validated local master VSL, then GREEN. No historical v1 URL is hardcoded in production.
3. Final new suites: 15/15. Real-reader test uses isolated temporary directories, actual activation/ledger/core/template/hash readers and real input assembler; only job IO is injected. It creates a confirmed ledger record without changing NEW status, verifies v2 input and stable/drifting revisions, and proves broken target JSON remains a blocker. Test cleanup removed only owned temporary fixtures.
4. `npm.cmd run test:partner-entitlement`: 11/11, exit 0.
5. `node --conditions=react-server --experimental-strip-types --experimental-loader ./scripts/node-test-alias-loader.mjs --test server/services/masterSitesBusinessPreviewService.test.ts server/services/masterSitesBusinessInput.test.ts server/services/businessMasterContent.integration.test.mjs server/services/businessProductHeroCorrelation.test.ts server/services/businessLegacyProductHeroCorrelation.test.ts server/services/businessVslPoster.test.ts server/services/productPageGenerationBusinessCta.test.ts server/services/businessCommercialReadinessService.test.ts server/services/publicationBackfillPreviewService.test.ts`: final 64/64, exit 0.
6. Exact four-file ESLint: exit 0, no errors/warnings. Initial no-control-regex lint failure was fixed with explicit character validation and rerun.
7. `npm.cmd exec prisma generate`: exit 0; local client only, required after prepared npm ci --ignore-scripts. No DB/migrations.
8. Final `npm.cmd run build`: exit 0, compiled, TypeScript complete and 39/39 static pages generated. A prior pre-self-review build also passed. Retains existing multiple-lockfile and NFT publicationJobWorkerService/instrumentation warnings; not warning-free.
9. `git diff --cached --check`: exit 0 before code commit; source boundary checked. Only own exploratory `app/web/tsconfig.tsbuildinfo` was removed and excluded from commits (regenerable).

Exploratory direct `npx.cmd tsc --noEmit --pretty false` was **not** green: repository test `.ts` import TS5097, existing ProcessEnv/other test typing diagnostics and missing pre-generate Prisma client; new fixture-widening diagnostics were corrected. Next's final actual build completed its production TypeScript check. No claim of standalone tsc/full test-script GREEN. Node tests retain existing MODULE_TYPELESS_PACKAGE_JSON and experimental-loader warnings.

## Remaining gates and risks

- Independent controller review before integration; 010 owns commands/status/error/no-store projection and 011 owns all declared test scripts plus final cross-ticket/production validation.
- No live Claudia data was read. CURRENT evidence is verified with local job/journal fixtures, not a new production assertion or publication.
- Fail-closed inventory is deliberately broader than the old reader: unsupported legacy v1 targets or malformed unrelated records can block the overview. Reconciliation/migration is a separate authorized ticket, never silently filtering or rewriting records here.
- Defaults use the existing file-backed commercial source-of-truth and job service. Inject full IO for isolated command tests; job service default directories are captured by its existing factory at import.
- Any explicit update of CURRENT must remain operator-confirmed. Opening this overview grants no production mutation authority. No unresolved source overlap or shared-contract change.

Follow-up: reviewed handoff to CDX-20261020-010 and final CDX-20261020-011 regression/production gate; no extra feature added here.
