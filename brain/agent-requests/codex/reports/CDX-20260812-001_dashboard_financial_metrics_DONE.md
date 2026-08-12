# CDX-20260812-001 — Dashboard financial metrics — DONE

## Request ID

`CDX-20260812-001`

## Summary

Extended `GET /api/internal/dashboard/metrics` with real financial metrics sourced only from confirmed records in the manual Payments ledger. The endpoint accepts optional `from` and `to` local calendar dates and uses `America/Bogota`. Its default period is the current Bogotá calendar month through today; the comparison period is the immediately preceding range with the same number of days.

The response preserves existing operational lead metrics and adds `financial` with:

- current and previous confirmed revenue in COP;
- percentage change, or `null` when the previous value is zero;
- current and previous confirmed payment count;
- current and previous partner registration count;
- category breakdown with amount and count for both periods;
- explicit timezone, currency, current period, and previous period.

Voided payments are excluded. No prices are inferred, no `paymentMethod` aggregation is produced, and no simulated data is created.

## Files changed

- `app/web/app/api/internal/dashboard/metrics/route.ts`
- `app/web/server/services/dashboardMetricsService.ts`
- `app/web/server/services/dashboardFinancialMetricsCore.ts`
- `app/web/server/services/dashboardFinancialMetricsCore.test.ts`
- `app/web/package.json`
- `brain/agent-requests/codex/reports/CDX-20260812-001_dashboard_financial_metrics_DONE.md`

## Verification

- `npm.cmd run test:dashboard-metrics`: PASS, 3/3.
- Scoped ESLint for all ticket files with `--max-warnings=0`: PASS.
- `npm.cmd run build`: PASS.
- `git diff --check`: PASS.
- Global `npm.cmd run lint`: BLOCKED by four pre-existing `no-explicit-any` errors and unrelated warnings in frontend files, principally `app/web/components/partners-referrals-view.tsx`. Those files are excluded from this backend ticket.

The build retains an existing Turbopack warning about workspace-root inference and dynamic filesystem tracing in the product-page preview route; it does not fail the build and was not introduced by this ticket.

## Branch and integration

- Branch: `codex/CDX-20260812-001-dashboard-financial-metrics`
- Base: `origin/main` at `3ab548e` (includes merged PR #110).
- PR: intentionally not opened per request.

## Risks

- Financial metrics remain file-ledger based and inherit the ledger storage availability characteristics.
- The consumer must treat `changePercent: null` as unavailable comparison, not zero growth.
- Global lint needs a separate frontend-owned cleanup ticket.

## Follow-up

After this branch is merged, `AGR-20260812-002` can bind the dashboard UI to the documented `financial` response. No backend follow-up is required for this scope.
