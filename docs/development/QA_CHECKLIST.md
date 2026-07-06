# QA Checklist

Ticket: PH-007
Owner: Claude Code (Principal Reviewer)

## Purpose

An operational, per-PR checklist derived from [docs/design/UX_AUDIT_FRAMEWORK.md](../design/UX_AUDIT_FRAMEWORK.md). Where the framework explains *why* a dimension matters, this checklist is the fast, mechanical pass used when reviewing a specific screen, component, or PR before it ships.

## How To Use

- Run through the relevant sections for the screen/feature under review — not every section applies to every change (e.g. a backend-only PR skips this checklist entirely).
- Mark each item **Pass / Risk / Fail / N/A**.
- Any **Fail** blocks merge.
- Any **Risk** must be written up as a follow-up ticket recommendation, not silently fixed or silently ignored.
- This checklist supports review; it does not authorize Claude to implement the fix. Route findings to the owning role per `brain/AGENT_RULES.md`.

## Checklist

### Accessibility
- [ ] All interactive elements reachable via keyboard
- [ ] Visible focus indicator on every interactive element
- [ ] Text/background contrast meets WCAG AA
- [ ] Form fields have labels and errors are tied via `aria-describedby` or equivalent
- [ ] Non-decorative icons/images have alt text; decorative ones are hidden from assistive tech

### Consistency
- [ ] Uses existing design system components, not one-off markup
- [ ] Terminology matches `brain/06_DOMAIN_MODEL.md`
- [ ] Spacing/typography match the established scale
- [ ] Equivalent actions elsewhere in the app behave the same way here

### Responsive Behavior
- [ ] Verified at mobile, tablet, and desktop breakpoints
- [ ] No horizontal scroll or overflow bugs
- [ ] Touch targets are large enough on mobile
- [ ] Dense tables/data have a defined mobile pattern (not silent truncation)

### Information Hierarchy
- [ ] Primary action is visually dominant
- [ ] Current context (tenant, module, record) is visible
- [ ] Secondary/advanced options are progressively disclosed
- [ ] Navigation context (breadcrumb or equivalent) is present

### SaaS Usability
- [ ] Active tenant/brand context is unambiguous
- [ ] Role-based visibility is correct (no admin-only controls exposed to partners, or vice versa)
- [ ] Settings/configuration is discoverable
- [ ] Bulk/replication actions exist wherever the workflow needs them

### Empty States
- [ ] Every list/table has a designed empty state
- [ ] Empty state explains the module's purpose
- [ ] Empty state offers a concrete next action

### Loading States
- [ ] Loading indicator present for async operations >~300ms
- [ ] Skeleton shape approximates final layout (no layout shift on resolve)
- [ ] First load, background refresh, and pagination loading are visually distinct

### Error States
- [ ] Validation, permission, and system errors are visually distinct
- [ ] Error messages are actionable
- [ ] Failed API calls degrade gracefully — screen never blanks or crashes
- [ ] Errors are traceable/logged where auditability is required

### Scalability
- [ ] Works with realistic large data volumes (pagination/search/filter present)
- [ ] No assumptions baked in that only fit a single tenant
- [ ] Reusable component patterns used, not screen-specific one-offs

### Maintainability
- [ ] No hardcoded copy/business data that should live in config/content
- [ ] No duplicated UI logic — shared components used instead
- [ ] Component variants/props are self-evident or documented

## Escalation

Any Fail, or any Risk that isn't already ticketed, gets written up as review feedback and routed to the correct owner — Antigravity for frontend implementation, Codex for backend-adjacent issues, ChatGPT for architecture-level conflicts — per `brain/AGENT_RULES.md`. Claude documents; Claude does not silently fix across role boundaries.
