# PH-007E Activation lead and referrer capture

Status: Backend MVP implemented; public registration UI handoff pending

## Objective

Capture the entrepreneur's referral code at the initial PartnerHub activation request and preserve it until the operator knows the final `siteId`.

## Public flow

- `POST /api/public/activation-leads` stores the activation request.
- The optional field is `referrerCode`, representing the approved GanoExcel/entrepreneur code supplied by the applicant.
- The code is normalized to uppercase but is not treated as a primary key or as proof of qualification.
- The request returns only `leadId` and `receivedAt`; private lead data is not exposed to the browser.

## Internal flow

- `GET /api/internal/activation-leads` lists captured requests for the operator dashboard.
- `PATCH /api/internal/activation-leads/:id` with `{ "siteId": "jenny-varela" }` links the lead to the generated page and creates a `PENDING` manual referral when a `referrerCode` exists.
- The operator later validates and qualifies the referral from `/partners` using the existing manual referral rules.
- The same endpoint accepts `{ "status": "NEW" | "CONTACTED" | "PAID" | "CONVERTED" | "CANCELLED" }` for manual lead tracking.

## Storage and boundary

- MVP storage is durable JSON under `PRODUCT_PAGE_ACTIVATION_DIR`, defaulting to `/data/generated-sites/.activation`.
- This endpoint does not process payment, issue credits, or qualify referrals automatically.
- Before higher volume or multi-operator use, move activation leads and the referral/credit ledger to Prisma with authentication, audit history, retention, and rate limiting.
