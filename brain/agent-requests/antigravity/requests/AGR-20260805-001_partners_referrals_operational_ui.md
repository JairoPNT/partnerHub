# AGR-20260805-001 - Partners and Referrals Operational UI

## Status

Completed.

## Owner

Antigravity.

## Context

The `/partners` module is the administrative control center for the MVP. It currently mixes operational lead management, referral behavior, master template replication, and detailed data in ways that can make daily operation slower. The interface needs to be more compact, clearer, and aligned with the current PartnerHub MVP workflow.

## Objective

Polish the `/partners` UI so Jairo can manage active entrepreneurs, pending leads, publication status, and referral relationships without horizontal scrolling or exposed low-priority data in the main list.

## Scope

- Routes:
  - `/partners`
- Components:
  - Entrepreneur operations view.
  - Partners referrals view.
  - Master template replication section inside the partners area, if still present there.
- Files:
  - `app/web/components/entrepreneur-operations-view.tsx`
  - `app/web/components/partners-referrals-view.tsx`
  - `app/web/components/master-template-replication-view.tsx`
  - Any local UI helper component needed for layout consistency.

## Requirements

- Remove horizontal scrolling from the "Operacion de Empresarios" table/list.
- Condense the main entrepreneur list to show only high-signal data:
  - Operational status indicator by color/symbol.
  - Entrepreneur/brand name.
  - Linked siteId.
  - Publication domain.
  - Registration date.
  - Compact action icons.
- Move contact details, payment method, and referrer details out of the main list and into the detail drawer/modal.
- Replace the verbose status badge text in the main list with compact color/symbol indicators and accessible labels/tooltips.
- Minimize "Verificar ahora" to an icon-only action with tooltip.
- Minimize "Detalle y Gestion" to a management/edit icon with tooltip.
- Rename `Programa de Referidos Manual` to `Programa de Referidos`.
- Keep `ganomaster` and `ganomaster.pro` excluded from client replication targets. They must only appear in `/master-site`.
- In the referrals UI, avoid exposing internal technical language to operators unless it is useful for audit.
- Preserve current backend contracts. Do not modify API shape, Prisma, auth, Docker, or database logic in this request.

## Referral UI Behavior

- The referral program should visually reflect the business rule:
  - A referred entrepreneur starts as pending.
  - A referral becomes effective only when the referred entrepreneur is paid/validated according to the operational state.
  - Every 2 effective referrals grant 1 month of management benefit.
- If the backend already exposes provisional inviter data, show it clearly as provisional/pending verification.
- If the backend does not expose enough data, show a graceful placeholder and document the gap in the completion report instead of changing backend code.

## Out of Scope

- Backend services.
- Database schema changes.
- Referral qualification logic.
- Payment automation.
- User-facing dashboard for entrepreneurs.
- Public offer page copy.

## Acceptance Criteria

- `/partners` no longer requires horizontal scrolling on desktop widths.
- Main list is readable and compact with icon-based actions.
- Contact, payment, and referrer details remain available in the detail view.
- Referral tab title no longer says "Manual".
- `ganomaster` is not selectable as a replication destination.
- Build passes.
- Report includes screenshots or manual verification notes for the updated `/partners` UI.

## Verification Plan

- Run the frontend build from `app/web`.
- Open `/partners`.
- Verify the entrepreneur operations tab with at least 5 entrepreneurs.
- Confirm no horizontal scroll in the main list area.
- Open an entrepreneur detail and confirm hidden fields are still available.
- Open the referrals tab and confirm title and language changes.
- Open the replication section and confirm `ganomaster` is excluded from clients.

## Required Completion Report

Write the completion report to:

`brain/agent-requests/antigravity/reports/AGR-20260805-001_partners_referrals_operational_ui_DONE.md`
