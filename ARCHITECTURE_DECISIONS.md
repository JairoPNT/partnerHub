# Architecture Decisions

This file stores architectural decision records for PartnerHub. Each decision should explain the problem, the alternatives considered, and the implications of the chosen path.

## ADR Structure

Every architecture decision should capture:

- Decision
- Context
- Alternatives
- Chosen solution
- Impact
- Status

## ADR-0001 Documentation-First Foundation

Status: Accepted

Decision: establish the repository with durable documentation before implementation code.

Context: the platform is still at the foundation stage, and the team needs a reliable memory for product, architecture, and collaboration rules.

Alternatives:

- Start implementing code immediately.
- Build a documentation and governance layer first.

Chosen solution: documentation-first foundation.

Impact: future contributors have a common source of truth, and early technical decisions can be made with less rework.

## ADR-0002 Generic Multi-Tenant Platform

Status: Accepted

Decision: design PartnerHub as a generic multi-tenant SaaS platform rather than a single-brand custom application.

Context: the first tenant is Gano Excel, but the product must later support many organizations with similar operating patterns.

Alternatives:

- Hard-code the initial tenant requirements.
- Build a configurable generic platform from the start.

Chosen solution: configurable generic platform.

Impact: the model supports future tenants, white-label growth, and lower long-term maintenance cost.

## ADR-0003 Role-Bound AI Collaboration

Status: Accepted

Decision: assign explicit AI roles for architecture, backend, frontend, and review.

Context: multiple AI collaborators will work in the same repository and need clear boundaries to avoid conflicting changes.

Alternatives:

- Let every AI edit any part of the repository.
- Partition responsibility by domain and decision authority.

Chosen solution: domain-based ownership with explicit review boundaries.

Impact: fewer conflicting edits, clearer accountability, and better long-term maintainability.

## ADR-0004 Business and Technical Documentation Separation

Status: Accepted

Decision: separate product, architecture, development, design, automation, deployment, and business documentation into dedicated folders.

Context: PartnerHub will evolve across several disciplines and needs documentation that is easy to navigate and update independently.

Alternatives:

- Keep all documentation in one directory.
- Split documentation by domain.

Chosen solution: split documentation by domain.

Impact: documentation is easier to maintain, and each discipline can evolve without creating a single overloaded file.

## ADR-0005 Local Brain as Repository Memory

Status: Accepted

Decision: create a `brain/` folder as the local source of truth for AI collaborators working inside the repository.

Context: Notion is the executive dashboard, GitHub is the technical source of truth, and the repository needs a durable operational memory that can be read before any work starts.

Alternatives:

- Keep the operational memory only in Notion.
- Rely on chat history for project memory.
- Store the operational memory in the repository itself.

Chosen solution: store the local operational memory in `brain/` and keep it synchronized with the root project docs.

Impact: every AI agent can recover the current sprint, ticket order, rules, and product model directly from the repo before making changes.

## ADR-0006 VPS SaaS and External Publishing Split

Status: Accepted

Decision: host the PartnerHub SaaS, admin panel, API, database, orchestration, and cost tracking on the VPS, while using the separate web hosting account to serve generated public websites, product landings, and VSL pages.

Context: the user already has a VPS, a separate web hosting account, n8n on Easypanel, and API access to HeyGen and ElevenLabs. Generated sites should not default to expensive VPS-side rendering when static or lightweight published artifacts can be served externally.

Alternatives:

- Render and serve everything inside the VPS.
- Use the web hosting account only for a tiny subset of pages.
- Split control and publishing so the SaaS orchestrates and the hosting layer serves the public artifacts.

Chosen solution: the VPS remains the control plane and the web hosting account becomes the public artifact serving layer whenever possible.

Impact: lower VPS processing costs, clearer separation between orchestration and publishing, and a more scalable path for generated landing pages and VSL pages.
