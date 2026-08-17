# CDX-20260817-001 — Wompi intent status endpoint — DONE

## Request ID

`CDX-20260817-001`

## Summary

Added a read-only server-side endpoint that reports the persisted status of a Wompi Sandbox payment intent and whether the approved webhook payment is present in the confirmed ledger.

The endpoint does not contact Wompi, process webhooks, update leads, mutate intents, or create payments. Repeated reads are idempotent.

## API contract

### Endpoint

`GET /api/public/payments/wompi/status`

The caller must provide `activationLeadId` plus exactly one lookup identifier:

```text
?activationLeadId=<opaque-lead-id>&intentId=<uuid>
```

or:

```text
?activationLeadId=<opaque-lead-id>&reference=<PH-uuid>
```

Requiring the opaque lead identifier together with the opaque intent/reference prevents partial identifier enumeration without introducing a new secret or breaking the already deployed checkout creation contract. Missing and mismatched pairs return the same `404 WOMPI_INTENT_NOT_FOUND` response. Invalid combinations return `400 INVALID_WOMPI_INTENT_QUERY`.

Successful response:

```json
{
  "intentId": "...",
  "reference": "PH-...",
  "status": "PENDING",
  "amountInCents": 18000000,
  "currency": "COP",
  "activationLeadId": "...",
  "paymentRecorded": false
}
```

All responses use `Cache-Control: no-store, max-age=0`. No signature, public/private key, secret, event checksum, transaction ID, notes, or offer metadata is returned.

## Payment reconciliation rule

`paymentRecorded` is true only when the existing ledger contains a record that simultaneously has:

- the same `activationLeadId`;
- the same Wompi intent `reference`;
- method `WOMPI`;
- status `CONFIRMED`.

The endpoint never creates or changes that record. A VOIDED payment or a confirmed payment using another method remains false.

## Compatible states

The safe response preserves persisted `PENDING`, `APPROVED`, `DECLINED`, `ERROR`, and `EXPIRED` states. Existing `VOIDED` compatibility is also retained.

## Files changed

- `app/web/app/api/public/payments/wompi/status/route.ts`
- `app/web/server/services/wompiIntentStatusCore.ts`
- `app/web/server/services/wompiIntentStatusCore.test.ts`
- `app/web/server/services/wompiSandboxService.ts`
- `app/web/package.json`
- `brain/agent-requests/codex/requests/CDX-20260817-001_wompi_intent_status_endpoint.md`
- `brain/agent-requests/codex/reports/CDX-20260817-001_wompi_intent_status_endpoint_DONE.md`

## Verification

- `npm.cmd run test:wompi-status`: PASS, 6/6.
- `npm.cmd run test:wompi-sandbox`: PASS, 7/7 regression tests.
- `npm.cmd run test:manual-payments`: PASS, 7/7 regression tests.
- Ticket-scoped backend ESLint with `--max-warnings=0`: PASS.
- `npm.cmd run build`: PASS; route included in production output.
- `git diff --check`: PASS.

The build retains the existing Turbopack workspace-root/NFT warning for the product-page preview route. It is unrelated and non-blocking.

## Branch and PR

- Branch: `codex/CDX-20260817-001-wompi-intent-status`
- Base: `origin/main` at `8a44ad6`, including merged Wompi backend PR #115 and checkout frontend PR #119.
- PR: not opened per request.

## Follow-up

A separate Antigravity ticket may poll this contract after checkout without modifying the Wompi backend or ledger rules.
