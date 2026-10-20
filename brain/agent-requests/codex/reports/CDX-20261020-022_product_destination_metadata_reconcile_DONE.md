# CDX-20261020-022 — Product destination metadata reconcile implementation

Date: 2026-10-20. Owner: Codex Backend Lead. Status: **implementation frozen, independent review / integration pending**. No production reconciliation, provider action, publication, push, merge or deployment was performed.

## Round 3 — bounded source classification guard

Current source freeze: `62d42b02965eb7cb26616547a28be5a43268149d`. Scoped re-review confirmed the two previous fixes but reproduced an invalid source ecosystem (`TYPO`) bypassing the Product apex collision check; the runtime normally defaults invalid values to Product. A single raw-inventory guard now permits only absent `ecosystemType` or exact PRODUCT/BUSINESS/PERSONAL_BRAND and blocks all explicit invalid enums/types as ambiguous. This does not introduce a generalized DTO validation or alter runtime classification.

Six filesystem regressions (`TYPO`, lowercase `product`, null, number, object, array) were RED then GREEN. Legacy undefined Product and legitimate Jairo Brand apex coverage remains green. Focused integration **77/77**, actual Node20 packaging **58/58**, forced scoped lint and diff check passed. The last full 72-script sweep/build is the round-2 run documented below; final merged-root verification is still pending. This freeze was not rebased during review. Controller reported 023 merged as PR220 / main `21aba6e13e44bcfb66ed202d73272135454a57dd`; rebase/deduplication and final real-merged-gate packaging wait for the review verdict.

## Round 2 — independent review corrections

Current source freeze: `c62e1eda097e4faccdac33b343e98ba75b702d01`. This supersedes the initial `3079985` implementation checkpoint below. Both Important findings from `.superpowers/sdd/2026-10-20-product-destination-reconcile/review-022-round1.md` were reproduced before fixes and are ready for independent re-review:

1. Raw source and target DNS identity comparisons now normalize case, trailing root dots and legacy URL wrappers. A canonical Product hostname collision blocks across every source ecosystem; a Product source's apex/owner collision still blocks. Target publicHost and baseDomain are normalized before uniqueness checks. Null/nonstring, port-bearing and invalid normalized hostname identities fail closed rather than comparing as unrelated values. The scope is only DNS identity validation, not a generalized inventory schema rewrite. A real-filesystem regression preserves Jairo's legitimate Brand apex source and same-owner Business target; no source data is normalized or rewritten by inventory reads.
2. APPLY fsyncs the output parent immediately after creating the audit root, before tenant audit directories, backups, intent or source/target installation. This establishes durability of the new audit root directory entry instead of relying only on child/file fsync. A child-process model exercises the Linux branch with real filesystem mutations and the real coordinator, modeling only directory handles/POSIX permission bits on Windows. It verifies ordering and that parent-fsync failure leaves source/target unchanged and audit root empty. These are call-order/fault regressions, **not actual Linux/power-loss verification**.

Final round-2 verification: **71/71** focused integration tests; **52/52** real Node20.20.2 production-shaped packaging tests; forced scoped ESLint and diff check clean; Next build passed with the same root/NFT warnings. Full **72** test-script sweep rerun after the corrections: **69 passed / 3 failed**, the same 9 baseline Business tests enumerated below. No baseline files were edited.

Round-2 tests consume the stable real 023 module from final source freeze `8a76cc5c8f15a4c643916a2f4b1afcf2124a9362` via its read-only worktree path. Canonical Git/LF SHA256: `3B6A52DEB6136393756BF90A8137006088459CBCADA04128D4A354081019E7AE`; current Windows CRLF bytes SHA256: `E7544D6CA0E1947FBE2D4DC8AB94EAFA5ECD4CF52B26D686897760B8E1E3FCA8`. Its change from the initial coordinator-only freeze was a trusted-namespace threat-model comment; API/version remained unchanged. No 023 files or package mapping were modified in this correction. 023's independent review/merge, 022 rebase and merged production packaging remain controller-owned prerequisites.

## Branch and source freeze

