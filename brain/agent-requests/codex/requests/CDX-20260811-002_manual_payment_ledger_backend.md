# CDX-20260811-002 - Manual payment ledger backend

## Owner

Codex (Backend Lead).

## Single outcome

Provide a durable internal API for operators to register, list and void real manual payments associated with an activation lead.

## Dependencies

- `CDX-20260811-001` audit complete.
- No frontend dependency.

## Scope

- Define and validate the payment-record contract established by CDX-20260811-001.
- Persist payment records independently from activation leads.
- Create internal endpoints to list and create payments and to void a specific payment.
- Allow filtering by activation lead and bounded payment-date range.
- Return totals derived only from confirmed records in the filtered result.
- Add focused backend tests for validation, totals, voiding and persistence.

## Required behavior

1. `amountCop` accepts positive whole COP values only.
2. `paidAt` is required and must be a valid ISO timestamp.
3. The referenced activation lead must exist.
4. A supplied `siteId` is derived from or checked against the lead; clients cannot attach a payment to another partner.
5. A newly created record is `CONFIRMED`.
6. Voiding records `voidedAt` and an operator-provided reason; it does not delete the record.
7. Repeated void requests are idempotent or return a stable conflict without modifying totals twice.
8. Only confirmed records contribute to totals.
9. Existing activation-lead `paymentMethod` behavior remains unchanged.
10. No Wompi API or webhook integration is added.

## Proposed internal API

- `GET /api/internal/payments?activationLeadId=&from=&to=&status=`
- `POST /api/internal/payments`
- `POST /api/internal/payments/{id}/void`

The implementation may refine response envelopes during the ticket, but must document the final exact schema before frontend handoff.

## Allowed files/modules

- New payment schema/service under `app/web/server/services/`.
- New routes under `app/web/app/api/internal/payments/`.
- Focused payment backend tests and package test script.
- Matching Codex completion report.

## Excluded files/modules

- `app/web/components/**`
- Dashboard UI and metrics.
- Partners UI and Payments UI.
- Wompi integrations and public checkout.
- Prisma migrations or `prisma db push`.
- Revenue projections, expected monthly fees, costs, refunds, referral credits and profitability.
- Interaction telemetry.
- Existing unrelated files or broad cleanup.

## Storage constraint

The active operational activation-lead flow still uses durable JSON files under `/data`. This ticket must not silently switch only payments to an unverified Prisma production path. Use a separate atomic payment ledger in the existing durable data boundary, and document migration requirements for the later PostgreSQL transition.

## Parallel safety

- Safe beside frontend work that does not edit payment APIs or backend services.
- Not safe beside another task creating `/api/internal/payments` or modifying the selected payment storage file.

## Acceptance criteria

1. Two partners can have different activation amounts without reference to current offer pricing.
2. One partner can have multiple payments and installments.
3. Listing by partner and period returns only matching records.
4. Confirmed totals exclude voided records.
5. Payment method, date, category, amount and audit timestamps survive service restart.
6. Invalid amounts, dates, categories, methods and unknown leads are rejected.
7. No frontend or dashboard file appears in the diff.

## Verification

- Focused service and route-contract tests.
- `npm run build` from `app/web`.
- `git diff --check`.
- Document sample request and response without real personal or financial data.

## Report and branch

- Report: `brain/agent-requests/codex/reports/CDX-20260811-002_manual_payment_ledger_backend_DONE.md`.
- Suggested branch: `codex/CDX-20260811-002-manual-payment-ledger-backend`.
- PR target: `main`.

