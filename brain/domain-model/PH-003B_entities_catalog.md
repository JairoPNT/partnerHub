# PH-003B - Entities Catalog

## Purpose

List conceptual entities for PH-003C planning. This is not a Prisma schema and does not define technical fields.

PH-003C supersedes CRM-like entity candidates in this catalog. The current model excludes managed Lead records and uses LeadDestination plus BusinessEvent traceability instead.

General note for PH-003C: common technical fields such as identifiers, timestamps, tenant scope, status, soft-delete strategy, and audit metadata must be decided during schema planning, not here.

## Platform

- Definition: The global PartnerHub SaaS.
- Owns / belongs to: Owns global platform configuration and tenants.
- Key conceptual attributes: Platform name, global policies, supported service models, global admin configuration.
- Relationships: Has many Tenants, Platform Admins, global configuration records.
- MVP status: MVP Core.
- Notes: Must remain generic.

## Tenant

- Definition: Customer workspace or business context inside PartnerHub.
- Owns / belongs to: Belongs to Platform; owned or operated by one or more business owners depending on future decision.
- Key conceptual attributes: Tenant name, country, status, selected plan/service model, operational configuration.
- Relationships: Has BusinessOwners, Partners, Leads, Configurations, Landings, Payments, Subscriptions, MetaSetup, CampaignServices.
- MVP status: MVP Core.
- Notes: Tenant isolation is mandatory.

## BusinessOwner

- Definition: Person/business that buys PartnerHub service for a commercial operation.
- Owns / belongs to: Belongs to one or more Tenants depending on `OPEN` decision.
- Key conceptual attributes: Name, WhatsApp, country, owner photo, onboarding status.
- Relationships: Associated with Tenant, Payments, Subscription, Landing configuration inputs.
- MVP status: MVP Core.
- Notes: No dashboard in MVP. Initial acquisition is manual / voz a voz / promoter-led; manual close is allowed.

## Partner

- Definition: Commercial actor in a tenant network.
- Owns / belongs to: Belongs to Tenant by default; multi-tenant membership remains `OPEN`.
- Key conceptual attributes: Role in network, relationship to owner/tenant, lifecycle status.
- Relationships: May relate to Leads, BusinessOwner, Tenant hierarchy, future commissions.
- MVP status: OPEN.
- Notes: Meaning varies by tenant. Do not confuse Partner / Distributor / Socio with a public PartnerHub affiliate role; PartnerHub affiliate mechanics are not part of MVP.

## Lead - Superseded By PH-003C

- Definition: Superseded. PH-003C does not model managed leads. Interested visitors are attracted, educated, and routed to external LeadDestination records.
- Owns / belongs to: Do not create lead ownership in PartnerHub.
- Key conceptual attributes: Use routing path and source context only through LeadDestination, TrafficCampaign, PersonalizedChannel, or BusinessEvent.
- Relationships: May interact with a PersonalizedChannel and be routed externally; no post-routing relationship is managed in PartnerHub.
- MVP status: MVP Support.
- Notes: Do not create a Lead table from this PH-003B candidate. Use PH-003C LeadDestination and BusinessEvent records instead.

## Plan

- Definition: Commercial package offered by PartnerHub.
- Owns / belongs to: Platform-defined, applied to Tenant/Subscription.
- Key conceptual attributes: Setup fee, monthly fee, included service models, billing rules.
- Relationships: Referenced by Subscription and ServiceModel configuration.
- MVP status: MVP Core.
- Notes: Gano Excel-specific package names must not be base logic. MVP sale of PartnerHub plans is manual / voz a voz / promoter-led, not public marketplace or self-service checkout.

## ServiceModel

- Definition: Operational model selected for a tenant service, such as `PRODUCT_SALES`, `VSL_RECRUITMENT`, or `FULL_COMBO`.
- Owns / belongs to: Platform-defined concept, configured per Tenant.
- Key conceptual attributes: Model code, required validators, publishable artifact type.
- Relationships: Has specialized Configuration types.
- MVP status: MVP Core.
- Notes: `FULL_COMBO` combines Product Sales and VSL.

## Configuration

