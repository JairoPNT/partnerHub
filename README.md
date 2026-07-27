# PartnerHub

PartnerHub is a multi-tenant SaaS foundation for creating web assets, validated messages, and acquisition channels for entrepreneurs in MLM, direct selling, affiliates, distributors, and commercial networks.

PartnerHub is not a CRM. It attracts, educates, and routes interested people toward external commercial channels controlled by the entrepreneur.

The first operational rollout is planned for Gano Excel, but every decision in this repository is intentionally generic so the same platform can later support brands and organizations such as Herbalife, Omnilife, Farmasi, Yanbal, Natura, insurance agencies, franchises, and affiliate programs.

## Current Status

- Foundation documentation and governance are complete.
- `PH-001 Repository Review` is complete.
- `PH-003C Non-CRM Web Assets, Validated Messages, and Routing Model` is documented.
- The next planned step is PH-003C review, followed by schema review and migration planning.
- The VPS hosts the SaaS control plane; the separate web hosting account serves generated public sites.

## Local Brain

The `brain/` folder is the local source of truth for all AI collaborators working inside the repository.

- Notion is the executive dashboard.
- This repository is the operational memory.
- GitHub remains the technical source of truth.
- Every AI agent must read `brain/` before doing any work.

## Vision

Build the asset and routing layer for entrepreneur-driven growth.

PartnerHub is designed to centralize reusable commercial knowledge, approved messages, personalized web channels, traffic context, and external lead destinations for entrepreneurs who operate in distributed sales networks.

The PartnerHub flow ends when the visitor is routed to the entrepreneur's external channel, such as WhatsApp, checkout, external form, booking link, social DM, phone, or another approved destination.

## Main Modules

- Entrepreneur management: entrepreneur profile, status, selected package, and asset readiness.
- Identity and access: authentication, authorization, roles, permissions, and secure session handling.
- Web asset packages: product pages, VSL pages, combo pages, and campaign pages.
- Master assets and validated messages: reusable commercial knowledge, approved copy, and claim discipline.
- Personalized channels: published entrepreneur-specific pages and VSL assets.
- Lead destinations: external channels controlled by the entrepreneur.
- Traffic campaigns: traffic generation toward assets or destinations, not lead management.
- Analytics and reporting: publication, routing, traffic, and operational traceability.
- Administration: tenancy controls, configuration, auditability, and support tooling.

## Tech Stack

The codebase contains a Next.js application scaffold, Prisma schema planning, and PH-003C backend service bases.

What is currently confirmed:

- The repository is npm-based, as shown by `package-lock.json`.
- The project remains documentation-first while backend planning is refined before migrations.
- The project roadmap is currently centered on PH-003C review, schema review, authentication strategy, and backend implementation sequencing.
- Generated public sites should be treated as lightweight artifacts whenever possible.

What will be defined next:

- API conventions.
- Multi-tenant data strategy and migration plan.
- Frontend framework and design system contracts.
- Infrastructure, CI/CD, and deployment standards.

## Repository Organization

The repository is organized to keep product, architecture, engineering, design, and business knowledge in separate but connected areas.

- `/README.md`: project overview and repository entry point.
- `/brain`: local operational memory for all AI collaborators.
- `/AI_CONTEXT.md`: permanent project memory for all AI collaborators.
- `/AGENTS.md`: role definitions and accountability boundaries for AI collaborators.
- `/PROJECT_BOARD.md`: current epic and ticket state.
- `/TICKETS.md`: backlog of work items and future planning.
- `/CHANGELOG.md`: semantic change history.
- `/ARCHITECTURE_DECISIONS.md`: architecture decision records and rationale.
- `/CONTRIBUTING.md`: collaboration and workflow rules.
- `/docs/product`: product vision, business model, and PRD notes.
- `/docs/architecture`: architecture, database, API, and security documentation.
- `/docs/development`: engineering standards, folder structure, and Git flow.
- `/docs/design`: design system and UX principles.
- `/docs/automation`: automation, AI, and workflow orchestration.
- `/docs/deployment`: Docker, CI/CD, and environment documentation.
- `/docs/business`: pricing, commercial strategy, and growth notes.
