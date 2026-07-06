# PH-003B - Plan, Configuration, and Service Model

## Purpose

Clarify commercial and operational concepts before PH-003C schema planning.

## Plan

A Plan is the commercial package PartnerHub sells.

Conceptually, a Plan answers:

- What is sold?
- What is the setup price?
- What is the monthly price?
- Which service models are included?
- Which add-ons are separate?

PH-003A approved:

- Setup inicial plus monthly fee.
- One model setup: COP 400.000.
- Combo setup: COP 600.000.
- Monthly fee for one active model: COP 100.000.
- Monthly fee for two active models: COP 150.000.

Rules:

- Plan must remain generic and not brand-specific.
- Gano Excel may appear as seed/demo configuration, not base plan logic.
- Campaigns are an additional service, not automatically included in base setup.
- In MVP, PartnerHub plans are sold through manual / voz a voz / initial promoter team channels.
- The MVP does not include a public PartnerHub marketplace.
- The MVP does not include mass self-service checkout for PartnerHub sales.
- The MVP does not include a public PartnerHub affiliate system.
- En MVP no hay sistema publico de afiliados de PartnerHub.
- Manual close remains valid.
- Lead source or promoter origin can be recorded operationally without becoming an affiliate engine.

## ServiceModel

A ServiceModel is the operational type of deliverable selected for a tenant.

Initial service models:

- `PRODUCT_SALES`
- `VSL_RECRUITMENT`
- `FULL_COMBO`

`PRODUCT_SALES`:

- Supports a product sales landing.
- Requires product/kit, current product price, availability, valid purchase link, WhatsApp, country, template assignment, and payment confirmation.

`VSL_RECRUITMENT`:

- Supports a recruitment/education VSL landing.
- Requires business owner photo, VSL video or proof, WhatsApp, country, template assignment, and payment confirmation.

`FULL_COMBO`:

- Combines Product Sales and VSL Recruitment.
- Inherits validators from both service models.
- Publishing structure remains `OPEN`: one landing with two routes or two separate URLs.

## Configuration

Configuration is the tenant-specific operational setup that makes a selected ServiceModel work.

Configuration answers:

- What does this tenant need configured?
- Which required fields are complete?
- Which validators are passed?
- Which template is assigned?
- Which publishing target should be used?
- Which Meta/social/campaign readiness steps apply?

Configuration is not the same as Plan:

- Plan is commercial packaging.
- Configuration is operational tenant setup.
- ServiceModel is the selected delivery model.

## ProductSalesConfiguration

ProductSalesConfiguration is the configuration subset for `PRODUCT_SALES`.

Conceptual fields:

- WhatsApp.
- Product purchase link.
- Product/kit selection.
- Current price.
- Product availability.
- Country.
- Template assignment.
- Landing validation state.
- Product landing publishing target.
- Product landing routing strategy.

Rules:

- Product purchase link is editable/configurable by Admin/Internal Operator in MVP.
- Business owner does not edit directly in MVP.
- Claims, product details, images, and brand references must come from approved knowledge.
- Product/shop landing should preferably publish to `shop.nombre.pro` or `[producto].nombre.pro`.
- `shop.nombre.pro` is the generic option when there is more than one product or when avoiding product-specific subdomain coupling.
- `[producto].nombre.pro` can be useful for a specific campaign or primary product.
- The root domain `nombre.pro` must not be assumed as the product landing by default.

## VSLConfiguration

VSLConfiguration is the configuration subset for `VSL_RECRUITMENT`.

Conceptual fields:

- WhatsApp.
- Business owner photo.
- VSL video URL / test video / proof.
- Country.
- Template assignment.
- Landing validation state.
- VSL landing publishing target.
- VSL landing routing strategy.

Rules:

- VSL video hosting remains `OPEN`.
- Whether VSL video is delivered by the business owner or produced by PartnerHub remains `OPEN`.
- HeyGen and ElevenLabs remain deferred to EPIC-800.
- VSL landing should preferably publish to `vsl.nombre.pro`.
- The root domain `nombre.pro` must not be assumed as the VSL landing by default.

