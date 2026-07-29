# PH-008A Thank-you page and resumable onboarding

Status: Backend contract implemented; public UI handoff pending

## Public contract

- `POST /api/public/activation-leads` accepts the minimum registration data and returns:
  - `leadId`
  - `receivedAt`
  - `onboardingPath`
- `mainProduct` is now optional because the product catalog is common to the PartnerHub template.
- The returned onboarding path is a bearer link and must be shown only to the applicant.

## Onboarding contract

- `GET /api/public/onboarding/:token` returns the saved activation data and partial onboarding data.
- `PATCH /api/public/onboarding/:token` merges partial onboarding data so the user can save and continue later.
- The token is stored hashed in durable storage; the raw token is returned only once when the activation request is created.
- The onboarding payload supports country, contact phones, complete purchase URL, hero assets, logo mode/asset, favicon, GA4 measurement ID, image consent, and agreement acceptance.

## UI handoff

Antigravity should:

1. Remove the product/service field from the minimum registration form.
2. On successful registration, navigate to a public thank-you page using the returned `onboardingPath`.
3. Explain that direct transfers require receipt validation through WhatsApp.
4. Offer a button to continue to the onboarding form.
5. Load existing progress with `GET` and save partial data with `PATCH`.

The public flow must not expose internal referral rules or dashboard navigation.
