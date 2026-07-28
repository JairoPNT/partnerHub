# PH-007D Manual Referral Registry API

Status: Backend MVP implemented; dashboard integration pending

## Endpoints

- `GET /api/internal/referrals` returns assigned codes, referrals, and qualified-month summaries.
- `POST /api/internal/referrals` with `{ "siteId", "code", "displayName" }` assigns an external entrepreneur code to a PartnerHub site.
- `POST /api/internal/referrals` with `{ "referredSiteId", "referrerCode" }` registers a referred entrepreneur.
- `PATCH /api/internal/referrals/:id` with `{ "status": "VALIDATED" | "QUALIFIED" | "REJECTED" | "CANCELLED" }` updates the manual review status.

## Rules

- Codes are normalized to uppercase and cannot be assigned to two sites.
- A referred site can have only one referral record.
- Unknown codes are stored as pending with `codeFound: false` for operator review.
- Only `QUALIFIED` referrals count toward earned months.
- The current summary is `floor(qualifiedReferrals / 2)` and does not apply credits automatically.

## Storage

The MVP stores codes and referral records as private JSON under `PRODUCT_PAGE_REFERRAL_DIR`, defaulting to `/data/generated-sites/.referrals`. This is suitable for manual low-volume operation on the durable EasyPanel volume. Prisma-backed records and a proper credit ledger should replace it before concurrent or automated billing operation.
