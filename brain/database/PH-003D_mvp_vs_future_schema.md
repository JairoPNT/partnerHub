# PH-003D - MVP vs Future Schema

## Purpose

Separate PH-003D schema planning into MVP and future scope.

This prevents the database model from quietly becoming a CRM, Ads Manager, AI Content Studio, public marketplace, or full self-service checkout platform.

## MVP Schema Scope

### Tenant And Actors

MVP:

- Organization
- OrganizationMembership
- User
- Entrepreneur

Notes:

- Organization is the final tenant-boundary model name.
- OrganizationMembership represents User-to-Organization role membership in MVP planning.
- Suggested UserRole values: PLATFORM_ADMIN, ORGANIZATION_ADMIN, OPERATOR, ENTREPRENEUR.
- Entrepreneur dashboard is not approved for MVP.
- Entrepreneur may exist as an entity and/or related actor without dashboard access.
- User can support admin/internal operation first.
- Tenant isolation must be structural from the first migration.
- Auth, permissions, endpoints, and UI are not implemented in PH-003D.

### Commercial Package

MVP:

- CommercialPackage
- PricingPlan
- WebAssetPackage

Must support:

- `PRODUCT_SALES`
- `VSL_RECRUITMENT`
- `FULL_COMBO`
- setup fee
- monthly fee
- package state
- selected package per entrepreneur

Open:

- upgrade price is documented as COP 200000 to COP 300000
- `upgradePricePolicy` for MVP is `MANUAL`
- upgrade price should not be fixed rigidly in the database yet

### Billing And Payment

MVP:

- Subscription
- BillingCycle
- BillingStatement
- PaymentProvider
- PaymentRecord
- PaymentWebhookEvent

Must support:

- Wompi as first provider
- manual close/payment
- setup fee
- monthly fee
- monthly billing beginning 30 days after registration starts
- webhook payload storage
- webhook idempotency
- PaymentWebhookEvent minimum fields: id, providerId, providerReference, idempotencyKey, rawPayload, status, receivedAt, processedAt, processingError, createdAt
- rawPayload stored before processing
- idempotencyKey preventing duplicate event reprocessing

Not MVP:

- automated dunning engine
- full accounting/invoicing compliance
- legal Invoice model
- self-service SaaS checkout at scale
- webhook processing implementation

### Publishing And Domains

MVP:

- PersonalizedChannel
- PublishingTarget
- DomainRecord

Must support:

- product page
- business VSL page
- combo page
- published URL
- external hosting target
- root domain reservation
- operational subdomains

Rules:

- `nombre.pro` root remains reserved for future entrepreneur profile site.
- `vsl.nombre.pro` preferred for VSL.
- `shop.nombre.pro` or `[producto].nombre.pro` preferred for product landing.
- root domain is not product landing default.
- root domain is not VSL default.

### Master Assets And Messages

MVP:

- MasterAsset
- MasterAssetVersion
- ValidatedMessage
- ProductCatalog
- Product
- Kit
- KitItem

Must support:

- global validated content
- tenant-adaptable content
- product and kit references
- kit item composition
- versioned master assets
- channel dependency on master version
- stale channel detection
- MasterAsset scope can be GLOBAL or ORGANIZATION

### Lead Routing

MVP:

- LeadDestination
- BusinessEvent for routing traceability

LeadDestination types:

- WhatsApp
- official purchase link
- external form
- Calendly
- WhatsApp group
- official sign-up link
- social DM
- phone
- custom URL

Not MVP:

- lead inbox
- lead profile
- lead ownership
- lead pipeline
- follow-up automation
- conversation storage

### Traffic Campaign

MVP:

- Basic TrafficCampaign planning record

Must support:

- source
- objective
- budget
- management fee if contracted
- billing mode
- linked personalized channel
- external ad account reference if provided
- claims review status
- manual approval status

Not MVP:

- Ads Manager clone
- automated ad optimization
- ad creative library workflow
- CRM attribution pipeline
- billing automation

BillingMode:

- INCLUDED
- FIXED_FEE
- PERCENTAGE
- MANUAL

MVP default recommended billingMode:

- MANUAL

Rules:

- TrafficCampaign remains traffic generation, not CRM.
- managementFeeAmount may exist, but must be accompanied by billingMode.

### Claims / Compliance

MVP:

- ClaimReview

Must support:

- health claims
- income claims
- guaranteed result claims
- ad policy risk
- approval status
- reviewer
- notes
- timestamp

Not MVP:

- automated compliance engine
- legal approval workflow engine

### Audit / Business Events

MVP:

- BusinessEvent

Must support:

- tenant context
- actor context
- entity type and id
- event type
- metadata
- append-only traceability by service convention
- terminal visitor redirect event: `visitor.redirected_to_external_destination`

Not MVP:

- CRM activity timeline
- post-routing sales history

## Future Scope

Future only:

- entrepreneur dashboard
- CRM
- pipeline
- inbox
- nurturing
- AI Content Studio
- HeyGen integration
- ElevenLabs integration
- Social Launch Engine
- advanced Asset Library
- advanced Campaign Manager
- public marketplace
- mass self-service checkout
- public PartnerHub affiliate system
- commission engine
- advanced domain provisioning automation
- full ad account management
- full accounting/legal invoice suite

## Rejection Rules

Reject or defer any schema proposal that adds:

- prospect profiles
- opportunity stages
- deal values
- pipeline stages
- follow-up tasks
- inbox messages
- conversation records
- lead assignment queues
- post-routing commercial status

Allowed alternative:

- store terminal routing BusinessEvents
- store aggregate traffic metrics in future if needed
- store external destination references controlled by the entrepreneur

## Readiness For Claude

Claude should review:

- whether MVP models are sufficient for the first migration plan
- whether future items are properly excluded
- whether any MVP item accidentally introduces CRM behavior
- whether billing and publishing are scoped enough for schema implementation
