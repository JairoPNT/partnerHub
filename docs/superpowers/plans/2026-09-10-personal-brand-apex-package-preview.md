# Personal Brand apex package and publication preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide deterministic, backend-only previews for Jairo's Personal Brand canonical master package and future apex publication readiness, without creating files, targets, DNS records, SFTP capabilities, or remote publication.

**Architecture:** Two small Node maintenance scripts bind Jairo's approved Personal Brand identity in code. The master-package script verifies an allowlisted canonical template and compares a deterministic inventory to the local package directory. The publication-preview script consumes only hashes and facts from the persisted Personal Brand source, entitlement, target, and canonical package; it reports a plan but never builds an SFTP client or calls a provider.

**Tech Stack:** Node.js 20 ESM maintenance scripts, `node:test`, `node:crypto`, `node:fs/promises`, existing PartnerHub publication-target JSON contract, npm scripts.

**Spec:** `docs/superpowers/specs/2026-09-10-personal-brand-apex-package-preview-design.md`

## Global Constraints

- Ticket and branch: `CDX-20260910-003`, `codex/CDX-20260910-003-personal-brand-preview`.
- Bind the reviewed subject in code: owner `f403f29e-95c8-4825-9320-967376443020`, site `jairo-pinto`, ecosystem `PERSONAL_BRAND`, base/public host `jairopinto.pro`, master package `ganomaster-personal-brand`.
- Both npm maintenance commands default to read-only preview mode and return `changed: false`.
- Do not accept endpoint, URL, hostname, owner, or customer identity overrides from CLI arguments.
- Do not construct an SFTP adapter, read SFTP environment variables, call Hostinger or Cloudflare, mutate DNS, create a publishing target, write a package, write staging files, enqueue a job, deploy, or publish remote files.
- Read only the allowlisted Personal Brand template files: `app.js`, `config.js`, `favicon.svg`, `index.html`, and `styles.css`; reject unexpected special files and escaped paths.
- Never put credentials, environment values, remote file contents, or customer data in errors or JSON evidence.
- Preserve Business, Product, route resolution, generic guarded-publication runtime, target provisioning, and all frontend files unchanged.
- No dependency addition or lockfile change is permitted.

## File Structure

- `app/web/scripts/jairo-personal-brand-master-package.mjs`: reads and hashes the canonical template and local Personal Brand master package; exports the preview API only.
- `app/web/scripts/jairo-personal-brand-master-package.test.mjs`: synthetic filesystem tests for the master-package preview.
- `app/web/scripts/prepare-jairo-personal-brand-publication-preview.mjs`: reads approved local source, entitlement, target, and canonical package; exports the read-only publication-preview API.
- `app/web/scripts/prepare-jairo-personal-brand-publication-preview.test.mjs`: synthetic filesystem tests for source, entitlement, target, package, and non-mutation behavior.
- `app/web/package.json`: exact npm test and maintenance script registration; no unrelated script changes.
- `brain/agent-requests/codex/requests/CDX-20260910-003_personal_brand_apex_package_preview.md`: bounded implementation request and non-overlap contract.
- `brain/agent-requests/codex/reports/CDX-20260910-003_personal_brand_apex_package_preview_DONE.md`: completion evidence, hashes only, verification, branch, commit, and follow-up gate.
- Relevant `brain/` operational-memory files: concise ticket status only after all code verification succeeds.

---

### Task 1: Read-only Personal Brand master-package preview

**Files:**
- Create: `brain/agent-requests/codex/requests/CDX-20260910-003_personal_brand_apex_package_preview.md`
- Create: `app/web/scripts/jairo-personal-brand-master-package.mjs`
- Create: `app/web/scripts/jairo-personal-brand-master-package.test.mjs`
- Modify: `app/web/package.json`

**Interfaces:**
- Consumes: `plantillas-de-pagina/personal-brand/{app.js,config.js,favicon.svg,index.html,styles.css}` and an optional test-only `outputRoot` / `templateDirectory`.
- Produces: `planPersonalBrandMasterPackage(options?: { outputRoot?: string; templateDirectory?: string }): Promise<PersonalBrandMasterPreview>` and `runJairoPersonalBrandMasterPackage(options?: object): Promise<PersonalBrandMasterPreview>`.
- `PersonalBrandMasterPreview` has `requestId: "CDX-20260910-003"`, `mode: "PREVIEW"`, `changed: false`, `blocked`, `blockedReasons`, `planHash`, `planMaterial`, `disposition`, `destination`, and `safety`.

