# Business Paid-Traffic Template Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the shared Business template safe by default and render only the approved `businessLandingContent` values for the selected partner.

**Architecture:** Keep the shared master generic and free of partner data. At runtime, render the optional profile from `window.CONFIG.businessLandingContent` with text nodes/textContent; when absent, use the safe generic master content. Keep disclosure, WhatsApp-only CTA semantics, VSL visibility, and measurement hooks stable.

**Tech Stack:** Static HTML/CSS/JavaScript template, Node test runner, existing Master package runtime tests.

**Spec:** `docs/superpowers/specs/2026-10-21-business-paid-traffic-readiness-design.md`

## Global Constraints

- Run commands through POSIX `sh`; do not use Bash.
- Only `plantillas-de-pagina/business/**` and the focused test file listed below may change in this ticket.
- Shared defaults contain no income/results guarantees, false scarcity, unsupported claims, corporate-registration claims, or partner identity.
- Preserve current VSL visibility; use “Ver presentación de negocio” and omit duration until the media duration is verified.
- CTA copy must describe its real WhatsApp destination; do not introduce a registration destination.
- The activity disclosure remains visible and cannot be turned off by partner configuration.
- No analytics/consent changes, campaign operations, hosting changes, generation of a real partner package, or deployment.

## Review Focus

- No profile: safe generic content remains visible; tests verify forbidden sample claims are absent.
- Malformed profile: template keeps generic fallback without throwing or rendering `[object Object]`.
- HTML-like profile strings: render as literal text, never executable DOM; test script markup.
- Unsupported field or external image origin: ignore/reject it and keep safe media fallback; test foreign URL.
- Mobile and desktop: disclosure/CTA/VSL do not overlap or become unreadable; verify at 390px and 1280px viewports using the existing project browser check before merge.

---

### Task 1: Safe shared defaults and profile renderer

**Files:**
- Modify: `plantillas-de-pagina/business/config.js`
- Modify: `plantillas-de-pagina/business/app.js`
- Modify: `plantillas-de-pagina/business/index.html`
- Modify: `plantillas-de-pagina/business/styles.css`
- Create: `app/web/scripts/business-paid-traffic-template.test.mjs`

**Interfaces:**
- Read `window.CONFIG.businessLandingContent` with the exact schema in the spec: hero headline/subheadline and optional approved hero image URLs; 1–4 benefits; official theme presets; dedication text.
- The renderer applies only the known fields to existing selectors; `cta.primaryText`/`cta.secondaryText` remain “Hablar por WhatsApp” or “Conocer la oportunidad” and their URLs remain the server-derived WhatsApp URLs.
- The near-CTA disclosure remains fixed, visible, and states independent direct-selling activity, required investment and commercial work, accompaniment, and that it is not employment; no amount is shown.
- The generic VSL heading is “Ver presentación de negocio”; no duration string is rendered by default. Existing player and stable analytics/CTA selectors remain.

- [ ] **Step 1: Add failing Node tests** that scan all user-visible copy in `config.js`, `app.js`, and `index.html` for the disallowed claims/urgency from the spec; assert the approved dedication text can be represented in the profile, assert CTA labels/destination hooks, and verify generic VSL title/no duration.
- [ ] **Step 2: Run `node --test scripts/business-paid-traffic-template.test.mjs` from `app/web`** and confirm expected failures against current template content.
- [ ] **Step 3: Replace unsafe shared copy in `config.js`** with neutral, non-guarantee language; disable unverified claims, social proof, testimonials, and success sections by default; keep the VSL asset visible without a duration claim.
- [ ] **Step 4: Add/update stable disclosure and CTA markup in `index.html`**. Preserve event selectors and make the disclosure accessible and near the main action.
- [ ] **Step 5: Implement the known-field renderer in `app.js`** using `textContent`, DOM node creation, strict preset allowlists, image-origin checks for `media.partnerhub.club/comunes/business/`, and neutral fallback on malformed profile. Do not use `innerHTML` for profile values.
- [ ] **Step 6: Adjust `styles.css`** only as needed for a legible, responsive disclosure and the approved youth-blue/lime/white direction when those official presets are selected.
- [ ] **Step 7: Run the template test** and `node --test scripts/business-master-runtime-packaging.test.mjs` from `app/web`; ensure checks pass without changing generated-site outputs.
- [ ] **Step 8: Verify desktop/mobile in local preview** at 1280px and 390px widths; record VSL, disclosure, CTA, navigation, contrast, and overflow observations.
- [ ] **Step 9: Run `npm run lint` and `npm run build` from `app/web`; inspect `git diff --check`; open a PR with no generation/publication/deploy action.**
