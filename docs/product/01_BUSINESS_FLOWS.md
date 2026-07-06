# Flow 1
New Partner Purchase

## Purpose
Record the initial commercial transaction that starts the partner journey and gives the platform a traceable source event for downstream operations.

## Actors
Buyer, sales partner, PartnerHub SaaS, payment layer, operations/admin.

## Trigger
Checkout completion or manual purchase registration.

## Inputs
Purchaser identity, selected product, payment confirmation, referral or sponsor reference, tenant context.

## Expected Outputs
Purchase record, partner intake record or onboarding work item, payment tracking entry, notification queue entry.

## Business Rules

## Dependencies
Product catalog, payment provider, cost tracking, notification/orchestration layer.

## Automation Opportunities
Payment confirmation, onboarding kickoff, receipt delivery, operational event logging, WhatsApp notification, cost logging.

## Open Questions

# Flow 2
Partner Onboarding

## Purpose
Move a new partner from purchase status into an operational profile that can be used across the platform.

## Actors
Partner, admin, PartnerHub SaaS, onboarding automation.

## Trigger
Purchase completion, manual activation, or approval of a partner record.

## Inputs
Partner profile data, identity details, commercial assignment data, onboarding checklist state.

## Expected Outputs
Completed partner profile, access-ready account state, pending setup tasks, audit trail entry.

## Business Rules

## Dependencies
Identity layer, onboarding workflow, role and permission model, audit logging.

## Automation Opportunities
Welcome notifications, task routing, identity checks, profile completion reminders, onboarding status sync.

## Open Questions

# Flow 3
Landing Creation

## Purpose
Create a public landing page artifact for a product, campaign, or business presentation.

## Actors
Marketing/admin user, PartnerHub SaaS, publishing service, web hosting account.

## Trigger
User requests a new landing page or duplicates an existing template.

## Inputs
Campaign purpose, page content, visual assets, call to action, domain or subdomain target.

## Expected Outputs
Landing page artifact, publish target, tracking references, version history entry.

## Business Rules

## Dependencies
Content source, asset library, external hosting, domain configuration, tracking layer.

## Automation Opportunities
Template generation, content sync, publish workflow, version snapshot, cost logging.

## Open Questions

# Flow 4
Master Site Update

## Purpose
Update the central site source so downstream public pages stay aligned with the latest approved information.

## Actors
Content owner, PartnerHub SaaS, publish orchestration, external hosting.

## Trigger
Approved change to the master site content or structure.

## Inputs
Updated copy, assets, structural edits, publish target references.

## Expected Outputs
Updated master source, propagated content updates, publish status entry, audit trail.

## Business Rules

## Dependencies
Master content storage, publishing layer, versioning, audit logging, cost tracking.

## Automation Opportunities
Propagation jobs, change detection, publish confirmation, rollback snapshot, notification.

## Open Questions

# Flow 5
Product Update Propagation

## Purpose
Distribute approved product changes to the places where the product is presented or reused.

## Actors
Product owner, PartnerHub SaaS, publishing service, external hosting, downstream page owners.

## Trigger
Approved product update in the master source.

## Inputs
Product name, description, offer details, media assets, affected destinations.

## Expected Outputs
Updated product references, refreshed pages or artifacts, audit history, cost entry if generation is needed.

## Business Rules

## Dependencies
Product registry, content management, publishing orchestration, tracking layer.

## Automation Opportunities
Diff-based updates, selective republishing, sync notifications, content validation, cost logging.

## Open Questions

# Flow 6
VSL Creation

## Purpose
Create a video sales letter artifact that can be reviewed, versioned, and published externally.

## Actors
Marketing/admin user, PartnerHub SaaS, HeyGen, ElevenLabs, publishing service.

## Trigger
User requests a new VSL or a new version of an existing one.

## Inputs
Script, voice direction, visual direction, CTA, target audience, length target, asset references.

## Expected Outputs
Video artifact, audio artifact if applicable, version record, publish target, audit trail.

## Business Rules

## Dependencies
Script source, asset library, HeyGen API, ElevenLabs API, external hosting, cost tracking.

## Automation Opportunities
Script-assisted generation, narration generation, review queue, publish workflow, cost logging.

## Open Questions

# Flow 7
Campaign Creation

## Purpose
Assemble the assets, destinations, and operational settings required to run a commercial campaign.

## Actors
Campaign owner, PartnerHub SaaS, automation/orchestration layer, publishing targets.

## Trigger
Campaign planning or launch request.

## Inputs
Campaign objective, landing pages, VSL assets, channel targets, schedule, budget references.

## Expected Outputs
Campaign record, linked assets, publish tasks, tracking references, operational audit entry.

## Business Rules

## Dependencies
Asset library, landing artifacts, VSL artifacts, orchestration layer, cost tracking.

## Automation Opportunities
Campaign template setup, asset linking, publish scheduling, task creation, spend logging.

## Open Questions

# Flow 8
WhatsApp Configuration

## Purpose
Configure WhatsApp-based external routing paths for notifications or campaign support.

## Actors
Admin, PartnerHub SaaS, messaging provider, automation layer.

## Trigger
Tenant or operator requests a new WhatsApp connection or configuration update.

## Inputs
Provider credentials, sender details, routing preferences, template references.

## Expected Outputs
Connected messaging channel, configuration record, routing rules, audit trail.

## Business Rules

## Dependencies
Messaging provider access, automation/orchestration, identity and authorization, audit logging.

## Automation Opportunities
Connection checks, template sync, onboarding notifications, campaign routing notifications, cost logging.

## Open Questions

# Flow 9
Domain Connection

## Purpose
Connect a domain to a generated public site so the artifact can be published and accessed externally.

## Actors
Admin, PartnerHub SaaS, web hosting provider, DNS provider.

## Trigger
User requests a new domain connection or updates an existing one.

## Inputs
Domain name, DNS records, hosting target, site artifact reference.

## Expected Outputs
Connected domain, publish-ready site, verification state, audit trail entry.

## Business Rules

## Dependencies
DNS access, web hosting API or control panel, domain registration state, publishing workflow.

## Automation Opportunities
DNS validation, connection tests, SSL checks, publish notifications, cost logging.

## Open Questions

# Flow 10
Monthly Renewal

## Purpose
Track and manage recurring renewals for the SaaS, hosting, domains, and external services that keep the platform operating.

## Actors
Finance/admin, PartnerHub SaaS, billing layer, external providers.

## Trigger
Recurring billing cycle, renewal date, or usage threshold review.

## Inputs
Subscription state, hosting costs, domain renewals, API usage totals, service invoices.

## Expected Outputs
Renewal status, payment tracking entry, cost report entry, reminder or escalation task.

## Business Rules

## Dependencies
Billing data, hosting accounts, domain registrar, external API usage logs, cost tracking records.

## Automation Opportunities
Renewal reminders, cost summaries, payment reminders, threshold alerts, provider usage aggregation.

## Open Questions
