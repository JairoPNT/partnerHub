# Business Landing Content Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist and validate one Super-Admin-managed Business landing profile per partner in the existing site source, then carry it into that partner’s generated package.

**Architecture:** Keep `/data/generated-sites/.sources/{siteId}.json` as the existing per-site source of truth and add only the `businessLandingContent` field defined in the spec. A guarded content service resolves partner/site/host/entitlement server-side, uses the existing Business site lock and expected revision for read-modify-write, and never generates or publishes as a side effect.

**Tech Stack:** Next.js route handlers, TypeScript, Zod, JSON source files, Node test runner.

**Spec:** `docs/superpowers/specs/2026-10-21-business-paid-traffic-readiness-design.md`

## Global Constraints

- Master Sites actions require an authenticated human in the configured Super Admin email allowlist.
- Run commands through POSIX `sh`; do not use Bash.
- The browser supplies only `activationLeadId`, `expectedRevision`, and `BusinessLandingContent`; server derives site identity, host, WhatsApp, entitlement, and ownership.
- One active landing-content profile per partner; the source file is the existing source of truth, not a new sidecar/table.
- Business-only: Product and Personal Brand generation and inputs remain unchanged.
- WhatsApp URL remains server-derived; no arbitrary destination, campaign ID, budget, or Ads operation enters the content profile.
- Only `https://media.partnerhub.club/comunes/business/` image URLs are accepted.
- No provider calls, DNS/SFTP, campaign operations, generation, or publication as part of profile save/read.

## Review Focus

- Forged `activationLeadId`, `siteId`, host, or owner: reject or derive identity server-side; add route tests proving no cross-partner read/write.
- Stale `expectedRevision` during a concurrent site update: return conflict without overwriting source; test the guarded update under the existing site lock.
- HTML/script strings or known prohibited claims (income, time guarantees, inventory/logistics, free training, international presence, registrations, financial backing, false scarcity): reject the payload; test benign copy mentioning results without promising them is not falsely blocked.
- HTTP, unapproved host, encoded traversal, or media URL with foreign origin: reject; test each boundary.
- Missing profile or profile sent to non-Business ecosystem: retain the neutral master fallback and preserve Product/Personal Brand snapshots; test both.

---

### Task 1: Business landing content contract, guarded persistence, and generation propagation

**Files:**
- Create: `app/web/shared/business-landing-content-contract.ts`
- Create: `app/web/shared/business-landing-content-contract.test.ts`
- Create: `app/web/server/services/masterSitesBusinessContentService.ts`
- Create: `app/web/server/services/masterSitesBusinessContentService.test.ts`
- Create: `app/web/app/api/internal/master-sites/business/content/route.ts`
- Modify: `app/web/server/services/productPageGenerationService.ts`
- Modify: `app/web/server/services/productPageSourceService.ts`
- Modify: `app/web/server/services/masterSitesBusinessInput.ts`
- Create: `app/web/server/services/masterSitesBusinessContentRouteHandlers.ts`
- Create: `app/web/server/services/masterSitesBusinessContentRoutes.test.ts`
- Modify: `app/web/server/services/masterSitesBusinessInput.test.ts`
- Modify: `app/web/server/services/productPageGenerationBusinessCta.test.ts`

**Interfaces:**
- `BusinessLandingContent`: `hero.headline` (1–160 chars), `hero.subheadline` (1–400 chars), optional `hero.desktopImageUrl`/`hero.mobileImageUrl`, 1–4 `{ title: 1–80 chars, description: 1–240 chars }` benefits, official `theme.fontPreset`/`theme.palettePreset`, and `dedicationText` (1–300 chars).
- `GET /api/internal/master-sites/business/content?activationLeadId=<uuid>` returns `{ activationLeadId, displayName, siteId, publicHost, revision, profile }`; `profile` is `null` until an operator explicitly creates one, while the public page continues to use generic safe master defaults.
- `PUT /api/internal/master-sites/business/content` accepts only `{ activationLeadId, expectedRevision, profile }` and returns the same safe projection with the new revision.
- The content service compares PUT `expectedRevision` against a fresh `snapshot.reviewRevision`; then `productPageSourceService.updateBusinessLandingContent({ siteId, expectedSourceHash, sourceConfiguration, profile })` performs a Business-identity-checked compare-and-swap under `withBusinessPublicationSite` and preserves all other source fields.
- All route responses use `Cache-Control: no-store`; never serialize email, owner key, entitlement, onboarding token, source bytes, provider configuration, or internal file path.