- Branch: `codex/CDX-20261020-022-product-destination-reconcile`.
- Base: `17c5fab25bff3b9a34dd94e4f60be6f17a057d8a`.
- Current source freeze: `62d42b02965eb7cb26616547a28be5a43268149d`; previous review freeze: `c62e1eda097e4faccdac33b343e98ba75b702d01`; initial source freeze: `3079985623c7968259c40a0ce20c3466a5c1a396`.
- Separate runtime import mapping commit: `a5f3a2d9c15b11c39bf626e0ffe888e1680ca7ac`. This exact mapping was also applied by the 022 package owner, with controller authorization, in the 023 checkout as a borrowed dependency. Controller owns its integration.
- No PR created by this implementer. Final release requires controller review and integration of 021 + 023.

## Outcome and bounded scope

Added a standalone, provider-free CLI for one reviewed tenant per invocation. PREVIEW is the default and creates no claims, audit folders or metadata files. APPLY requires `--mode APPLY`, an exact plan hash, a reviewed manifest path and `--confirm RECONCILE_PRODUCT_DESTINATION`.

Only the six approved pairs are accepted: blanca-ruiz/blancastella.pro, claudia-calero/claudiacalero.pro, dorian-higuita/dorianhiguita.pro, jairo-pinto-product/jairopinto.pro, lida-castaneda/lidacastaneda.pro, yenny-garcia/yennygarcia.pro. Existing IDs are never renamed. Business, Brand and masters are not reconciliation candidates.

Controller's actual-inventory ruling is implemented: only ABSENT -> canonical v2 target creation. An unexpected existing target, including v1, blocks without calling the side-effectful application target getter. The sole exception is verified exact replay of this CLI's completed receipt.

Source changes only `site.domain`; unknown fields and the absence of `ecosystemType` are preserved semantically. Existing verification/history remains untouched as historical bytes. New target provisioning/hosting is READY, DNS RESOLVED and SSL READY only under fresh reviewed evidence; **publication remains PENDING**, never inferred from copied files or HTTPS 200. Claudia's reviewed root routing is BUSINESS; the other five are PRODUCT. No payment, grant, eligibility, status, onboarding, converted or verification inference is made, including for Dorian.

## Files changed

- `app/web/scripts/product-destination-reconcile.mjs`: strict raw inventory, plan, CLI, gate loading and durable transaction.
- `app/web/scripts/product-destination-reconcile.test.mjs`: 57 core filesystem/CLI cases and fixture factory after review corrections.
- `app/web/scripts/product-destination-reconcile.integration.test.mjs`: real coordinator transaction cases and modeled Linux durability ordering; imports the core tests, 77 total.
- `app/web/scripts/product-destination-reconcile.packaging.test.mjs`: stages a production-shaped runtime, bundles real coordinator and invokes a real Node 20 executable; imports the core tests, 58 total.
- `app/web/package.json`: isolated coordinator imports mapping, maintenance command and two focused test commands. No versions/dependencies changed.
- Root `Dockerfile`: bundle the actual 023 coordinator for Node 20, import/version smoke check, copy coordinator asset and CLI into runner. No other infrastructure edits.
- This request and report. Local implementation handoff is `.superpowers/sdd/2026-10-20-product-destination-reconcile/task-2-report.md`.

No modifications to 021 prevention, source/generator/publisher/job/provisioning/worker services, 023 coordinator source, frontend, Prisma, runtime data, generated public packages or provider configuration.

## Evidence / identity / filesystem contract

Manifest is strict JSON, with unknown/duplicate keys rejected; no paths or credentials are accepted in its fields. Integers unsafe for lossless JSON round-trip and non-finite values also block. Maximum manifest size is 64 KiB; raw metadata and inventory have explicit bounds. The exact manifest bytes and trusted roots are included in the plan hash.

Manifest fields are:

```text
version: 1
ticket: CDX-20261020-022
siteId, ownerKey (UUID), baseDomain
expectedSourceHash (sha256), expectedTargetState: ABSENT
evidence:
  observedAt (canonical ISO timestamp), evidenceSha256
  provider: username, baseDomain, publicHost, remoteRoot
  dns: publicHost, resolved: true
  https: url, status: 200
  rootRouting: baseDomain, ecosystemType
```