## ComboConfiguration

ComboConfiguration combines ProductSalesConfiguration and VSLConfiguration.

Conceptual fields:

- All ProductSalesConfiguration fields.
- All VSLConfiguration fields.
- Combo publishing mode.
- Combo routing strategy.

Rules:

- Combo setup price: COP 600.000.
- Monthly fee for two active models: COP 150.000.
- One URL vs two URLs remains `OPEN`.
- Combo must preserve the root domain reservation and should route MVP operational experiences through subdomains.

## Domain and Subdomain Publishing Strategy

The entrepreneur ecosystem may have a principal domain like `nombre.pro`.

The root domain `nombre.pro` is reserved for a future owner profile site. That future site may become the entrepreneur's personal brand page, commercial resume, professional profile, institutional page, or broader owned ecosystem.

MVP operational landings should preferably publish on subdomains:

- VSL: `vsl.nombre.pro`.
- Product/shop generic: `shop.nombre.pro`.
- Product/campaign-specific: `[producto].nombre.pro`.

Rules:

- Root domain is reserved and must not be assumed as the product landing default.
- Root domain is reserved and must not be assumed as the VSL default.
- `shop.nombre.pro` is appropriate when there is more than one product or when the subdomain should not be coupled to a specific product.
- `[producto].nombre.pro` can be useful for a specific campaign or primary product.
- The strategy remains generic and must not be tied to Gano Excel.
- Gano Excel can be first implementation / seed demo only.
- Examples such as `vsl.claudiacalero.pro`, `shop.claudiacalero.pro`, and `ganocafe.claudiacalero.pro` are seed/demo examples, not base platform logic.

## Upgrade

Upgrade means adding another ServiceModel after initial setup.

Approved:

- Upgrade exists conceptually.

Still `OPEN`:

- Later upgrade price: COP 200.000 or COP 300.000.
- Whether upgrade changes setup checklist, monthly fee timing, publication structure, or billing event model.

PH-003B must not close this question.

## Subscription

Subscription is the ongoing billing relationship after setup.

Approved:

- Monthly billing starts 30 days after registration starts.
- One active model monthly fee: COP 100.000.
- Two active models monthly fee: COP 150.000.

Still `OPEN`:

- What happens if the tenant does not pay monthly.
- Whether there is a grace period.
- Whether publishing should be suspended, archived, or kept live after non-payment.

## MVP Go-To-Market Boundary

The MVP go-to-market for selling PartnerHub is manual / voz a voz / initial promoter team.

This means:

- Business owner acquisition is managed by the internal/promoter team.
- Closing can be manual.
- Payment can still use Wompi where useful, but the domain must not assume mass self-service checkout.
- There is no public PartnerHub marketplace in MVP.
- There is no public affiliate system for selling PartnerHub in MVP.
- En MVP no hay sistema publico de afiliados de PartnerHub.
- Any lead source/promoter tracking is simple operational attribution until a future ticket defines otherwise.

## Campaign Service Model

Campaigns are additional services.

Rules:

- Campaigns are separate from initial landing setup.
- Ad spend and administration must be itemized for the client.
- Campaign budget is visible to the client.
- Campaign management fee is visible to the client.
- Internal costs remain invisible to the business owner.
- Campaign Manager is future epic / ads service.

## PH-003C Boundary

PH-003C must decide:

- How Plan, ServiceModel, Configuration, and Subscription become tables or configuration records.
- How specialized configurations relate to generic Configuration.
- How upgrade events are stored while price remains `OPEN`.
- How campaign add-ons relate to subscriptions and billing.
- How internal costs remain separated from client-visible fees.
- How to represent simple lead source/promoter origin without creating an affiliate or marketplace model.
- How root domain, subdomain, publishing purpose, landing type, reserved root domain, future owner profile site, product landing target, VSL landing target, and routing strategy become schema concepts.

PH-003C must not implement code or migrations until schema planning is reviewed.
