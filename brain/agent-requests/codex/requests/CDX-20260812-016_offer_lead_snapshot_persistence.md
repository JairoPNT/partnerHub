# CDX-20260812-016 — Persist offer contract on public activation leads

## Owner

Codex — backend and API contract.

## Objective

Ensure every new public activation lead created from the offer page persists the selected `offerCode` and an immutable `offerSnapshot` before any Wompi intent is created.

## Scope

- Extend the activation-lead input and persisted record schemas with a validated offer code and snapshot.
- Resolve the selected offer from the catalog server-side; never trust a client-supplied amount.
- Persist ecosystem type, offer code, amount COP, currency, and catalog/version metadata in the snapshot.
- Preserve compatibility with historical leads that have no snapshot.
- Expose the fields through `/api/public/activation-leads` and `/api/internal/activation-leads`.
- Add tests for valid offers, unknown offers, amount tampering, and legacy records.

## Exclusions

- No Wompi provider calls or webhook changes.
- No frontend changes.
- No manual mutation of existing partners.
- No price changes.

## Acceptance

1. A new offer registration stores `offerCode` and `offerSnapshot`.
2. The amount is derived server-side from the catalog.
3. Wompi intent creation can consume the persisted snapshot.
4. Existing historical leads continue to load safely.
5. Tests, backend lint, build, and diff check pass.