- Definition: Generic tenant-specific settings needed to operate selected service models.
- Owns / belongs to: Belongs to Tenant.
- Key conceptual attributes: Selected model, checklist state, publish preferences, tenant-level options.
- Relationships: Parent concept for ProductSalesConfiguration, VSLConfiguration, ComboConfiguration.
- MVP status: MVP Core.
- Notes: Must avoid brand-specific hardcoding.

## ProductSalesConfiguration

- Definition: Settings for product sales landing.
- Owns / belongs to: Belongs to Tenant Configuration.
- Key conceptual attributes: Product/kit, product purchase link, current price, availability, WhatsApp, preferred product landing target.
- Relationships: Used by Landing, LandingFields, validation checklist.
- MVP status: MVP Core.
- Notes: Product data for Gano Excel comes from approved knowledge, not base schema assumptions. Product/shop landing should preferably publish to `shop.nombre.pro` or `[producto].nombre.pro`; `shop.nombre.pro` is generic for multiple products or when avoiding product-specific coupling, while `[producto].nombre.pro` can support a primary product or campaign.

## VSLConfiguration

- Definition: Settings for recruitment VSL landing.
- Owns / belongs to: Belongs to Tenant Configuration.
- Key conceptual attributes: Business owner photo, VSL video URL/proof, WhatsApp, preferred VSL landing target.
- Relationships: Used by Landing, LandingFields, validation checklist.
- MVP status: MVP Core.
- Notes: Video hosting remains `OPEN`. VSL landing should preferably publish to `vsl.nombre.pro`; the root domain `nombre.pro` must not be assumed as VSL by default.

## ComboConfiguration

- Definition: Settings for combined Product Sales plus VSL service.
- Owns / belongs to: Belongs to Tenant Configuration.
- Key conceptual attributes: ProductSalesConfiguration inputs plus VSLConfiguration inputs, combo publishing mode, combined routing strategy.
- Relationships: Combines both configuration families.
- MVP status: MVP Core.
- Notes: One landing with two routes vs two URLs remains `OPEN`. Combo should preserve the reserved root domain strategy and route operational experiences through subdomains such as `vsl.nombre.pro`, `shop.nombre.pro`, or `[producto].nombre.pro`.

## Landing

- Definition: Generated public artifact for product sales, VSL recruitment, or combo.
- Owns / belongs to: Belongs to Tenant and Configuration.
- Key conceptual attributes: Template assignment, publish status, public URL, validation status, landing type, publishing purpose.
- Relationships: Uses LandingTemplate, LandingFields, PublishingTarget, DomainRecord.
- MVP status: MVP Core.
- Notes: Served by Publishing Layer when practical. MVP landings should preferably use subdomains; the root domain `nombre.pro` is reserved for a future owner profile site and must not be the default product or VSL landing.

## LandingTemplate

- Definition: Approved template used to generate landing content.
- Owns / belongs to: Platform or tenant-scoped template library.
- Key conceptual attributes: Template type, approved copy structure, supported fields.
- Relationships: Used by Landing and LandingField.
- MVP status: MVP Support.
- Notes: Claims-sensitive templates require review rules.

## LandingField

- Definition: Configurable field injected into an approved landing template.
- Owns / belongs to: Landing/Configuration.
- Key conceptual attributes: Field type, value, validation state, manual review requirement.
- Relationships: Used by Landing.
- MVP status: MVP Core.
- Notes: MVP fields are WhatsApp, product purchase link, business owner photo, VSL video URL/test video.

## PublishingTarget

- Definition: Destination where a landing or artifact is published.
- Owns / belongs to: Belongs to Tenant or Platform publishing configuration.
- Key conceptual attributes: Hosting target, root domain, subdomain, publishing purpose, landing type, routing strategy, status, deployment mode.
- Relationships: Related to Landing and DomainRecord.
- MVP status: MVP Core.
- Notes: External hosting is Publishing Layer. Recommended targets include `vsl.nombre.pro` for VSL, `shop.nombre.pro` for generic product/shop, and `[producto].nombre.pro` for campaign or primary product. The root domain is reserved, not an operational landing default.

