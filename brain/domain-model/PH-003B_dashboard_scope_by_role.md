# PH-003B - Dashboard Scope by Role

## Purpose

Document dashboard boundaries before UI or auth implementation.

## What Exists Now

- `AdminDashboardPrototype` exists and is connected to `/dashboard`.
- This route is a known non-blocking warning from PH-003A / PH-011A context.
- PH-003B does not modify UI or app code.

## What Is Prototype

The current `/dashboard` surface should be understood as:

- Admin/Internal Operations Prototype.
- Not a Tenant Owner dashboard.
- Not a Partner dashboard.
- Not a Lead dashboard.

## What Is MVP Allowed

MVP may allow:

- Platform Admin Dashboard.
- Internal Operations Dashboard.

MVP does not allow:

- Tenant Owner / Empresario dashboard.
- Lead dashboard.
- Free landing editing UI.
- Campaign Manager UI.
- Asset Library UI.

## Platform Admin Dashboard

Purpose:

- Platform-wide operational administration.

MVP allowed:

- Yes.

Can include conceptually:

- Tenant overview.
- Payment/publishing/checklist status.
- PublishingTarget and DomainRecord operational visibility, including reserved root domain and subdomain targets.
- Internal operational alerts.
- Audit visibility.
- Webhook status.
- Meta/social readiness summary.

Not allowed yet:

- Unticketed production feature expansion.
- Schema-dependent workflows before PH-003C.
- UI changes by Codex.

## Internal Operations Dashboard

Purpose:

- Day-to-day PartnerHub operations and manual validation.

MVP allowed:

- Yes.

Can include conceptually:

- Onboarding checklist review.
- Landing field configuration.
- Domain/subdominio setup review for `nombre.pro`, `vsl.nombre.pro`, `shop.nombre.pro`, or `[producto].nombre.pro`.
- Payment confirmation review.
- Manual review tasks.
- Meta Setup readiness.
- Campaign readiness if service is contracted.

Not allowed yet:

- Campaign Manager implementation.
- Asset Library implementation.
- Direct user-facing tenant dashboard.
- Future owner profile site builder for the root domain `nombre.pro`.

## Tenant Owner Dashboard

Purpose:

- Future customer self-service experience.

MVP allowed:

- No.

Future:

- Future / `OPEN`.

Not allowed yet:

- Tenant Owner direct dashboard access.
- Tenant Owner direct landing editing.
- Tenant Owner direct billing management.
- Tenant Owner direct campaign management.

Notes:

- Empresario will not have a dashboard in MVP.
- Admin/Internal Operator configures allowed MVP landing fields.

## Partner Dashboard

Purpose:

- Future partner/distributor/socio operational experience.

MVP allowed:

- `OPEN`, treated as future until role is clarified.

Future:

- Future / `OPEN`.

Not allowed yet:

- Assuming Partner equals Tenant Owner.
- Assuming Partner equals Lead.
- Building partner UI before role clarification.

Notes:

- Partner meaning may vary by commercial network.

## Lead Experience

Purpose:

- Public landing interaction and routing.

MVP allowed:

- Public landing experience only.

Dashboard:

- No.

Account:

- No account in MVP.

Not allowed yet:

- Lead dashboard.
- Lead account management.
- Lead editing or administrative permissions.

## Required Permission Definition Before Real UI

Before real UI implementation:

- Roles must be converted into authorization concepts.
- Dashboard access must be scoped by role.
- Landing field editing must be permissioned.
- Billing and payment views must distinguish client-visible and internal-only cost data.
- AI Agent and External Integration operations must be auditable.

## Summary Table

| Surface | What exists now | Prototype | MVP allowed | Future | Not allowed yet |
| --- | --- | --- | --- | --- | --- |
| Platform Admin Dashboard | `/dashboard` prototype context | Yes | Yes | Expanded operations | Unticketed production expansion |
| Internal Operations Dashboard | `/dashboard` prototype context | Yes | Yes | Expanded workflows | Campaign Manager / Asset Library implementation |
| Tenant Owner Dashboard | None approved | No | No | `OPEN` | Empresario dashboard in MVP |
| Partner Dashboard | None approved | No | `OPEN` | `OPEN` | Building before role clarification |
| Lead Experience | Public landing concept | Not dashboard | Public flow only | `OPEN` | Lead account/dashboard |
