# LIVE PROJECT STATE

OFFICIAL_PROJECT_ROOT = `D:\Proyectos multi agentes\PartnerHub`

## Current Ticket

`PH-039 - Deploy recovery integration (ready for PR)`

## Current State

PH-003A is closed / approved with warnings.

PH-003B has been executed in `/brain`; PH-003B-ADDENDUM documented MVP go-to-market clarification; PH-003B-ADDENDUM-2 documented domain/subdomain publishing strategy.

PH-003C was executed as an architecture correction mission from the active CTO instruction.

PH-003C redefines PartnerHub as a platform for web assets, validated messages, personalized channels, external lead destinations, traffic generation, and traceability.

PartnerHub is not a CRM and does not manage leads after routing.

PH-003D has created schema planning documentation and has not modified `schema.prisma`.

Claude reviewed PH-003D as `APPROVED WITH WARNINGS`.

PH-003D closure has incorporated W-A, W-B, and W-C documentally and is ready for CTO quick check.

PH-020 backend MVP was implemented on 2026-07-30. The internal product page publisher now runs public verification after SFTP upload. A manual verification endpoint exists at `POST /api/internal/product-pages/verify`. Verification stores the latest result in `PRODUCT_PAGE_SOURCE_DIR/.verifications/<siteId>.json`, updates linked activation leads to `VERIFIED` or `VERIFY_FAILED`, and exposes `lastVerification` from `GET /api/internal/product-pages`.

## Path Integrity

- Official project root: `D:\Proyectos multi agentes\PartnerHub`.
- Obsolete / unauthorized path: `C:\Users\jairo\Documents\PartnerHub`.
- Work for PH-003D was performed only under the official root.

## Current Scope

- PH-003C created non-CRM domain, state-machine, business-rule, and flow documentation under `/brain`.
- PH-003C updated Prisma planning entities to Entrepreneur, WebAssetPackage, MasterAsset, PersonalizedChannel, LeadDestination, ValidatedMessage, TrafficCampaign, and BusinessEvent.
- PH-003C added backend service base files for domain transitions and minimum business events.
- PH-003D created database planning docs under `brain/database/`.
- PH-003D created a session handoff under `brain/session-handoffs/`.
- PH-003D identified required schema additions for Organization/Tenant, billing, payments, webhooks, publishing, domains, master asset versions, product catalog, compliance, and hardened BusinessEvent audit logs.
- PH-003D closure ratified Organization as the tenant boundary name.
- PH-003D closure added OrganizationMembership and UserRole to MVP planning without implementing auth or permissions.
- PH-003D closure renamed terminal external routing traceability to `visitor.redirected_to_external_destination`.
- PH-003D closure added BillingMode to TrafficCampaign planning, with MVP default recommended as MANUAL.
- PH-003D closure documented PaymentWebhookEvent minimum fields, rawPayload-before-processing, and idempotencyKey duplicate protection.
- PH-003D closure ratified BillingStatement for MVP, ProductCatalog/Product/Kit/KitItem for MVP, MasterAsset GLOBAL or ORGANIZATION scope, and manual upgrade price policy.
- PH-003B-ADDENDUM clarified that MVP PartnerHub sales are manual / voz a voz / initial promoter team, with no public marketplace, no mass self-service checkout, and no public affiliate system.
- PH-003B-ADDENDUM-2 clarified that `nombre.pro` root domain is reserved for a future owner profile site and MVP operational landings should preferably publish on subdominios such as `vsl.nombre.pro`, `shop.nombre.pro`, or `[producto].nombre.pro`.
- Application backend planning code was touched for PH-003C service bases and Prisma schema planning.
- No UI was touched.
- Prisma schema was not modified during PH-003D closure; no migration was created or applied.
- No database migration was run.
- No Docker was touched.
- No endpoints were created or changed.
- No auth was changed.
- No dependencies were added.
- No Prisma generate, migrate, or db push was run.

## Next Step

PH-039 is active. `origin/main` contains publication/verification imports and the merged Domains UI without their untracked PH-036/PH-038 backend implementations. Deployment and new feature work are paused while Codex prepares a narrowly scoped recovery branch, clean build evidence, and PR to `main`.

Antigravity work for provisioning and logo upload must begin later from new, specific AGR requests after the corresponding backend APIs are stable. Existing completed AGR requests must not be reopened.
