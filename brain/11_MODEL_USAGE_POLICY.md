# Model Usage Policy

Ticket: PH-002C

PartnerHub uses AI agents as a coordinated engineering team. Model selection must protect quality while controlling cost. Expensive models are reserved for decisions where mistakes would create architecture, security, data, or business risk.

## Role Strategy

| Agent | Role | Primary Scope |
| --- | --- | --- |
| ChatGPT | CTO / Chief Software Architect | Architecture, product direction, roadmap, ticket definition, cross-cutting decisions |
| Codex | Backend Lead | Backend architecture, APIs, Prisma, PostgreSQL, auth, authorization, services, Docker, testing |
| Antigravity | Frontend and UX Lead | UI, UX flows, React implementation, Tailwind, responsive behavior, design system |
| Claude | QA and Principal Reviewer | Quality review, risk review, maintainability, accessibility, architecture second opinion |

## Cost-Control Principle

Use the cheapest model that can complete the task safely.

Model choice should be based on risk, not preference. Routine work should use cheap or fast models. Daily review should use balanced models. Premium models should be used only when the decision has high downside risk or long-term architectural impact.

## Model Tiers

### Cheap / Fast Models

Use for:

- Summaries.
- Documentation cleanup.
- Ticket formatting.
- Simple consistency checks.
- Routine frontend iterations.
- Low-risk copy changes.
- Drafting checklists.
- Reviewing small documentation-only diffs.

Avoid for:

- Security decisions.
- Database design.
- Authentication design.
- Multi-tenant isolation.
- Payment architecture.
- High-risk production incidents.

### Balanced Models

Use for:

- Daily code review.
- Normal backend implementation.
- Normal frontend implementation.
- API contract review.
- Documentation review.
- Refactor planning with limited blast radius.
- Medium-complexity debugging.

Avoid for:

- Final approval of critical architecture.
- Final approval of security-sensitive auth flows.
- Deep database redesign.
- Payment or billing correctness decisions.

### Premium Models

Use only for:

- Critical architecture decisions.
- Security-sensitive design.
- Database and tenant isolation decisions.
- Authentication and authorization decisions.
- Payment, billing, and auditability decisions.
- High-risk production decisions.
- Major cross-module refactors.
- Complex incident analysis.

Do not use premium models for:

- Simple documentation formatting.
- Routine summaries.
- Small CSS or UI changes.
- Ticket naming.
- Low-risk copy edits.
- Repeating a task already validated by another agent.
- Generating boilerplate that does not affect architecture.

## Agent-Specific Usage

### ChatGPT

Use ChatGPT as the CTO / Chief Software Architect for:

- Product strategy.
- Architecture direction.
- Ticket sequencing.
- Cross-agent ownership decisions.
- Approval of high-impact technical direction.

Use premium reasoning only when:

- A decision changes the platform architecture.
- A decision affects tenant isolation, auth, billing, or long-term scalability.
- The team needs final arbitration between competing technical approaches.

### Codex

Use Codex as Backend Lead for:

- Backend implementation.
- API structure.
- Prisma schema planning.
- PostgreSQL data modeling.
- Authentication and authorization implementation.
- Docker and environment work.
- Backend tests and security hardening.

Escalate to ChatGPT before implementing if:

- The ticket changes architecture.
- The ticket affects multiple roles.
- The ticket changes tenant isolation.
- The ticket changes auth, payment, or database boundaries.

### Antigravity

Use Antigravity for:

- UI implementation.
- UX decisions.
- React component work.
- Tailwind and responsive behavior.
- Design system changes.

Prefer cheap or balanced models for:

- Routine UI tasks.
- Visual iteration.
- Component cleanup.
- Responsive fixes.

Use stronger models only for:

- Complex product flows.
- Large frontend refactors.
- Design system decisions with long-term impact.

### Claude

Use Claude as QA and Principal Reviewer for:

- Pull request review.
- Maintainability review.
- Accessibility review.
- Security review.
- Performance review.
- Second-opinion architecture review.

Use balanced models for daily review.

Use premium models only for:

- Security review.
- Architecture review.
- Database review.
- Auth review.
- Payment review.
- High-risk production readiness review.

## Escalation Rules

- If a cheap model identifies a possible high-risk issue, escalate to a balanced model.
- If a balanced model identifies an architecture, security, auth, database, or billing risk, escalate to a premium model or ChatGPT.
- If a task crosses role boundaries, stop implementation and document the handoff.
- If two agents disagree on architecture, ChatGPT decides.
- If a review blocks a change, the owner documents the risk before continuing.

## Examples By Ticket Type

| Ticket Type | Owner | Recommended Model Tier | Notes |
| --- | --- | --- | --- |
| Documentation cleanup | Assigned agent | Cheap | Use premium only if architecture meaning changes |
| Architecture decision | ChatGPT | Premium | Must be recorded in architecture docs |
| Backend CRUD API | Codex | Balanced | Escalate if auth, tenant isolation, or billing is affected |
| Prisma schema draft | Codex | Balanced | Premium review before production migration |
| Auth implementation | Codex | Premium or balanced plus premium review | Security-sensitive by default |
| UI page implementation | Antigravity | Cheap or balanced | Codex should not implement visual decisions |
| Design system change | Antigravity | Balanced | Escalate if product-wide interaction model changes |
| PR review | Claude | Balanced | Premium only for high-risk areas |
| Security review | Claude | Premium | Required for auth, payments, secrets, file storage |
| Deployment config | Codex | Balanced | Premium if production security or data persistence is affected |

## Operating Rule

Every ticket should name the owner first, then choose the model tier. The team should not choose a premium model by habit. Premium usage requires a clear reason tied to risk, complexity, or long-term impact.
