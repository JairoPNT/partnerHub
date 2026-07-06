# PH-003A - Consolidated Business Rules

## Generic multi-tenant platform

- PartnerHub is a generic SaaS for commercial networks, direct sales, distributors, affiliates, and partner teams.
- Gano Excel is first implementation / seed demo, not base logic.
- Do not hardcode Gano Excel as platform logic.
- Tenant configuration must stay generic for future commercial networks.

## Purchase

- Leads are routed as product buyer leads or business owner registration leads.
- Product buyer leads from Colombia use `https://col.ganoexcel.com/claudiacalero`.
- Product buyer leads from other countries are routed toward new business owner registration.
- New business owners can go through an educational/persuasive funnel and manual close.

## Setup

- Supported initial service models are `PRODUCT_SALES`, `VSL_RECRUITMENT`, and `FULL_COMBO`.
- Setup for one model is COP 400.000.
- Setup for combo is COP 600.000.

## Upgrade

- Later upgrade price is unresolved: COP 200.000 or COP 300.000.
- Upgrade rules must be clarified before implementation.

## Monthly fee

- One active model: COP 100.000.
- Two active models: COP 150.000.
- Monthly billing starts 30 days after registration starts.
- Non-payment behavior and grace period remain open questions.

## Payment

- Initial payment uses a mixed model with Wompi.
- Wompi payment is preferred for initial payment.
- Wompi webhooks/events confirm payment.
- Manual close is allowed when needed.
- Payment confirmation is required before paid setup activation.

## Publication

- Landing is published automatically only when critical requirements are complete.
- Manual copy approval is not required when only approved templates and allowed custom fields are used.
- Allowed MVP custom fields are WhatsApp, product sales link, photo, and VSL video.
- Meta Setup does not block landing publication unless social launch or ads are contracted.

## Validation

- Critical validators include confirmed payment, valid WhatsApp, country, domain/subdomain/route availability, assigned template, and complete checklist.
- `PRODUCT_SALES` requires valid purchase link, product/kit, current price, and availability.
- `VSL_RECRUITMENT` requires business owner photo and VSL video or proof.
- Sensitive claims require manual validation.

## Costs

- Internal costs are invisible to the business owner.
- Internal generation, automation, support, and operations costs are tracked internally.
- Ad spend and campaign administration are itemized for the client when campaigns are contracted.

## Campaigns

- Campaigns are an additional service.
- Campaign Manager remains Future Epic / Ads Service.
- Campaign readiness depends on Meta assets, ad account, payment method, budget, administration fee, and compliance review.

## Dashboard

- The business owner will not have a dashboard in MVP.
- The initial dashboard is allowed only as Admin/Internal Operations Prototype.
- AdminDashboardPrototype connected to `/dashboard` is a non-blocking warning, not a PH-003A-CLOSE-FIX-2 change.

## Future scope

- Asset Library remains Future Epic / Social Launch Engine.
- VSL Builder MVP does not include AI.
- HeyGen and ElevenLabs remain in EPIC-800.
