# PH-003B - Dependencies for PH-003C

## 1. Entities Requiring Tables

PH-003C supersedes this section for CRM-like candidates. Do not create managed Lead, LeadSource, PromoterOrigin, opportunity, pipeline, or follow-up tables from this PH-003B dependency list.

PH-003C should evaluate tables for:

- Tenant
- BusinessOwner
- Partner
- Superseded by PH-003C: do not create a managed Lead table
- Superseded by PH-003C: source context belongs on Entrepreneur, PersonalizedChannel, TrafficCampaign, LeadDestination, or BusinessEvent as needed
- Plan
- ServiceModel
- Configuration
- ProductSalesConfiguration
- VSLConfiguration
- ComboConfiguration
- Landing
- LandingTemplate
- LandingField
- PublishingTarget
- DomainRecord
- FutureOwnerProfileSite, if PH-003C decides the reserved root domain needs an explicit future-facing record
- Payment
- Subscription
- BillingEvent
- CostRecord
- CampaignService
- CampaignBudget
- CampaignManagementFee
- MetaSetup
- SocialAccount
- AdAccount
- AuditLog
- WebhookEvent
- AIJob

Table need and normalization level must be decided in PH-003C.

## 2. Entities That May Remain Configuration Files Initially

PH-003C may consider keeping these as configuration files or curated content before making them full tables:

- LandingTemplate
- Platform-level Plan definitions
- Platform-level ServiceModel definitions
- KnowledgeBase
- ImageBank
- Some approved claim/content libraries

This depends on MVP editing needs, audit requirements, and tenant scoping.

## 3. Required Relationships

PH-003C must define:

- Platform to Tenants.
- Tenant to BusinessOwners.
- Tenant to Partners.
- Superseded by PH-003C: no Tenant to managed Leads relationship.
- Source context may relate to Entrepreneur, PersonalizedChannel, TrafficCampaign, LeadDestination, or BusinessEvent.
- Tenant to Configuration.
- Configuration to ProductSalesConfiguration / VSLConfiguration / ComboConfiguration.
- Configuration to Landing.
- Landing to LandingTemplate.
- Landing to LandingFields.
- Landing to PublishingTarget and DomainRecord.
- DomainRecord to root domain, reserved root domain status, subdomain, publishing purpose, landing type, and routing strategy.
- PublishingTarget to product landing target and VSL landing target.
- Tenant/BusinessOwner to Payments and Subscriptions.
- Subscription to BillingEvents.
- Payments/BillingEvents to WebhookEvents.
- Tenant to CostRecords.
- Tenant to MetaSetup, SocialAccounts, and AdAccounts.
- CampaignService to CampaignBudget and CampaignManagementFee.
- CampaignService to MetaSetup readiness.
- AIJob to CostRecord and AuditLog.

## 4. Tenant Isolation Rules

PH-003C must define:

- Which records are tenant-scoped.
- Which records are platform-global.
- How platform-global configuration is referenced by tenant-scoped records.
- Whether BusinessOwner can belong to multiple tenants.
- Whether Partner can belong to multiple tenants.
- Superseded by PH-003C: PartnerHub does not scope managed Leads before conversion.
- How lead source/promoter origin is recorded without creating public affiliate, marketplace, or mass self-service sales mechanics.
- How AIJob, WebhookEvent, AuditLog, and CostRecord preserve tenant context.

No tenant should see another tenant's data.

## 5. Billing and Payment Records

PH-003C must plan:

- Setup payment records.
- Wompi webhook confirmation records.
- Manual close/payment status records.
- Payment records that support manual / voz a voz / promoter-led acquisition without assuming mass self-service checkout.
- Monthly subscription schedule.
- Monthly billing events.
- Non-payment behavior as `OPEN`.
- Grace period behavior as `OPEN`.
- Upgrade billing while upgrade price remains `OPEN`.

## 6. Cost Tracking Records

PH-003C must plan:

- Internal cost records invisible to business owner.
- External client-visible campaign budget.
- External client-visible campaign management fee.
- AI generation cost tracking.
- Hosting/domain/storage/n8n/integration cost tracking where applicable.
- Cost category and provider/source concepts.

## 7. Publishing Records

PH-003C must plan:

- Landing generation state.
- Landing publication state.
- Publishing target.
- Root domain.
- Subdomain.
- Publishing purpose.
- Landing type.
- Routing strategy.
- Reserved root domain.
- Future owner profile site.
- Product landing target.
- VSL landing target.
- Domain/subdomain/subroute strategy as clarified conceptually for root domain reservation plus MVP subdomain publication; final product convention remains `OPEN`.
- Domain ownership/admin responsibility as `OPEN`.
- Published artifact URL.
- Checklist and validation state.
- Manual review state for sensitive copy.

