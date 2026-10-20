# CDX-20261020-021 — Product destination prevention

Status: independent corrective review approved; ready for reviewed GitHub integration. Date: 2026-10-20.
Owner: Codex backend; balanced implementation with independent premium tenant/security review required.
Branch: `codex/CDX-20261020-021-product-destination-prevention`.
Base: `17c5fab25bff3b9a34dd94e4f60be6f17a057d8a`.
Current source freeze: `ca1f1cf35911918e83455adc5349393e027ac457` (P1 review fixes). Original source freeze: `79823db71d45ffe8a3d542d18aaba11c2f036089`. No push, PR, merge, deployment, provider action, or real runtime metadata write.

## Outcome and scoped files

Controller release evidence: original independent review reproduced two P1 tenant-isolation failures; both corrected in ca1f1cf. Scoped independent re-review approved with no remaining Critical/Important/Minor findings, 61/61 focused and46/46 supplemental/adversarial checks. Controller freshly verified61/61, lint/build exit0 (39pages), clean diff. Existing nine baseline failures remain explicitly disclosed below. Approval covers021 only:023 writer coverage and022 reviewed metadata APPLY/deployment remain separate blocked gates. No real runtime metadata was changed by this verification.

- `app/web/server/services/productPageLeadSyncService.ts` and new test: preserve onboarding base-domain value and legacy IDs; canonical effective Product host; later edits cannot restore apex. Missing ecosystem defaults Product, explicit Business/Brand and masters retain previous behavior. Preserve existing Product root/site/distributor metadata while schema-validating the editable data. Preserve-existing mode retains the selected source's tenant/domain.
- `app/web/server/services/productPublicationDestinationPolicy.ts`: narrow Product-only destination policy. Derives canonical hostname through existing hostname contract. Rejects missing/ambiguous/foreign source, lead, target, account/root evidence. Does not infer owner from names or target self-assertion.
- `app/web/server/services/publicationTargetService.ts`: optional Product context, authoritative lead read, read-only explicit target read. Product does not invoke the generic target reader's v1-to-v2 persistence. Generic callers remain unchanged.
- `app/web/server/services/publicationTargetResolver.ts`: optional snapshot identity fields only; existing generic fallback semantics unchanged.
- `app/web/server/services/productPagePublicationService.ts` and new test: nonmaster Product, including legacy unsuffixed IDs and missing ecosystem field, always supplies validated context before package access/transport. Bypasses legacy remote-root fallback entirely for Product. Business/Brand/master retain existing resolution.

## Identity and trusted configuration contract

The source schema has no mandatory owner field. Ownership is derived from the existing authoritative activation lead store: exactly one lead must match source site ID, or the established canonical `<lead.siteId>-product` identity. Derived IDs additionally bind the lead's validated onboarding base to canonical source host and target. Duplicate exact/derived candidates fail closed; target owner alone, display names, or matching domains alone cannot establish ownership. Target `ownerKey` must equal that lead's UUID. Optional source/root-site `ownerKey`, `activationLeadId`, and `baseDomain` evidence must agree when present.

Nonmaster Product requires explicit version-2 READY PRODUCT target with exact site ID/base/canonical host and root `/home/<configured SFTP username>/domains/<base>/public_html/producto`. `rootEcosystemType` is not a grant to publish apex. Account comes from trusted environment configuration, not client input or target claims. Global fallback root may belong to another website but must match the configured account. Trusted base-root template `/home/<username>/domains/{domain}/public_html` and already-suffixed `/producto` template are supported; absent template safely derives from configured account. A configured site mapping must equal the exact Product root. Old account/foreign domain/apex/traversal roots reject before transport. Errors contain no credentials or foreign identity detail.

Base-domain normalization trims/lowercases and removes one `www.`; rejects prefixed/ambiguous Product/Business/Brand bases and master domains. Effective Product source must be canonical; old apex source stays blocked while 022 is pending. No source IDs, Brand records, contacts, tracking values, commercial states or master locations were migrated by this ticket.

## RED/GREEN and verification

Real temporary source/target/activation/output files exercise the production services. Only SFTP transport and network-backed verification are faked. Local activation state/history writes remain real in temporary directories.

- Initial RED: 3 lead-sync failures reproduced apex assignment, www host assignment, and accepted double-prefix input; 21 publisher failures proved unsafe inputs reached transport. Additional preserve-existing-domain RED caught tenant/domain switching; fixed within lead-sync semantics.
- Final focused command: `node --conditions=react-server --experimental-strip-types --experimental-loader ./scripts/node-test-alias-loader.mjs --test server/services/productPageLeadSyncService.test.ts server/services/productPagePublicationService.test.ts`: **42/42 passed** (11 lead sync, 31 publisher).
- Coverage: all six current legacy IDs; apex-to-canonical first sync and later edit; normalization and preserve-existing canonical www source; no double prefix; protected values; Business/Brand/master exceptions; missing/not-ready/wrong-site/owner/base/host/type/root/account target; source apex/foreign identity; unknown/ambiguous owner; no v1 target mutation; mapping/template bypass; exact root success; canonical derived Product ID.
- Full existing `test:*` sweep: **70 scripts executed, 67 exit 0, 3 exit 1**, nine failed test cases listed below. No generic `npm test` script exists. Controller independently reproduced the same nine failures on base 17c5fab in the untouched-source 022 checkout.
- Final relevant rerun after narrow preserve-existing correction: `test:partner-hostnames` 39/39; `test:hostinger-only` 31/31; `test:publication-jobs` 17/17; `test:publication-job-worker` 9/9; `test:publication-events` 7/7; `test:publication-backfill-preview` 5/5; `test:publication-backfill-executor` 7/7; `test:hero-sync` 6/6; `test:ecosystem-generation-contract` 14/14.
- Final `npm run lint`: exit 0. Final `npm run build`: exit 0, 39 pages generated; configured Next TypeScript phase passed. `git diff --check`: clean.
- Preserved Node experimental-loader and MODULE_TYPELESS_PACKAGE_JSON warnings. Next emitted existing multiple-lockfile/workspace-root warning and NFT tracing warning referencing masterSitesBusinessOperationStore; no tooling/config edits.
- Exploratory standalone `npx tsc --noEmit --incremental false`: exit 2, 107 diagnostics, all in existing test files (TS5097 import-extension issues and known test fixture typing such as missing NODE_ENV/readonly/vsl). No diagnostic in these seven new/modified implementation/test files. This is not a standalone-tsc-green claim; no unrelated fixture changes were made. The generated exploratory tsbuildinfo artifact was removed and excluded from commits.

