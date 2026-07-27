# UX Audit Framework

Ticket: PH-007
Owner: Claude Code (Principal Reviewer)

## Purpose

A repeatable framework for evaluating PartnerHub screens — current and future — across the UX and QA dimensions that matter for a multi-tenant, operational SaaS product. This framework is an evaluation tool, not an implementation spec. It exists so screen reviews are consistent regardless of which module or sprint produced them.

## How To Use

- Apply per screen or per module, not as a whole-app pass.
- Each dimension below gets a qualitative rating: **Pass**, **Risk**, or **Fail**, with a short WHY.
- This framework does not grant authority to redesign a screen. Findings are documented as review feedback and routed to the owning role per `brain/AGENT_RULES.md` (Antigravity for frontend implementation, ChatGPT for architecture-level conflicts).
- For day-to-day PR review, use the companion checklist at [docs/development/QA_CHECKLIST.md](../development/QA_CHECKLIST.md), which operationalizes these same dimensions into checkboxes.

## Severity Levels

- **Blocker** — breaks core usability or accessibility; must be fixed before merge.
- **Risk** — works today but introduces debt or inconsistency; should become a follow-up ticket recommendation, not a silent fix.
- **Note** — minor polish suggestion, non-blocking.

## Dimensions

### 1. Accessibility

- Every interactive element is reachable and operable via keyboard.
- Focus state is visible at all times, never suppressed.
- Text and interactive-element contrast meets WCAG AA.
- Form inputs have associated labels and errors are announced (e.g. `aria-describedby`).
- Non-decorative icons/images carry alt text; decorative ones are hidden from assistive tech.

**Why it matters here:** PartnerHub's primary surfaces (per `brain/07_UI_MODEL.md`) are administrative and data-dense — accessibility gaps compound fastest in dashboards and tables, not marketing pages.

### 2. Consistency

- Screens reuse the established design system components rather than one-off markup.
- Terminology matches the domain language in `brain/06_DOMAIN_MODEL.md` (no synonyms drifting in from ad hoc copy).
- Spacing and typography follow the scale defined in `docs/design/README.md`.
- Equivalent actions (create, edit, replicate, archive) behave the same way across modules.

**Why it matters here:** the platform must stay generic across future tenants (per `AI_CONTEXT.md`); visual/interaction drift between modules undermines that goal as fast as architectural drift does.

### 3. Responsive Behavior

- Verified at mobile, tablet, and desktop breakpoints, not just desktop.
- Dense tables and business data degrade gracefully on small viewports (stack, scroll-with-affordance, or summarized view — not silent truncation).
- Touch targets are large enough for mobile use.
- No horizontal scroll traps or overflow bugs.

**Why it matters here:** `docs/design/README.md` already commits to responsive behavior "from the beginning" — this dimension exists to catch violations before they ship, not redesign the responsive strategy itself.

### 4. Information Hierarchy

- The primary action on a screen is visually dominant; secondary actions don't compete with it.
- Dense business data follows headline metric → supporting detail → raw data, not a flat data dump.
- Advanced or rarely-used settings are progressively disclosed, not surfaced by default.
- Current context (tenant, module, record) is always visible.

**Why it matters here:** `brain/07_UI_MODEL.md` explicitly calls for "strong hierarchy" on dense business data; this dimension turns that principle into something checkable.

### 5. SaaS Usability

- The active tenant/brand context is unambiguous at all times — this is a hard requirement in a multi-tenant product.
- Role-based views don't leak controls that belong to another role (admin vs. partner).
- Settings and configuration are discoverable, not buried behind unlabeled icons or nested menus.
- Bulk and replication actions are available wherever the underlying workflow needs them (e.g. Sitio Master content propagation).

**Why it matters here:** the product's stated value proposition is centralized, replicable administration, not a single-tenant landing page — usability failures here undermine the core pitch, not just polish.

### 6. Empty States

- Every list or table has a designed empty state — never a blank void.
- The empty state explains what the module does, not just that it's empty.
- The empty state offers a concrete next action (a CTA or link), never a dead end.

### 7. Loading States

- Any async operation taking longer than ~300ms has a visible loading indicator.
- Skeletons approximate the final layout shape so content doesn't jump when it resolves.
- First load, background refresh, and pagination loading are visually distinguishable from one another.

### 8. Error States

- Validation errors, permission errors, and system errors are visually and textually distinct from each other.
- Every error message is actionable — it tells the user what to do next, not just that something failed.
- A failed API call degrades the screen gracefully; it never blanks or crashes it.
- Errors are traceable/logged where the underlying requirement calls for auditability (RNF-06 in `docs/01_requerimientos.md`).

### 9. Scalability

- The screen remains usable at realistic large data volumes — pagination, search, and filtering are present where needed, not assumed to be "added later."
- Nothing in the design silently assumes a single tenant's data shape.
- UI patterns generalize to future modules rather than being one-off solutions for the current module only.

**Why it matters here:** `AI_CONTEXT.md` states the platform must support "tens of thousands of companies" without re-platforming — UI scalability is part of that promise, not just backend scalability.

### 10. Maintainability

- No hardcoded copy or business data that should live in a content/config layer (relevant once the Sitio Master content model exists).
- No duplicated UI logic across screens — shared components are used instead of parallel implementations.
- Component variants and props are self-evident or documented, so a new contributor can extend them without guessing.

## Reporting

When this framework is applied as part of a full review, fold the findings into the standard reviewer report structure: Architecture Review, Performance, Security, Maintainability, Scalability, Suggestions, Priority — each recommendation stating WHY. For a single-screen audit, a lightweight per-dimension table (dimension → rating → why) is sufficient; escalate Blockers and Risks as ticket recommendations rather than fixing them directly, per the role boundaries in `brain/AGENT_RULES.md`.
