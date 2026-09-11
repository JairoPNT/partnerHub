# CDX-20260911-002 — Business commercial readiness

- Owner: Codex (Backend Lead; balanced model tier).
- Scope: Expose an authenticated, read-only Business readiness projection for one existing partner activation lead.
- Allowed files/modules: `app/web/server/services/businessCommercialReadinessService.ts`, its test, `app/web/app/api/internal/activation-leads/[id]/business-commercial-readiness/route.ts`, `app/web/package.json`, this request, the matching report, and the Antigravity handoff request.
- Excluded files/modules: React/components, templates, master-package contents, source generation, job enqueue/worker behavior, SFTP, DNS, Hostinger, Cloudflare configuration, Docker, EasyPanel, credentials, remote files, and deployment configuration.
- Dependencies: durable publication jobs and publication-backfill preview already merged.
- Parallel-safe with: frontend-only work that does not modify this API route or service.
- Integration: Antigravity may consume the documented endpoint from Partners after this ticket merges; a later backend ticket owns preview/approval/enqueue actions.

## Single outcome

Provide `GET /api/internal/activation-leads/:id/business-commercial-readiness` behind the existing human Cloudflare Access guard. It must perform only reads and classify the selected Business ecosystem as one of:

- `READY_FOR_PUBLICATION_PREVIEW`
- `PUBLICATION_CURRENT`
- `PUBLICATION_SCHEDULED`
- `RETRY_REQUIRED`
- `BLOCKED` with one bounded reason code

The projection checks approved activation, commercial entitlement, target identity/readiness, canonical source/master-package intent, and any existing durable publication job. It returns hashes and safe site/public-host identity only; never raw credentials, owner keys, source content, provider errors, or a mutation capability.

For legacy targets, `publicationState: READY` takes precedence over a missing durable job and is classified as `PUBLICATION_CURRENT`; this prevents a previously published site from being presented as a fresh publication candidate.

## Verification

- Focused readiness and existing publication-backfill tests.
- ESLint for the changed backend files.
- `npm run build` from `app/web`.
- `git diff --check`.
