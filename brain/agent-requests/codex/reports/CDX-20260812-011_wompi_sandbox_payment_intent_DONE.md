# CDX-20260812-011 — Wompi Sandbox Payment Intent and webhook — DONE

## Request ID

`CDX-20260812-011`

## Summary

Implemented the backend-only Wompi Sandbox flow. Payment intents resolve their amount exclusively from the immutable activation lead offer snapshot, generate a unique `PH-<uuid>` reference, convert COP to Wompi cents, and create the Checkout integrity signature server-side with SHA-256.

The Wompi webhook accepts only `transaction.updated` events from the `test` environment. It validates dynamic `signature.properties` in their supplied order, the body checksum, and `X-Event-Checksum` when present. It then requires the transaction reference, amount, and currency to match the persisted intent before applying a status.

Only `APPROVED` transactions create a confirmed `ACTIVATION` payment in the existing ledger with method `WOMPI`. Ledger idempotency uses the Wompi transaction ID. Declined, voided, error, expired, pending, invalid, or duplicate events do not create another confirmed payment. Browser redirects are not used for authorization and this ticket does not change lead status or onboarding.

## API contract for the frontend follow-up

### `POST /api/public/payments/wompi/intent`

Request:

```json
{ "activationLeadId": "...", "offerCode": "PRODUCT_ONLY" }
```

Successful response (`201`, or `200` for the same pending intent):

```json
{
  "intentId": "...",
  "reference": "PH-...",
  "amountInCents": 18000000,
  "currency": "COP",
  "publicKey": "pub_test_...",
  "signature": { "integrity": "..." },
  "idempotent": false
}
```

No private key, integrity secret, or events secret is returned.

### `POST /api/webhooks/wompi`

Public HTTPS event endpoint to configure in Wompi Sandbox after deployment. It accepts authenticated Wompi `transaction.updated` payloads and returns the accepted status and duplicate indication. It must not be called from the browser checkout redirect.

## Durable records

- Intents: `${PRODUCT_PAGE_PAYMENT_DIR}/wompi-sandbox-intents.json`.
- Existing ledger remains `${PRODUCT_PAGE_PAYMENT_DIR}/payments.json`.
- Persisted intent fields include reference, lead ID, offer code, snapshot-derived amount, currency, state, transaction ID, timestamps, and processed event checksums.
- Existing historical payments are never rewritten by intent creation or non-approved events.

## Environment

Only these EasyPanel Sandbox variables are consumed:

- `WOMPI_ENV=sandbox`
- `WOMPI_SANDBOX_PUBLIC_KEY`
- `WOMPI_SANDBOX_PRIVATE_KEY`
- `WOMPI_SANDBOX_INTEGRITY_SECRET`
- `WOMPI_SANDBOX_EVENTS_SECRET`

Configuration fails closed when any value is absent. Public/private key prefixes must be Sandbox (`pub_test_` / `prv_test_`), and `prod_` integrity/events secrets are rejected. Errors never include credential values.

## Files changed

- `app/web/server/services/wompiSandboxCore.ts`
- `app/web/server/services/wompiSandboxCore.test.ts`
- `app/web/server/services/wompiSandboxService.ts`
- `app/web/app/api/public/payments/wompi/intent/route.ts`
- `app/web/app/api/webhooks/wompi/route.ts`
- `app/web/.env.example`
- `app/web/package.json`
- `brain/agent-requests/codex/reports/CDX-20260812-011_wompi_sandbox_payment_intent_DONE.md`

## Verification

- `npm.cmd run test:wompi-sandbox`: PASS, 7/7.
- `npm.cmd run test:manual-payments`: PASS, 7/7 regression tests.
- Ticket-scoped backend ESLint with `--max-warnings=0`: PASS.
- `npm.cmd run build`: PASS.
- `git diff --check`: PASS.

The build retains the pre-existing Turbopack workspace-root/NFT warning for the product-page preview route. It is outside this ticket and does not fail the build.

## Branch and PR

- Branch: `codex/CDX-20260812-011-wompi-sandbox-payment-intent`
- Base: `origin/main` at `c53b3dc`, including merged PR #113.
- PR: not opened; Codex audit is required first.

## Risks and deployment notes

- Configure the production-facing HTTPS URL `/api/webhooks/wompi` as the Sandbox events URL only after merge and deployment.
- Persistence follows the existing file-ledger architecture and therefore requires the same durable volume mounted for `PRODUCT_PAGE_PAYMENT_DIR`.
- This implementation is intentionally Sandbox-only. Enabling production credentials requires a separate reviewed ticket.

## Follow-up

After audit, merge, and deploy: `AGR-20260812-011` may consume the intent contract and integrate Wompi Sandbox Checkout. No React work is included here.