- [ ] **Step 1: Create the bounded Codex request before code work.**

  Write the request with these exact boundaries:

  ```markdown
  Owner: Codex
  Scope: Add non-mutating Personal Brand master-package preview evidence.
  Allowed files: app/web/scripts/jairo-personal-brand-master-package.mjs, its test, app/web/package.json, this request, its report, and operational-memory status after completion.
  Excluded files: React, templates, generic publication runtime, SFTP, Hostinger, Cloudflare, DNS, EasyPanel, credentials, remote files, and deployment configuration.
  Dependencies: CDX-20260909-003 merged.
  Parallel-safe with: frontend-only tickets that do not edit app/web/package.json or the listed scripts.
  Integration: later Personal Brand publication preview consumes only the exported preview facts and deterministic package hash.
  ```

- [ ] **Step 2: Write failing master-preview tests.**

  Use a temporary directory and a test-only template copy. Cover these cases with assertions against returned JSON instead of stdout:

  ```js
  const preview = await planPersonalBrandMasterPackage({ outputRoot, templateDirectory });
  assert.equal(preview.changed, false);
  assert.equal(preview.safety.localWritesMade, false);
  assert.equal(preview.safety.providerCallsMade, false);
  assert.equal(preview.disposition, "CREATE_LOCAL_MASTER_PACKAGE");
  assert.equal(preview.blocked, false);
  assert.match(preview.planHash, /^[a-f0-9]{64}$/);
  ```

  Add tests that assert: two invocations with the same input produce the same `canonicalTemplateHash`, `expectedPackageHash`, and `planHash`; a `config.js` with `ecosystemType: "BUSINESS"` produces `PERSONAL_BRAND_CANONICAL_TEMPLATE_IDENTITY_INVALID`; a `site.id` other than `ganomaster-personal-brand` produces the same error; a destination with an extra or mismatched file produces `PERSONAL_BRAND_MASTER_PACKAGE_DRIFT`; an absent destination is not blocked; and the destination does not appear after preview.

- [ ] **Step 3: Run the new test and confirm it fails because the module does not exist.**

  Run: `node --test scripts/jairo-personal-brand-master-package.test.mjs`

  Expected: failure resolving `jairo-personal-brand-master-package.mjs` or its exported function; no files outside the temporary test directory are written.

- [ ] **Step 4: Implement the minimal preview-only package module.**

  Model the read-only portions of `jairo-business-master-package.mjs`, but do not copy its APPLY functions, `mkdir`, `rename`, `rm`, `randomUUID`, claim handling, or journal handling. Define constants exactly as follows:

  ```js
  const REQUEST_ID = "CDX-20260910-003";
  const SITE_ID = "ganomaster-personal-brand";
  const ECOSYSTEM_TYPE = "PERSONAL_BRAND";
  const PUBLIC_HOST = "brand.ganomaster.pro";
  const REQUIRED_TEMPLATE_FILES = ["app.js", "config.js", "favicon.svg", "index.html", "styles.css"];
  const PACKAGE_FILES = [".htaccess", ...REQUIRED_TEMPLATE_FILES, "manifest.json"];
  ```

  Parse `config.js` in a restricted `vm` context and require `CONFIG.ecosystemType === "PERSONAL_BRAND"`, `CONFIG.site.id === "ganomaster-personal-brand"`, and `CONFIG.site.appName === "ganomaster-personal-brand"`. Build an in-memory `.htaccess` and `manifest.json`; use sorted `{ path, hash }` entries and `sha256(JSON.stringify(entries))` for every inventory hash. Resolve children with an `inside(root, child)` check that rejects path escape. If the source template cannot be read, return `PERSONAL_BRAND_CANONICAL_TEMPLATE_MISSING_OR_UNREADABLE`; never leak the host filesystem error.

  Return an object with this stable safety shape:

  ```js
  safety: {
    providerCallsMade: false,
    sftpAdapterCreated: false,
    localWritesMade: false,
    partnerPackagesMutable: false
  }
  ```

  `destination` must report only `{ present, hash, typographyDirectoryPresent }`; `disposition` is `"ALREADY_CURRENT"` only when inventory and required `tipografia/` directory match, otherwise `"MASTER_PACKAGE_MISSING"`. A preview never creates the typography directory.

