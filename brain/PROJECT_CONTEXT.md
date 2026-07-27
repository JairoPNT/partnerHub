# Project Context

## What PartnerHub Is

PartnerHub is a SaaS platform for direct selling, network marketing, distributors, affiliates, and commercial partner ecosystems.

## Current Project State

- Sprint 0 is practically complete.
- PH-000, PH-001, PH-002A, PH-002B, PH-002C, and PH-002 are complete.
- PH-003A is the next real product ticket.
- EPIC-100 is the future PHOS Sync Engine queue.

## What It Is Not

- It is not a hardcoded Gano Excel-only product.
- It is not a feature dump.
- It is not allowed to drift away from the ticketed workflow.

## Why The Project Exists

The platform exists to centralize partner operations, commercial workflows, identity, content, and future automation in one scalable system.

## Deployment Context

- The VPS hosts the PartnerHub SaaS control plane, admin panel, API, database, orchestration, and cost tracking.
- The separate web hosting account serves generated public websites, product landings, and VSL pages.
- Generated sites should be treated as static or lightweight published artifacts whenever possible.
- The SaaS controls and publishes, while the hosting layer serves.
- The sync queue should keep Notion current without manual copy-paste.

## Automation Context

- n8n is the automation orchestrator for sync workflows and future operational automations.
- EPIC-800 will research HeyGen and ElevenLabs for AI Content Studio.

## Cost Context

Track external spend for:

- HeyGen video generation
- ElevenLabs audio generation
- storage
- n8n executions when applicable
- domain and hosting costs
- future Meta Ads spend

AI model usage is also a cost-control concern. The model strategy is documented in `brain/11_MODEL_USAGE_POLICY.md` and `docs/development/MODEL_USAGE_POLICY.md`.

## Roadmap Shape

- Sprint 0 Foundation
- Sprint 1 Core SaaS
- Sprint 2 Landing Builder
- Sprint 3 VSL Builder
- Sprint 4 Creative Assets
- Sprint 5 Campaign Manager and AI Content Studio research
- Sprint 6 Automations
- Sprint 7 Deploy
- Sprint 8 Beta
- Sprint 9 Launch

## Strategic Constraint

PartnerHub must stay generic so future tenants can be added without changing the architecture.

## Operational Constraint

Do not assume all rendering happens inside the SaaS.

## AI Model Usage Constraint

PartnerHub uses model tiers deliberately:

- ChatGPT owns CTO, architecture, and product decisions.
- Codex owns backend execution.
- Antigravity owns frontend and UX.
- Claude owns QA and review.

Cheap models should handle routine work, balanced models should handle daily engineering and review, and premium models should be reserved for critical architecture, security, database, auth, payment, tenant isolation, and high-risk decisions.
A long session should always end with a dated handoff file in `brain/`.
