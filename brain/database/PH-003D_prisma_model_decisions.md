# PH-003D - Prisma Model Decisions

## Status

Planning document only.

No Prisma schema change is authorized by this document.

## Decisions Taken

### D1 - Keep PartnerHub Non-CRM

The schema must not include:

- Prospect
- Opportunity
- Deal
- Pipeline
- FollowUp
- CRMActivity
- LeadManagement
- inbox
- conversation ownership
- commercial closing lifecycle

Routing events are allowed only as terminal traceability.

### D2 - Organization Is The Tenant Boundary

Use `Organization` as the final tenant boundary model name.

Use `organizationId` on tenant-owned records.

Tenant-owned records include:

- OrganizationMembership
- Entrepreneur
- WebAssetPackage
- PersonalizedChannel
- LeadDestination
- TrafficCampaign
- Subscription
- BillingCycle
- BillingStatement
- PaymentRecord
- PaymentWebhookEvent
- PublishingTarget
- DomainRecord
- BusinessEvent
- ClaimReview

### D3 - User Is Not The Tenant Boundary

`User` is an actor/account concept.

`Organization` is the data isolation boundary.

`User` should relate to tenant context through `OrganizationMembership`.

`OrganizationMembership` represents the relationship between `User` and `Organization` with role and membership status.

Suggested fields:

- `id`
- `userId`
- `organizationId`
- `role`
- `status`
- `createdAt`
- `updatedAt`

Auth, authorization checks, endpoint access rules, and permission implementation remain deferred to a later auth/security ticket.

### D4 - Entrepreneur Belongs To Organization

`Entrepreneur.organizationId` is required.

An entrepreneur may have optional linked users later, but MVP does not approve an entrepreneur dashboard.

The entrepreneur can exist as an entity and/or related actor in MVP without receiving direct dashboard access.

### D5 - Plan Becomes CommercialPackage / PricingPlan

Earlier `Plan` should be split conceptually:

- `CommercialPackage`: product offering and included service model
- `PricingPlan`: setup and monthly pricing rules
- `WebAssetPackage`: entrepreneur-selected package instance and fulfillment state

### D6 - Payment Becomes PaymentRecord / PaymentWebhookEvent

Earlier `Payment` should become:

- `PaymentProvider`
- `PaymentRecord`
- `PaymentWebhookEvent`
- optionally `BillingPayment` only if PH-003D/CTO wants a join table between invoices/statements and payments

MVP can start with `PaymentRecord` linked to `Subscription`, `BillingStatement`, `WebAssetPackage`, and `Entrepreneur` where applicable.

`PaymentWebhookEvent` minimum fields:

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

Rules:

- `rawPayload` is stored before processing.
- `idempotencyKey` prevents duplicate event reprocessing.
- No webhook implementation is authorized in PH-003D.

### D7 - Site Becomes PersonalizedChannel / PublishingTarget / DomainRecord

Earlier `Site` should not return as a generic catch-all.

Use:

- `PersonalizedChannel` for the entrepreneur-specific public asset
- `PublishingTarget` for hosting/deployment target
- `DomainRecord` for domain/subdomain/routing strategy

### D8 - MasterAsset Needs Versions

Add `MasterAssetVersion`.

`PersonalizedChannel` should reference the version it was generated from.

This enables stale-channel detection and auditability.

### D9 - Product Knowledge Must Be Generic

Add generic product models:

- `ProductCatalog`
- `Product`
- `Kit`
- `KitItem`

No base schema field should be Gano Excel-specific.

`ProductCatalog`, `Product`, `Kit`, and `KitItem` belong in MVP planning.

### D10 - BusinessEvent Is The Audit Spine

`BusinessEvent` should store generic event facts:

- organizationId
- actorType
- actorId
- entityType
- entityId
- eventType
- metadata
- createdAt

Typed optional foreign keys can be added only if they materially improve query patterns, but they should not replace generic audit fields.

Terminal redirect event:

- `visitor.redirected_to_external_destination`

Do not use the old lead-prefixed redirect event name; PartnerHub is not a CRM and the event records a visitor redirect, not lead management history.

## Proposed Enum Families

### OrganizationStatus

- `ACTIVE`
- `PAUSED`
- `ARCHIVED`

### UserRole

- `PLATFORM_ADMIN`
- `ORGANIZATION_ADMIN`
- `OPERATOR`
- `ENTREPRENEUR`

### EntrepreneurStatus

- `INVITED`
- `ACTIVE`
- `PAUSED`
- `ARCHIVED`

### CommercialPackageType

- `PRODUCT_SALES`
- `VSL_RECRUITMENT`
- `FULL_COMBO`

### WebAssetPackageStatus

- `DRAFT`
- `SELECTED`
- `DATA_REQUIRED`
- `READY_FOR_ASSET`
- `ACTIVE`
- `PAUSED`
- `ARCHIVED`

