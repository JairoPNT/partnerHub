# PH-003C - Attract, Educate, Route Flow

## Purpose

Define the main PartnerHub flow after the PH-003C correction.

PartnerHub does not manage leads. PartnerHub attracts, educates, and routes interested people toward external channels owned or controlled by the entrepreneur.

## Actors

- Entrepreneur
- Internal Operator
- AI Agent
- External visitor / interested person
- External commercial channel controlled by the entrepreneur

The external visitor is not modeled as a managed PartnerHub lead.

## Flow

1. Internal Operator creates the Entrepreneur.
2. Entrepreneur selects a WebAssetPackage.
3. Entrepreneur submits required data such as WhatsApp, product link, VSL proof, photo, domain preference, or other approved inputs.
4. PartnerHub requests the web asset.
5. PartnerHub selects validated MasterAssets and ValidatedMessages.
6. PartnerHub creates the PersonalizedChannel.
7. PartnerHub publishes the PersonalizedChannel on the approved target.
8. PartnerHub creates or updates the LeadDestination.
9. Optional TrafficCampaign is requested and enabled.
10. A visitor reaches the PersonalizedChannel.
11. The PersonalizedChannel educates the visitor with validated messages.
12. The visitor clicks or is routed to the LeadDestination.
13. PartnerHub records `lead.redirected_to_external_destination`.
14. The PartnerHub flow ends.

## Terminal Boundary

PartnerHub must not continue into:

- inbox management
- prospect management
- opportunity stages
- pipeline stages
- follow-up tasks
- sales closing
- post-routing commercial conversation
- CRM activity history

The entrepreneur's own WhatsApp, checkout, social DM, booking link, phone, or external form owns what happens next.

## Allowed Measurements

PartnerHub may record:

- page publication events
- destination updates
- traffic campaign enablement
- click or redirect events
- source, medium, and campaign references
- operational audit metadata

PartnerHub may not turn those measurements into managed lead records.

## Generic Scope

The flow applies to:

- MLM
- direct selling
- affiliates
- distributors
- commercial networks
- future tenant-specific ecosystems

Gano Excel can be a seed implementation, but the architecture must remain generic.
