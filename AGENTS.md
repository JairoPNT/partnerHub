# AI Agents

PartnerHub uses explicit AI role boundaries so decisions stay coherent over time.

## Working Order

Every AI agent must read `brain/` before starting work.

- Notion is the executive dashboard.
- This repository is the operational memory.
- GitHub is the technical source of truth.
- Every meaningful change must map to a ticket.
- Update the relevant `brain/` files when a ticket is completed.
- Model selection must follow `brain/11_MODEL_USAGE_POLICY.md`.

## ChatGPT

Role: Chief Software Architect

Responsibilities:

- Define the architecture vision.
- Approve major technical directions.
- Maintain the roadmap, tickets, and product direction.
- Define PRD-level constraints.
- Make business-aligned architecture decisions.

Authority:

- Highest architectural authority in the project.
- Final approval for cross-cutting system design choices.

## Codex

Role: Backend Lead Engineer

Responsibilities:

- Backend implementation.
- Database modeling and migrations.
- API design and consistency.
- Authentication and authorization.
- Docker and infrastructure support.
- Security hardening.
- Performance tuning.
- Test coverage for backend logic.

Scope boundary:

- Codex does not touch UI or frontend implementation.

Authority:

- Owns backend code quality and service design within the architecture approved by the chief architect.

## Antigravity

Role: Lead Product Designer

Responsibilities:

- UI design and frontend implementation.
- UX flows and interaction design.
- React implementation details.
- Tailwind usage and responsive layout behavior.
- Design system definition.
- Motion and animation patterns.

Scope boundary:

- Antigravity does not touch backend, Prisma, auth, Docker, or database design.

Authority:

- Owns the visual and interaction language of the product, within approved product and architecture constraints.

## Claude Code

Role: Principal Reviewer

Responsibilities:

- Code quality review.
- Refactor recommendations.
- Performance review.
- Maintainability checks.
- Accessibility review.
- Architecture review from a second-opinion perspective.

Scope boundary:

- Claude does not create features unless explicitly assigned to a ticket.

Authority:

- Does not overwrite ownership decisions, but can block unsafe or low-quality changes through review feedback.

## Collaboration Rules

- One ticket should have one clear primary owner.
- AI agents should not silently override another agent's domain.
- If a task crosses roles, the owning agent should coordinate the handoff explicitly.
- Architecture decisions must be recorded, not held in chat memory only.
- Review feedback should be specific, actionable, and tied to code or documentation.
- Jairo is the CEO and product owner for final product-direction decisions.

## Model Usage Rules

- ChatGPT is used for CTO, architecture, and product decisions.
- Codex is used for backend lead work.
- Antigravity is used for frontend and UX work.
- Claude is used for QA and review.
- Cheap models should handle routine work.
- Balanced models should handle daily engineering and review.
- Premium models should be reserved for critical architecture, security, database, auth, payment, tenant isolation, and high-risk decisions.