## DomainRecord

- Definition: Domain, subdomain, or route association for a published artifact.
- Owns / belongs to: Belongs to Tenant or PublishingTarget.
- Key conceptual attributes: Root domain, subdomain, publishing purpose, landing type, routing strategy, reserved root domain status, owner/admin responsibility, availability.
- Relationships: Related to Landing and PublishingTarget.
- MVP status: OPEN.
- Notes: The entrepreneur ecosystem may use a root domain like `nombre.pro`. The root domain is reserved for a future owner profile site, such as marca personal, commercial resume, professional profile, institutional page, or broader entrepreneur ecosystem. MVP operational landings should preferably use subdominios such as `vsl.nombre.pro`, `shop.nombre.pro`, or `[producto].nombre.pro`. Domain ownership/admin remains `OPEN`.

## Payment

- Definition: A payment event or transaction such as setup payment.
- Owns / belongs to: Belongs to Tenant/BusinessOwner.
- Key conceptual attributes: Amount, currency, payment provider, payment status, confirmation source.
- Relationships: Related to Subscription, BillingEvent, WebhookEvent.
- MVP status: MVP Core.
- Notes: Wompi is initial payment provider where possible. Manual close/payment handling remains valid in MVP; this does not require mass self-service checkout.

## Subscription

- Definition: Ongoing monthly billing relationship.
- Owns / belongs to: Belongs to Tenant/BusinessOwner.
- Key conceptual attributes: Active model count, monthly fee, billing start, billing status.
- Relationships: References Plan, Payments, BillingEvents.
- MVP status: MVP Core.
- Notes: Non-payment and grace period remain `OPEN`.

## BillingEvent

- Definition: Billing lifecycle event such as invoice due, paid, failed, disputed, or scheduled.
- Owns / belongs to: Belongs to Subscription/Tenant.
- Key conceptual attributes: Event type, status, source, amount.
- Relationships: Related to Payment, Subscription, WebhookEvent.
- MVP status: MVP Support.
- Notes: Required for auditability.

## CostRecord

- Definition: Internal operational cost record.
- Owns / belongs to: Belongs to Tenant, Platform, AIJob, campaign, hosting, or integration context.
- Key conceptual attributes: Cost category, amount, provider/source, visibility.
- Relationships: Related to AIJob, CampaignService, PublishingTarget, integrations.
- MVP status: MVP Support.
- Notes: Internal costs are invisible to business owner.

## CampaignService

- Definition: Additional ads/campaign service contracted by a tenant.
- Owns / belongs to: Belongs to Tenant.
- Key conceptual attributes: Service status, readiness, platform, contracted scope.
- Relationships: Has CampaignBudget, CampaignManagementFee, MetaSetup, ContentCalendar, ContentAsset.
- MVP status: Future.
- Notes: Campaign Manager is future epic / ads service.

## CampaignBudget

- Definition: Client-approved paid ad spend budget.
- Owns / belongs to: Belongs to CampaignService.
- Key conceptual attributes: Budget amount, period, approval status, platform.
- Relationships: Related to CampaignService and AdAccount.
- MVP status: Future.
- Notes: Visible to client and itemized.

## CampaignManagementFee

- Definition: PartnerHub administration fee for campaign management.
- Owns / belongs to: Belongs to CampaignService.
- Key conceptual attributes: Fee amount, billing method, approval status.
- Relationships: Related to CampaignService and BillingEvent.
- MVP status: Future.
- Notes: Visible to client and itemized.

## MetaSetup

- Definition: Readiness flow for Meta/social assets.
- Owns / belongs to: Belongs to Tenant and possibly CampaignService.
- Key conceptual attributes: Checklist status, alert severity, permissions status, readiness status.
- Relationships: Has SocialAccount, AdAccount, CampaignService.
- MVP status: MVP Support.
- Notes: Does not block landing unless social launch or ads are contracted.

## SocialAccount

- Definition: Facebook Page, Instagram Business/Creator, or similar social account connection/readiness record.
- Owns / belongs to: Belongs to Tenant/BusinessOwner depending on ownership decision.
- Key conceptual attributes: Platform, account type, readiness, permission status.
- Relationships: Related to MetaSetup and ContentCalendar.
- MVP status: MVP Support.
- Notes: Automatic personal account creation is not allowed.

