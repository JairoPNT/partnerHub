# Architecture

## Architecture Overview

PartnerHub should follow a modular, multi-tenant SaaS architecture with strict separation between platform services and tenant-specific configuration.

Architecture validation is the current active ticket, so this document should evolve in step with the decisions recorded in the project board and ADR log.

## Deployment Split

- The VPS hosts the SaaS control plane: admin panel, API, database, orchestration, and cost tracking.
- The external web hosting account serves generated public websites, product landings, and VSL pages.
- Whenever possible, generated output should be delivered as static or lightweight published artifacts to reduce VPS processing cost.
- The SaaS controls and publishes; the hosting layer serves.

## Core Concerns

- tenancy and data isolation
- authentication and authorization
- domain-driven modules
- API consistency
- auditability and observability
- integration readiness

## Database Strategy

The data model must support:

- many companies in one platform
- clear tenant boundaries
- controlled access by role
- history and auditing for sensitive operations
- future scaling without breaking schema design

## API Strategy

The API layer should remain predictable and versioned. Contract stability matters more than quickly adding bespoke endpoints.

## Security Strategy

Security must be treated as a product feature:

- least privilege access
- strong authentication foundations
- audit logging for sensitive events
- safe tenant boundaries
- secrets and environment hygiene
