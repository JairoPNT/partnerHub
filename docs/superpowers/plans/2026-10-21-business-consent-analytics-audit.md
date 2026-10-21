# Business Consent and Analytics Audit Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce an evidence-based, read-only map of consent, GA4/Meta loading, and event meaning for Business pages without changing product behavior.

**Architecture:** Trace code from the Business page’s source configuration through generation and static output, including server-injected Meta code and any consent UI or event handlers. Report exact evidence, gaps, and a minimal separate follow-up; do not use provider APIs or live accounts.

**Tech Stack:** TypeScript/JavaScript static review, Node test runner where useful, repository report in Markdown.

**Spec:** `docs/superpowers/specs/2026-10-21-business-paid-traffic-readiness-design.md`

## Global Constraints

- Run commands through POSIX `sh`; do not use Bash.
- Read-only audit: no runtime/code changes, external account calls, IDs, campaigns, events, consent or publication changes.
- Analítica y Métricas monitors only already-active campaigns and resulting data; it does not create or operate campaigns.
- A WhatsApp click is only an intent signal; do not call it a conversation, lead registration, purchase, or sale.
- Never send or log partner/user PII in an analytics event.
- Findings distinguish repository evidence from unknown live deployment/account state.

## Review Focus

- Meta Pixel injected into generated HTML before any consent path: report exact injection point and whether consent gates it.
- GA4 ID present in source/input but no Business runtime loader: trace to generated bundle and classify as absent/unverified, not configured.
- WhatsApp click listeners or conversion names: verify event semantics and PII treatment.
- No JavaScript or rejected/absent consent: determine whether tags still load and record limitations.
- Current static tests only verify tag injection or configuration, not user-consent behavior: list missing tests.

---

### Task 1: Read-only source-to-event audit and report

**Files:**
- Read: `plantillas-de-pagina/business/app.js`
- Read: `plantillas-de-pagina/business/config.js`
- Read: `app/web/server/services/productPageGenerationService.ts`
- Read: `app/web/server/services/metaPixelHtml.ts`
- Read: `app/web/server/services/metaPixelHtml.test.ts`
- Read: `app/web/server/services/productPageGenerationBusinessCta.test.ts`
- Create: `brain/agent-requests/codex/reports/CDX-20261021-002_business_consent_analytics_audit_DONE.md`

**Interfaces:**
- Report sections: scope/method, consent source, load order for GA4 and Meta, PageView behavior, CTA event names/meaning, PII behavior, behavior without consent/JavaScript, test evidence, unknown live state, and smallest corrective follow-up.
- Source references include repository-relative path and line numbers. Do not include secret values or real partner data.

- [ ] **Step 1: Write a source map** from template and input configuration to generated HTML and browser event handlers, noting all branches for configured and absent IDs.
- [ ] **Step 2: Run only relevant local tests** with `npm run test:meta-pixel` and `npm run test:business-whatsapp-cta` from `app/web`; record exact pass/fail and what those tests do not prove.
- [ ] **Step 3: Verify consent behavior by static trace**. If no consent gate exists, explicitly state that it is unverified/absent rather than inferring compliance from a privacy notice.
- [ ] **Step 4: Write the DONE report** with exact evidence and a separate remediation request proposal if needed; change no source code.
- [ ] **Step 5: Run `git diff --check` and verify the diff contains only the report and its completion metadata.**
