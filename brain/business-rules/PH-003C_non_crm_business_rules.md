# PH-003C - Non-CRM Business Rules

## Core Rule

PartnerHub is not a CRM.

PartnerHub creates and updates assets, messages, channels, destinations, traffic context, and traceability. It does not own the lead relationship after routing.

## Entity Rules

- Entrepreneur is the commercial actor receiving PartnerHub assets.
- WebAssetPackage defines what PartnerHub prepares.
- MasterAsset is reusable validated knowledge.
- PersonalizedChannel is the entrepreneur-specific published asset.
- LeadDestination is an external channel controlled by the entrepreneur.
- ValidatedMessage is approved commercial language.
- TrafficCampaign sends traffic toward assets or destinations.
- BusinessEvent records traceability without becoming commercial follow-up.

## Routing Rules

- A LeadDestination must point outside PartnerHub or to an external channel controlled by the entrepreneur.
- Routing to WhatsApp, checkout, form, booking, social DM, phone, or another approved external destination is valid.
- The main PartnerHub flow ends once the visitor is routed to LeadDestination.
- PartnerHub may record `visitor.redirected_to_external_destination` only as a terminal traceability event.

## Prohibited Rules

PartnerHub core must not implement:

- Prospect
- Opportunity
- Deal
- Pipeline
- FollowUp
- CRMActivity
- LeadManagement
- CRM inbox
- centralized lead database for commercial follow-up
- sales process ownership after external routing

## TrafficCampaign Rules

- TrafficCampaign is traffic generation and routing support.
- TrafficCampaign may reference budget, source, medium, destination, UTM, readiness, and enablement.
- TrafficCampaign must not own lead lifecycle, lead stage, opportunity stage, or follow-up state.

## Message And Asset Rules

- MasterAsset and ValidatedMessage represent validated commercial knowledge.
- Published PersonalizedChannels should use validated assets and messages.
- Sensitive health, income, compliance, or opportunity claims require validation before publication.

## Generic Product Rules

- The architecture must support MLM, direct selling, affiliates, distributors, and commercial networks.
- No model, status, or service may be hardcoded exclusively to Gano Excel.
- Gano Excel examples are seed/demo context only.
