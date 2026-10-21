# Master Sites Business Landing Content Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Super Admin-only Master Sites editor for one Business landing-content profile per partner, clearly separated from publication and Ads controls.

**Architecture:** Add a focused client component to the existing Master Site management surface and call the `/api/internal/master-sites/business/content` GET/PUT contract only. Select a partner, edit approved content fields, show a preview-safe summary and save with optimistic revision checking. Saving never prepares a target, publishes a site, or manages advertising campaigns.

**Tech Stack:** React/TypeScript, existing Master Sites components and API, shared Zod response/request schemas, Next.js build.

**Spec:** `docs/superpowers/specs/2026-10-21-business-paid-traffic-readiness-design.md`

## Global Constraints

- Run commands through POSIX `sh`; do not use Bash.
- This is a content editor, not a campaign editor; Analítica y Métricas only follows active campaigns and results and is not implemented in this ticket.
- Only Super Admin can access/save; backend remains authoritative for authorization and validation.
- The UI must not allow edits to site identity, domain, partner WhatsApp, CTA URL, entitlement, campaign IDs/budgets, privacy consent, claims, testimonials, VSL duration, Product, or Personal Brand.
- One profile per partner; multiple external campaigns may point to the same active landing. No A/B or query-string variant selector.
- “Guardar” does not generate, prepare, enqueue, publish, deploy, call a provider, or contact Meta/Google.
- No direct upload to Hostinger, DNS/SFTP, external platform or account integrations.

## Review Focus

- API returns 401/403 or malformed response: show safe error and preserve unsaved edits; test pure response/error mapper.
- Stale profile revision: show conflict and require reload/review before resave; never silently overwrite.
- Partner switch while request is in flight: discard late response for previous partner; test selected-ID guard.
- Dangerous URL/content pasted: show schema error from server and do not save; no client-only validation is treated as authority.
- Small-screen layout: partner selector, fields, disclosure preview, and save status remain usable at 390px.

---

### Task 1: Master Sites content editor

**Files:**
- Create: `app/web/components/business-landing-content-editor.tsx`
- Create: `app/web/components/business-landing-content-editor-helpers.ts`
- Create: `app/web/components/business-landing-content-editor-helpers.test.ts`
- Modify: `app/web/components/master-site-management-view.tsx`

**Interfaces:**
- Consume `businessLandingContentSchema`, `BusinessLandingContent`, and the GET/PUT wire schemas from `app/web/shared/business-landing-content-contract.ts`.
- GET `/api/internal/master-sites/business` supplies the partner list; GET `/api/internal/master-sites/business/content?activationLeadId=<uuid>` supplies one partner’s current profile and revision; PUT uses `{ activationLeadId, expectedRevision, profile }`.
- Component states: `idle | loading | ready | saving | conflict | error`; only a successful PUT updates the displayed revision.
- Fields: hero headline/subheadline, desktop/mobile approved media URL, 1–4 benefit cards, official font/palette presets, and dedication text. When GET returns `profile: null`, show that the shared generic fallback is active; do not invent or prefill a different default. The disclosure/CTA/VSL title are read-only previews; claims/testimonials remain unavailable.

- [ ] **Step 1: Add failing pure-helper tests** for profile initialization, safe partner-switch behavior, parsing API conflict/errors, and constructing a PUT payload without siteId/domain/WhatsApp/CTA URL/campaign fields.
- [ ] **Step 2: Run `node --experimental-strip-types --test components/business-landing-content-editor-helpers.test.ts` from `app/web`** and confirm the tests fail before the helper exists.
- [ ] **Step 3: Implement the pure helper functions** with typed responses and discard stale responses whose activationLeadId no longer matches current selection.
- [ ] **Step 4: Run helper tests** and confirm they pass.
- [ ] **Step 5: Build the editor component** with accessible labels, character limits matching the shared Zod contract, server-error display, stale-revision reload path, and explicit “Guardar contenido” wording.
- [ ] **Step 6: Integrate the component into the Business Master Sites management surface**. Do not add a campaign creation/action panel and do not conflate “guardar” with the separate existing prepare/publish actions.
- [ ] **Step 7: Run helper tests, `npm run lint`, and `npm run build` from `app/web`; manually verify partner selection, saved revision, 409 conflict, 403 state, and 390px layout against a local mocked API.**
- [ ] **Step 8: Inspect `git diff --check` and open the frontend-only PR, listing backend contract dependency and confirming no API, template, or external campaign files changed.**
