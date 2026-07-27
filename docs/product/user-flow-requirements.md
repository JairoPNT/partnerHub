# User Flow Requirements

This document captures the user-facing flow and the core functional requirements currently defined for PartnerHub.

## Purpose

The goal is to document how a user moves through the software in a way that supports the first product requirements and the foundation roadmap.

## Primary User Flow

```mermaid
flowchart TD
  A([Start]) --> B[Access PartnerHub]
  B --> C{Session active?}

  C -- No --> D[Sign in]
  D --> E{Credentials valid?}
  E -- No --> D1[Show error]
  D1 --> D
  E -- Yes --> F[Enter system]

  C -- Yes --> F[Enter system]

  F --> G{User role}

  G -- Administrator --> H1[Open admin panel]
  H1 --> H2[Manage tenant]
  H2 --> H3[Manage users]
  H3 --> H4[Assign roles and permissions]
  H4 --> H5[Configure administrative settings]
  H5 --> H6[Review reports]
  H6 --> Z([Sign out])

  G -- Partner --> P1[Open partner panel]
  P1 --> P2[Complete onboarding]
  P2 --> P3[Review hierarchy]
  P3 --> P4[Check commissions]
  P4 --> P5[Access content]
  P5 --> P6[Receive notifications]
  P6 --> Z

  G -- Support / Operations --> S1[Open support panel]
  S1 --> S2[Review users]
  S2 --> S3[Review partners]
  S3 --> S4[Inspect reports]
  S4 --> S5[Check audit history]
  S5 --> Z

  G -- External system --> X1[Run integration sync]
  X1 --> X2[Record event]
  X2 --> Z
```

## Functional Requirements Reflected

- Authentication and access control
- Role-based routing after sign-in
- Administrative tenant management
- User management
- Partner management
- Role and permission assignment
- Partner onboarding
- Hierarchy visibility
- Commission visibility
- Content access
- Notifications
- Reporting
- Auditability
- External integrations

## Notes

- The flow is intentionally generic so it can support the first tenant and future tenants without redesigning the core model.
- Auditability is treated as a baseline requirement, not an optional add-on.
- This document represents the current foundation-level product view and can be expanded once implementation tickets are created.