Reviewed evidence must identify `u708491435`, `producto.<baseDomain>` and `/home/u708491435/domains/<baseDomain>/public_html/producto`, and be no older than 30 minutes for every new plan/APPLY. `evidenceSha256` binds the separately reviewed evidence artifact; the CLI does not fetch or authenticate provider evidence itself. The operator/controller must actually review fresh provider, DNS, live HTTPS and root-routing observations. This report is not a runtime manifest.

Owner authority is raw `.activation/leads.json`: unique exact site ID, or for the specifically approved Jairo Product identity its base `jairo-pinto`, with the same normalized base domain and UUID. Duplicate same-domain leads block even with an unrelated site ID; display names are never authority. Source owner fields, if present at root or site, must match. Duplicate Product source domains/owners, colliding target owners/hosts and overlapping remote roots block.

Source, target, lead, jobs and protected state are read raw. No application getter, generator, transport, provisioning, queue, payment, entitlement or notification callback is imported. CLI output contains hashes and reviewed destination identity, not contact/source contents. Original source bytes are retained only in private backups.

The application-default directory layout is enforced: configured output root containing `.sources`, `.activation`, `.publication-jobs`, `.publication-journals`, `.commercial-grants`, `.payments`. Independent or ambiguous configured roots block. The targets directory must already exist. Source/job/output configuration comes from trusted process options/environment, never the JSON manifest. File reads reject symlinks/junction ancestors, non-files, hard links, excessive size and descriptor/metadata races.

The protected fingerprint covers source inventory (including target/history/verification metadata except the two owned files), activation bytes, jobs, journals, payments, grants and the selected tenant's public package. Existing metadata and package bytes are not changed. Any active/queued tenant job, live/ancient/orphan Product claim, or any job lease/lock claim blocks conservatively.

## Coordination and durability

Production APPLY loads `runtime-assets/product-mutation-coordinator.mjs`, requires exact `PRODUCT_MUTATION_COORDINATION_VERSION = product-mutation-v1` and the factory export, and acquires the actual shared Product claim before its final authoritative re-plan. No `--quiesced` or user-supplied gate asset flag exists. Missing/wrong-version module blocks without metadata writes. The injectable module is for programmatic integration testing of the real 023 implementation, not a CLI bypass.

023 source used for tests: coordinator-only frozen commit `c3839d82a22ffed269bea604a565a67f9720100b`, SHA256 `64D642916DD4D1CE415CD9CCB634210496566EB906AC3EAA376E2371FC3F110E`. This was read from the separate 023 worktree; not copied into 022 and not represented as fully reviewed writer-hook coverage. Default integration test path resolves the module in the integrated checkout; `PRODUCT_RECONCILE_TEST_GATE` accepts an explicit read-only source path only in test code.

Under the claim, APPLY writes create-only private backup/intent/checkpoint files in `<output>/.product-destination-reconcile/<siteId>`, uses source atomic rename and target atomic no-clobber hard-link installation, then rechecks source, target, protected state and claim before completing the receipt. File data and parent directories are fsynced on Linux. Private audit directories/files request modes 0700/0600.

**The source/target pair is not one filesystem-atomic transaction.** A fault can occur between the two installs. Fault rollback touches only the expected hashes and original owned inode identities while still under the gate. Foreign same-byte inode replacement, foreign drift, lost claim, ambiguous checkpoint or crash remains blocked for explicit recovery review. There is no blind restore, claim stealing, TTL, automatic resume, orphan deletion or broad cleanup. Failed/rolled-back audits deliberately block another APPLY rather than guessing recovery.

Exact completed receipts verify original manifest, plan hash, durable intent/checkpoints, backup hashes, current source/target hashes, current identity/activity and complete protected fingerprint. They produce ALREADY_APPLIED without another metadata effect. Controller approved only this exact completed replay to outlive the original evidence freshness; every new APPLY still requires fresh evidence. Drift still blocks an expired completed receipt.

