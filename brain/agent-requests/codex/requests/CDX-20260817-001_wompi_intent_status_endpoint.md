# CDX-20260817-001 — Wompi intent status endpoint

## Owner

Codex — backend and payments.

## Objective

Expose a read-only server-side endpoint for the offer flow to query a persisted Wompi Sandbox intent by `reference` or `intentId` and determine whether its approved webhook payment exists in the confirmed ledger.

## Security contract

- Require `activationLeadId` plus exactly one opaque lookup identifier (`reference` or `intentId`).
- Return a uniform not-found response when either identifier does not match, preventing disclosure through partial matches.
- Disable response caching.
- Return only `intentId`, `reference`, `status`, `amountInCents`, `currency`, `activationLeadId`, and `paymentRecorded`.
- Never expose configuration, secrets, signatures, keys, event checksums, transaction IDs, notes, or offer metadata.
- Never create or update intents, leads, or payments from this endpoint.

## Allowed files

- Wompi backend core/service and focused tests.
- New Wompi intent status API route.
- Backend test script and request/report documentation.

## Excluded files

- React, offer/onboarding visuals, Payments UI, dashboard, metrics, offer catalog, historical payments.

## Dependencies and parallel safety

- Base: `origin/main` after merged PR #115 and PR #119.
- Parallel-safe with work that does not modify Wompi backend services or this route.

## Acceptance

- Supports persisted `PENDING`, `APPROVED`, `DECLINED`, `ERROR`, and `EXPIRED` states (and preserves the existing `VOIDED` state contract).
- `paymentRecorded` is true only for a matching confirmed WOMPI ledger record produced by the webhook.
- Missing, valid pending, approved, and repeated idempotent reads are tested.
- Focused tests, backend ESLint, production build, and `git diff --check` pass.
- Report, commit, and push are produced; no PR is opened.
