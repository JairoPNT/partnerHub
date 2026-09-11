# CDX-20260911-002 — DONE

## Outcome

Added an authenticated, read-only Business commercial-readiness projection for a selected activation lead:

`GET /api/internal/activation-leads/{id}/business-commercial-readiness`

It evaluates the approved activation, Business entitlement, target identity and provisioning state, canonical publication intent/master package, and durable job status. It never enqueues, publishes, wakes a worker, or calls SFTP/DNS/provider infrastructure.

States are `READY_FOR_PUBLICATION_PREVIEW`, `PUBLICATION_CURRENT`, `PUBLICATION_SCHEDULED`, `RETRY_REQUIRED`, and bounded `BLOCKED` reasons. A legacy target whose `publicationState` is already `READY` is treated as current even if it predates durable jobs.

## Changed files

- `app/web/server/services/businessCommercialReadinessService.ts`
- `app/web/server/services/businessCommercialReadinessService.test.ts`
- `app/web/app/api/internal/activation-leads/[id]/business-commercial-readiness/route.ts`
- `app/web/package.json`
- `brain/agent-requests/antigravity/requests/AGR-20260911-001_business_commercial_readiness_view.md`

## Verification

- Focused readiness plus publication-backfill regression suite: 10/10 passed.
- Full `npm run lint`: passed with zero errors and zero warnings.
- `npm run build`: passed, including TypeScript and the new dynamic API route.
- `git diff --check`: passed.
- Independent review found and resolved the legacy `publicationState: READY` precedence case. No unresolved security or read-only-boundary findings remain.

## Branch and commit

- Branch: `codex/CDX-20260911-002-business-commercial-readiness`
- Implementation commit: `60e0dc8fcf171a0074fab82993419e671475bbf9`

## Risks and follow-up

- The endpoint is intentionally per selected partner, not a bulk poll of all partners.
- It is protected by the ordinary PartnerHub Cloudflare Access audience; direct EasyPanel host access still cannot provide that session.
- `AGR-20260911-001` is pending. It may present readiness only; publication preview/approval/enqueue remains a separate backend authorization and UI ticket.