## 8. Meta/Social Records

PH-003C must plan:

- MetaSetup checklist.
- SocialAccount readiness.
- AdAccount readiness.
- Permission status.
- Restriction status.
- Alert severity: `INFO`, `WARNING`, `BLOCKER`, `WAIT`, `COMPLIANCE`.
- Manual checklist vs Meta Login as `OPEN`.
- Business Portfolio ownership as `OPEN`.

## 9. Campaign Records

PH-003C must plan:

- CampaignService contract/status.
- CampaignBudget.
- CampaignManagementFee.
- Campaign readiness state.
- Budget approval.
- Admin fee approval.
- Campaign account ownership as `OPEN`.
- Minimum recommended budget as `OPEN`.

## 10. Audit Logs

PH-003C must define audit requirements for:

- Payment confirmation changes.
- Manual close actions.
- Landing field changes.
- Landing publication.
- Claim review and approvals.
- Meta/social permissions and readiness changes.
- Campaign readiness and launch blockers.
- AI-generated outputs and approvals.
- Webhook processing.
- Integration-triggered changes.

Exact mandatory audit events remain `OPEN`.

## 11. Webhook Event Records

PH-003C must plan:

- Provider event storage.
- Wompi payment webhook records.
- Event processing status.
- Idempotency strategy.
- Error/retry status.
- Relationship to Payment/BillingEvent.
- Future relationships to Meta, hosting, n8n, and AI providers.

## 12. Open Schema Decisions

PH-003C must preserve these as `OPEN` until approved:

- Upgrade price: COP 200.000 or COP 300.000.
- Combo URL structure.
- Non-payment behavior.
- Grace period.
- Domain/subdomain/subroute strategy.
- Domain ownership/admin.
- Product subdomain convention: `shop.nombre.pro`, `[producto].nombre.pro`, or both by configuration.
- Timing and commercial packaging for future owner profile site on `nombre.pro`.
- VSL video hosting.
- VSL video producer/source.
- Meta Login vs manual checklist.
- Manual publishing pack vs API publishing.
- Business Portfolio ownership.
- Campaign account ownership.
- Campaign administration cost.
- Minimum ad budget.
- Claims allowed for Gano Excel.
- Claim approval owner.
- ImageBank scope.
- Exact role semantics.
- TenantOwner vs BusinessOwner relationship.
- Multi-owner tenants.
- Multi-tenant partners.
- Superseded by PH-003C: no PartnerHub-managed lead-to-partner conversion.
- Whether initial promoter team has simple referral tracking or only manual operational records.
- Global vs tenant-scoped entities.
- AI Agent generation/publication permissions.
- Mandatory audit events.

No Prisma schema or migrations should be created before PH-003C is reviewed.

## 13. Domain and Subdomain Publishing Strategy

PH-003C must model the domain/subdomain strategy conceptually documented in PH-003B-ADDENDUM-2:

- Root domain: `nombre.pro`.
- Subdomain: `vsl`, `shop`, or product/campaign-specific value.
- Publishing purpose: future owner profile site, product landing, VSL landing, campaign landing, or other approved purpose.
- Landing type: `PRODUCT_SALES`, `VSL_RECRUITMENT`, `FULL_COMBO`, or future approved types.
- Routing strategy: root reserved, subdomain target, product-specific subdomain, generic shop subdomain, or future approved routing mode.
- Reserved root domain: root domain must remain free for the future owner profile site.
- Future owner profile site: personal brand, commercial resume, professional profile, institutional page, or broader entrepreneur ecosystem.
- Product landing target: preferably `shop.nombre.pro` or `[producto].nombre.pro`.
- VSL landing target: preferably `vsl.nombre.pro`.

Rules for PH-003C:

- Do not assume the root domain is the default product landing.
- Do not assume the root domain is the default VSL landing.
- Keep the strategy generic and not tied to Gano Excel.
- Treat examples such as `vsl.claudiacalero.pro`, `shop.claudiacalero.pro`, and `ganocafe.claudiacalero.pro` as seed/demo examples only.

## 14. MVP Go-To-Market Constraint

PH-003C must not model the MVP as a mass self-service SaaS sales engine.

Documented MVP constraint:

- PartnerHub sales are manual / voz a voz / initial promoter team.
- There is no public PartnerHub marketplace in MVP.
- There is no mass self-service checkout for selling PartnerHub in MVP.
- There is no public PartnerHub affiliate system in MVP.
- En MVP no hay sistema publico de afiliados de PartnerHub.
- Initial business owner acquisition is managed by internal/promoter team.
- Closing can be manual.
- Source/promoter origin may be recorded, but only as operational tracking unless a future approved ticket defines referral/affiliate mechanics.
