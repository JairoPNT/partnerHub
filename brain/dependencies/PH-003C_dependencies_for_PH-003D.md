# PH-003C - Dependencies for PH-003D

## Purpose

PH-003D should review the PH-003C schema direction before any migration is created or applied.

## Required Inputs

- `brain/domain-model/PH-003C_non_crm_domain_model.md`
- `brain/state-machines/PH-003C_state_machines.md`
- `brain/business-flows/PH-003C_attract_educate_route_flow.md`
- `brain/business-rules/PH-003C_non_crm_business_rules.md`
- `app/web/prisma/schema.prisma`
- `app/web/server/services/`

## Schema Review Required

Validate that Prisma models remain limited to:

- Entrepreneur
- WebAssetPackage
- MasterAsset
- PersonalizedChannel
- LeadDestination
- ValidatedMessage
- TrafficCampaign
- BusinessEvent
- supporting auth/user constructs

Also validate the explicit rescope of earlier non-CRM product concerns:

- `Plan` must not disappear conceptually; it should evolve toward `CommercialPackage` or `PricingPlan`, related to WebAssetPackage and billing.
- `Payment` must not disappear conceptually; it should evolve toward `PaymentRecord` or `BillingPayment`, related to Wompi, setup fee, monthly fee, and webhook events.
- `Site` must not disappear conceptually; it should evolve toward `PersonalizedChannel` or `PublishingTarget`, depending on whether the record represents the personalized public asset or the publication destination.
- The current `schema.prisma` is a technical draft for planning and is not migrable as a production decision.
- The removal of Plan, Payment, and Site from the current draft schema is not approved as a final database decision.

Reject CRM-style additions:

- Prospect
- Opportunity
- Deal
- Pipeline
- FollowUp
- CRMActivity
- LeadManagement
- inbox
- post-routing lead management

## Service Review Required

Validate that services model:

- state transitions
- minimum business events
- asset creation and publication
- external lead destination routing
- traffic enablement
- terminal routing event

Services must not introduce commercial follow-up, ownership of post-routing leads, or pipeline stages.

## Migration Rule

No migration should be created until PH-003D receives CTO quick check, PH-003E is explicitly authorized, schema implementation is completed, and a later migration ticket is explicitly approved.

Do not run `prisma generate`, `prisma migrate`, or `prisma db push` during PH-003D closure.

## Open Questions

- Resolved by PH-003D closure: `visitor.redirected_to_external_destination` remains in the minimum event list as terminal BusinessEvent/audit traceability.
- Resolved by PH-003D closure: MVP starts with individual BusinessEvent records for visitor redirects; aggregated metrics can be added later if volume requires it.
- Resolved by PH-003D closure: UserRole may include `ENTREPRENEUR` before the entrepreneur has an MVP dashboard, but no auth, permissions, endpoint access, or entrepreneur dashboard is implemented yet.
- Should billing/payment remain out of PH-003C until a separate billing mission?
- Should TrafficCampaign include only PartnerHub-managed traffic or also manually launched external traffic references?
