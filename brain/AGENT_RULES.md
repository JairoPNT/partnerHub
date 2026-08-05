# Agent Rules

## Global Rules

- Read `brain/` first.
- Read `brain/11_MODEL_USAGE_POLICY.md` before selecting models for ticket work.
- Work only on the assigned PH ticket.
- Do not modify files outside your scope.
- Keep the platform generic.
- Do not build new features until Architecture Validation is complete.

## Role Boundaries

- ChatGPT defines architecture, tickets, priorities, and approval.
- Codex does not touch UI.
- Antigravity does not touch backend, Prisma, auth, Docker, or database design.
- Antigravity works strictly under the Cross-Agent Request Protocol (`brain/agent-requests/antigravity/`).
- Claude does not create features unless explicitly assigned.
- Jairo is the CEO / Product Owner.

## Work Product Requirements

Every completed ticket must update the relevant `brain/` files and return:

- summary
- files changed
- risks
- next recommended ticket

## Escalation Rule

If a change crosses domain boundaries, stop and coordinate the handoff rather than silently expanding scope.

## Model Usage Rule

- Use cheap models for routine work.
- Use balanced models for daily implementation and review.
- Use premium models only for critical architecture, security, database, authentication, authorization, payment, tenant isolation, or high-risk production decisions.
- Escalate model tier based on risk, not preference.
