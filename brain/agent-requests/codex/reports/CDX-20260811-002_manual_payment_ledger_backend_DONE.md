# CDX-20260811-002 - Completion report

- Request ID: `CDX-20260811-002`
- Owner: Codex (Backend Lead)
- Branch: `codex/CDX-20260811-002-manual-payment-ledger`
- Commit: final commit hash is reported in the handoff after this report is committed.

## Result and final API contract

The manual payment ledger is persisted independently at `PRODUCT_PAGE_PAYMENT_DIR` (default `/data/generated-sites/.payments/payments.json`) using the existing atomic temporary-file + rename pattern.

Routes:

- `GET /api/internal/payments?activationLeadId=&siteId=&from=YYYY-MM-DD&to=YYYY-MM-DD&status=` returns `{ payments, totalAmountCop, totalsByLocalDate }`.
- `POST /api/internal/payments` accepts `{ activationLeadId, siteId?, category, amountCop, method, paidAt, reference?, notes?, idempotencyKey? }` and returns `{ payment, idempotent }`.
- `GET /api/internal/payments/{id}` returns `{ payment }` or 404.
- `POST /api/internal/payments/{id}/void` accepts `{ reason }` and returns `{ payment, idempotent }` or 404.

Persisted records contain the requested fields: `id`, `activationLeadId`, `siteId` snapshot, `category`, positive integer `amountCop`, `method`, normalized ISO `paidAt`, `status`, optional `reference`/`notes`, `createdAt`, and `updatedAt`. Void records additionally retain `voidedAt` and `voidReason`.

Only `CONFIRMED` records contribute to totals. Date filtering and `totalsByLocalDate` use `America/Bogota`. A supplied `siteId` must match the referenced activation lead; the snapshot is taken from the lead. Unknown leads and malformed input are rejected. Repeated creation with the same `activationLeadId` + `idempotencyKey` returns the original record without a second write. Voiding changes status and preserves history; repeated voiding returns the existing voided record without changing its audit timestamps.

Example request (synthetic data only):

```json
{
  "activationLeadId": "lead-example-001",
  "category": "ACTIVATION",
  "amountCop": 125000,
  "method": "BANCOLOMBIA",
  "paidAt": "2026-08-11T02:30:00.000Z",
  "reference": "REC-EXAMPLE-001"
}
```

## Files modified

- `app/web/server/services/manualPaymentLedgerCore.ts`
- `app/web/server/services/manualPaymentLedgerService.ts`
- `app/web/server/services/manualPaymentLedgerCore.test.ts`
- `app/web/app/api/internal/payments/route.ts`
- `app/web/app/api/internal/payments/[id]/route.ts`
- `app/web/app/api/internal/payments/[id]/void/route.ts`
- `app/web/package.json`
- `brain/agent-requests/codex/reports/CDX-20260811-002_manual_payment_ledger_backend_DONE.md`

No frontend, dashboard, metrics, template, Wompi, activation-lead, or production-data file was modified.

## Verification

- `npm.cmd run test:manual-payments`: PASS, 7/7.
- Focused ESLint on ledger core, service, tests, and all payment routes: PASS with `--max-warnings=0`.
- `npm.cmd run build` from `app/web`: PASS; all three payment routes appear in the build route manifest and TypeScript passed.
- `git diff --check`: PASS.
- Tests use isolated temporary directories and synthetic records; no production data or `/data` path was read or written.

Covered creation/validation, positive whole-COP amounts, ISO dates, persistence shape, lead/date filtering, Bogota-local grouping, confirmed-only totals, query bounds, idempotent repeated creation, voiding, and history retention. The service enforces lead existence and site snapshot consistency; the build verifies route contracts compile.

## Risks and dependencies

- This is a durable JSON ledger consistent with the current operational storage boundary. A later PostgreSQL migration will need an explicit data migration and concurrency strategy.
- Idempotency is opt-in through `idempotencyKey`; requests without one create separate legitimate installments/payments.
- File persistence is atomic per write but not a cross-process transaction; concurrent operator writes should be addressed during the PostgreSQL transition.
- Totals intentionally exclude `VOIDED` records and do not infer any amount from current offers or activation-lead `paymentMethod`.
- No dashboard revenue metric was added; a later dashboard ticket can consume the documented response envelope.
- Next build emits existing workspace-root/NFT tracing warnings from `next.config.mjs`; compilation and type checking pass.
