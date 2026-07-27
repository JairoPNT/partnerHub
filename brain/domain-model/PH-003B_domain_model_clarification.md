# PH-003B - Domain Model Clarification

## 1. Purpose

Clarify the PartnerHub domain model before PH-003C Database Planning.

PH-003C supersedes the CRM-like parts of this document. The current model is `brain/domain-model/PH-003C_non_crm_domain_model.md`: PartnerHub is not a CRM, does not manage leads, and ends the visitor flow when the visitor is routed to an external LeadDestination controlled by the entrepreneur.

PH-003B documents concepts, boundaries, roles, service models, campaign ownership, Meta/social ownership, landing editability, and schema planning limits. It does not implement application code, Prisma schema, database tables, migrations, UI, endpoints, Docker changes, auth changes, or dependencies.

## 2. Scope

In scope:

- Conceptual roles and permissions.
- Conceptual entities and relationships.
- Difference between Plan, Configuration, and ServiceModel.
- Tenant Owner / Business Owner / Empresario vs Partner / Distributor / Socio vs Lead.
- Dashboard scope by role.
- Landing editable fields for MVP.
- Generic tenant configuration.
- MVP go-to-market boundaries for selling PartnerHub.
- Domain and subdomain publishing strategy.
- Product Sales, VSL Recruitment, and Combo service models.
- Campaign service model.
- Meta Setup ownership.
- Boundaries for PH-003C schema planning.

Out of scope:

- Prisma schema.
- Database migrations.
- App code.
- UI implementation.
- Auth implementation.
- Endpoint design.
- Docker or deployment changes.
- Dependency changes.

## 3. Sources

- `brain/LIVE_PROJECT_STATE.md`
- `brain/02_CURRENT_STATUS.md`
- `brain/03_NEXT_MISSION.md`
- `brain/04_DECISIONS.md`
- `brain/05_PRODUCT_MODEL.md`
- `brain/06_DOMAIN_MODEL.md`
- `brain/08_API_MODEL.md`
- `brain/11_MODEL_USAGE_POLICY.md`
- `brain/PROJECT_CONTEXT.md`
- `brain/business-flows/PH-003A_flow_001_owner_purchases_partnerhub.md`
- `brain/business-flows/PH-003A_flow_002_meta_assets_preparation.md`
- `brain/business-rules/PH-003A_consolidated_business_rules.md`
- `brain/business-rules/PH-003A_meta_business_rules.md`
- `brain/open-questions/PH-003A_open_questions.md`
- `brain/dependencies/PH-003A_dependencies_for_PH-003B_PH-003C.md`
- `brain/scope-alignment/PH-003A_ux_scope_alignment.md`
- `brain/state-machines/PH-003A_owner_purchase_state_machine.md`
- `brain/session-handoffs/SESSION_HANDOFF_2026-07-05.md`

## 4. Domain Principles

- PartnerHub is a generic multi-tenant SaaS for commercial networks, direct sales, distributors, affiliates, and partner teams.
- Gano Excel is the first implementation / seed demo only.
- Do not hardcode Gano Excel brands, products, plans, claims, URLs, prices, images, or content into base platform logic.
- `brain/` is the operational memory.
- Notion is the executive dashboard.
- GitHub and the repo are the technical source of truth.
- VPS is the Control Plane: SaaS app, admin panel, API, database, orchestration, and cost tracking.
- External hosting is the Publishing Layer for generated public websites, product landings, and VSL pages when they can be static or lightweight.
- n8n is the orchestration layer for sync workflows and future operational automations.
- Tenant boundaries must be explicit and auditable.
- Sensitive operations must be auditable.
- Business workflows should be modeled as domain concepts, not ad hoc flags.
- MVP go-to-market for PartnerHub is manual / voz a voz / initial promoter team.
- The MVP must not assume a massive public sales system for PartnerHub itself.
- The MVP must not include a public PartnerHub marketplace.
- The MVP must not include mass self-service checkout for selling PartnerHub.
- The MVP must not include a public affiliate system for PartnerHub.
- En MVP no hay sistema publico de afiliados de PartnerHub.
- Initial business owner acquisition is handled by an internal/promoter team, and closing can be manual.
- The domain may record lead source or promoter origin, but this must not become an affiliate system until a future approved phase.
- The entrepreneur ecosystem may use a root domain like `nombre.pro`.
- The root domain `nombre.pro` is reserved for a future owner profile site, such as marca personal, commercial resume, professional profile, institutional page, or broader entrepreneur ecosystem.
- MVP operational landings should preferably publish on subdomains, not on the root domain.
- The root domain must not be assumed as the default product landing or default VSL landing.
- Future AI features must respect consent, approval, versioning, audit, and cost visibility.

## 5. Core Concepts

- Platform: The global PartnerHub SaaS.
- Tenant: A customer workspace for one commercial business context.
- Tenant Owner / Business Owner / Empresario: The person or business buying PartnerHub service for their commercial operation.
- Partner / Distributor / Socio: A commercial actor in a tenant network. Exact meaning remains `OPEN` because it may vary by tenant. It must not be confused with a PartnerHub commercial affiliate until a future phase defines that role.
- External visitor / interested person: A person attracted and educated by a PersonalizedChannel, then routed to an external LeadDestination. PartnerHub does not manage this person as a CRM lead after routing.
- Plan: Commercial packaging and pricing offered by PartnerHub.
- ServiceModel: The type of landing/service being configured, such as `PRODUCT_SALES`, `VSL_RECRUITMENT`, or `FULL_COMBO`.
- Configuration: Tenant-specific operational settings that make a selected service model work.
- Landing: A generated public artifact controlled by the SaaS and served by the Publishing Layer.
- PublishingTarget: The destination for a published artifact, including subdomain purpose and routing strategy.
- DomainRecord: The root domain and subdomain record for the entrepreneur ecosystem, including reserved root domain strategy.
- MetaSetup: A complementary readiness flow for Facebook, Instagram, Business Portfolio, ad account, payment method, and permissions.
- CampaignService: Additional service for paid campaign readiness and/or management.