- [ ] **Step 5: Register only the exact npm commands.**

  Add these `app/web/package.json` scripts next to the existing Business master-package scripts:

  ```json
  "test:jairo-personal-brand-master-package": "node --test scripts/jairo-personal-brand-master-package.test.mjs",
  "maintenance:jairo-personal-brand-master-package": "node scripts/jairo-personal-brand-master-package.mjs"
  ```

  The executable entry point must invoke `runJairoPersonalBrandMasterPackage()` with no CLI identity overrides and print only `JSON.stringify(result, null, 2)`.

- [ ] **Step 6: Run focused tests and exact lint.**

  Run:

  ```powershell
  npm run test:jairo-personal-brand-master-package
  npx eslint --no-ignore scripts/jairo-personal-brand-master-package.mjs scripts/jairo-personal-brand-master-package.test.mjs
  ```

  Expected: all tests pass and ESLint reports zero errors and warnings.

- [ ] **Step 7: Commit the independently testable deliverable.**

  ```powershell
  git add brain/agent-requests/codex/requests/CDX-20260910-003_personal_brand_apex_package_preview.md app/web/package.json app/web/scripts/jairo-personal-brand-master-package.mjs app/web/scripts/jairo-personal-brand-master-package.test.mjs
  git commit -m "feat(publication): preview personal brand master package"
  ```

### Task 2: Read-only Personal Brand apex publication preview

**Files:**
- Create: `app/web/scripts/prepare-jairo-personal-brand-publication-preview.mjs`
- Create: `app/web/scripts/prepare-jairo-personal-brand-publication-preview.test.mjs`
- Modify: `app/web/package.json`

**Interfaces:**
- Consumes: Task 1 inventory semantics; `/data/generated-sites/.sources/jairo-pinto.json`; `/data/generated-sites/.sources/.publishing-targets/jairo-pinto.json`; approved entitlement JSON; `/data/generated-sites/ganomaster-personal-brand`.
- Produces: `preparePersonalBrandPublicationPreview(options?: { sourceDirectory?: string; outputDirectory?: string; entitlementPath?: string; now?: Date }): Promise<PersonalBrandPublicationPreview>`.
- `PersonalBrandPublicationPreview` has `requestId: "CDX-20260910-003"`, `mode: "PREPARE_AND_PREVIEW"`, `changed: false`, `blocked`, `blockedReasons`, `planHash`, `planMaterial`, `target`, and a safety object with all mutation flags false.

- [ ] **Step 1: Write failing apex-preview tests.**

  Build all source, entitlement, target, and package fixtures inside a temporary directory. Assert the happy path accepts only this target shape:

  ```js
  {
    version: 2,
    ownerKey: "f403f29e-95c8-4825-9320-967376443020",
    siteId: "jairo-pinto",
    ecosystemType: "PERSONAL_BRAND",
    baseDomain: "jairopinto.pro",
    publicHost: "jairopinto.pro",
    remoteRoot: "/provider-derived/non-root-directory",
    provisioningState: "READY",
    dnsState: "RESOLVED",
    sslState: "READY",
    publicationState: "PENDING"
  }
  ```

  Assert all of these block without writing fixtures after setup: missing target gives `PERSONAL_BRAND_TARGET_MISSING`; `publicHost: "brand.jairopinto.pro"` gives `PERSONAL_BRAND_APEX_TARGET_INVALID`; missing `remoteRoot`, non-READY provisioning, non-RESOLVED DNS, or non-READY SSL gives `PERSONAL_BRAND_TARGET_NOT_READY`; wrong source identity gives `PERSONAL_BRAND_SOURCE_IDENTITY_INVALID`; entitlement without `PERSONAL_BRAND` gives `PERSONAL_BRAND_ENTITLEMENT_INVALID`; missing package gives `PERSONAL_BRAND_MASTER_PACKAGE_MISSING`; a package hash mismatch gives `PERSONAL_BRAND_PACKAGE_DRIFT`.

  The valid case must assert:

  ```js
  assert.equal(preview.changed, false);
  assert.equal(preview.blocked, false);
  assert.equal(preview.safety.providerCallsMade, false);
  assert.equal(preview.safety.sftpAdapterCreated, false);
  assert.equal(preview.safety.localWritesMade, false);
  assert.match(preview.planHash, /^[a-f0-9]{64}$/);
  assert.equal(preview.planMaterial.identity.publicHost, "jairopinto.pro");
  ```

