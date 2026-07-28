# PH-003D - Schema Review

## Purpose

Review the PH-003C Prisma draft and convert the approved non-CRM product model into a database planning baseline.

This document is planning only.

PH-003D does not authorize:

- Prisma migrations
- `prisma generate`
- `prisma migrate`
- `prisma db push`
- endpoint implementation
- webhook implementation
- Wompi integration
- billing automation
- CRM features

## Sources Reviewed

- `brain/business-flows/PH-003C_ajuste_mision.md`
- `brain/business-flows/PH-003C_attract_educate_route_flow.md`
- `brain/domain-model/PH-003C_non_crm_domain_model.md`
- `brain/dependencies/PH-003C_dependencies_for_PH-003D.md`
- `brain/session-handoffs/SESSION_HANDOFF_2026-07-06_PH-003C.md`
- `brain/session-handoffs/PH-003C_commit_boundary.md`
- `app/web/prisma/schema.prisma`
- `app/web/server/services/`
- `docs/product/01_BUSINESS_FLOWS.md`
- `docs/00_concepcion.md`

## Current Schema Summary

The current `app/web/prisma/schema.prisma` is a PH-003C technical draft, not a migration-ready schema.

It currently includes:

- `User`
- `Entrepreneur`
- `WebAssetPackage`
- `MasterAsset`
- `PersonalizedChannel`
- `LeadDestination`
- `ValidatedMessage`
- `TrafficCampaign`
- `BusinessEvent`

It correctly reflects the non-CRM boundary:

- no `Prospect`
- no `Opportunity`
- no `Deal`
- no `Pipeline`
- no `FollowUp`
- no `CRMActivity`
- no `LeadManagement`

It also contains useful state enums for entrepreneurs, asset packages, master assets, personalized channels, lead destinations, validated messages, traffic campaigns, and business events.

## Main Risks Detected

### R1 - No Tenant Isolation

The current draft has no `Organization` / `Tenant` model and no `tenantId` on tenant-owned records.

Risk:

- future records cannot be safely scoped
- cross-tenant leakage cannot be prevented structurally
- indexes and authorization rules cannot rely on tenant boundaries

Required PH-003D decision:

- introduce `Organization` as the tenant boundary
- keep `Organization` as the final Prisma name for the tenant boundary
- introduce `OrganizationMembership` in MVP planning to represent User-to-Organization membership and role
- add `organizationId` to tenant-owned models
- keep global platform records explicitly global

### R2 - Entrepreneur Is Not Tenant-Scoped

`Entrepreneur` exists but does not belong to an organization.

Risk:

- users, channels, destinations, billing, and events cannot be reliably isolated

Required PH-003D decision:

- `Entrepreneur.organizationId` required
- `User` should relate to organizations through `OrganizationMembership`
- `User.entrepreneurId` remains optional, because MVP entrepreneur dashboard is not approved
- the entrepreneur may exist as an entity and/or related actor in MVP, but no entrepreneur dashboard is approved
- do not implement auth, permission checks, endpoints, or UI in PH-003D

### R3 - Plan, Payment, And Site Are Not Reintroduced

PH-003C intentionally removed earlier `Plan`, `Payment`, and `Site` models from the draft, but this was not a final database decision.

Required PH-003D rescope:

- `Plan` -> `CommercialPackage` / `PricingPlan`
- `Payment` -> `PaymentRecord` / `BillingPayment`
- `Site` -> `PersonalizedChannel` plus `PublishingTarget` and `DomainRecord`

### R4 - Billing Is Missing

No subscription, billing cycle, payment provider, invoice/statement, setup fee, monthly fee, or webhook storage exists.

Risk:

- payment confirmation cannot be audited
- monthly billing start rule cannot be represented
- Wompi events cannot be stored idempotently

Required PH-003D decision:

- add billing models before migration
- use `BillingStatement` in MVP planning; `Invoice` remains outside MVP until legal invoice requirements are defined

