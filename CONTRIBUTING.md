# Contributing

PartnerHub is built through ticketed work, clear ownership, and explicit documentation of decisions.

## Workflow

1. Start with an assigned ticket.
2. Read `brain/` before making changes.
3. Read the permanent context files before making changes.
4. Make changes only within the assigned domain.
5. Document important decisions in the appropriate markdown file.
6. Review the result before handing it off.

## Collaboration Rules

- No AI should overwrite another AI's work.
- Every task must map to a ticket.
- Do not build new features until Architecture Validation is complete.
- Keep PartnerHub generic and avoid hardcoding Gano Excel into architecture.
- Architecture decisions belong to the Chief Software Architect.
- Backend belongs to Codex.
- Frontend belongs to Antigravity.
- Review belongs to Claude Code.

## Quality Rules

- Keep the platform generic unless the ticket requires tenant-specific behavior.
- Prefer clear naming and explicit business rules.
- Avoid hidden coupling between modules.
- Preserve auditability and security as first-class requirements.
- Write documentation as if the project will be maintained for at least 10 years.

## Communication

- Explain tradeoffs when a change affects future architecture.
- Record decisions rather than relying on chat history.
- Escalate cross-domain conflicts early instead of merging contradictory work.
- When a ticket is complete, update the relevant `brain/` files.
