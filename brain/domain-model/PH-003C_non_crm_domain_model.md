# PH-003C - Non-CRM Domain Model

## Source And Execution Note

PH-003C was assigned as an architecture correction mission for Codex.

Mandatory source requested by the mission: `PH-003C_ajuste_mision.md`.

Repository state during initial PH-003C execution: the file was not present under the official root `D:\Proyectos multi agentes\PartnerHub`. The CTO instruction in the active mission message was therefore treated as the executive source of truth.

Closure update: the mission source has now been versioned at `brain/business-flows/PH-003C_ajuste_mision.md`.

## Core Decision

PartnerHub is not a CRM.

PartnerHub is a platform for web assets, validated messages, and acquisition channels for entrepreneurs in MLM, direct selling, affiliates, distributors, and commercial networks.

PartnerHub does not manage leads.

PartnerHub attracts, educates, and routes leads toward the entrepreneur's own external commercial channel.

The PartnerHub flow ends when the lead is directed to an external destination controlled by the entrepreneur. Any later sales conversation, follow-up, closing, purchase handling, relationship management, or pipeline work happens outside PartnerHub.

## Explicitly Excluded Concepts

PH-003C excludes these core entities and product directions:

- Prospect
- Opportunity
- Deal
- Pipeline
- FollowUp
- CRMActivity
- LeadManagement
- CRM inbox
- commercial follow-up inside PartnerHub
- prospect management
- centralized lead ownership inside PartnerHub
- internal sales pipeline for the entrepreneur's prospects

Traffic and routing can be measured as business events, but not converted into CRM lifecycle management.

## Core Entities

### Entrepreneur

The business actor using PartnerHub to publish assets and route interested people toward their own commercial channel.

Generic for MLM, direct selling, affiliates, distributors, and commercial networks. It must not be tied exclusively to Gano Excel.

### WebAssetPackage

The selected package of web assets PartnerHub will prepare for an entrepreneur.

Initial package types:

- `PRODUCT_SALES`
- `VSL_RECRUITMENT`
- `FULL_COMBO`

The package defines what PartnerHub creates and validates. It does not create a CRM workspace.

### MasterAsset

Validated platform knowledge or reusable commercial asset.

Examples:

- landing template
- VSL template
- copy block
- creative reference
- product reference
- education sequence

MasterAsset represents PartnerHub's reusable commercial knowledge, not tenant-specific lead handling.

### PersonalizedChannel

A published or publishable web asset personalized for an entrepreneur.

Examples:

- product page
- VSL page
- combo page
- campaign page

This replaces the CRM-style idea of tracking prospects. The public asset educates and directs the visitor.

### LeadDestination

An external destination controlled by the entrepreneur.

Examples:

- WhatsApp
- external checkout
- external form
- booking link
- social DM
- phone
- other approved external channel

LeadDestination is the boundary of PartnerHub responsibility. PartnerHub records that routing happened, but does not manage the subsequent relationship.

### ValidatedMessage

Approved message unit used in MasterAssets, PersonalizedChannels, or TrafficCampaigns.

Examples:

- hero copy
- CTA
- objection response
- product education
- business education
- compliance note
- ad copy

ValidatedMessage represents commercially validated language and claim discipline.

### TrafficCampaign

A traffic generation request or activation that points people toward PersonalizedChannels or LeadDestinations.

TrafficCampaign is not lead management. It may carry budget, source, medium, destination, UTM, and readiness metadata, but it does not own prospects or sales follow-up.

### BusinessEvent

Append-only traceability record for meaningful state changes and routing events.

BusinessEvent may record that a lead was redirected to an external destination. It must not become a record of post-routing commercial management.

## Main Flow

1. Entrepreneur is created.
2. Entrepreneur selects a WebAssetPackage.
3. Entrepreneur submits required data.
4. PartnerHub requests or prepares the required web asset.
5. PartnerHub uses MasterAssets and ValidatedMessages.
6. PartnerHub creates a PersonalizedChannel.
7. PartnerHub publishes or updates the PersonalizedChannel.
8. PartnerHub creates or updates the LeadDestination.
9. Optional TrafficCampaign is requested and enabled to drive traffic.
10. Visitor is attracted and educated by the PersonalizedChannel.
11. Visitor is routed to the LeadDestination.
12. PartnerHub records a terminal routing BusinessEvent.
13. PartnerHub does not manage the commercial relationship after routing.

## Minimum Events

- `entrepreneur.created`
- `entrepreneur.package_selected`
- `entrepreneur.data_submitted`
- `web_asset.requested`
- `personalized_channel.created`
- `personalized_channel.published`
- `personalized_channel.updated_from_master`
- `lead_destination.created`
- `lead_destination.updated`
- `master_asset.created`
- `master_asset.updated`
- `validated_message.created`
- `validated_message.updated`
- `traffic_campaign.requested`
- `traffic_campaign.enabled`
- `visitor.redirected_to_external_destination`

The final event is added by PH-003C because the acceptance criteria require the flow to terminate when the visitor is directed externally.

## Technical Mapping

Prisma schema planning now uses these entity names:

- `Entrepreneur`
- `WebAssetPackage`
- `MasterAsset`
- `PersonalizedChannel`
- `LeadDestination`
- `ValidatedMessage`
- `TrafficCampaign`
- `BusinessEvent`

Service base files now use these domain names:

- `entrepreneurFlowService`
- `webAssetPackageService`
- `masterAssetService`
- `personalizedChannelService`
- `leadDestinationService`
- `validatedMessageService`
- `trafficCampaignService`
- `businessEventService`

## Plan, Payment, And Site Rescope Decision

Plan, Payment, and Site must not disappear conceptually from PartnerHub.

PH-003C removed the earlier Prisma models from the draft schema while correcting the product away from CRM framing, but that removal is not approved as a final database decision.

CTO decision:

- `Plan` should evolve toward `CommercialPackage` or `PricingPlan`, related to WebAssetPackage and billing.
- `Payment` should evolve toward `PaymentRecord` or `BillingPayment`, related to Wompi, setup fee, monthly fee, and webhook events.
- `Site` should evolve toward `PersonalizedChannel` or `PublishingTarget`, depending on whether the record represents the personalized public asset or the publication destination.
- These models must be planned formally in PH-003D before any Prisma migration.
- The current `schema.prisma` is a technical draft for planning and is not migrable as a production decision.
- PH-003D must review billing, publishing, and schema boundaries before `prisma generate`, migration creation, `db push`, or production data work.

## Acceptance Boundary

Any future feature that introduces inboxes, pipelines, opportunity stages, follow-up tasks, CRM activities, prospect ownership, or centralized lead handling must be rejected or moved to a separate explicitly approved future product, because it violates PH-003C.
