# PH-008 Onboarding and entrepreneur operations

Status: Planned for next work session

## Objective

Separate the public acquisition/payment flow from the internal operational dashboard. Allow an entrepreneur to begin onboarding after payment without requiring all production data at once, while giving the operator a reliable view of account and service status.

## Approved flow

1. The entrepreneur completes the minimum registration form:
   - full name
   - WhatsApp
   - email
   - brand or commercial name
   - optional referring entrepreneur code
   - payment method
   - acceptance of commercial conditions
2. PartnerHub creates an activation lead and provides payment instructions.
3. The user reaches a public thank-you page with a continuation link to the detailed onboarding form.
4. Wompi payments must be confirmed through the official transaction confirmation flow before the account is treated as paid.
5. Direct transfers remain pending until the operator receives and verifies the receipt through WhatsApp.
6. The detailed onboarding form is resumable and may be incomplete. The operator can complete or correct it from the internal dashboard.
7. The detailed data is linked to the activation lead and later to the generated `siteId`.

## Detailed onboarding data

- country of operation
- WhatsApp and visible phone
- complete purchase URL
- hero desktop and mobile assets
- logo image or template typography selection
- favicon image or generated initial
- brand identity assets
- analytics measurement ID, when supplied
- image-use consent and onboarding agreement acceptance
- internal notes and missing-information checklist

## Operator dashboard

The next dashboard module must list entrepreneurs and support:

- search and filters by status, country, plan, and due date
- detail view for each entrepreneur
- manual editing and completion of onboarding data
- payment and receipt status
- onboarding completeness
- generated/published page status
- support start date and next due date
- referral code and referral relationship
- internal notes and change history

## Status color system

- Green: `ACTIVE` - published and support current.
- Yellow: `NEW` or `PENDING_INFORMATION` - registration received or data incomplete.
- Blue: `PAYMENT_CONFIRMED` or `IN_PREPARATION` - payment confirmed and work queued.
- Orange: `DUE_SOON` - support due within seven days.
- Red: `EXPIRED` or `SUSPENDED` - payment overdue or service suspended.
- Gray: `CANCELLED` or `ARCHIVED` - no longer active.

The color is a visual aid only; the underlying status and transition date remain authoritative.

## Implementation order

1. Create the public thank-you route and resumable onboarding-link contract.
2. Extend activation lead storage with payment, onboarding, and `siteId` linkage states.
3. Add operator list/detail/update endpoints.
4. Build the internal entrepreneur list and detail view.
5. Add payment confirmation and support-date transitions as manual operations first.
6. Add Wompi webhook verification only after the payment contract and credentials are defined.

## Explicit boundaries

- No automatic referral credit or support discount is issued by this ticket.
- No customer-facing dashboard is created.
- Partial onboarding must be allowed.
- Payment confirmation must never rely only on a browser redirect or a query-string flag.
- The administrative host still requires authentication hardening before it is treated as private.
