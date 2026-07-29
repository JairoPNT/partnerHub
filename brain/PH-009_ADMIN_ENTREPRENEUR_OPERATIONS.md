# PH-009: Operacion administrativa de empresarios

## Scope

Modulo exclusivamente interno de `app.partnerhub.club`. No crea login, dashboard ni acceso para empresarios finales.

## Existing API contract

- `GET /api/internal/activation-leads` devuelve `{ leads }`.
- `PATCH /api/internal/activation-leads/:id` acepta:
  - `{ "status": "NEW" | "CONTACTED" | "PAID" | "CONVERTED" | "CANCELLED" }`
  - `{ "siteId": "slug-del-sitio" }` para vincular el empresario con su pagina.
- El registro incluye datos de contacto, marca, metodo de pago, estado, fechas, `siteId` y `onboardingData`.

## Internal status presentation

The UI must distinguish operational state from payment state where possible. For the current MVP, use these labels:

| Estado | Color | Meaning |
| --- | --- | --- |
| NEW | Amarillo | Solicitud nueva pendiente de contacto |
| CONTACTED | Azul | Contacto iniciado o onboarding en curso |
| PAID | Verde claro | Pago confirmado, pendiente de publicacion |
| CONVERTED | Verde | Pagina activa y servicio operativo |
| CANCELLED | Rojo | Solicitud cancelada o no continuada |

Future expiry indicators should be derived from a subscription date, not inferred from the lead status.

## Required view

- Summary counters by status.
- Search by name, brand, email, siteId or referrer code.
- Filter by status and payment method.
- Table with status badge, entrepreneur, brand, contact, payment method, siteId, created date and last update.
- Detail drawer or page for one entrepreneur showing all onboarding data and missing fields.
- Action to update status.
- Action to link or correct `siteId`.
- Clear empty, loading, error and success states.
- Never expose this view from the public offer host.

## Acceptance criteria

1. An operator can locate a lead and see its complete onboarding progress.
2. An operator can update status and link a site without editing JSON manually.
3. Color labels are consistent and accessible; color is not the only status signal.
4. No final user account or public dashboard is introduced.