### R5 - Publishing Is Too Denormalized

`PersonalizedChannel` has `publicUrl`, `rootDomain`, `subdomain`, and `routePath` directly.

Risk:

- root-domain reservation cannot be enforced cleanly
- hosting targets and domain records cannot be reused or audited
- domain routing strategy becomes ad hoc fields

Required PH-003D decision:

- introduce `PublishingTarget`
- introduce `DomainRecord`
- keep `publishedUrl` on `PersonalizedChannel` as denormalized output only if useful

### R6 - Master Asset Versioning Is Insufficient

`MasterAsset.version` is a scalar, but channels need to know which version they were generated from.

Risk:

- cannot identify channels stale against master updates
- cannot audit what version was published
- rollback becomes weak

Required PH-003D decision:

- add `MasterAssetVersion`
- link `PersonalizedChannel.masterAssetVersionId`

### R7 - Product Catalog Is Missing

Docs reference products, kits, prices, promos, and master content. The schema currently has no `ProductCatalog`, `Product`, `Kit`, or `KitItem`.

Risk:

- product pages cannot be generated from structured validated product data
- first implementation may accidentally hardcode Gano Excel

Required PH-003D decision:

- add generic product catalog models
- keep Gano Excel as seed data only
- include `ProductCatalog`, `Product`, `Kit`, and `KitItem` in MVP schema planning

### R8 - LeadDestination Types Need Product-Specific External Channels

Current enum has `WHATSAPP`, `EXTERNAL_CHECKOUT`, `EXTERNAL_FORM`, `BOOKING_LINK`, `SOCIAL_DM`, `PHONE`, `OTHER`.

Missing types from PH-003D scope:

- `OFFICIAL_PURCHASE_LINK`
- `CALENDLY`
- `WHATSAPP_GROUP`
- `OFFICIAL_SIGNUP_LINK`
- `CUSTOM_URL`

Required PH-003D decision:

- update enum naming before migration
- do not add managed lead records

### R9 - TrafficCampaign Is Too Thin For Ads Service Planning

Current `TrafficCampaign` lacks campaign type, objective, management fee, external ad account reference, claims review status, and manual approval status.

Risk:

- paid traffic cannot be planned without becoming ad-hoc JSON

Required PH-003D decision:

- expand TrafficCampaign schema planning while keeping it non-CRM

### R10 - Claims / Compliance Is Missing

Sensitive claims need manual review records.

Risk:

- health claims, income claims, guaranteed-result claims, and ad policy risks cannot be audited

Required PH-003D decision:

- add `ClaimReview` or equivalent minimal review model

### R11 - BusinessEvent Needs Tenant Context And More Event Types

Current `BusinessEvent` lacks `tenantId` / `organizationId`, generic `entityType`, and `entityId`.

Risk:

- audit queries become relation-specific and incomplete
- webhook/billing/domain events cannot be recorded consistently

Required PH-003D decision:

- add `organizationId`
- add `eventType` string or enum
- add `entityType` and `entityId`
- add metadata JSON
- keep optional typed relations only when useful

## Proposed Final Model Areas

### Tenant Isolation

Proposed core:

- `Organization`
- `OrganizationMembership`
- `User`
- `Entrepreneur`

Rules:

- `Organization` is the tenant boundary.
- `Organization` is the final tenant-boundary model name for PH-003D planning.
- `OrganizationMembership` represents the relation between `User` and `Organization` with role and membership status.
- Every tenant-owned record must include `organizationId`.
- Platform-global records may have nullable `organizationId` or a `scope` enum, but global vs tenant-owned must be explicit.
- Queries in services must always filter tenant-owned records by `organizationId`.
- `BusinessEvent`, `PaymentWebhookEvent`, `PaymentRecord`, `PublishingTarget`, and `DomainRecord` must include `organizationId` when tenant-related.

Suggested `UserRole` enum:

