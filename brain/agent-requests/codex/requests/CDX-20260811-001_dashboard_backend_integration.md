# CDX-20260811-001 - Dashboard backend integration audit

## Status

Audited and decomposed. This document is an orchestration decision, not an implementation ticket.

## Owners

- Backend contracts, persistence, metrics and tests: Codex.
- Dashboard React integration, charts and responsive behavior: Antigravity.
- Production approval and interpretation of business metrics: Jairo.

## Product objective

Replace the new Dashboard's static visual examples with truthful PartnerHub operational and financial data. PartnerHub may create its own first-party telemetry, but charts must remain unavailable until the corresponding events are actually collected.

## Audit result

The original handoff cannot be implemented as one ticket because it combines payment persistence, KPI calculations, three APIs, first-party telemetry and frontend integration.

Current data supports:

- Current activation-lead counts.
- Lead creation dates.
- Current lead statuses and site linkage.
- Product-page `GENERATED`, `PUBLISHED`, `VERIFIED` and `VERIFY_FAILED` history.

Current data does not support:

- Historical active-partner or linked-site snapshots.
- Page views or interaction series.
- Channel attribution for social networks or email.
- Confirmed revenue, because amount and payment date are not persisted.

The existing `paymentMethod` on an activation lead describes the selected/intended route (`wompi` or `direct`). It is not evidence that a payment occurred and must not be summed as revenue.

## Approved financial model for the MVP

Payments must be independent ledger records, not one mutable amount on the partner. This preserves historical prices and supports activation payments, monthly fees, renewals, extras and installments.

Minimum payment fields:

- `id`
- `activationLeadId`
- `siteId` snapshot when available
- `category`: `ACTIVATION`, `MONTHLY_FEE`, `ANNUAL_RENEWAL`, `ADD_ON`, `OTHER`
- `amountCop`: positive integer COP amount
- `method`: `WOMPI`, `BANCOLOMBIA`, `NEQUI`, `NU`, `CASH`, `OTHER`
- `paidAt`: actual payment timestamp
- `status`: `CONFIRMED` or `VOIDED`
- optional `reference`
- optional `notes`
- `createdAt`, `updatedAt`

Rules:

- Only `CONFIRMED` records contribute to collected revenue.
- Revenue is grouped by `paidAt`, using the `America/Bogota` reporting timezone.
- A correction voids a record and creates a replacement; financial history is not silently deleted.
- Each installment is a separate payment record.
- `amountCop` is never inferred from the current public offer.
- Historical partners may have different amounts.
- Initial metrics represent cash collected, not accrued accounting revenue.
- Expected monthly revenue, receivables, referral credits, refunds, costs and profitability require later contracts.

## Grounded delivery sequence

### 1. CDX-20260811-002 - Manual payment ledger backend

One outcome: persist and expose confirmed manual payment records per partner.

This is the immediate next backend ticket.

### 2. AGR follow-up - Payment administration UI

Dependency: CDX-20260811-002 complete.

One outcome: allow an operator to register, inspect and void a payment from Partners or Payments. Antigravity owns the UI and must consume the finished API contract.

### 3. CDX follow-up - Dashboard collected-revenue metrics

Dependencies: payment ledger and at least the initial historical payments entered.

One outcome: extend dashboard metrics with a requested period and previous-period comparison:

- collected revenue in period;
- previous-period collected revenue;
- percentage delta or `null` when the comparison has no valid denominator;
- payment count;
- activation vs recurring/other revenue breakdown;
- lead registrations in current and previous periods.

Do not fabricate growth for active partners or linked sites until their transitions are historized.

### 4. CDX follow-up - Recent operational activity API

One outcome: aggregate existing real page history into a bounded recent-activity response. Initial event types are generation, publication, verification and verification failure. Campaign and email rows remain excluded until those modules produce events.

### 5. AGR follow-up - Dashboard real-data binding

Dependencies: revenue metrics and recent-activity contracts complete.

One outcome: remove hard-coded KPIs/activity and connect the date selector, revenue widgets and real activity table. Export must either receive a separate implemented behavior or be removed; it must not refresh metrics while labelled `Exportar`.

### 6. CDX follow-up - First-party interaction telemetry contract

One outcome: define privacy-aware collection for real events such as `PAGE_VIEW`, `WHATSAPP_CLICK`, `STORE_CLICK` and `LEAD_SUBMITTED`, including site, ecosystem, timestamp and attribution fields. This is an architecture/security ticket and does not include dashboard charts.

### 7. CDX follow-up - Interaction aggregates

Dependency: telemetry collection deployed and real data accumulated.

One outcome: provide time series and event/channel distribution. Categories must follow collected data; do not hard-code Web, social networks or email without attributable events.

### 8. AGR follow-up - Interaction charts

Dependency: interaction aggregate contract complete.

One outcome: bind the line, donut and channel-ranking visuals to real aggregates, with loading, empty and unavailable states.

## Dashboard metric language

- Use `Ingresos cobrados` or `Pagos confirmados`, not generic `Revenue`, for the first financial metric.
- `Crecimiento` always names its comparison dates.
- A missing denominator displays `Sin comparación`, never `0%` or an infinite percentage.
- Empty telemetry displays `Aún no hay datos`, never sample values.
- Expected revenue and confirmed collections remain separate.

## Explicitly rejected shortcuts

- Deriving revenue from `status: PAID`.
- Deriving revenue from the currently advertised package price.
- Treating the lead's preferred payment method as confirmation.
- Using `updatedAt` as the date a partner became active.
- Returning mocked interaction/channel series from production APIs.
- Assigning frontend `fetch()` or chart implementation to Codex.

