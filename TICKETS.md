# Tickets

## EPIC-000 Foundation

The foundation epic establishes the platform memory and the first planning backlog.

### PH-000 Documentation

Status: Done

Goal: create the permanent documentation structure and align all AI collaborators around one source of truth.

### PH-001 Repository Review

Status: Done

Goal: complete the documentation consistency review and identify the runtime, tooling, and baseline constraints.

### PH-002A Architecture Inventory

Status: Done

Goal: inventory current architecture decisions, open assumptions, and missing technical context before validation begins.

### PH-002B Create Local Brain

Status: Done

Goal: create the `brain/` folder and populate the local operational memory that every AI agent must read first.

### PH-002C Model Usage Policy

Status: Done

Goal: define cost-aware AI model routing so routine work, daily review, and high-risk decisions use the correct model tier.

### PH-002 Architecture Validation

Status: Done, approved with mandatory adjustments

Goal: validate the platform architecture for generic multi-tenant use and confirm the long-term technology direction after the inventory is complete.

### PH-003A Business Flows Foundation

Status: In Progress

Goal: document the operational manual for PartnerHub before database planning or feature implementation begins.

### PH-003 Database Planning

Status: TODO

Goal: define tenant isolation, core entities, indexing strategy, and data lifecycle rules.

### PH-004 Authentication Strategy

Status: TODO

Goal: define login, session, authorization, and administrative access patterns.

### PH-005 Partner Module

Status: TODO

Goal: design the first product module for partner onboarding and lifecycle management.

### PH-005A Product Page Static Generator

Status: Done

Goal: generate a validated static product-page package from an entrepreneur configuration. The first increment produces `config.js` and a publish-ready folder only; it does not add database persistence, API endpoints, authentication, dashboard UI, automated SFTP deployment, or n8n workflows.

### PH-005B Internal Product Page Generation Service

Status: Done

Goal: expose the static product-page generator through a Cloudflare Access-protected internal route and persist generated packages in the EasyPanel volume mounted at `/data`. This increment does not add dashboard UI, database persistence, automatic hosting deployment, or SFTP credentials.

### PH-005C Product Page Generator Interface

Status: In Progress

Primary owner: Antigravity

Goal: provide the internal landing-builder form that submits a validated product-page configuration to `POST /api/internal/product-pages/generate` and presents the generation result. No backend, Docker, auth, database, or external publishing changes are included.

### PH-005D Controlled SFTP Product Page Publication

Status: In Progress

Primary owner: Codex

Goal: publish an already generated product-page package to the single Hostinger document root configured only through EasyPanel environment variables. This increment adds a protected backend endpoint; it does not add multi-domain routing, automatic publication after generation, R2 uploads, or frontend publishing controls.

### PH-005E Dependency Security Patch

Status: In Progress

Primary owner: Codex

Goal: apply safe patch-level updates for the critical `next-auth` and high `next` findings, verify the production build, and separately assess remaining transitive PostCSS and Sharp findings without using a breaking `npm audit fix --force`.

## EPIC-100 PHOS Sync Engine

The PHOS queue exists to keep Notion updated from selected brain files without manual copy-paste.

### PH-100A Design SYNC_MANIFEST Protocol

Status: TODO

Goal: define the manifest rules that mark which brain files sync to Notion and how each file should be merged.

### PH-100B n8n Change Detection Workflow

Status: TODO

Goal: create the n8n workflow that detects brain file changes and starts the sync pipeline.

### PH-100C Markdown Parser

Status: TODO

Goal: convert selected brain markdown files into structured objects that can be mapped to Notion updates.

### PH-100D Notion Sync Targets

Status: TODO

Goal: sync Project Progress, Progress Dashboard, Architecture Decisions, and Sprint state to the correct Notion destinations.

### PH-100E Sync Audit Logs

Status: TODO

Goal: record sync date, files changed, status, and errors so the sync queue remains observable.

## Future Backlog

The following items are intentionally deferred until the foundation is complete:

- tenant configuration management
- partner hierarchy management
- commission engine design
- reporting and analytics
- notification orchestration
- integration framework
- PH-800 Research AI Content Studio Integrations

## Related Documents

- [Project Board](./PROJECT_BOARD.md) for status tracking.
- [AI Context](./AI_CONTEXT.md) for the project memory behind the backlog.
- [Architecture Decisions](./ARCHITECTURE_DECISIONS.md) for decisions that can spawn new tickets.