- `PLATFORM_ADMIN`
- `ORGANIZATION_ADMIN`
- `OPERATOR`
- `ENTREPRENEUR`

Suggested `OrganizationMembership` fields:

- `id`
- `userId`
- `organizationId`
- `role`
- `status`
- `createdAt`
- `updatedAt`

MVP boundary:

- `OrganizationMembership` belongs in MVP schema planning.
- The entrepreneur does not receive a dashboard in MVP.
- Auth, authorization checks, endpoint access rules, and permission implementation remain for a later auth/security ticket.

Tenant-owned:

- Entrepreneur
- OrganizationMembership
- WebAssetPackage
- PersonalizedChannel
- LeadDestination
- TrafficCampaign
- Subscription
- BillingCycle
- PaymentRecord
- PaymentWebhookEvent
- PublishingTarget
- DomainRecord
- BusinessEvent
- ClaimReview

Global or optionally tenant-scoped:

- CommercialPackage
- PricingPlan
- MasterAsset
- MasterAssetVersion
- ValidatedMessage
- ProductCatalog
- Product
- Kit

### Commercial Packages

Proposed models:

- `CommercialPackage`
- `PricingPlan`
- `WebAssetPackage`

Responsibilities:

- `CommercialPackage` defines the commercial offering such as `PRODUCT_SALES`, `VSL_RECRUITMENT`, or `FULL_COMBO`.
- `PricingPlan` defines setup fee, monthly fee, active model count, currency, and effective dates.
- `WebAssetPackage` is the entrepreneur-specific selected package and workflow state.

Commercial reference:

- one model setup: COP 400000
- combo setup: COP 600000
- later upgrade documented range: COP 200000 to COP 300000
- `upgradePricePolicy` for MVP: `MANUAL`
- do not fix the upgrade price rigidly in the database yet
- one active model monthly fee: COP 100000
- two active models monthly fee: COP 150000

### Billing, Subscriptions, And Payments

Proposed models:

- `Subscription`
- `BillingCycle`
- `BillingStatement`
- `PaymentProvider`
- `PaymentRecord`
- `PaymentWebhookEvent`

Rules:

- Wompi is the first payment provider, not the core platform abstraction.
- Manual close must be supported for MVP.
- `BillingStatement` is used in MVP planning; `Invoice` is outside MVP.
- Monthly billing starts 30 days after registration starts.
- Payment webhooks must be stored raw before business processing.
- Webhook idempotency key must be unique per provider.
- No real webhook processing is implemented in PH-003D.

Minimum `PaymentWebhookEvent` fields:

- `id`
- `providerId`
- `providerReference`
- `idempotencyKey`
- `rawPayload`
- `status`
- `receivedAt`
- `processedAt`
- `processingError`
- `createdAt`

Webhook storage rules:

- `rawPayload` is stored before processing.
- `idempotencyKey` prevents duplicate event reprocessing.
- PH-003D documents this only; it does not implement real webhook handling.

### Publishing, Site, And Domain Routing

Proposed models:

- `PersonalizedChannel`
- `PublishingTarget`
- `DomainRecord`

Rules:

- `Site` becomes the combination of a `PersonalizedChannel` and its `PublishingTarget`.
- `PersonalizedChannel` represents product page, business VSL, combo page, or campaign page.
- `PublishingTarget` represents hosting target and deployed URL.
- `DomainRecord` represents root domain, subdomain, routing strategy, verification, and reservation state.
- Root domain such as `nombre.pro` is reserved for future entrepreneur profile site.
- Operational MVP landings should prefer `vsl.nombre.pro`, `shop.nombre.pro`, or `[producto].nombre.pro`.

### Master Assets And Product Knowledge

Proposed models:

- `MasterAsset`
- `MasterAssetVersion`
- `ValidatedMessage`
- `ProductCatalog`
- `Product`
- `Kit`
- `KitItem`

Rules:

