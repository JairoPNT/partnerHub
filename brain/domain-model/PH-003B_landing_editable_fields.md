# PH-003B - Landing Editable Fields

## Purpose

Document which landing fields can be configured in MVP and who can configure them.

## MVP Decision

Allowed MVP custom fields from PH-003A:

- WhatsApp.
- Product purchase link.
- Business owner photo.
- VSL video URL / test video.

The business owner / empresario does not edit directly in MVP because there is no Tenant Owner dashboard in MVP.

Admin/Internal Operator can configure allowed fields through approved internal workflows.

## Publishing Target Rules

- The entrepreneur ecosystem may use a root domain like `nombre.pro`.
- The root domain `nombre.pro` is reserved for a future owner profile site, such as personal brand, commercial resume, professional profile, institutional page, or broader owned ecosystem.
- MVP operational landings should preferably publish on subdominios.
- VSL should preferably use `vsl.nombre.pro`.
- Product/shop should preferably use `shop.nombre.pro` or `[producto].nombre.pro`.
- `shop.nombre.pro` is generic when there is more than one product or when avoiding product-specific coupling.
- `[producto].nombre.pro` can be useful for a specific campaign or primary product.
- Root domain must not be assumed as product landing default.
- Root domain must not be assumed as VSL default.

## Field Matrix

| Field | Applies to Product Sales | Applies to VSL | Applies to Combo | Editable by Admin | Editable by Owner in MVP | Requires manual validation | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| WhatsApp | Yes | Yes | Yes | Yes | No | Yes | Must be valid before publishing |
| Product purchase link | Yes | No | Yes | Yes | No | Yes | Required for `PRODUCT_SALES`; must be valid |
| Business owner photo | No | Yes | Yes | Yes | No | Yes | Required for VSL; quality/appropriateness review may apply |
| VSL video URL / test video | No | Yes | Yes | Yes | No | Yes | Hosting/source remains `OPEN` |

## Template and Copy Rules

- Base copy is generated from approved templates.
- Manual copy approval is not required when only approved templates and allowed custom fields are used.
- Free-form landing editing is not allowed before permissions are defined.
- Copy outside approved templates triggers manual review.
- Sensitive claims require manual validation.
- Health, income, guaranteed result, or regulated claims must not be published without review.

## Brand, Product, Image, and Claim Rules

- PartnerHub base logic must stay generic.
- Gano Excel may be configured as first implementation / seed demo only.
- Gano Excel brand, products, images, and claims must come from approved KnowledgeBase/ImageBank sources.
- No Gano Excel-specific claim should become base platform logic.
- The approved knowledge source must define what claims can be used.

## Editing Ownership

Admin/Internal Operator:

- Can configure MVP fields.
- Can validate field values.
- Can block publication if required fields are incomplete.
- Can escalate sensitive claims to manual review.

Tenant Owner / Business Owner / Empresario:

- Provides source inputs.
- Receives requests for missing or invalid inputs.
- Does not edit landing directly in MVP.

AI Agent:

- May draft or suggest content from approved templates and knowledge.
- Must not publish sensitive claims without manual review.
- Must operate under auditable permissions.

External Integration:

- Does not edit landing fields.
- May provide status or webhook signals where authorized.

## Publication Rules

- Landing publication requires complete critical checklist.
- `PRODUCT_SALES` publication requires valid product purchase link, product/kit, current price, availability, WhatsApp, country, template, and payment confirmation.
- `VSL_RECRUITMENT` publication requires owner photo, VSL video or proof, WhatsApp, country, template, and payment confirmation.
- `FULL_COMBO` requires both sets of validators.
- Publication should resolve a PublishingTarget and DomainRecord consistent with the reserved root domain and subdomain strategy.
- Meta Setup does not block landing unless social launch or ads are contracted.

## PH-003C Boundary

PH-003C must decide:

- Whether landing fields are stored as generic key/value fields, typed fields, or model-specific configuration tables.
- How manual validation status is stored.
- How template assignment relates to field values.
- How claim review and approval history are audited.
- How owner-provided inputs are distinguished from admin-configured values.
- How root domain, subdomain, publishing purpose, landing type, and routing strategy are stored for landing publication.
