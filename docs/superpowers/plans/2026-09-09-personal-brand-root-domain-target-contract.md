# Personal Brand Root-Domain Target Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve the apex to Personal Brand when active, keep Product and Business on fixed subdomains, and reject apex Personal Brand before a subdomain provisioner can mutate it.

**Architecture:** A pure validated route-policy API derives actions from active ecosystems and known hosts. The subdomain provisioner consumes that API only to gate apex Personal Brand before persistence or provider activity.

**Tech Stack:** TypeScript, Node.js built-in test runner, Zod, PublishingTarget v2.

**Spec:** `docs/superpowers/specs/2026-09-09-personal-brand-root-domain-target-contract-design.md`

## Global Constraints

- Support only `PRODUCT`, `BUSINESS`, and `PERSONAL_BRAND`.
- Hosts are apex, `producto.<baseDomain>`, and `negocio.<baseDomain>`.
- Apex priority is Personal Brand, then Business, then Product.
- Preserve targets and legacy migration; do not rewrite records.
- No provider, DNS, Cloudflare, SFTP, EasyPanel, publication, or production mutation.
- Do not edit React, Tailwind, templates, or frontend assets.

---

### Task 1: Pure partner route policy

**Files:** Modify `app/web/server/services/partnerHostnameContract.ts`; test `app/web/server/services/partnerHostnameContract.test.ts`.

**Interfaces:** Produce `resolvePartnerRoute({ baseDomain, requestedHost, activeEcosystems })` returning `{ requestedHost, canonicalHost, action, ecosystemType }`, with `action: "SERVE" | "REDIRECT"`. Produce `getPartnerCanonicalPublicHost(baseDomain, ecosystemType, rootEcosystemType)`.

- [ ] **Step 1: Write failing table-driven tests**

Use these cases and also assert active known subdomains `SERVE`, inactive known
subdomains redirect, and empty lists/unknown labels throw:

```ts
{ activeEcosystems: ["PRODUCT"], requestedHost: "partner.pro", action: "REDIRECT", ecosystemType: "PRODUCT", canonicalHost: "producto.partner.pro" }
{ activeEcosystems: ["BUSINESS"], requestedHost: "producto.partner.pro", action: "REDIRECT", ecosystemType: "BUSINESS", canonicalHost: "negocio.partner.pro" }
{ activeEcosystems: ["PRODUCT", "BUSINESS"], requestedHost: "partner.pro", action: "REDIRECT", ecosystemType: "BUSINESS", canonicalHost: "negocio.partner.pro" }
{ activeEcosystems: ["PRODUCT", "BUSINESS", "PERSONAL_BRAND"], requestedHost: "partner.pro", action: "SERVE", ecosystemType: "PERSONAL_BRAND", canonicalHost: "partner.pro" }
```

- [ ] **Step 2: Run the focused failing test**

Run: `node --experimental-strip-types --test server/services/partnerHostnameContract.test.ts`

Expected: FAIL because the route-policy exports do not exist.

- [ ] **Step 3: Implement minimum policy**

Add `PARTNER_SUBDOMAIN_SLUGS` for Product and Business only. Validate base and
requested host. Personal Brand returns the apex only when it is root; Product
and Business return fixed subdomains. Resolve priority Personal Brand → Business
→ Product and reject labels outside the current allowlist.

- [ ] **Step 4: Run focused passing test**

Run: `node --experimental-strip-types --test server/services/partnerHostnameContract.test.ts`

Expected: PASS including master-host compatibility cases.

- [ ] **Step 5: Commit Task 1**

Run: `git add app/web/server/services/partnerHostnameContract.ts app/web/server/services/partnerHostnameContract.test.ts; git commit -m "feat: resolve partner root domain routes"`

### Task 2: Apex gate in subdomain provisioner

**Files:** Modify `app/web/server/services/subdomainProvisioningService.ts`; test `app/web/server/services/subdomainProvisioningService.test.ts`.

**Interfaces:** Consume `getPartnerCanonicalPublicHost`. Produce `ProvisioningError` code `PROVISIONING_ROOT_TARGET_REQUIRES_SEPARATE_GATE` before persistence or provider calls for apex Personal Brand.

- [ ] **Step 1: Write failing apex test**

Replace the Personal Brand subdomain expectation with:

```ts
await assert.rejects(() => instance.provision(input), (error: unknown) => error instanceof ProvisioningError && error.code === "PROVISIONING_ROOT_TARGET_REQUIRES_SEPARATE_GATE");
assert.deepEqual(calls, []);
assert.equal(await instance.get("jairo-brand"), null);
```

Retain Product/Business assertions for `producto.jairopinto.pro` and
`negocio.jairopinto.pro`.

- [ ] **Step 2: Run focused failing test**

Run: `node --experimental-strip-types --test server/services/subdomainProvisioningService.test.ts`

Expected: FAIL because the current path attempts to create `brand`.

- [ ] **Step 3: Implement pre-provider gate**

After input parsing and before `createOrLoad`, resolve the canonical host. If
it is the Personal Brand apex, throw the new error and do not persist a target
or call Hostinger, DNS, or readiness. Use canonical resolution for Product and
Business; leave legacy migration unchanged.

- [ ] **Step 4: Run focused passing test**

Run: `node --experimental-strip-types --test server/services/subdomainProvisioningService.test.ts`

Expected: PASS; Personal Brand is inert and Product/Business plus legacy cases remain green.

- [ ] **Step 5: Commit Task 2**

Run: `git add app/web/server/services/subdomainProvisioningService.ts app/web/server/services/subdomainProvisioningService.test.ts; git commit -m "feat: gate personal brand root provisioning"`

### Task 3: Verify and record contract

**Files:** Create `brain/agent-requests/codex/reports/CDX-20260909-003_personal_brand_root_domain_target_contract_DONE.md`; modify `brain/02_CURRENT_STATUS.md`, `brain/03_NEXT_MISSION.md`, and `brain/LIVE_PROJECT_STATE.md`.

- [ ] **Step 1: Run focused suites**

Run: `npm run test:partner-hostnames; npm run test:publication-target`

Expected: PASS.

- [ ] **Step 2: Run static checks**

Run: `npx eslint server/services/partnerHostnameContract.ts server/services/partnerHostnameContract.test.ts server/services/subdomainProvisioningService.ts server/services/subdomainProvisioningService.test.ts --no-ignore --max-warnings=0; git diff --check`

Expected: both commands exit zero.

- [ ] **Step 3: Write report and update memory**

Record changed files, verification evidence, no provider/production actions,
and the next guarded Personal Brand master-package/preview ticket.

- [ ] **Step 4: Commit Task 3**

Run: `git add brain/agent-requests/codex/reports/CDX-20260909-003_personal_brand_root_domain_target_contract_DONE.md brain/02_CURRENT_STATUS.md brain/03_NEXT_MISSION.md brain/LIVE_PROJECT_STATE.md; git commit -m "docs: close personal brand root routing contract"`
