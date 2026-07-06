# AI Context

This file is the permanent memory of PartnerHub. Every AI working in this repository should read it before making changes.

## Project Vision

PartnerHub will become a multi-tenant SaaS platform for organizations that rely on digital ecosystems and partner networks to generate revenue. The platform must be able to serve a single brand at launch and multiple brands later without redesigning the core architecture.

## Business Model

PartnerHub is intended to be sold as a subscription-based SaaS platform, with pricing that can evolve by tenant size, active users, business volume, feature tier, and support level. The model should support direct enterprise contracts, white-label deployments, and implementation services.

## Current Scope

The current scope is documentation, project orchestration, and foundation planning. Foundation work is complete, the local brain is being created, and architecture validation stays gated behind the inventory step.

- Establish the project memory.
- Define roles and responsibilities.
- Capture the first board, backlog, and architecture decisions.
- Create durable documentation for future contributors.
- Maintain a local operational memory that every AI can read before working.

## Future Scope

Future phases should support:

- Multi-tenant administration.
- Partner onboarding and identity management.
- Role-based access control.
- Commercial workflow management.
- Analytics and reporting.
- Integrations with ERP, CRM, messaging, payment, and automation systems.
- White-label branding and tenant-specific configuration.
- AI-assisted content generation workflows for commercial videos and campaign assets.

## Hosting And Publishing Model

- The VPS hosts the PartnerHub SaaS, admin panel, API, database, orchestration, and cost tracking.
- The separate web hosting account serves generated public websites, product landings, and VSL pages.
- Generated sites should be treated as static or lightweight published artifacts whenever possible.
- The SaaS controls and publishes, while the hosting layer serves.

## Cost Tracking

All external API usage and platform spend should be tracked, including:

- HeyGen video generation
- ElevenLabs audio generation
- storage
- n8n executions when applicable
- domain and hosting costs
- future Meta Ads spend
- AI model usage for architecture, implementation, frontend, and review work

Model usage must follow `brain/11_MODEL_USAGE_POLICY.md` and `docs/development/MODEL_USAGE_POLICY.md`: cheap models for routine work, balanced models for daily engineering and review, and premium models only for critical architecture, security, database, auth, payment, tenant isolation, and high-risk decisions.

## Local Brain

- `brain/` is the repository-level source of truth for AI collaborators.
- Notion is the executive dashboard for leadership and ticket sequencing.
- GitHub is the technical source of truth for implementation work.
- Any meaningful change should be reflected in the relevant `brain/` file after the ticket is complete.

## Software Philosophy

- Prefer explicit domain modeling over scattered ad hoc logic.
- Optimize for maintainability before feature speed.
- Keep business rules visible and testable.
- Make tenant isolation and auditability first-class concerns.
- Design for long-lived product evolution, not short-lived prototypes.

## Architecture Philosophy

- Build a generic platform, not a single-company custom app.
- Separate core platform concerns from tenant-specific configuration.
- Keep the backend API contract stable and predictable.
- Treat security, observability, and data boundaries as baseline requirements.
- Support growth to tens of thousands of companies and millions of requests without re-platforming.

## Design Philosophy

- Favor clarity, hierarchy, and fast comprehension.
- Build interfaces that feel trustworthy and operational, not decorative.
- Ensure responsive behavior from the beginning.
- Use a consistent design system so new modules can be shipped without visual drift.

## AI Roles

- ChatGPT: chief software architect, responsible for architecture, tickets, priorities, and approval.
- Codex: backend lead engineer, responsible for backend, database, API, authentication, Docker, infrastructure, security, performance, and testing.
- Antigravity: lead product designer / frontend engineer, responsible for UI, UX, React, Tailwind, responsiveness, design system, and animations.
- Claude Code: principal reviewer / QA engineer, responsible for quality, review, refactor guidance, performance, maintainability, accessibility, and architecture review.
- Jairo: CEO / product owner.

## AI Model Usage

- ChatGPT is used for CTO-level architecture, product, roadmap, and cross-agent decisions.
- Codex is used for backend-owned engineering work.
- Antigravity is used for frontend and UX-owned work.
- Claude is used for QA, review, maintainability, accessibility, performance, and second-opinion review.
- Premium models require clear risk justification and should not be used for routine documentation, formatting, summaries, or low-risk boilerplate.

## Current Roadmap

1. Sprint 0 Foundation.
2. Sprint 1 Core SaaS.
3. Sprint 2 Landing Builder.
4. Sprint 3 VSL Builder.
5. Sprint 4 Creative Assets.
6. Sprint 5 Campaign Manager and AI Content Studio research.
7. Sprint 6 Automations.
8. Sprint 7 Deploy.
9. Sprint 8 Beta.
10. Sprint 9 Launch.

## Commercial Model

The platform should support:

- Monthly and annual subscriptions.
- Enterprise plans with custom limits.
- Implementation and onboarding fees.
- Optional managed services.
- Future add-ons for analytics, automation, integrations, and branding.

## Future Integrations

The architecture should remain compatible with:

- CRM platforms.
- ERP systems.
- Payment gateways.
- Messaging services such as email, SMS, and WhatsApp providers.
- Automation engines such as n8n.
- Identity providers and SSO solutions.
- Accounting, logistics, and fulfillment systems.
- AI generation services such as HeyGen and ElevenLabs for future content studio workflows.

## Current Rules

- Do not build new features until Architecture Validation is complete.
- Keep the platform generic and avoid hardcoding Gano Excel into architecture.
- Work only from assigned PH tickets.
- Do not modify files outside the assigned scope.
- Keep every decision documented instead of relying on chat memory.
- Do not assume all rendering happens inside the SaaS.

## Development Rules

- Do not overwrite another AI's work without understanding it first.
- Every meaningful change must map to a ticket.
- Architecture decisions belong to the chief architect.
- Backend changes belong to Codex.
- Frontend changes belong to Antigravity.
- Review and quality gates belong to Claude Code.
- Document major decisions in the appropriate markdown files.
- Keep changes generic unless a ticket explicitly requires tenant-specific behavior.
