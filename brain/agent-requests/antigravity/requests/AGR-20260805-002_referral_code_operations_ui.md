# AGR-20260805-002 - Referral Code Operations UI

## Status

Completed. See `brain/agent-requests/antigravity/reports/AGR-20260805-002_referral_code_operations_ui_DONE.md`.

## Owner

Antigravity.

## Context

PH-030 compacted the `/partners` operation view and started moving the referral program from manual handling toward an operational workflow based on entrepreneur codes.

The backend already supports provisional inviter codes and automatic referral qualification when the referred entrepreneur becomes paid/effective. The remaining gap is mainly UI/UX: the operator needs to manage each entrepreneur's own code, understand pending provisional inviters, and resolve ambiguous referral cases without leaving `/partners`.

## Objective

Complete the frontend experience for referral code operations inside `/partners`, so Jairo can manage codes, pending inviters, and effective referrals from the same administrative workflow.

## Scope

- Routes:
  - `/partners`
- Components:
  - `app/web/components/partners-referrals-view.tsx`
  - `app/web/components/entrepreneur-operations-view.tsx`
  - Any existing UI helper component needed for compact forms, badges, or dialogs.
- Files:
  - Frontend React/Tailwind files only.

## Requirements

- In `Operación de Empresarios`, expose each entrepreneur's own invitation/referral code inside the detail/management modal.
- Allow the operator to assign, copy, or update the entrepreneur code from the detail modal if the backend endpoint already supports it.
- If a code is provisional or linked to a provisional inviter, display it clearly as `Provisional` with a neutral/warning visual treatment.
- In the `Programa de Referidos` tab, remove language that implies the process is permanently manual.
- Preserve a clear list or audit view for:
  - Pending referrals.
  - Effective/qualified referrals.
  - Rejected/cancelled referrals.
  - Provisional inviters created from a code + inviter name.
- When a new lead entered a referrer code that did not exist but provided an inviter name, show that relationship in a way the operator can understand and later resolve.
- Add a clear empty state explaining that qualified referrals appear only after the referred entrepreneur is paid/validated.
- Do not reintroduce the old wide table layout or horizontal scroll in the main entrepreneur list.
- Keep all secondary data inside the detail modal or referral tab, not in the compact list.
- Use icon buttons and tooltips consistently with AGR-20260805-001.
- Keep Spanish labels concise and operator-friendly.

## Out of Scope

- Backend changes.
- Prisma/schema changes.
- Auth changes.
- Docker/EasyPanel changes.
- Payment automation.
- Automatic cash discounts.
- Public user dashboard.
- Public offer page redesign.

## Acceptance Criteria

- `/partners` main entrepreneur list remains compact and has no horizontal scrollbar at common desktop widths.
- Entrepreneur detail modal shows the entrepreneur's own code and lets the operator copy it.
- Referral tab shows pending, qualified/effective, and provisional cases with understandable labels.
- The UI no longer depends on a separate "Asignar código a empresario" workflow as the primary path if the detail modal can handle it.
- `ganomaster` and `ganomaster.pro` remain excluded from replication targets.
- The implementation does not modify backend/API contracts.
- Build passes with no TypeScript errors.

## Verification Plan

- Run `npm run build` in `app/web`.
- Manually verify `/partners`.
- Check at least:
  - One entrepreneur with an existing code.
  - One entrepreneur without a code.
  - One pending referral.
  - One qualified referral.
  - One provisional inviter case if available in local/staging data.
- Verify responsive behavior at desktop and tablet widths.

## Required Completion Report

Write the completion report to:

`brain/agent-requests/antigravity/reports/AGR-20260805-002_referral_code_operations_ui_DONE.md`
