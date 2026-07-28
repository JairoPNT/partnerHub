# NEXT MISSION

OFFICIAL_PROJECT_ROOT = `D:\Proyectos multi agentes\PartnerHub`

## Current Gate

PH-003D CTO quick check after Claude review.

PH-003C supersedes the CRM-like parts of the earlier model. PartnerHub is not a CRM.

PartnerHub attracts, educates, and routes interested people toward external channels controlled by the entrepreneur.

PH-003B still contributes the MVP go-to-market addendum: manual / voz a voz / initial promoter team, not public marketplace, mass self-service checkout, or public affiliate system.

PH-003B still contributes the domain/subdomain addendum: `nombre.pro` root domain reserved for future owner profile site, MVP operational landings preferably on subdominios such as `vsl.nombre.pro`, `shop.nombre.pro`, or `[producto].nombre.pro`.

PH-003D documents the target schema direction for tenant isolation, commercial packages, billing, payment records, webhook records, publishing targets, domain records, master asset versioning, personalized channels, lead destinations, traffic campaigns, claims/compliance, and BusinessEvent auditability.

Claude reviewed PH-003D as `APPROVED WITH WARNINGS`.

PH-003D closure incorporated W-A, W-B, and W-C documentally:

- W-A: redirect event naming is `visitor.redirected_to_external_destination`.
- W-B: `OrganizationMembership` and `UserRole` are in MVP planning.
- W-C: `BillingMode` is documented for `TrafficCampaign`, default recommended as `MANUAL`.

PH-003D also documents PaymentWebhookEvent minimum fields, raw payload storage before processing, webhook idempotency, `BillingStatement` for MVP, `ProductCatalog` / `Product` / `Kit` / `KitItem` for MVP, `MasterAsset` GLOBAL or ORGANIZATION scope, and manual upgrade price policy.

## Current Queue

1. PH-003D CTO quick check.
2. PH-003E - Controlled Prisma Schema Implementation, only if CTO authorizes it.
3. Migration ticket only after schema implementation is approved.
4. PH-004 Authentication Strategy after schema direction is accepted.

## Hold

Do not create migrations, endpoints, UI, or production workflows until PH-003E or another explicit ticket authorizes implementation.

## Path Integrity

- Official project root: `D:\Proyectos multi agentes\PartnerHub`.
- Obsolete / unauthorized path: `C:\Users\jairo\Documents\PartnerHub`.

## Do Not Do Yet

- Do not implement features.
- Do not modify UI.
- Do not apply database migrations.
- Do not modify Docker.
- Do not add endpoints.
- Do not change auth.
- Do not add dependencies.
- Do not add CRM, inbox, pipeline, prospect, opportunity, deal, follow-up, CRM activity, or lead management features.
- Do not run `prisma generate`.
- Do not run `prisma migrate`.
- Do not run `prisma db push`.

## Next Step

Run CTO quick check on PH-003D closure.

Do not open PH-003E yet without CTO authorization.
