# PH-003C - State Machines

## Entrepreneur

States:

- `INVITED`
- `ACTIVE`
- `PAUSED`
- `ARCHIVED`

Transitions:

- `INVITED` -> `ACTIVE`
- `INVITED` -> `ARCHIVED`
- `ACTIVE` -> `PAUSED`
- `ACTIVE` -> `ARCHIVED`
- `PAUSED` -> `ACTIVE`
- `PAUSED` -> `ARCHIVED`
- `ARCHIVED` -> terminal

Rules:

- `ACTIVE` means PartnerHub can prepare and publish assets for the entrepreneur.
- `PAUSED` blocks new traffic activation but does not imply CRM follow-up.
- `ARCHIVED` preserves traceability.

## WebAssetPackage

States:

- `DRAFT`
- `SELECTED`
- `DATA_REQUIRED`
- `READY_FOR_ASSET`
- `ACTIVE`
- `PAUSED`
- `ARCHIVED`

Transitions:

- `DRAFT` -> `SELECTED`
- `DRAFT` -> `ARCHIVED`
- `SELECTED` -> `DATA_REQUIRED`
- `SELECTED` -> `READY_FOR_ASSET`
- `SELECTED` -> `ARCHIVED`
- `DATA_REQUIRED` -> `READY_FOR_ASSET`
- `DATA_REQUIRED` -> `ARCHIVED`
- `READY_FOR_ASSET` -> `ACTIVE`
- `READY_FOR_ASSET` -> `ARCHIVED`
- `ACTIVE` -> `PAUSED`
- `ACTIVE` -> `ARCHIVED`
- `PAUSED` -> `ACTIVE`
- `PAUSED` -> `ARCHIVED`
- `ARCHIVED` -> terminal

Rules:

- `READY_FOR_ASSET` requires enough entrepreneur data to create the web asset.
- `ACTIVE` means the package can produce or support PersonalizedChannels.
- The package does not create a lead management workspace.

## MasterAsset

States:

- `DRAFT`
- `VALIDATED`
- `DEPRECATED`
- `ARCHIVED`

Transitions:

- `DRAFT` -> `VALIDATED`
- `DRAFT` -> `ARCHIVED`
- `VALIDATED` -> `DEPRECATED`
- `VALIDATED` -> `ARCHIVED`
- `DEPRECATED` -> `VALIDATED`
- `DEPRECATED` -> `ARCHIVED`
- `ARCHIVED` -> terminal

Rules:

- Only `VALIDATED` MasterAssets should be used for published PersonalizedChannels.
- `DEPRECATED` assets can trigger `personalized_channel.updated_from_master`.

## PersonalizedChannel

States:

- `REQUESTED`
- `DRAFT`
- `READY_FOR_REVIEW`
- `PUBLISHED`
- `NEEDS_UPDATE`
- `PAUSED`
- `ARCHIVED`

Transitions:

- `REQUESTED` -> `DRAFT`
- `REQUESTED` -> `ARCHIVED`
- `DRAFT` -> `READY_FOR_REVIEW`
- `DRAFT` -> `ARCHIVED`
- `READY_FOR_REVIEW` -> `PUBLISHED`
- `READY_FOR_REVIEW` -> `DRAFT`
- `READY_FOR_REVIEW` -> `ARCHIVED`
- `PUBLISHED` -> `NEEDS_UPDATE`
- `PUBLISHED` -> `PAUSED`
- `PUBLISHED` -> `ARCHIVED`
- `NEEDS_UPDATE` -> `READY_FOR_REVIEW`
- `NEEDS_UPDATE` -> `ARCHIVED`
- `PAUSED` -> `PUBLISHED`
- `PAUSED` -> `ARCHIVED`
- `ARCHIVED` -> terminal

Rules:

- `PUBLISHED` requires an active LeadDestination unless the page is informational only by approved exception.
- A PersonalizedChannel educates and routes. It does not retain or manage lead records.

## LeadDestination

States:

- `DRAFT`
- `ACTIVE`
- `PAUSED`
- `ARCHIVED`

Transitions:

- `DRAFT` -> `ACTIVE`
- `DRAFT` -> `ARCHIVED`
- `ACTIVE` -> `PAUSED`
- `ACTIVE` -> `ARCHIVED`
- `PAUSED` -> `ACTIVE`
- `PAUSED` -> `ARCHIVED`
- `ARCHIVED` -> terminal

Rules:

- `ACTIVE` requires a valid external URL, handle, phone, or routing target controlled by the entrepreneur.
- PartnerHub's main visitor flow terminates after routing to an `ACTIVE` LeadDestination.
- Post-routing commercial management is outside PartnerHub.

## ValidatedMessage

States:

- `DRAFT`
- `VALIDATED`
- `DEPRECATED`
- `ARCHIVED`

Transitions:

- `DRAFT` -> `VALIDATED`
- `DRAFT` -> `ARCHIVED`
- `VALIDATED` -> `DEPRECATED`
- `VALIDATED` -> `ARCHIVED`
- `DEPRECATED` -> `VALIDATED`
- `DEPRECATED` -> `ARCHIVED`
- `ARCHIVED` -> terminal

Rules:

- Published content should use `VALIDATED` messages.
- Health, income, compliance, or sensitive claims require validation before use.

## TrafficCampaign

States:

- `REQUESTED`
- `READY`
- `ENABLED`
- `PAUSED`
- `COMPLETED`
- `CANCELLED`

Transitions:

- `REQUESTED` -> `READY`
- `REQUESTED` -> `CANCELLED`
- `READY` -> `ENABLED`
- `READY` -> `CANCELLED`
- `ENABLED` -> `PAUSED`
- `ENABLED` -> `COMPLETED`
- `ENABLED` -> `CANCELLED`
- `PAUSED` -> `ENABLED`
- `PAUSED` -> `COMPLETED`
- `PAUSED` -> `CANCELLED`
- `COMPLETED` -> terminal
- `CANCELLED` -> terminal

Rules:

- `ENABLED` means traffic is being sent toward a PersonalizedChannel or external LeadDestination.
- TrafficCampaign records generation and routing context, not lead ownership or sales follow-up.
