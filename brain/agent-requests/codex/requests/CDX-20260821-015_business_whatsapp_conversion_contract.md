# CDX-20260821-015 — Business WhatsApp conversion contract

## Owner / scope

Codex Backend. Align the Jairo Business DRY_RUN with the approved independent
ecosystem funnels. Allowed: the dedicated maintenance script/tests and this
request/report. Excluded: frontend, templates, production data and operations.

## Contract

| Ecosystem | Conversion/navigation |
| --- | --- |
| PRODUCT | Independent funnel: WhatsApp information plus store purchase CTA. |
| BUSINESS | Independent funnel: all current conversion ends at the partner's validated WhatsApp. |
| PERSONAL_BRAND | Hub linking Product, Business and other owned environments. |

- Product and Business never link directly to one another.
- Business does not consume Product `purchaseUrl` or a registration/store URL.
- Business primary and secondary CTA URLs are derived from the validated
  activation-lead WhatsApp; no hardcoded partner number.
- `cta.directRegisterUrl` must be absent from the pilot profile and remains empty
  in the projection.
- A future capture form requires a separate contract/ticket.
- DRY_RUN-only; no production operations.