## Verification

TDD: missing entrypoint first failed the zero-write PREVIEW assertion; APPLY tests failed with APPLY_UNAVAILABLE against the real frozen coordinator before implementation. Normalized-domain collision, absent-target-directory planning, expired-receipt replay and altered-intent regressions were observed RED before fixes.

Initial focused commands (2026-10-20; superseded by the round-2 counts above):

- `node --experimental-strip-types --test scripts/product-destination-reconcile.integration.test.mjs`: **53/53 passed**, using the frozen real 023 source path.
- `npm run test:product-destination-reconcile-packaging`: **36/36 passed**, including real Node **v20.20.2**, real bundled coordinator import, default PREVIEW, absent runtime asset block, APPLY, receipt replay and a separate Node 20 CLI process blocked by a held writer claim.
- Forced scoped ESLint (`--no-ignore`, all four new `.mjs` files, `--max-warnings=0`): passed. Scripts are normally ignored by the repository ESLint config; the forced run is intentional.
- `git diff --check`: passed.
- `npm run build`: **passed** on this 022 checkout, with existing multiple-lockfile/root inference and two NFT tracing warnings. This is not a build of the future merged 021/023 deployment.

`npm test` does not exist in this repository. All **72** configured `test:*` scripts were therefore executed in a sequential sweep: **69 passed; 3 scripts failed**, matching the controller/021 baseline failures (9 tests total):

1. `test:jairo-business-source-dry-run`: “the repository canonical Business artifact produces a placeholder-free partner projection”.
2. `test:jairo-business-publication-preview`: “creates one fresh capability manifest and returns a provider-free PREVIEW”; “isolates generator side effects, installs the package and returns unblocked publication PREVIEW”; “rolls back the previous package when the installed PREVIEW detects drift”. Errors include `PUBLISHING_TARGET_IDENTITY_INVALID`.
3. `test:jairo-business-sftp-capability-renewal`: “PREVIEW binds exact expired evidence and performs no provider operation”; “APPLY archives bytes exactly and returns the next provider-free probe PREVIEW”; “rerunning the same authorized APPLY is idempotent”; “PREVIEW ignores immutable archives owned by the historical renewal request”; “two successive capabilities archive independently by their exact content hashes”. Errors include `TARGET_IDENTITY_OR_STATE_INVALID`.

The sweep preceded the final focused receipt regression additions; both affected focused commands were rerun afterward. The old failures were reported, not edited or hidden.

Platform limits: tests ran on Windows. The real file-hardlink and directory-junction rejection cases ran; file-symlink creation initially failed with Windows EPERM and was replaced with the actual junction-parent rejection case. Linux directory-fsync branches were **not executed**. Docker CLI is installed but its Linux daemon was unavailable (`dockerDesktopLinuxEngine` pipe absent), so no Docker image build/Linux execution is claimed. Node20 production-shaped packaging was actually executed on Windows, not merely transpiled or inspected textually.

## Remaining gates / handoff

1. Independent premium review of this tenant/filesystem/audit-sensitive change.
2. Reviewed merge of 021 prevention and full 023 writer hooks; coordinator-only fixture success is not proof that all deployed writers participate.
3. Integrate the isolated mapping commit once; reconcile/cherry-pick/rebase under controller ownership. Docker's new bundle intentionally requires the actual 023 source to exist in the final integrated build.
4. Build/test the merged production image and validate Linux durability/permissions on the deployment filesystem before runtime APPLY.
5. Prepare fresh reviewed evidence for each tenant, PREVIEW, approve exact hash, then explicitly authorize each single-tenant APPLY. Six real migrations have **not** occurred.
6. Any orphan audit, target, claim or foreign drift requires a separate reviewed recovery decision; never delete the safeguards to force execution.

No commercial eligibility or publication decision was made. There is no authority here to regenerate, provision, publish or change Business/Brand data. Follow-up required: **yes**, independent review, merged-gate packaging/integration and separately authorized runtime reconciliation.