- [ ] **Step 2: Run the test and confirm it fails because the preview module does not exist.**

  Run: `node --test scripts/prepare-jairo-personal-brand-publication-preview.test.mjs`

  Expected: missing module/export failure; no `sftp-capability.json`, manifest, claim, stage, target, package, or provider state is created.

- [ ] **Step 3: Implement a fixed-identity, in-memory preview.**

  Do not import `createSftpAdapter`, `planSftpCapabilityProbe`, or `runGuardedPublication`. Do not invoke `planGuardedPublication`, because that generic planner requires a capability manifest and evaluates SFTP configuration. Instead, use a small local validator that returns plan material equivalent in purpose but limited to facts available safely now.

  Bind these constants:

  ```js
  const OWNER_KEY = "f403f29e-95c8-4825-9320-967376443020";
  const SITE_ID = "jairo-pinto";
  const ECOSYSTEM_TYPE = "PERSONAL_BRAND";
  const BASE_DOMAIN = "jairopinto.pro";
  const PUBLIC_HOST = "jairopinto.pro";
  const MASTER_SITE_ID = "ganomaster-personal-brand";
  ```

  Use a safe path join helper for every local artifact. Hash raw source, entitlement, target, and sorted package inventory bytes. Source must have `site.id === SITE_ID` and `ecosystemType === ECOSYSTEM_TYPE`; entitlement must bind `OWNER_KEY` and include `PERSONAL_BRAND` according to its existing approved snapshot schema. Read the target only if it exists; do not synthesize a root, hostname, remote root, or `PublishingTarget` record. Permit target `publicationState` only `PENDING` or `READY`. Include only hashes, identity, target readiness facts, and the non-sensitive `remoteRoot` in `planMaterial`.

  Use this output contract:

  ```js
  {
    requestId: "CDX-20260910-003",
    mode: "PREPARE_AND_PREVIEW",
    changed: false,
    blocked: reasons.length > 0,
    blockedReasons: [...new Set(reasons)],
    planHash,
    planMaterial: { operation: "PREVIEW_PERSONAL_BRAND_APEX_PUBLICATION", identity, sourceHash, entitlementHash, targetHash, masterPackageHash, targetReadiness },
    target: { present, hash, provisioningState, dnsState, sslState, publicationState, remoteRootPresent },
    safety: { providerCallsMade: false, sftpAdapterCreated: false, localWritesMade: false, remoteWritesMade: false, publishingTargetMutable: false }
  }
  ```

  Map unexpected JSON/read errors to the specified neutral blocked reason instead of echoing local paths or environment values.

- [ ] **Step 4: Register exact npm commands.**

  Add these `app/web/package.json` scripts beside the Business publication-preview scripts:

  ```json
  "test:jairo-personal-brand-publication-preview": "node --test scripts/prepare-jairo-personal-brand-publication-preview.test.mjs",
  "maintenance:jairo-personal-brand-publication-preview": "node scripts/prepare-jairo-personal-brand-publication-preview.mjs"
  ```

  The entry point uses `preparePersonalBrandPublicationPreview()` with no endpoint, URL, host, owner, or credential override flags and emits structured JSON only.

- [ ] **Step 5: Run focused tests and exact lint.**

  Run:

  ```powershell
  npm run test:jairo-personal-brand-publication-preview
  npx eslint --no-ignore scripts/prepare-jairo-personal-brand-publication-preview.mjs scripts/prepare-jairo-personal-brand-publication-preview.test.mjs
  ```

  Expected: all valid/blocked cases pass; zero ESLint errors and warnings; no SFTP or provider code is imported by the new preview module.

