# PH-003B - Roles and Permissions

## Purpose

Define conceptual role boundaries before database planning. This file does not implement authorization.

## Role: Platform Admin

Definition:

Global PartnerHub operator with platform-wide administrative responsibility.

What they can do:

- View and manage platform-level operational state.
- Access internal/admin dashboard.
- Manage tenant records conceptually.
- Configure service models for tenants through approved workflows.
- Review audit, payment, webhook, publishing, Meta/social, and campaign readiness records when implemented.

What they cannot do:

- Bypass tenant isolation.
- Publish sensitive claims without validation.
- Create features or schema outside approved tickets.
- Treat Gano Excel as base platform logic.

MVP dashboard access:

- Yes, admin/internal dashboard is allowed.

Future dashboard access:

- Yes, expanded platform operations dashboard.

Notes / open questions:

- Exact permission granularity remains for PH-003C / auth planning.

## Role: Tenant Owner / Business Owner / Empresario

Definition:

The customer who buys PartnerHub for a commercial operation. May be called Business Owner or Empresario in the first implementation.

What they can do:

- Provide required onboarding data.
- Pay setup and monthly fees.
- Provide WhatsApp, product purchase link, owner photo, VSL video/proof, and domain preferences.
- Receive published landing URL and operational communication.
- Contract additional campaign services.
- Enter through manual / voz a voz / initial promoter team acquisition.

What they cannot do:

- Access a dashboard in MVP.
- Edit landing fields directly in MVP.
- Manage billing directly in MVP unless later approved.
- Publish unrestricted copy or sensitive claims without manual review.
- Manage campaign execution directly in MVP.

MVP dashboard access:

- No.

Future dashboard access:

- Future / `OPEN`.

Notes / open questions:

- Whether Tenant Owner and Business Owner are always the same person is `OPEN`.
- Whether one Tenant can have multiple BusinessOwners is `OPEN`.

## Role: Partner / Distributor / Socio

Definition:

A commercial actor inside a tenant network. The exact meaning may differ by tenant: distributor, affiliate, socio, team member, or another role.

This role must not be confused with a public commercial affiliate of PartnerHub. PartnerHub does not have a public affiliate system in MVP.

What they can do:

- `OPEN` until partner role semantics are clarified.
- May participate in commercial hierarchy, referrals, lead handling, or enablement in future tickets.

What they cannot do:

- Assume tenant ownership by default.
- Access dashboard in MVP unless explicitly clarified.
- Edit landing fields in MVP unless explicitly approved.
- Manage billing or campaigns by default.

MVP dashboard access:

- `OPEN`; currently treated as future until role is clarified.

Future dashboard access:

- Future / `OPEN`.

Notes / open questions:

- Partner Dashboard remains `OPEN` until clarifying whether partner equals distributor, socio, empresario, or tenant-specific actor.
- Whether a Partner can belong to multiple tenants is `OPEN`.
- Superseded by PH-003C: PartnerHub does not manage Lead conversion; it routes visitors externally.
- Whether PartnerHub ever needs a separate promoter/affiliate role is future scope and not part of MVP.

## Role: External Visitor - Superseded Lead Concept

Definition:

An interested external visitor who may consume a public PersonalizedChannel and be routed to an external LeadDestination controlled by the entrepreneur.

What they can do:

- Interact with public landing flows.
- Click or choose an external destination.
- Be routed to WhatsApp, external checkout, external form, booking link, social DM, phone, or another approved external channel.
- Generate terminal routing traceability through BusinessEvent where applicable.

What they cannot do:

- Access a dashboard in MVP.
- Have a PartnerHub account in MVP.
- Edit landing fields.
- Manage billing, publishing, or campaigns.

MVP dashboard access:

- No.

Future dashboard access:

- None planned. Any future account-based visitor experience would require a new architecture decision and must not become CRM lead management.

Notes / open questions:

- Lead conversion rules remain `OPEN`.
- Lead does not imply a mass acquisition engine, public PartnerHub marketplace, self-service checkout, or public affiliate system in MVP.

## Role: Internal Operator

Definition:

PartnerHub internal operations user responsible for configuring, validating, and supporting tenant deliverables.

What they can do:

- Use internal/admin dashboard.
- Configure tenant service model data.
- Validate onboarding requirements.
- Configure MVP landing fields.
- Review payment, publishing, Meta/social, and campaign readiness.
- Trigger manual review when required.
- Manage manual / voz a voz / promoter-led acquisition records operationally.

What they cannot do:

- Bypass payment confirmation for paid activation without manual process rules.
- Publish sensitive claims without review.
- Evade Meta restrictions or publish without permissions.
- Change app code, schema, or product rules outside tickets.

MVP dashboard access:

- Yes.

Future dashboard access:

- Yes.

Notes / open questions:

- Exact separation between Platform Admin and Internal Operator permissions remains for auth planning.
- Initial promoter team tracking may be manual or simple operational tracking; exact scope remains `OPEN`.

## Role: AI Agent

Definition:

Non-human automation actor operating under controlled permissions and auditable workflows.

What they can do:

- Generate drafts, checklists, alerts, summaries, and operational support artifacts when authorized.
- Support internal workflows.
- Prepare generated content from approved templates and knowledge.

What they cannot do:

- Act as a human user.
- Own a tenant.
- Publish sensitive claims without manual review.
- Publish externally without valid permissions and approval rules.
- Bypass tenant isolation, consent, audit, or cost tracking.

MVP dashboard access:

- No human dashboard. It may support internal workflows under controlled permissions.

Future dashboard access:

- No direct dashboard; AI operation visibility should be shown in admin/internal views.

Notes / open questions:

- Exact permissions for generation/publication remain `OPEN`.

## Role: External Integration

Definition:

Non-human external system such as Wompi, Meta, n8n, hosting provider, domain provider, or future AI APIs.

What they can do:

- Send webhooks/events.
- Receive publishing artifacts or orchestration tasks when authorized.
- Provide external status, payment, publishing, or platform signals.

What they cannot do:

- Act as a human user.
- Own business decisions.
- Bypass validation, consent, permissions, tenant isolation, or audit.
- Create base platform logic tied to one brand.

MVP dashboard access:

- No.

Future dashboard access:

- No. Integration health may appear in admin/internal dashboard.

Notes / open questions:

- Integration event storage and idempotency must be planned in PH-003C.

## Simple Permission Matrix

| Role | MVP Dashboard | Can publish landing | Can edit landing fields | Can manage billing | Can manage campaigns | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Platform Admin | Yes | Yes, through approved workflow | Yes | `OPEN` | `OPEN` | Internal/admin authority, exact permissions pending |
| Tenant Owner / Business Owner / Empresario | No | No direct MVP access | No | No direct MVP access | No direct MVP access | Receives outputs and provides inputs |
| Partner / Distributor / Socio | `OPEN` | `OPEN` | `OPEN` | No by default | `OPEN` | Role meaning varies by tenant/network |
| Lead | No | No | No | No | No | No account in MVP |
| Internal Operator | Yes | Yes, through approved workflow | Yes | `OPEN` | `OPEN` | Operational role |
| AI Agent | No | `OPEN`, only under controlled permissions | Can suggest/draft, not freely apply | No | No direct ownership | Non-human actor |
| External Integration | No | Only as authorized target/system | No | Webhook/event support only | Event/API support only | Non-human system |
