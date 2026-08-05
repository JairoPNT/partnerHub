# Antigravity Requests

Antigravity owns frontend implementation, UI design, UX flows, React components, Tailwind styling, responsive behavior, and visual consistency.

## Request Lifecycle

1. Codex or ChatGPT creates a request in `requests/`.
2. Antigravity reads pending requests in ID order.
3. Antigravity implements the request.
4. Antigravity writes a matching report in `reports/`.
5. Codex reviews the report and creates a follow-up request only if needed.

## Do Not Repeat

If a request already has a completion report, do not execute it again unless a new request explicitly references it as a follow-up.

## Required Report

Every report must include:

- Request ID.
- Summary of implemented changes.
- Files or routes changed.
- Verification performed.
- Build status.
- Commit or branch if available.
- Known gaps or follow-up needed.
