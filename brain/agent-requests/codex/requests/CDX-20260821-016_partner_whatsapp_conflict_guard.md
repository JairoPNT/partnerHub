# CDX-20260821-016 — Partner WhatsApp conflict guard

## Owner / scope

Codex Backend. Fail closed in the Jairo Business preview and future onboarding
writes when the normalized activation-lead WhatsApp and onboarding WhatsApp
disagree. Allowed: shared identity contract, activation service, dedicated
Business maintenance script/tests, Docker runtime transport and documentation.
Excluded: production data, UI implementation and all production operations.

## Policy

- `lead.whatsapp` and `onboardingData.whatsapp` are two representations of the
  same WhatsApp identity. If both exist, their digits must be identical.
- Neither field silently outranks a conflicting field.
- `onboardingData.phone` is a call/display phone and is not WhatsApp authority.
- A conflict blocks with `PARTNER_WHATSAPP_CONFLICT` and emits no projection.
- A single present WhatsApp, or two equivalent normalized values, remains valid.
- Internal creation, public onboarding updates and operator activation updates
  apply the same guard before persistence.
- Existing-partner inventory and any persisted correction require separate
  read-only/DRY_RUN and APPLY tickets.
- Public onboarding maps the conflict to HTTP 409 with stable code
  `PARTNER_WHATSAPP_CONFLICT`; invalid tokens remain 404.
- Focused persistence tests must prove createInternal, updateOnboarding and
  updateStatus reject before changing the storage file.

## Dependency / safety

Based on main after PR #155. No entitlement JWT, snapshots, manifest, Business
DRY_RUN, APPLY, DNS, publishing or real-data mutation.

## Confirmed Jairo correction target

- National number: `3188430283` (Colombia).
- Authorized E.164: `+573188430283`.
- Authorized wa.me digits: `573188430283`.
- Rejected value: `+5673188430283`.
