# PH-003D - Migration Plan

## Status

Planning only.

No migration is created in PH-003D.

## Non-Negotiable Gates

Before any real migration:

1. Claude Code reviews PH-003D documents.
2. CTO / ChatGPT approves schema direction.
3. Open CTO decisions are resolved or explicitly deferred.
4. `schema.prisma` is updated in a separate implementation ticket.
5. `npx prisma validate --schema prisma/schema.prisma` passes.
6. Only then may an explicitly authorized migration ticket run migration commands.

Do not run in PH-003D:

- `prisma generate`
- `prisma migrate`
- `prisma db push`

## Recommended Migration Sequence

### Phase 0 - Schema Draft Approval

Output:

- approved model list
- approved enum list
- approved tenant isolation strategy
- approved billing/payment scope
- approved publishing/domain scope

No database command.

### Phase 1 - Tenant Foundation

Add:

- `Organization`
- `OrganizationMembership`
- `UserRole`
- organization status enum
- `organizationId` to `Entrepreneur`

Rules:

- `Organization` is the final tenant-boundary model name.
- `OrganizationMembership` represents the relation between `User` and `Organization` with role and status.
- Suggested `UserRole` values: `PLATFORM_ADMIN`, `ORGANIZATION_ADMIN`, `OPERATOR`, `ENTREPRENEUR`.
- no tenant-owned record may exist without organization context after this phase
- platform admin behavior must be decided before production auth
- do not implement auth, permissions, endpoints, or UI in this phase
- the entrepreneur can exist as an entity and/or related actor without an MVP dashboard

Migration risk:

- existing development data may not have organization references

Mitigation:

- if dev data exists, create a default development organization in seed or manual data plan
- no production data migration until approved

### Phase 2 - Commercial Package And Pricing

Add:

- `CommercialPackage`
- `PricingPlan`
- relation from `WebAssetPackage` to commercial package / pricing plan

Rules:

- support `PRODUCT_SALES`, `VSL_RECRUITMENT`, and `FULL_COMBO`
- keep setup and monthly pricing configurable
- do not hardcode Gano Excel

Rules:

- upgrade price range is documented as COP 200000 to COP 300000
- `upgradePricePolicy` for MVP is `MANUAL`
- do not hardcode a rigid upgrade price in the database yet

### Phase 3 - Billing And Subscription

Add:

- `Subscription`
- `BillingCycle`
- `BillingStatement`
- `PaymentProvider`
- `PaymentRecord`
- `PaymentWebhookEvent`

Rules:

- Wompi is first provider, not hardcoded core
- `BillingStatement` is used for MVP; `Invoice` remains outside MVP
- support manual close/payment
- monthly billing starts 30 days after registration starts
- webhook idempotency key must be unique per provider
- `PaymentWebhookEvent` minimum fields: `id`, `providerId`, `providerReference`, `idempotencyKey`, `rawPayload`, `status`, `receivedAt`, `processedAt`, `processingError`, `createdAt`
- `rawPayload` must be stored before processing
- `idempotencyKey` prevents duplicate webhook reprocessing

No webhook processing implementation in this phase unless a later ticket explicitly authorizes it.

### Phase 4 - Publishing And Domain Routing

Add:

- `PublishingTarget`
- `DomainRecord`

Adjust:

- `PersonalizedChannel` references `PublishingTarget`
- keep published URL as output field if approved
- remove or deprecate direct domain fields after normalized fields are available

Rules:

- root domain reserved for future owner profile site
- MVP operational assets prefer subdomains
- product landing target: `shop.nombre.pro` or `[producto].nombre.pro`
- VSL target: `vsl.nombre.pro`

### Phase 5 - Master Asset Versioning

Add:

- `MasterAssetVersion`
- channel relation to master asset version
- master sync status on `PersonalizedChannel`

Rules:

- channel knows which version generated it
- channel can be marked stale when master changes

### Phase 6 - Product Knowledge

Add:

- `ProductCatalog`
- `Product`
- `Kit`
- `KitItem`

Rules:

- generic product model
- ProductCatalog, Product, Kit, and KitItem belong in MVP planning
- Gano Excel as seed/demo content only
- no brand-specific schema fields

### Phase 7 - Lead Destination Expansion

Adjust:

- lead destination type enum to include official purchase/sign-up links, Calendly, WhatsApp group, and custom URL

Rules:

- destination stays external
- no managed lead lifecycle

### Phase 8 - Traffic Campaign Planning

Adjust:

- add campaign type
- objective
- external ad account reference
- management fee fields
- billing mode
- claim review status
- manual approval status

Rules:

- traffic generation only
- no pipeline or follow-up state
- suggested `BillingMode` values: `INCLUDED`, `FIXED_FEE`, `PERCENTAGE`, `MANUAL`
- MVP default recommended for `billingMode`: `MANUAL`
- `managementFeeAmount` may exist only with `billingMode`
- no billing automation in PH-003D

### Phase 9 - Claims / Compliance

Add:

- `ClaimReview`

Rules:

- track sensitive claims
- no compliance engine
- manual review only in MVP

### Phase 10 - BusinessEvent Hardening

Adjust:

- add `organizationId`
- add `entityType`
- add `entityId`
- add `eventType`
- add `metadata`

Rules:

- append-only behavior should be enforced in service layer initially
- do not convert BusinessEvent into CRM activity history
- terminal external routing event is `visitor.redirected_to_external_destination`
- do not use the old lead-prefixed redirect event name

## Rollback Planning

Because no production database exists in this phase, rollback planning is conceptual.

When migrations begin:

- keep migrations small by phase
- avoid combining billing, publishing, and master versioning in one migration
- validate migration locally against empty database first
- only introduce seed data after schema validation

## Validation Plan For Future Migration Ticket

Allowed after approval:

- `npx prisma validate --schema prisma/schema.prisma`
- `npx prisma format --schema prisma/schema.prisma`

Only in explicit migration ticket:

- `npx prisma migrate dev --name <approved-name>`
- `npx prisma generate`

Never use `prisma db push` for production-intended schema history unless CTO explicitly approves a throwaway prototype context.

## Exit Criteria For PH-003D

PH-003D can be sent to Claude when:

- schema risks are documented
- target model list is documented
- migration phases are documented
- MVP vs future boundary is documented
- pending CTO decisions are documented
- Claude warning closures W-A, W-B, and W-C are documented
- no migration has been created
- working tree contains only PH-003D documentation changes
