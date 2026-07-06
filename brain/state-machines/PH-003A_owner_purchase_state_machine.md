# PH-003A - Owner Purchase State Machine

## States

```text
lead_detected
lead_qualified
route_selected
offer_presented
manual_close_required
payment_link_generated
payment_pending
payment_confirmed
onboarding_checklist_started
requirements_validation
requirements_complete
workspace_created
landing_generated
landing_published
owner_notified
monthly_billing_scheduled
active
```

## Main flow

```text
lead_detected
-->
lead_qualified
-->
route_selected
-->
offer_presented
-->
payment_link_generated
-->
payment_pending
-->
payment_confirmed
-->
onboarding_checklist_started
-->
requirements_validation
-->
requirements_complete
-->
workspace_created
-->
landing_generated
-->
landing_published
-->
owner_notified
-->
monthly_billing_scheduled
-->
active
```

## Manual close branch

```text
offer_presented
-->
manual_close_required
-->
payment_link_generated
```

## Blocks

```text
payment_failed
requirements_incomplete
invalid_whatsapp
invalid_product_link
missing_vsl_video
missing_owner_photo
domain_unavailable
manual_review_required
cancelled
```

## Rules

- `landing_published` cannot happen before `requirements_complete`.
- `active` cannot happen before `payment_confirmed`.
- `monthly_billing_scheduled` happens after `owner_notified` or during activation, depending on implementation.
- Meta Setup does not block `landing_published` unless social launch or ads are contracted.
- `requirements_complete` requires all critical validators for the selected model.
- `PRODUCT_SALES` must validate product link, product/kit, current price, and availability.
- `VSL_RECRUITMENT` must validate owner photo and VSL video or proof.
- `FULL_COMBO` inherits validators from both `PRODUCT_SALES` and `VSL_RECRUITMENT`.
