# AGR-20260812-009 - Payments partner selector

## Owner

Antigravity — frontend/UI.

## Dependency

- PR #111 deployed.
- Existing backend endpoint `GET /api/internal/activation-leads`.
- Existing payment contract remains unchanged: `activationLeadId` is sent internally.

## Single outcome

Replace the free-text `activationLeadId` field in Payments with a searchable partner selector that displays the partner name and site/domain while retaining the internal activation lead ID for submission.

## Allowed files

- `app/web/components/payments-management-view.tsx`.
- Focused frontend test files if already established.
- This request and its matching DONE report.

## Excluded files

- Backend services and APIs.
- Payment ledger contract.
- Dashboard.
- Sidebar and Topbar.
- Other modules, templates, stylesheets and infrastructure.

## Required behavior

1. Load active activation leads from `/api/internal/activation-leads`.
2. Show a readable option such as `Claudia Calero — claudia-calero` and optionally the domain.
3. Store the selected internal lead ID in form state.
4. Do not ask the operator to type a UUID.
5. Handle loading, empty, error and retry states for the selector.
6. Prevent payment submission without a selected partner.
7. Preserve all existing payment fields and endpoint payload shape.
8. Do not send `siteId` manually unless the existing contract already requires it; the backend derives the snapshot from the selected lead.
9. Keep the search/filter behavior responsive on desktop and mobile.
10. Do not include sample or fake partners.

## Acceptance checks

- The form no longer exposes a raw `activationLeadId` text input.
- A selected partner sends the correct internal `activationLeadId` to `POST /api/internal/payments`.
- Existing list, filter and void flows remain unchanged.
- Build, focused lint and `git diff --check` pass.
- Diff contains no backend or unrelated dashboard files.

## Delivery

- Create branch `antigravity/AGR-20260812-009-payments-partner-selector` from updated `origin/main`.
- Create matching DONE report.
- Push the branch.
- Do not create or merge a PR; Codex will audit first.