- [ ] **Step 1: Write failing contract tests** for exact bounds, unknown-key rejection, official presets, HTTP/foreign media URL rejection, the prohibited-claim cases listed in the spec, and allowed neutral/approved copy.
- [ ] **Step 2: Run `node --experimental-strip-types --test shared/business-landing-content-contract.test.ts` from `app/web`**; confirm the tests fail because the schema does not exist.
- [ ] **Step 3: Implement `businessLandingContentSchema` and exported `BusinessLandingContent`** in `app/web/shared/business-landing-content-contract.ts`. Keep it strict; do not add CTA URLs, claim-evidence toggles, testimonials, campaign fields, or VSL duration.
- [ ] **Step 4: Run the contract test** and confirm all boundaries pass.
- [ ] **Step 5: Write failing source-update tests** covering first save when no source file exists (using the fresh server-composed `snapshot.input`), update of an existing profile while preserving unrelated source fields, stale revision conflict, non-Business identity rejection, and no changes to Product sources.
- [ ] **Step 6: Run the new source-update test** and confirm it fails before the method exists.
- [ ] **Step 7: Implement `productPageSourceService.updateBusinessLandingContent`** with strict schema parsing, Business site identity validation, existing Business site serialization, compare-before-write, atomic temp-file rename, and preservation of all non-profile source fields. Do not call a nested save path that bypasses the expected-revision check.
- [ ] **Step 8: Run the source-update test** and confirm it passes.
- [ ] **Step 9: Write failing route/service tests** for unauthenticated 401, non-Super-Admin 403, wrong Origin/content type, unknown fields, missing/ineligible partner, stale revision 409, and isolation when a second partner ID is substituted.
- [ ] **Step 10: Run the route tests** and confirm they fail before the content route/service exists.
- [ ] **Step 11: Implement `createMasterSitesBusinessContentService({ preview, sources })`**. It resolves a fresh snapshot by activation lead, requires an eligible Business entitlement and current `snapshot.reviewRevision`, constructs the update from `snapshot.input`, and saves only `businessLandingContent` to that same site source. A missing profile remains `null` on GET and uses only the shared master fallback in generation.
- [ ] **Step 12: Implement `masterSitesBusinessContentRouteHandlers.ts` and `/content` GET/PUT route** using the existing `authorizeMasterSitesOperator`; parse PUT before creating services; map safe errors without reflecting Zod/filesystem text. The content service compares `expectedRevision` with a fresh snapshot inside `withBusinessPublicationSite`; the source update is reentrant under that same per-site lock. Return the recalculated post-save `snapshot.reviewRevision`.
- [ ] **Step 13: Extend `productPageGenerationInputSchema` and normalization** to accept `businessLandingContent` only for `ecosystemType: BUSINESS`, preserve it when normalizing/saving source, and fail closed for other ecosystems.
- [ ] **Step 14: Extend `assembleMasterSitesBusinessInput`** to use a validated saved profile when present and leave it absent when no profile exists; do not let saved content override site identity, distributor identity, WhatsApp, CTA URL, integrations, or entitlement.
- [ ] **Step 15: Add integration assertions** that generated Business configuration contains only that partner’s profile, the server-derived WhatsApp CTA remains intact, an absent profile uses the master fallback, and Product/Personal Brand inputs are unchanged.
- [ ] **Step 16: Run the focused suite:** `node --experimental-strip-types --test shared/business-landing-content-contract.test.ts server/services/masterSitesBusinessContentService.test.ts server/services/masterSitesBusinessInput.test.ts server/services/masterSitesBusinessRoutes.test.ts server/services/productPageGenerationBusinessCta.test.ts` from `app/web`.
- [ ] **Step 17: Run `npm run lint` and `npm run build` from `app/web`; inspect `git diff --check`; open a PR and report the exact files, tests, identity/security findings, and explicit no-publication status.**
