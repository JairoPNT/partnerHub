# Decisions

## Decision 1: Local Brain As Operational Memory

`brain/` is the repository-level source of truth for AI agents working in PartnerHub.

Implication:

- agents can recover context directly from the repo
- important decisions do not disappear into chat history
- ticket execution becomes easier to hand off

## Decision 2: Notion, Repo, GitHub Separation

- Notion is the executive dashboard.
- The local repository is the operational memory.
- GitHub remains the technical source of truth.

Implication:

- leadership can steer in Notion
- execution can continue locally without losing context
- code decisions stay close to the implementation history

## Decision 3: Generic SaaS Model

PartnerHub is a SaaS for direct selling, network marketing, distributors, affiliates, and related partner ecosystems.

Implication:

- the first implementation is Gano Excel
- the architecture must remain generic
- no product rule should be hardcoded to a single brand

## Decision 4: Freeze New Features Until Validation

No new features should be built until Architecture Validation is complete.

Implication:

- the foundation stays stable
- hidden architecture issues are less likely to leak into product code
- roadmap work remains ticketed and sequenced

## Decision 5: AI Role Boundaries

- ChatGPT owns architecture, tickets, priorities, and approval.
- Codex owns backend execution and backend-oriented documentation.
- Antigravity owns frontend and product design.
- Claude Code owns review and quality gates.
- Jairo owns product direction as CEO / Product Owner.

## Decision 6: VPS Control Plane And External Publishing Layer

The VPS hosts the PartnerHub SaaS, admin panel, API, database, orchestration, and cost tracking.

The separate web hosting account serves generated public websites, product landings, and VSL pages whenever those outputs can be static or lightweight.

Implication:

- the SaaS controls and publishes
- the hosting layer serves
- expensive rendering should stay off the VPS when an external artifact is enough
- API usage and infra spend must be visible

## Decision 7: Model-Aware Routing And Cost Control

AI model usage must follow cost-aware routing.

Implication:

- routine work should use cheap models
- daily engineering and review should use balanced models
- critical architecture, security, database, auth, payment, tenant isolation, and other high-risk decisions can use premium models
- model choice should be documented when it affects risk or budget

## Decision 8: PHOS Sync Engine

PartnerHub will define a future PHOS Sync Engine to synchronize selected `brain/` files to Notion.

Implication:

- executive-facing state can stay current without manual copy-paste
- the repo can keep local operational memory while Notion remains the dashboard
- sync must be selective, not blanket publication of all internal notes

## Decision 9: Session Handoff Protocol

Long sessions must close with a dated session handoff file.

Implication:

- the next agent can continue without chat history
- architecture and queue transitions are recorded
- the team can preserve session continuity across handoffs
## Decision 10: n8n As Automation Orchestrator

n8n is the automation orchestrator for sync workflows and future operational automations.

Implication:

- automation stays outside the core SaaS control plane
- sync and workflow orchestration remain observable
- future integrations can reuse the same orchestration pattern

## Decision 11: Future AI Content Studio Integrations

HeyGen and ElevenLabs remain future integrations under EPIC-800 AI Content Studio.

Implication:

- content generation stays gated behind explicit product work
- consent, review, versioning, audit, and cost tracking remain mandatory
- external API usage and infrastructure spend must be tracked with the same rigor as core SaaS costs

## Decision 12: PartnerHub Is Not A CRM

PartnerHub is a platform for web assets, validated messages, personalized acquisition channels, external lead destinations, traffic generation context, and traceability.

PartnerHub does not manage leads after routing.

Implication:

- core entities are Entrepreneur, WebAssetPackage, MasterAsset, PersonalizedChannel, LeadDestination, ValidatedMessage, TrafficCampaign, and BusinessEvent
- Prospect, Opportunity, Deal, Pipeline, FollowUp, CRMActivity, and LeadManagement are excluded from the core model
- the main visitor flow ends when the visitor is routed to an external channel controlled by the entrepreneur
- TrafficCampaign means generating traffic toward assets or destinations, not managing lead relationships
- BusinessEvent can record terminal routing events without becoming a CRM activity log

## Decision 13: MVP Pricing, Renewal, And Growth Model

PartnerHub's approved MVP commercial model is documented in `brain/business/PH-004C_APPROVED_MVP_PRICING_RENEWAL_AND_GROWTH_MODEL.md`.

Implication:

- the active MVP prices are $180.000 COP for 1 ecosystem, $300.000 COP for 2 ecosystems, and $350.000 COP for all-in-one
- monthly management is $40.000 COP for 1 ecosystem and $60.000 COP for 2 ecosystems or all-in-one
- annual domain and hosting renewal is not included in monthly management and must be charged separately as a renewal/reactivation fee
- personalization, AI video, video editing, advertising campaigns, and social media publishing are separate services
- referral credits remain valid as monthly management credits and apply to the referrer's active plan price

## Decision 14: Subdomain Architecture and Showcase Hub for Multi-Ecosystem Masters

Each master ecosystem operates on its own dedicated subdomain under `ganomaster.pro` (`product.ganomaster.pro`, `business.ganomaster.pro`, `brand.ganomaster.pro`), while the apex domain `ganomaster.pro` serves as an interactive showcase and ecosystem demonstrator (documented in `brain/PH-034_MASTER_SHOWCASE_AND_SUBDOMAIN_ARCHITECTURE.md`).

Implication:

- zero blast radius between templates: modifying one ecosystem does not impact the others
- future template types (events, catalog, webinars) can scale on their own subdomains seamlessly
- the root domain `ganomaster.pro` becomes an interactive commercial demo hub for PartnerHub

## Decision 15: Master Ecosystems Publish To Canonical Subdomain Folders

Date: 2026-08-06

Decision:

PartnerHub uses dedicated master hosts for each ecosystem preview:

- `product.ganomaster.pro`
- `business.ganomaster.pro`
- `brand.ganomaster.pro`

Each host maps to a fixed subdirectory under the `ganomaster.pro` Hostinger account. Master publishing must not depend on client-domain routing or per-client SFTP JSON mappings.

Reason:

The product, VSL/business, and personal brand ecosystems must be independently reviewable by the team before replication.

## Decision 16: Durable Jobs Own Partner Publication

Date: 2026-09-02

Decision:

Partner publication is executed by durable, idempotent backend jobs. A job binds the exact saved source, PublishingTarget v2, canonical ecosystem master package and customer identity. The worker creates a fresh scoped SFTP rename capability immediately before each publication, performs the guarded recoverable directory swap, verifies public HTTPS assets and writes an immutable journal per plan.

Implication:

- operators and customers do not create manual SFTP capability windows;
- no raw SFTP credential, Access token or worker lease token is persisted in jobs or journals;
- a changed master package creates a distinct replication intent while duplicate requests for the same version are deduplicated;
- PRODUCT, BUSINESS and PERSONAL_BRAND use the same isolation contract;
- already published targets can receive later versioned updates without overwriting prior audit journals;
- activation hooks and existing-customer backfill are separate gated tickets and cannot silently publish customers merely because the worker is deployed.
