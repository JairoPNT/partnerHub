# PH-003B - Campaign and Meta Domain

## Purpose

Document Meta/social and campaign domain boundaries before schema planning.

## MetaSetup

Definition:

Complementary readiness flow for Facebook, Instagram, Business Portfolio / Business Manager, ad account, payment method, permissions, restrictions, and campaign readiness.

Rules:

- Meta Setup is complementary.
- Meta Setup does not block landing unless social launch or ads are contracted.
- PartnerHub does not automate personal Facebook account creation.
- PartnerHub does not automate personal Instagram account creation.
- PartnerHub does not evade Meta restrictions, verification, reviews, limits, or policy checks.
- Automatic publishing requires valid permissions.
- Missing/expired/rejected permissions block automatic publishing.
- New accounts can trigger `WAIT` alerts.

## SocialAccount

Definition:

Facebook Page, Instagram Business/Creator, or similar social asset readiness/connection record.

Rules:

- Instagram must be Business or Creator for advanced integrations.
- If Instagram is personal, PartnerHub generates manual conversion instructions.
- Social account ownership and permission state must be explicit.
- Publishing without current authorization is not allowed.

## AdAccount

Definition:

Ad account readiness/connection record for campaign services.

Rules:

- Missing ad account blocks paid campaign launch.
- Restricted ad account blocks paid campaign launch.
- Missing payment method blocks paid campaign launch.
- New account friction may require waiting or manual review.
- Campaign account ownership remains `OPEN`: business owner account or managed account.

## CampaignService

Definition:

Additional service for paid campaigns and/or campaign readiness.

Rules:

- Campaigns are additional services.
- Campaign Manager is future epic / ads service.
- Campaign readiness requires contracted campaign service, Meta/social readiness, ad account, payment method, budget, administration fee, no unresolved restrictions, and compliance review.

## CampaignBudget

Definition:

Client-approved advertising spend.

Rules:

- Visible to client.
- Must be itemized separately from management/admin fee.
- Minimum recommended budget remains `OPEN`.

## CampaignManagementFee

Definition:

PartnerHub fee for administering campaigns.

Rules:

- Visible to client.
- Must be itemized separately from ad spend.
- Exact fee remains `OPEN`.

## ContentCalendar

Definition:

Planned publishing schedule for social launch, campaign content, or future Social Launch Engine.

Rules:

- Future epic.
- Manual publishing pack is valid.
- API publishing is future/conditional and requires permissions.

## ContentAsset

Definition:

Creative, copy, image, video, or other asset used in landing/social/campaign workflows.

Rules:

- Claims-sensitive assets require manual review.
- Health, income, guaranteed results, or regulated claims must not publish without validation.
- Asset Library is future epic / Social Launch Engine.

## KnowledgeBase

Definition:

Approved source of product, brand, claim, template, and tenant-specific knowledge.

Rules:

- Gano Excel knowledge must be approved and scoped as first implementation / seed demo.
- Claims must come from approved knowledge.
- Claims allowed for Gano Excel remain `OPEN`.

## ImageBank

Definition:

Approved image source for landing, content, and campaign artifacts.

Rules:

- ImageBank scope remains `OPEN`: by commercial network, country, or business model.
- Usage rights and approval status must be tracked in future planning.

## Ownership Matrix

| Concept | Owner | Visible to client | MVP status | Notes |
| --- | --- | --- | --- | --- |
| MetaSetup | Tenant operations / Internal Operator | Partially | MVP Support | Complementary; blocks only social launch/ads |
| SocialAccount | Business owner or tenant, exact ownership `OPEN` | Yes | MVP Support | Manual checklist valid |
| AdAccount | `OPEN`: business owner account or managed account | Yes | Future | Required for campaigns |
| CampaignService | PartnerHub operations, contracted by tenant | Yes | Future | Additional service |
| CampaignBudget | Client-approved spend | Yes | Future | Itemized separately |
| CampaignManagementFee | PartnerHub | Yes | Future | Administration fee itemized |
| ContentCalendar | PartnerHub operations / future Social Launch Engine | Partially | Future | Manual pack valid |
| ContentAsset | Platform/Tenant depending on source | Partially | Future | Sensitive claims need review |
| KnowledgeBase | Platform/Tenant curated source | No direct client editing in MVP | MVP Support | Approved claims/content source |
| ImageBank | Platform/Tenant curated source | No direct client editing in MVP | Future | Scope remains `OPEN` |

## Alert Rules

- `INFO`: Missing setup that does not block landing.
- `WARNING`: Setup issue that may affect social launch.
- `BLOCKER`: Missing permissions, restrictions, missing ad account, or missing payment method.
- `WAIT`: New account friction or waiting period risk.
- `COMPLIANCE`: Sensitive claims or policy risk.

## Publishing Rules

- Manual publishing pack is valid.
- API publishing is future/conditional.
- Automatic publishing requires valid permissions.
- PartnerHub must not publish without authorization.
- PartnerHub must not bypass Meta restrictions.

## PH-003C Boundary

PH-003C must decide:

- Which Meta/social concepts require tables in MVP.
- How checklist status and alerts are stored.
- How ownership and permission status are modeled.
- How campaign service, budget, and management fee relate to billing.
- How claim review and manual approval are audited.
