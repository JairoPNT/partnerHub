# PH-003A - Flow 001: Business Owner Purchases PartnerHub

## 1. Purpose

Document the business foundation flow for a business owner who purchases PartnerHub, from lead routing through payment, onboarding validation, landing publication, cost tracking, and dependencies for PH-003B / PH-003C.

PartnerHub must remain a generic SaaS for commercial networks, direct sales, distributors, affiliates, and partner teams. Gano Excel is the first implementation / seed demo only, never base platform logic.

## 2. Entry routes

There are two main approved routes:

- Product buyer lead.
- Lead who wants to register as a business owner.

If the product buyer lead comes from Colombia:

- Route to `https://col.ganoexcel.com/claudiacalero`.
- The link may be used on the page and in WhatsApp.

If the product buyer lead comes from another country:

- Direct the conversation toward registration as a new business owner.

For a new business owner:

- The lead passes through an educational/persuasive funnel.
- Questions and objections are resolved.
- When there is a purchase decision, the close is manual.

## 3. Purchase models

Approved commercial model:

- Initial setup plus monthly fee.

Initial models:

- `PRODUCT_SALES`
- `VSL_RECRUITMENT`
- `FULL_COMBO`

Setup:

- One model: COP 400.000.
- Combo: COP 600.000.
- Later upgrade pending: COP 200.000 or COP 300.000.

Monthly fee:

- One active model: COP 100.000.
- Two active models: COP 150.000.

Campaigns:

- Additional service.
- Ad spend and administration must be itemized for the client.

## 4. Payment flow

Payment:

- Mixed model with Wompi.
- Initial payment through Wompi.
- Wompi webhooks/events confirm payment.
- Monthly charge starts 30 days after registration starts.
- Manual close is possible for new business owners.

Payment confirmation is a critical validator before paid setup activation and publication.

## 5. Required data

Required data:

- Country.
- WhatsApp.
- Selected model.
- Product/kit if `PRODUCT_SALES`.
- Current product price if `PRODUCT_SALES`.
- Product availability if `PRODUCT_SALES`.
- Valid purchase link if `PRODUCT_SALES`.
- Business owner photo if VSL.
- VSL video or proof if VSL.
- Domain/subdomain/route preference.
- Template assignment.

Allowed MVP custom fields:

- WhatsApp.
- Product sales link.
- Photo.
- VSL video.

Critical validators:

- Payment confirmed.
- Valid WhatsApp.
- Valid purchase link if `PRODUCT_SALES`.
- Defined country.
- Defined product/kit if `PRODUCT_SALES`.
- Current price if `PRODUCT_SALES`.
- Availability if `PRODUCT_SALES`.
- Business owner photo if VSL.
- VSL video or proof if VSL.
- Domain/subdomain/route available.
- Template assigned.
- Checklist complete.

## 6. Automatic creation

After payment confirmation and critical validation, PartnerHub may automatically create:

- Tenant/workspace record.
- Selected service model configuration.
- Onboarding checklist.
- Landing draft.
- Publishing record.
- Monthly billing schedule.
- Internal cost records.
- Operational alerts.

The business owner will not have a dashboard in MVP.

## 7. Manual validation

Manual validation is required when:

- Close happens outside the normal Wompi flow.
- Payment status is missing, unclear, duplicated, rejected, or disputed.
- Product link, product/kit, price, or availability cannot be validated.
- Landing uses copy outside approved templates and allowed custom fields.
- Health, income, result, or regulated claims appear.
- Domain/subdomain/route availability is unclear.
- VSL video or owner photo quality is insufficient.
- Compliance or operational risk is detected.

## 8. Publishing flow

Landing:

- Published automatically only if checklist/critical requirements are complete.
- Does not require manual copy approval if it only uses approved templates and allowed custom fields.
- Must remain blocked if critical validators are incomplete.

Meta Setup does not block the initial landing unless the contracted service requires social launch or ads.

## 9. Business owner deliverables

The business owner receives:

- Payment/purchase confirmation when available.
- Onboarding instructions.
- Requests for missing requirements.
- Published landing URL.
- WhatsApp/email operational communication.
- Campaign cost breakdown if campaigns are contracted.

## 10. Cost tracking

Internal costs:

- Invisible to the business owner.
- Tracked internally for operations, generation, automation, and support.

Campaign costs:

- Additional service.
- Ad spend and campaign administration must be itemized for the client.

## 11. Pending tasks

- Resolve later upgrade price.
- Decide combo URL structure.
- Define unpaid monthly billing behavior.
- Define grace period.
- Define domain/subdomain/subroute strategy.
- Define domain ownership and administration.
- Define VSL video hosting.
- Define whether VSL video is delivered by the business owner or produced by PartnerHub.

## 12. Business rules

- PartnerHub is generic multi-tenant SaaS.
- Gano Excel is first implementation / seed demo only.
- Do not hardcode Gano Excel as base platform logic.
- Payment confirmation is required before paid setup activation.
- Landing publication requires critical checklist completion.
- Manual copy approval is not required for approved templates plus allowed custom fields.
- Internal costs are invisible to the business owner.
- Campaign costs are visible and itemized when campaigns are contracted.
- Business owner dashboard is out of MVP scope.

## 13. Open questions

Open questions are maintained in `brain/open-questions/PH-003A_open_questions.md`.

## 14. Dependencies for PH-003B / PH-003C

PH-003B must clarify roles, permissions, domain entities, service model configuration, tenant ownership, landing editability, campaign service model, and Meta Setup ownership.

PH-003C must clarify schema, tables, relationships, multi-tenant isolation, billing fields, costs, publishing records, domain routing, webhook records, and audit logs.
