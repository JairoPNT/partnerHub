# Model Usage Policy

Ticket: PH-002C

This document defines how the PartnerHub AI engineering team should choose models for work across architecture, backend, frontend, and review. The goal is to maintain high engineering quality without spending premium model capacity on routine work.

## Team Roles

| Agent | Responsibility |
| --- | --- |
| ChatGPT | CTO / Architecture / Product decisions |
| Codex | Backend Lead |
| Antigravity | Frontend and UX |
| Claude | QA and Review |

## Cost-Control Principle

Use the cheapest model that can complete the task safely.

Premium models are not the default. They are reserved for work where an incorrect answer could create expensive rework, security exposure, data loss, tenant isolation failures, payment mistakes, or long-term architecture debt.

## When To Use Cheap Models

Use cheap or fast models for:

- Routine documentation updates.
- Summaries.
- Ticket formatting.
- Small copy edits.
- Low-risk UI iteration.
- Checklist creation.
- Simple file inventory.
- Repetitive validation already guided by documented rules.

Do not use cheap models as final authority for:

- Authentication.
- Authorization.
- Database modeling.
- Payment workflows.
- Security review.
- Tenant isolation.
- Major architecture decisions.

## When To Use Balanced Models

Use balanced models for:

- Daily backend implementation.
- Daily frontend implementation.
- Pull request review.
- API contract review.
- Medium-complexity debugging.
- Documentation review.
- Refactor planning with contained scope.

Balanced models are the default for normal engineering work.

## When To Use Premium Models

Use premium models only for:

- Critical architecture decisions.
- Security-sensitive decisions.
- Database design and migration strategy.
- Authentication and authorization design.
- Multi-tenant isolation.
- Payment and billing logic.
- High-risk integrations.
- Production readiness review.
- Major refactors with cross-module impact.

Do not use premium models for:

- Formatting markdown.
- Writing routine summaries.
- Creating simple checklists.
- Renaming files.
- Small UI copy changes.
- Re-running already validated decisions.
- Low-risk boilerplate.

## Agent Guidance

### ChatGPT

Use ChatGPT for CTO-level decisions:

- Architecture direction.
- Product direction.
- Ticket sequencing.
- Cross-agent arbitration.
- Final decisions for platform-wide tradeoffs.

Use premium reasoning when the answer changes the long-term platform direction.

### Codex

Use Codex for backend-owned work:

- APIs.
- Prisma.
- PostgreSQL.
- Auth and authorization implementation.
- Services and business logic.
- Docker and environment.
- Backend testing.

Codex should escalate before implementing any backend change that alters approved architecture or crosses into frontend ownership.

### Antigravity

Use Antigravity for frontend-owned work:

- UX flows.
- React components.
- Tailwind.
- Responsive layouts.
- Design system decisions.

Use cheap or balanced models for normal UI iteration. Use stronger models only when the frontend work changes product-wide flows or design-system foundations.

### Claude

Use Claude for review and QA:

- PR review.
- Maintainability review.
- Accessibility review.
- Performance review.
- Security review.
- Architecture second opinion.

Use balanced models for daily review. Use premium models for high-risk review involving auth, security, database, payments, tenant isolation, or production readiness.

## Escalation Rules

- Escalate from cheap to balanced when a task becomes ambiguous, cross-module, or risk-bearing.
- Escalate from balanced to premium when security, auth, database, payments, tenant isolation, or production risk appears.
- Escalate to ChatGPT when architecture direction is unclear or agents disagree.
- Do not allow one agent to overwrite another agent's scope without a documented handoff.
- Record major model-driven decisions in the relevant `brain/` or `docs/` file.

## Examples By Ticket Type

| Ticket Type | Primary Owner | Recommended Tier |
| --- | --- | --- |
| PH documentation cleanup | Assigned agent | Cheap |
| Architecture validation | ChatGPT | Premium |
| Backend API design | Codex | Balanced |
| Prisma schema planning | Codex | Balanced, with premium review before production |
| Authentication | Codex | Premium or balanced plus premium review |
| Frontend module page | Antigravity | Cheap or balanced |
| Design system foundation | Antigravity | Balanced |
| PR review | Claude | Balanced |
| Security review | Claude | Premium |
| Deployment config | Codex | Balanced, premium if production data/security is affected |

## Enforcement

Every ticket should state:

- Primary owner.
- Expected model tier.
- Escalation trigger.
- Whether premium review is required.

If the model tier is unclear, choose the lower-cost tier first and escalate only when risk justifies it.