- Master assets can be `GLOBAL` or `ORGANIZATION` scoped.
- Published channels should reference a specific master asset version.
- Product, kit, and kit-item data must be generic and never hardcoded to Gano Excel.
- Gano Excel can be loaded as seed/demo content later.

### Personalized Channels

Proposed key fields:

- `organizationId`
- `entrepreneurId`
- `webAssetPackageId`
- `masterAssetVersionId`
- `publishingTargetId`
- `type`
- `status`
- `slug`
- `publishedUrl`
- `personalizationFields`
- `masterSyncStatus`
- `metadata`

Rules:

- channel state must stay independent from CRM lead lifecycle
- `NEEDS_UPDATE` means the channel is stale against a master version
- routing must happen through LeadDestination

### Lead Destinations

Proposed destination types:

- `WHATSAPP`
- `OFFICIAL_PURCHASE_LINK`
- `EXTERNAL_FORM`
- `CALENDLY`
- `WHATSAPP_GROUP`
- `OFFICIAL_SIGNUP_LINK`
- `SOCIAL_DM`
- `PHONE`
- `CUSTOM_URL`

Rules:

- LeadDestination always points to external channels controlled by the entrepreneur.
- No post-routing relationship or conversation is stored.

### Traffic Campaigns

Proposed fields:

- `organizationId`
- `entrepreneurId`
- `personalizedChannelId`
- `campaignType`
- `source`
- `objective`
- `budgetAmount`
- `managementFeeAmount`
- `billingMode`
- `status`
- `externalAdAccountRef`
- `claimsReviewStatus`
- `manualApprovalStatus`
- `metadata`

Rules:

- TrafficCampaign models traffic generation, not lead management.
- Suggested `BillingMode` enum values: `INCLUDED`, `FIXED_FEE`, `PERCENTAGE`, `MANUAL`.
- MVP default recommended for `billingMode`: `MANUAL`.
- `managementFeeAmount` may exist, but it must be accompanied by `billingMode`.
- No real billing automation is implemented in PH-003D.
- It may reference external ad accounts but does not implement Ads Manager.

### Claims / Compliance

Proposed model:

- `ClaimReview`

Fields:

- `organizationId`
- `entityType`
- `entityId`
- `claimType`
- `riskLevel`
- `approvalStatus`
- `reviewerId`
- `notes`
- `reviewedAt`
- `createdAt`

Claim types:

- health claim
- income claim
- guaranteed result
- ad policy risk
- other sensitive claim

### Audit Logs / Business Events

Proposed `BusinessEvent` shape:

- `id`
- `organizationId`
- `actorId`
- `actorType`
- `entityType`
- `entityId`
- `eventType`
- `metadata`
- `createdAt`

Minimum event coverage:

- `entrepreneur.created`
- `entrepreneur.package_selected`
- `entrepreneur.data_submitted`
- `personalized_channel.created`
- `personalized_channel.published`
- `personalized_channel.updated_from_master`
- `lead_destination.created`
- `lead_destination.updated`
- `visitor.redirected_to_external_destination`
- `master_asset.created`
- `master_asset.updated`
- `validated_message.created`
- `validated_message.updated`
- `traffic_campaign.requested`
- `traffic_campaign.enabled`
- `payment.received`
- `payment.failed`
- `subscription.activated`
- `subscription.past_due`
- `webhook.received`
- `domain_record.created`
- `publishing_target.created`

Routing event naming rule:

- Use `visitor.redirected_to_external_destination` for terminal routing traceability.
- Do not use the old lead-prefixed redirect event name; PartnerHub is not a CRM and this event represents a visitor redirect, not lead management or commercial history.

## Recommendation

PH-003D should not modify `schema.prisma` yet.

Recommended next step:

1. Review this plan with Claude Code.
2. Resolve pending CTO decisions listed in `PH-003D_prisma_model_decisions.md`.
3. Only after approval, update `schema.prisma` in a new implementation ticket.
4. Validate Prisma.
5. Then create migration in a later explicitly authorized migration ticket.