### Named existing failures (baseline identical)

`test:jairo-business-source-dry-run` (13/14):

- the repository canonical Business artifact produces a placeholder-free partner projection.

`test:jairo-business-publication-preview` (6/9):

- creates one fresh capability manifest and returns a provider-free PREVIEW.
- isolates generator side effects, installs the package and returns unblocked publication PREVIEW.
- rolls back the previous package when the installed PREVIEW detects drift.

`test:jairo-business-sftp-capability-renewal` (4/9):

- PREVIEW binds exact expired evidence and performs no provider operation.
- APPLY archives bytes exactly and returns the next provider-free probe PREVIEW.
- rerunning the same authorized APPLY is idempotent.
- PREVIEW ignores immutable archives owned by the historical renewal request.
- two successive capabilities archive independently by their exact content hashes.

These are existing Business artifact/target identity fixtures (`PUBLISHING_TARGET_IDENTITY_INVALID` / `TARGET_IDENTITY_OR_STATE_INVALID`), not repaired under 021. A full-suite-green claim is not made.

## Follow-up and integration risks

- Independent security/tenant review is mandatory before merge; source is frozen and publisher ownership remains exclusive to 021 until controller hands it off.
- 022 APPLY must remain blocked: no shared Product exclusion currently protects source save, generation, direct publisher, queue claim/retry/worker, and metadata writer together. A momentary idle-job check or boolean flag is not exclusion proof. Controller sliced 023 for this shared claim/maintenance boundary. No queue/source/generator edits were added here.
- 023 publisher integration must wrap the complete nonmaster Product publish operation with the reviewed shared Product claim before reading source/target through completion of remote writes, verification, and state/history effects. Existing Business coordinator must remain unchanged. This is a sequential publisher-file handoff after reviewed 021 integration, not simultaneous editing.
- 022 must use reviewed canonical base/owner/root evidence, preserve IDs/content/commercial state, and create only verified absent targets. This ticket changes no real runtime source/target; current apex sources or missing targets intentionally block publication until reconciliation.
- Queue legacy unsuffixed-ID compatibility remains separately scoped; this change does not rename IDs or alter queue contracts.
- No runtime/provider readiness or production safety declaration is implied by local tests/build.

## Independent review corrections — 2026-10-20

Independent review blocked the original freeze on two reproduced P1 tenant bypasses. Both were corrected in source commit `ca1f1cf35911918e83455adc5349393e027ac457`; independent re-review is still required, not assumed passed.

1. A source could claim PERSONAL_BRAND (or BUSINESS with a matching slug) while its explicit target remained PRODUCT, bypassing the Product context and reaching foreign/apex roots. Root cause: source-only exception selection. All nonmaster publisher calls now pass trusted site context. The service reads the explicit target without mutation and checks source/target ecosystem equality before selecting generic resolution, evaluating the lazy legacy-root callback, or invoking v1 migration. Generic target rereads are checked again. Matching Brand/Business and master behavior remains covered. No new Brand/Business ownership architecture was added.
2. A unique site-ID lead did not prove exclusive ownership of the physical domain root: another distinct lead owner with a different site ID could claim the same base. Product now checks all authoritative leads for distinct-owner normalized-base collisions, including lowercase/trim/www aliases, before accepting source/target/root. This applies to both legacy IDs and canonical derived Product IDs. Unrelated base domains do not block a valid owner.

RED/GREEN evidence: three new actual-publisher failures reproduced ecosystem-discriminator bypasses; after correcting that boundary, four additional actual-publisher failures reproduced same-base distinct-owner collisions across legacy/derived IDs and normalization aliases. Each failed with missing expected rejection before its corresponding fix. All now reject before fake SFTP effects; a different-base positive control still publishes.

Fresh corrective verification:

- Same focused real-service command above: **50/50 passed** (11 lead-sync, 39 publication-boundary tests).
- All **70 existing test:* scripts re-executed: 67 pass / 3 baseline-red suites**, with exactly the same nine named failures listed above (13/14 source dry run, 6/9 publication preview, 4/9 SFTP renewal). No new failing script or unrelated fixture edits.
- `npm run lint`: exit 0. `npm run build`: exit 0, 39 pages, configured TypeScript phase passed. Existing workspace/multiple-lockfile and two NFT trace warnings preserved. `git diff --check` and staged diff check clean.
- Only four previously declared source/test files changed for these fixes. 023 publisher ownership remains excluded pending controller review/merge/handoff; 022 APPLY remains blocked on its reviewed shared exclusion dependency.
