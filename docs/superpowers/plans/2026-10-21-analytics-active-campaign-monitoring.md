# Analytics Active Campaign Monitoring Discovery Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Document the current Analytics & Metrics surface and specify read-only monitoring for campaigns already active in connected platforms, including Google Ads conversions when verifiable data exists.

**Architecture:** Trace the current UI, partner settings, campaign lifecycle model, and available metrics. Separate internal campaign workflow events from external ad-platform performance data. Produce a read-only discovery report; platform API connection and UI implementation require separate tickets and approval.

**Tech Stack:** TypeScript/React source review, Node test runner only if needed, Markdown report.

**Spec:** `docs/superpowers/specs/2026-10-21-business-paid-traffic-readiness-design.md`

## Global Constraints

- Run commands through POSIX `sh`; do not use Bash.
- This ticket is documentation/read-only; do not edit application code or call external platform APIs.
- Analytics & Metrics monitors already-active campaigns and results only; no campaign, ad, budget, or bid creation or operation.
- Separate GA4/Meta measurements and landing clicks from Google Ads conversion records and platform-attributed conversions.
- A WhatsApp click is only intent and is not a conversation, registration, sale, or purchase.
- Distinguish what source code proves from connected-account and live-data state that remains unknown.

## Review Focus

- Current form saves GA4/Meta settings: report this separately from campaign management; do not remove it in this discovery task.
- Current Google Ads section is only a disabled placeholder: do not present it as an active integration.
- `trafficCampaignService` models internal lifecycle transitions: do not infer that it contains Google/Meta campaign performance.
- A campaign’s landing/partner association is needed for tenant isolation: document the authoritative join key and any missing mapping.
- No Ads API call is made: list which future read-only OAuth/API scopes and operator decisions would be needed, without requesting or exposing credentials.

---

### Task 1: Current-state inventory and read-only dashboard requirements

**Files:**
- Read: `app/web/components/analytics-and-metrics-view.tsx`
- Read: `app/web/server/services/trafficCampaignService.ts`
- Read: `app/web/server/services/businessEventService.ts`
- Read: `app/web/server/services/lifecycle.ts`
- Read: `app/web/server/services/dashboardMetricsService.ts`
- Read: relevant API routes referenced by the Analytics & Metrics component
- Create: `brain/agent-requests/codex/reports/CDX-20261021-003_analytics_active_campaign_monitoring_spec_DONE.md`

**Interfaces:**
- Report: current UI controls; available internal data vs missing provider data; proposed read-only campaign/conversion card fields; tenant/site association; time period and last-updated/freshness labels; conversion semantics; unknowns; and minimum future API/UI tickets.
- Do not specify a final provider metric list unless the source contract supports it; mark unverified values `unknown` rather than guessing.

- [ ] **Step 1: Trace the Analytics & Metrics component’s rendered controls and write paths**; record any existing GA4/Meta configuration, manual verification, and Google Ads placeholder with exact source lines.
- [ ] **Step 2: Trace campaign lifecycle and metrics services**; determine whether records represent internal campaign requests or external platform performance and document exact fields/statuses found.
- [ ] **Step 3: Map available API routes and authentication** without sending requests to external providers or reading live campaign/account data.
- [ ] **Step 4: Draft the read-only requirements**: active campaigns only, source/platform, partner/site association, reporting window, last sync, provider-attributed conversion counts, and explicit no-write controls. Mark unavailable values and provider mapping as unknown.
- [ ] **Step 5: Write the DONE report** with exact paths/lines, evidence limits, open decisions, and a separate follow-up proposal for read-only integration and UI; no code change.
- [ ] **Step 6: Run `git diff --check` and verify only the request/report changed.**