## AdAccount

- Definition: Advertising account readiness/connection record.
- Owns / belongs to: Belongs to Tenant/BusinessOwner or managed account depending on `OPEN` decision.
- Key conceptual attributes: Platform, status, payment method status, restrictions.
- Relationships: Related to MetaSetup, CampaignService, CampaignBudget.
- MVP status: Future.
- Notes: Missing/restricted ad account blocks paid campaign launch.

## ContentCalendar

- Definition: Planned schedule for social or campaign content.
- Owns / belongs to: Belongs to Tenant/CampaignService.
- Key conceptual attributes: Schedule, channel, status, approval state.
- Relationships: Uses ContentAssets and KnowledgeBase.
- MVP status: Future.
- Notes: Part of future Social Launch Engine / Campaign Manager.

## ContentAsset

- Definition: Copy, image, video, creative, or publishing asset.
- Owns / belongs to: Belongs to Tenant, campaign, or platform-approved library.
- Key conceptual attributes: Asset type, approval status, claim risk, source.
- Relationships: Related to ImageBank, ContentCalendar, KnowledgeBase.
- MVP status: Future.
- Notes: Sensitive claims require manual review.

## KnowledgeBase

- Definition: Approved knowledge source for brands, products, claims, templates, and tenant-specific content.
- Owns / belongs to: Platform and/or Tenant.
- Key conceptual attributes: Scope, approval status, allowed claims, source references.
- Relationships: Supports LandingTemplate, ContentAsset, AIJob.
- MVP status: MVP Support.
- Notes: Gano Excel content must come from approved knowledge, not base logic.

## ImageBank

- Definition: Approved image collection for templates, landings, social content, and campaigns.
- Owns / belongs to: Platform, tenant, country, network, or model; exact scoping remains `OPEN`.
- Key conceptual attributes: Asset category, usage rights, approval status, scope.
- Relationships: Supports ContentAsset and Landing.
- MVP status: Future.
- Notes: Scope remains open.

## AuditLog

- Definition: Immutable or append-only record of sensitive operations.
- Owns / belongs to: Platform/Tenant depending on event.
- Key conceptual attributes: Actor type, action, target concept, result, reason.
- Relationships: References users/roles, integrations, AIJob, webhook, publishing, billing.
- MVP status: MVP Core.
- Notes: PH-003C must define required audited events.

## LeadSource / PromoterOrigin - Superseded By PH-003C

- Definition: Superseded. Source context may be stored on Entrepreneur, TrafficCampaign, PersonalizedChannel, or BusinessEvent without creating lead ownership or opportunity tracking.
- Owns / belongs to: Do not attach to managed Lead or opportunity entities.
- Key conceptual attributes: Source type, promoter/operator reference concept, manual note, attribution status.
- Relationships: May relate to Entrepreneur, TrafficCampaign, PersonalizedChannel, Internal Operator, or BusinessEvent.
- MVP status: MVP Support.
- Notes: This is simple operational context only. It must not become lead management, a public affiliate system, commission engine, or marketplace in MVP.

## WebhookEvent

- Definition: Stored external event received from providers such as Wompi, Meta, n8n, or hosting.
- Owns / belongs to: Platform/Tenant depending on event.
- Key conceptual attributes: Provider, event type, processing status, idempotency key concept.
- Relationships: May create/update Payment, BillingEvent, PublishingTarget, MetaSetup, AIJob.
- MVP status: MVP Core.
- Notes: Required for payment confirmation and auditability.

## AIJob

- Definition: Auditable automation/generation job executed by AI or workflow.
- Owns / belongs to: Tenant, Platform, or Internal Operator workflow.
- Key conceptual attributes: Job type, status, input source, output artifact, approval state, cost.
- Relationships: Related to CostRecord, AuditLog, KnowledgeBase, Landing, ContentAsset.
- MVP status: MVP Support.
- Notes: HeyGen and ElevenLabs stay in EPIC-800.
