# CDX-20260824-001 — Partner WhatsApp read-only inventory

Owner: Codex Backend.

## Objective

Provide one exact EasyPanel command that reads the current activation-lead store
and emits, only to stdout, a privacy-minimized WhatsApp coherence inventory for
every existing linked partner after CDX-017.

## Boundaries

- Allowed files: this request and its matching Codex report only.
- Production access: operator-executed read-only command after review.
- Excluded: source code, runtime packaging, file writes, snapshots, manifests,
  corrections, APPLY, Business, UI, DNS, Hostinger and publishing.
- Dependency: CDX-017 merged through PR #157.
- Parallel-safe with: tickets that do not alter `leads.json` while the inventory
  is being captured.
- Integration: any finding becomes a separate per-partner DRY_RUN ticket; this
  ticket grants no correction authority.

## Output contract

One row per record whose `siteId` is a non-empty string. Rows expose only:

- `activationLeadId`
- `siteId`
- `leadWhatsapp`
- `onboardingWhatsapp`
- `onboardingPhone`
- `classification`: `COHERENT`, `CONFLICT`, or `MISSING`

No names, emails, domains, tokens, offer/payment fields, timestamps or other
onboarding data may be emitted.
