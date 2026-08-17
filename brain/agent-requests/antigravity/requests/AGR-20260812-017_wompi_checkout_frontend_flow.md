# AGR-20260812-017 — Wompi checkout frontend flow

## Owner

Antigravity — offer-page & checkout UI flow.

## Dependency

Depends on CDX-20260812-011 (Wompi Sandbox backend) and CDX-20260812-016 / AGR-20260812-016 (Offer selection contract & UI).

## Objective

Connect the frontend activation form with the Wompi Sandbox intent API (`POST /api/public/payments/wompi/intent`) so users selecting `wompi` as their payment method can initiate and complete the payment process via Wompi Checkout without being prematurely redirected to the onboarding.

## Scope

- Upon activation lead creation (`POST /api/public/activation-leads`), if `paymentMethod === "wompi"`, immediately call `POST /api/public/payments/wompi/intent` with `activationLeadId` and `offerCode`.
- Present the Wompi Sandbox Checkout UI using intent data (`intentId`, `reference`, `amountInCents`, `currency`, `publicKey`, `signature.integrity`).
- Render Wompi Checkout widget / direct link and show status indicators (loading, pending, approved, declined/error).
- Provide a clear action ("Continuar al Onboarding") once the payment intent is initialized/pending/completed.
- Preserve existing direct payment flow (`paymentMethod === "direct"`).

## Exclusions

- Do not calculate amounts or use private keys in the browser.
- Do not modify backend APIs, onboarding logic, Payments management view, or dashboard.

## Acceptance

1. `wompi` payment method triggers intent creation upon lead registration.
2. Wompi Sandbox widget / checkout link opens using server-generated signature and reference.
3. User is not redirected to onboarding prior to payment intent initialization.
4. `direct` payment method retains original flow.
5. Build, lint, and diff check pass cleanly.