## 6. Role Overview

Minimum conceptual roles:

- Platform Admin
- Tenant Owner / Business Owner / Empresario
- Partner / Distributor / Socio
- Lead
- Internal Operator
- AI Agent
- External Integration

MVP decision:

- Tenant Owner / Empresario does not have a dashboard in MVP.
- Initial dashboard is admin/internal.
- Partner Dashboard remains `OPEN` until partner meaning is clarified per tenant/network.
- Lead does not have an account or dashboard in MVP.
- Lead source/promoter origin may be recorded operationally, but not as a public affiliate system in MVP.

## 7. Entity Overview

PH-003B recognizes conceptual entities for tenancy, people, plans, configurations, landings, publishing, billing, campaigns, Meta/social readiness, knowledge, assets, audit, webhooks, and AI jobs.

The entity catalog lives in `brain/domain-model/PH-003B_entities_catalog.md`.

PH-003C must decide which entities require tables, which can remain configuration files initially, and how tenant isolation is enforced.

## 8. Business Model Overview

Approved PH-003A model:

- Initial setup plus monthly fee.
- Initial service models: `PRODUCT_SALES`, `VSL_RECRUITMENT`, and `FULL_COMBO`.
- One model setup: COP 400.000.
- Combo setup: COP 600.000.
- Later upgrade price remains `OPEN`: COP 200.000 or COP 300.000.
- Monthly fee for one active model: COP 100.000.
- Monthly fee for two active models: COP 150.000.
- Monthly billing starts 30 days after registration starts.
- Campaigns are an additional service.
- Ad spend and administration must be itemized for the client.
- Internal costs are invisible to the business owner.
- Selling PartnerHub in MVP is manual / voz a voz / promoter-led, not marketplace-driven or self-service checkout-driven.

## 9. Publishing Model Overview

- The SaaS controls creation, validation, publishing records, and cost tracking.
- External hosting serves public generated artifacts when appropriate.
- The entrepreneur may have a root domain such as `nombre.pro`.
- The root domain `nombre.pro` remains reserved for a future owner profile site: marca personal, commercial resume, professional profile, institutional page, or broader entrepreneur ecosystem.
- MVP functional landings should preferably use subdomains.
- Recommended VSL target: `vsl.nombre.pro`.
- Recommended product/shop targets: `shop.nombre.pro` or `[producto].nombre.pro`.
- `shop.nombre.pro` is the generic option when there is more than one product or when the subdomain should not be coupled to a specific product.
- `[producto].nombre.pro` can be useful for a specific campaign or primary product.
- Example seed/demo targets may include `vsl.claudiacalero.pro`, `shop.claudiacalero.pro`, or `ganocafe.claudiacalero.pro`, but this must remain generic and not hardcoded to Gano Excel.
- Landing publication requires critical checklist completion.
- `PRODUCT_SALES` requires valid purchase link, product/kit, current price, and availability.
- `VSL_RECRUITMENT` requires business owner photo and VSL video or proof.
- `FULL_COMBO` inherits validators from both models.
- Meta Setup does not block initial landing unless social launch or ads are contracted.
- Domain strategy is clarified conceptually as root domain reserved plus operational subdomains preferred for MVP; final product subdomain convention remains `OPEN`.

## 10. Meta / Social Model Overview

- Meta Setup is complementary.
- Meta Setup does not block landing except when social launch or ads are contracted.
- PartnerHub must not automate personal Facebook or Instagram account creation.
- PartnerHub must not evade Meta restrictions, verification, reviews, limits, or policy checks.
- Automatic publishing requires valid permissions.
- Missing or invalid permissions block automatic publishing.
- New Meta accounts may trigger `WAIT` alerts.
- Sensitive claims trigger manual compliance review.

## 11. Campaign Model Overview

- Campaign Manager is a future epic / ads service.
- Campaigns are additional services, not part of the base landing setup.
- Campaign readiness depends on Meta/social assets, ad account, payment method, budget, management fee, permissions, and compliance review.
- Campaign budget and campaign administration fee must be visible and itemized for the client.
- Internal costs remain invisible to the client but tracked internally.
- Asset Library is a future epic / Social Launch Engine.
- HeyGen and ElevenLabs remain deferred to EPIC-800.

## 12. What PH-003B Does Not Do

PH-003B does not:

- Create Prisma schema.
- Create database tables.
- Create migrations.
- Build UI.
- Create endpoints.
- Change auth or permissions implementation.
- Modify Docker.
- Add dependencies.
- Implement Campaign Manager.
- Implement Asset Library.
- Implement Meta Login.
- Implement AI video/audio integrations.
- Implement public PartnerHub marketplace.
- Implement mass self-service checkout for PartnerHub sales.
- Implement public affiliate system for PartnerHub.
- Implement public PartnerHub sistema de afiliados.
- Close open product, billing, role, domain, Meta, campaign, or claim questions without approval.

## 13. What PH-003C Must Do Next

PH-003C must convert the approved PH-003B domain clarification into database planning:

- Table candidates.
- Relationships.
- Tenant isolation rules.
- Billing and payment records.
- Cost tracking records.
- Publishing records.
- Domain routing records.
- Root domain, subdomain, publishing purpose, landing type, reserved root domain, future owner profile site, product landing target, VSL landing target, and routing strategy.
- Meta/social records.
- Campaign records.
- Audit logs.
- Webhook event records.
- Schema decisions still marked `OPEN`.

PH-003C must not start until PH-003B receives Claude review.
