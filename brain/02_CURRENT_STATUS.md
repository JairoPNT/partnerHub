# CURRENT STATUS

OFFICIAL_PROJECT_ROOT = `D:\Proyectos multi agentes\PartnerHub`

## Ticket

`PH-038A - Domain inventory read model API (completed)`

## Status Summary

PH-003A is closed / approved with warnings.

PH-003B domain documentation has been created.

PH-003B-ADDENDUM documented MVP go-to-market clarification: manual / voz a voz / initial promoter team, no public marketplace, no mass self-service checkout, and no public affiliate system.

PH-003B-ADDENDUM-2 documented domain/subdomain publishing strategy: root domain `nombre.pro` reserved for future owner profile site, MVP operational landings preferably on `vsl.nombre.pro`, `shop.nombre.pro`, or `[producto].nombre.pro`.

PH-003C was executed from the active CTO instruction as an architecture correction.

PartnerHub is now documented and modeled as not being a CRM.

The PH-003C core is web assets, validated messages, personalized channels, external lead destinations, traffic generation, and traceability.

PH-003D has created database planning documentation for schema review before migration.

Claude Code reviewed PH-003D as `APPROVED WITH WARNINGS`.

The PH-003D closure pass incorporated W-A, W-B, and W-C documentally:

- W-A: terminal redirect event is `visitor.redirected_to_external_destination`.
- W-B: `OrganizationMembership` and `UserRole` are included in MVP planning.
- W-C: `BillingMode` is documented for `TrafficCampaign`, with MVP default recommended as `MANUAL`.

PH-003D does not authorize migrations, Prisma generate, Prisma migrate, Prisma db push, endpoint work, auth work, UI work, webhook implementation, Wompi integration, or billing automation.

PH-004A Commercial Pricing Update: Approved official commercial rates for MVP launch saved in `brain/business/OFERTA_COMERCIAL_OFICIAL_MVP.md` ($247k Producto, $347k Negocio, $475.2k Plan 360, $59.9k/mo 1 servicio, $89.900/mo 2 servicios, Meta Ads $197k setup + $89.9k/mo).

PH-004B Product Ecosystem Beta Sales Campaign: CEO direction saved in `brain/business/PH-004B_PRODUCT_ECOSYSTEM_BETA_SALES_CAMPAIGN.md`. Current sales hook focuses only on Ecosistema de Producto at $247.000 COP implementation, first month of administration included during implementation, $59.900 COP/month required after the first implementation month, special meeting-day benefit of 2 waived monthly management months worth $119.800 COP, beta entry price maintained during MVP validation without a public fixed deadline, live demos at jairopinto.pro, yennygarcia.pro, claudiacalero.pro and blancastella.pro, direct transfer/Nequi/Nu/Bancolombia/Wompi payment options, and referral rule of 1 waived month per 2 activated referrals capped at 12 months.

PH-020 Publicacion verificada was implemented in backend MVP on 2026-07-30. Publishing now performs SFTP upload followed by public-domain verification against the saved product page source. Manual verification is available at `POST /api/internal/product-pages/verify`. Verification results are stored under `PRODUCT_PAGE_SOURCE_DIR/.verifications/<siteId>.json`, and `GET /api/internal/product-pages` returns `lastVerification`.

On 2026-08-01 Codex audited and stabilized the 2026-07-31 Antigravity change set. Verification was restored to read-only behavior, public onboarding photo uploads now validate the onboarding token before uploading to R2, proxy host handling was hardened to prefer `Host`, and PH-025 font preset contracts were unified across UI, onboarding schema, lead sync, and generation. Handoff: `brain/session-handoffs/2026-08-01_ANTIGRAVITY_AUDIT_STABILIZATION.md`.

## Path Integrity

- Official project root: `D:\Proyectos multi agentes\PartnerHub`.
- Obsolete / unauthorized path: `C:\Users\jairo\Documents\PartnerHub`.

## Constraints Honored

- Work changed `/brain` database planning documentation only after PH-003C commit closure.
- No UI changed.
- Prisma schema was not changed during PH-003D.
- No database migration was created or applied.
- No Docker changed.
- No endpoints changed.
- No auth changed.
- No dependencies added.
- Schema planning was documented in `brain/database/`.
- No migrations created.

## Current Deliverables

- PH-003C non-CRM domain clarification exists under `brain/domain-model/`.
- PH-003C state machines exist under `brain/state-machines/`.
- PH-003C attract/educate/route flow exists under `brain/business-flows/`.
- PH-003C non-CRM business rules exist under `brain/business-rules/`.
- Prisma schema uses Entrepreneur, WebAssetPackage, MasterAsset, PersonalizedChannel, LeadDestination, ValidatedMessage, TrafficCampaign, and BusinessEvent.
- Backend service base files exist under `app/web/server/services/`.
- PH-003D schema review exists under `brain/database/`.
- PH-003D migration plan exists under `brain/database/`.
- PH-003D Prisma model decisions exist under `brain/database/`.
- PH-003D MVP vs future schema boundary exists under `brain/database/`.
- PH-003D session handoff exists under `brain/session-handoffs/`.
- PH-003D closure documents PaymentWebhookEvent minimum fields and idempotency/raw payload handling.
- PH-003D closure ratifies Organization as tenant boundary, BillingStatement for MVP, ProductCatalog/Product/Kit/KitItem for MVP, MasterAsset GLOBAL/ORGANIZATION scope, and manual upgrade price policy.
- PH-003B domain clarification files remain under `brain/domain-model/`.
- PH-003B open questions exist under `brain/open-questions/`.
- PH-003B dependencies for PH-003C exist under `brain/dependencies/`.
- PH-003B session handoff exists under `brain/session-handoffs/`.
- PH-003B addendum is reflected in domain model, roles, entities, plan/service model, open questions, dependencies, and session handoff.
- PH-003B-ADDENDUM-2 is reflected in domain model, landing fields, dashboard scope, open questions, dependencies, and session handoff.

## Next Step

PH-038A is closed with Cloudflare Access-protected `GET /api/internal/domains`. It returns three canonical masters plus only real legacy or explicit partner entries, with operational states kept separate and infrastructure details omitted. Three focused tests, targeted lint, and build pass. `AGR-20260807-002` is ready for Antigravity as a read-only frontend task. PH-038B may proceed in parallel as the separate restricted DNS diagnostic backend ticket.

The broader queue is documented in `brain/PH-036_INCREMENTAL_MULTI_ECOSYSTEM_OPERATIONS_PLAN.md`. Subdomain automation (`PH-036`) and logo media handling (`PH-037`) are independent streams and must not be combined into a mega-task.
