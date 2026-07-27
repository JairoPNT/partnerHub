# PH-003C - Commit Boundary

## Purpose

Close Claude warning W-1 without reverting work.

The current working tree contains mixed changes from PH-003C plus earlier PH-003B / UI / dependency work. Do not advance to PH-003D until commits are separated or the mixed state is explicitly accepted by the CTO.

## Group A - PH-003C Changes

These files belong to PH-003C closure and should be committed together if creating an atomic PH-003C commit:

- `brain/business-flows/PH-003C_ajuste_mision.md`
- `brain/business-flows/PH-003C_attract_educate_route_flow.md`
- `brain/business-rules/PH-003C_non_crm_business_rules.md`
- `brain/domain-model/PH-003C_non_crm_domain_model.md`
- `brain/state-machines/PH-003C_state_machines.md`
- `brain/dependencies/PH-003C_dependencies_for_PH-003D.md`
- `brain/session-handoffs/SESSION_HANDOFF_2026-07-06_PH-003C.md`
- `brain/session-handoffs/PH-003C_commit_boundary.md`
- `app/web/prisma/schema.prisma`
- `app/web/server/services/lifecycle.ts`
- `app/web/server/services/entrepreneurFlowService.ts`
- `app/web/server/services/webAssetPackageService.ts`
- `app/web/server/services/masterAssetService.ts`
- `app/web/server/services/personalizedChannelService.ts`
- `app/web/server/services/leadDestinationService.ts`
- `app/web/server/services/validatedMessageService.ts`
- `app/web/server/services/trafficCampaignService.ts`
- `app/web/server/services/businessEventService.ts`
- `app/web/server/services/index.ts`
- `README.md`
- `docs/00_concepcion.md`
- `docs/product/README.md`
- `docs/product/01_BUSINESS_FLOWS.md`

PH-003C also updated project memory files that should be included with PH-003C if not already committed:

- `brain/01_CURRENT_SPRINT.md`
- `brain/02_CURRENT_STATUS.md`
- `brain/03_NEXT_MISSION.md`
- `brain/04_DECISIONS.md`
- `brain/05_PRODUCT_MODEL.md`
- `brain/06_DOMAIN_MODEL.md`
- `brain/08_API_MODEL.md`
- `brain/LIVE_PROJECT_STATE.md`
- `brain/domain-model/PH-003B_domain_model_clarification.md`
- `brain/domain-model/PH-003B_entities_catalog.md`
- `brain/domain-model/PH-003B_roles_and_permissions.md`
- `brain/dependencies/PH-003B_dependencies_for_PH-003C.md`

## Group B - Prior PH-003B / UI / Dependency Changes

These files appear in the working tree but should not be mixed into an atomic PH-003C commit unless the CTO explicitly accepts a broad foundation commit:

- `app/web/app/(app)/[module]/page.tsx`
- `app/web/app/globals.css`
- `app/web/components/sidebar.tsx`
- `app/web/components/topbar.tsx`
- `app/web/components/dashboard-view.tsx`
- `app/web/components/ui/`
- `app/web/package.json`
- `app/web/package-lock.json`
- `app/web/tailwind.config.ts`
- root `package-lock.json`
- broad foundation files such as `AGENTS.md`, `AI_CONTEXT.md`, `ARCHITECTURE_DECISIONS.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `PROJECT_BOARD.md`, and `TICKETS.md` if they are still uncommitted from earlier tickets.
- broad `docs/` folders unrelated to the PH-003C non-CRM correction.
- broad `brain/` files unrelated to the PH-003C closure if they are still uncommitted from PH-003B.

## Commit Strategy Recommendation

Recommended strategy:

1. Commit PH-003C documentation, schema draft, and backend service bases as one PH-003C closure commit.
2. Commit PH-003B / foundation documentation separately.
3. Commit UI and dependency changes separately under the appropriate owner or ticket.

Do not create one mixed commit containing PH-003C schema/service changes plus UI/dependency work unless the CTO explicitly approves that tradeoff.

## Warning

Do not advance to PH-003D while the working tree remains mixed.

PH-003D should start from a clean or intentionally staged tree so schema review is not contaminated by unrelated UI, dependency, or foundation-documentation changes.
