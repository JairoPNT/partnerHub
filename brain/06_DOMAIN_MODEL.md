# Domain Model

## Core Bounded Areas

- Tenant and organization management
- Entrepreneur identity and lifecycle
- Web asset packages
- Master assets and validated messages
- Personalized channels
- External lead destinations
- Traffic generation
- Reporting and analytics
- Automation and orchestration
- Audit and governance

## Conceptual Entities

- Tenant
- Organization
- User
- Entrepreneur
- WebAssetPackage
- MasterAsset
- PersonalizedChannel
- LeadDestination
- ValidatedMessage
- TrafficCampaign
- BusinessEvent
- Role
- Permission
- Workflow Job
- Published Artifact
- External Hosting Target

## Domain Rules

- A tenant must never see another tenant's data.
- PartnerHub is not a CRM and must not implement prospect, opportunity, deal, pipeline, follow-up, CRM activity, or lead management entities.
- PartnerHub attracts, educates, and routes interested people toward external channels controlled by the entrepreneur.
- The PartnerHub flow ends when a visitor is routed to a LeadDestination.
- Sensitive operations must be auditable.
- Commercial workflows should be modeled as business objects, not ad hoc flags.
- Future AI features must respect consent, approval, and version history.
- Generated outputs should be modeled as published artifacts that can be served externally when appropriate.

## Early Domain Questions

- What tenant isolation model best fits the launch scale?
- Which entities need immutable audit trails from day one?
- Which workflows belong in the core platform versus add-on modules?
- Which redirect and attribution metrics can be stored without becoming lead management?
