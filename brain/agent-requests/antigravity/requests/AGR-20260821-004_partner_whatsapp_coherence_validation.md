# AGR-20260821-004 — Partner WhatsApp coherence validation

## Owner / dependency

Antigravity. Depends on backend contract CDX-20260821-016.

## Objective

Prevent the onboarding UI from silently submitting a WhatsApp value that
differs from the activation lead's normalized WhatsApp identity. Show a clear
validation error and require an authorized operator flow for an intentional
identity change.

## Allowed areas

- Onboarding form validation and focused frontend tests.
- Matching request/report documentation.

## Excluded areas

- Backend, activation storage, migrations, generated sources, Docker, payments,
  DNS, publishing and production data.

## Contract

- Normalize only for comparison by removing formatting characters.
- If both lead and onboarding values exist and digits differ, block submit.
- Do not infer country codes, repair digits or silently prefer either field.
- Exact regression: `+573188430283` versus `+5673188430283` must block.
- Display phone remains a separate field and cannot resolve WhatsApp conflict.
- Backend public onboarding responds HTTP `409` with stable JSON code
  `PARTNER_WHATSAPP_CONFLICT`; render that as a field-level coherence error, not
  as an expired-link message.