- [ ] **Step 6: Commit the independently testable deliverable.**

  ```powershell
  git add app/web/package.json app/web/scripts/prepare-jairo-personal-brand-publication-preview.mjs app/web/scripts/prepare-jairo-personal-brand-publication-preview.test.mjs
  git commit -m "feat(publication): preview personal brand apex readiness"
  ```

### Task 3: Ticket closure, regression evidence, and handoff boundary

**Files:**
- Create: `brain/agent-requests/codex/reports/CDX-20260910-003_personal_brand_apex_package_preview_DONE.md`
- Modify: only the project `brain/` status files named by current operational-memory conventions.

**Interfaces:**
- Consumes: Task 1 and Task 2 command outputs, exact test results, commit SHAs, and the design spec.
- Produces: an auditable completion report stating that both commands are read-only and that PB apex target provisioning, SFTP capability, and publication remain separate gates.

- [ ] **Step 1: Run the complete ticket verification sequence.**

  Run from `app/web`:

  ```powershell
  npm run test:jairo-personal-brand-master-package
  npm run test:jairo-personal-brand-publication-preview
  npm run test:publication-target
  npm run test:partner-hostnames
  npx eslint --no-ignore scripts/jairo-personal-brand-master-package.mjs scripts/jairo-personal-brand-master-package.test.mjs scripts/prepare-jairo-personal-brand-publication-preview.mjs scripts/prepare-jairo-personal-brand-publication-preview.test.mjs
  npm run lint
  npm run build
  ```

  Then run: `git diff --check origin/main...HEAD`.

  Expected: all named tests, lint, and build pass; `git diff --check` is silent. Record existing non-fatal tool warnings only if actually observed; do not call them failures.

- [ ] **Step 2: Write the completion report with exact evidence and boundaries.**

  The report must include request ID, changed script/test/package paths, command outcomes, branch and commit, and the following explicit statement:

  ```markdown
  This ticket did not create a Personal Brand publishing target, call DNS/Hostinger/Cloudflare, create or renew SFTP capability, use credentials, write a master package, enqueue a publication job, upload remote files, deploy, or mutate production.
  ```

  Record the remaining follow-ups as separate authorization gates: (1) guarded local Personal Brand master-package apply, (2) independently designed Personal Brand apex target/DNS/SSL provisioning, (3) scoped SFTP capability proof, and (4) guarded publication enqueue/apply.

- [ ] **Step 3: Update operational memory concisely.**

  Mark `CDX-20260910-003` complete only when Step 1 passes. State that the Personal Brand apex is not public and no infrastructure mutation occurred. Do not record credentials, raw entitlement/source data, filesystem paths outside approved operational facts, or speculative deployment status.

- [ ] **Step 4: Commit documentation and verify the final diff.**

  ```powershell
  git add brain/agent-requests/codex/reports/CDX-20260910-003_personal_brand_apex_package_preview_DONE.md brain
  git commit -m "docs: close personal brand apex preview ticket"
  git diff --check origin/main...HEAD
  ```

  Expected: final diff check is silent. Do not merge, deploy, call provider APIs, or publish; request a review before integration.

## Self-Review

1. **Spec coverage:** Task 1 covers canonical source allowlisting, identity/config verification, deterministic package inventory, absent/current/drifted preview, and no package mutation. Task 2 covers approved source/entitlement/target reads, apex-only validation, readiness facts, package verification, fixed identity, and no SFTP/provider side effects. Task 3 covers test evidence, ticket status, and the future guarded gates. No DNS, Cloudflare, Hostinger, SFTP, deployment, remote publication, frontend, or production action is included.
2. **Placeholder scan:** This plan contains no undefined deliverables or deferred implementation placeholders; each task names exact files, functions, commands, error conditions, and output fields.
3. **Type consistency:** Task 1 produces only a read-only package preview. Task 2 independently validates the same deterministic package inventory and produces `PersonalBrandPublicationPreview`; it deliberately does not pass an incompatible Personal Brand identity into the legacy capability-dependent generic planner.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-10-personal-brand-apex-package-preview.md`.

1. **Subagent-Driven (recommended):** dispatch one fresh subagent per task, with code and test review between tasks.
2. **Inline Execution:** execute the tasks in this session with checkpoints for review.