### SubscriptionStatus

- `PENDING_ACTIVATION`
- `ACTIVE`
- `PAST_DUE`
- `PAUSED`
- `CANCELLED`

### BillingCycleStatus

- `SCHEDULED`
- `OPEN`
- `PAID`
- `PAST_DUE`
- `VOID`

### PaymentProviderCode

- `WOMPI`
- `MANUAL`
- `OTHER`

Wompi is first provider, not a hardcoded platform dependency.

### PaymentStatus

- `PENDING`
- `RECEIVED`
- `FAILED`
- `CANCELLED`
- `REFUNDED`
- `DUPLICATE`

### PaymentWebhookStatus

- `RECEIVED`
- `PROCESSED`
- `DUPLICATE`
- `FAILED`
- `IGNORED`

### BillingMode

- `INCLUDED`
- `FIXED_FEE`
- `PERCENTAGE`
- `MANUAL`

MVP default recommended value: `MANUAL`.

### PersonalizedChannelType

- `PERSONALIZED_PRODUCT_PAGE`
- `PERSONALIZED_BUSINESS_VSL`
- `PERSONALIZED_COMBO`
- `CAMPAIGN_PAGE`

### PersonalizedChannelStatus

- `REQUESTED`
- `DRAFT`
- `READY_FOR_REVIEW`
- `PUBLISHED`
- `NEEDS_UPDATE`
- `PAUSED`
- `ARCHIVED`

### MasterSyncStatus

- `CURRENT`
- `STALE`
- `UPDATE_REQUIRED`
- `MANUAL_REVIEW_REQUIRED`

### LeadDestinationType

- `WHATSAPP`
- `OFFICIAL_PURCHASE_LINK`
- `EXTERNAL_FORM`
- `CALENDLY`
- `WHATSAPP_GROUP`
- `OFFICIAL_SIGNUP_LINK`
- `SOCIAL_DM`
- `PHONE`
- `CUSTOM_URL`

### TrafficCampaignStatus

- `REQUESTED`
- `READY`
- `ENABLED`
- `PAUSED`
- `COMPLETED`
- `CANCELLED`

### ClaimReviewStatus

- `NOT_REQUIRED`
- `PENDING`
- `APPROVED`
- `REJECTED`
- `CHANGES_REQUIRED`

### ClaimType

- `HEALTH`
- `INCOME`
- `GUARANTEED_RESULT`
- `AD_POLICY`
- `OTHER`

## Proposed Model List For MVP Schema

- `Organization`
- `OrganizationMembership`
- `User`
- `Entrepreneur`
- `CommercialPackage`
- `PricingPlan`
- `WebAssetPackage`
- `Subscription`
- `BillingCycle`
- `BillingStatement`
- `PaymentProvider`
- `PaymentRecord`
- `PaymentWebhookEvent`
- `MasterAsset`
- `MasterAssetVersion`
- `ValidatedMessage`
- `ProductCatalog`
- `Product`
- `Kit`
- `KitItem`
- `PersonalizedChannel`
- `LeadDestination`
- `PublishingTarget`
- `DomainRecord`
- `TrafficCampaign`
- `ClaimReview`
- `BusinessEvent`

## CTO Decisions Ratified In PH-003D Closure

### P1 - Tenant Model Naming

Decision: use `Organization` in Prisma as the final tenant boundary name.

### P2 - Platform Admin Isolation

Deferred to later auth/security ticket. Choose whether platform admins:

- have nullable `organizationId`
- belong to a special platform organization
- use separate `PlatformUser` model

PH-003D does not implement auth or permissions.

### P3 - BillingStatement vs Invoice

Decision: use `BillingStatement` in MVP. `Invoice` remains outside MVP until legal invoice requirements are defined.

### P4 - ProductCatalog MVP Depth

Decision: include `ProductCatalog`, `Product`, `Kit`, and `KitItem` in MVP planning.

### P5 - MasterAsset Global Scope Strategy

Decision: `MasterAsset` can be `GLOBAL` or `ORGANIZATION` scoped.

### P6 - Redirect Event Granularity

Decision: start with individual `BusinessEvent` records for MVP traceability.

Required event name: `visitor.redirected_to_external_destination`.

Aggregated metrics can be added later if volume requires it.

### P7 - Upgrade Price

Upgrade price range is documented:

- COP 200000
- COP 300000

Decision: `upgradePricePolicy` for MVP is `MANUAL`; do not fix the upgrade price rigidly in the database yet.

### P8 - Campaign Fee Model

Decision: planned campaign fee can live on `TrafficCampaign`; billed fee belongs on `BillingStatement` when billing is represented.

`TrafficCampaign` may store `managementFeeAmount`, but it must also store `billingMode`.

For MVP, recommended `billingMode` default is `MANUAL`.

TrafficCampaign remains traffic generation, not CRM, and PH-003D does not implement billing automation.
