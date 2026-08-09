# PH-036 / PH-037 - Plan incremental de operaciones multiecosistema

Status: Planned
Date: 2026-08-07
Owner: Jairo (product), Codex (backend), Antigravity (frontend), ChatGPT (architecture review)

## Objective

Deliver two independent operational capabilities without creating a mega-task:

1. Provision real client subdomains for Product and Business ecosystems.
2. Upload, optimize, store, and render partner logos without manually pasting URLs.

The canonical client convention is:

| Ecosystem | Public hostname |
| --- | --- |
| Personal Brand | `name.pro` |
| Product | `producto.name.pro` |
| Business | `negocio.name.pro` |

Each ticket below must be independently testable, reversible, and small enough to review in isolation. A later ticket cannot silently absorb unfinished scope from an earlier ticket.

## Stream PH-036 - Automatic subdomain provisioning

### PH-036A - Hostname and PublishingTarget contract (completed)

Owner: Codex

- Document canonical hostnames and identifiers.
- Define the minimum `PublishingTarget` contract.
- Define compatibility with existing PRODUCT-only sources.
- Define idempotency, failure states, and manual recovery boundaries.
- Documentation only; no API calls, UI, Prisma, or production changes.

Acceptance: contract approved and a compatibility matrix exists.

### PH-036B - Hostinger API client (completed)

Owner: Codex

- Implement a narrow client for get/create subdomain only.
- Use a scoped token from environment configuration.
- Treat an already-existing matching subdomain as success.
- Add mocked contract tests.
- Do not connect it to onboarding or publication.

Acceptance: tests cover create, already exists, rejected token, and provider error.

### PH-036C - DNS provider client (completed)

Owner: Codex

- Implement get/create DNS record for one hostname.
- Prefer Cloudflare when the client zone is managed there.
- Never overwrite a conflicting record automatically.
- Add mocked contract tests.

Acceptance: tests cover create, matching record, conflicting record, and provider error.

### PH-036D - Provisioning state service (completed)

Owner: Codex

- Orchestrate Hostinger and DNS clients behind an explicit confirmation.
- Persist resumable states without coupling provisioning to page generation.
- Make retries idempotent.
- Do not publish files yet.

Acceptance: an interrupted operation can resume without duplicating provider resources.

### PH-036E - Publication target integration (completed)

Owner: Codex

- Resolve `publicHost` and `remoteRoot` from the provisioned target.
- Keep current client PRODUCT publication backward-compatible.
- Publish only when the target state is READY.
- Verify the exact public hostname after upload.

Acceptance: existing root-domain pages still publish and a test target publishes to an isolated subdomain path.

### PH-036F - Provisioning API contract (completed)

Owner: Codex

- Expose authenticated internal read and provision operations over the stable service.
- Validate explicit confirmation and return safe status/error fields only.
- Do not expose provider tokens, responses, or remote roots.
- Add route-level tests before frontend handoff.

Acceptance: Antigravity has a stable, documented backend contract with mocked route coverage.

### PH-036G - Authenticated admin bridge decision (completed)

Owner: Codex + Jairo; ChatGPT architecture review

- Confirm the application-level or infrastructure-level admin authentication boundary.
- Define how server-side UI actions reach the bearer-protected provisioning API.
- Never expose `PARTNERHUB_PROVISIONING_API_TOKEN` to browser JavaScript.
- Keep this as a security contract ticket; do not implement UI.

Acceptance: the UI handoff has an approved authenticated mutation path and no browser-held infrastructure secret.

### PH-036H - Admin provisioning UI

Owner: Antigravity

- Create a new AGR request only after PH-036D API is stable.
- Add one explicit action: `Preparar subdominio`.
- Show state, retry guidance, and provider failure without exposing tokens or remote paths unnecessarily.
- Do not combine generation, publication, and provisioning into an ambiguous button.

Acceptance: UI consumes the published backend contract and has a matching AGR completion report.

### PH-036I - One-client pilot

Owner: Codex + Jairo; ChatGPT architecture review

- Pilot with one approved client and one ecosystem subdomain.
- Validate Hostinger, DNS, SSL, SFTP publication, and public verification.
- Record rollback and recovery evidence.
- Expand to the second ecosystem only after the first passes.

Acceptance: one complete 0-to-100 run is VERIFIED with no manual document-root correction.

## Stream PH-037 - Partner logo pipeline

This stream is independent from PH-036 and must not block subdomain provisioning.

### PH-037A - Logo media contract

Owner: Codex

- Define accepted input, output, size limits, R2 key, and ownership rules.
- Canonical input: transparent PNG, recommended `1200 x 400`, maximum 4 MB.
- Canonical output: transparent WebP inside `720 x 240`, maximum target 250 KB.
- Define square-logo behavior without stretching.

Acceptance: contract and validation cases are documented.

### PH-037B - R2 logo upload

Owner: Codex

- Add an authenticated logo-only upload operation.
- Trim excess transparent pixels, rotate, resize with `fit: inside`, and preserve alpha.
- Return the R2 URL and metadata.
- Add tests for format, size, transparency, and invalid images.

Acceptance: backend returns a stable R2 URL without requiring manual uploads.

### PH-037C - Admin logo uploader

Owner: Antigravity

- Create a new AGR request after PH-037B is stable.
- Replace manual URL entry with upload, preview, replace, and validation feedback.
- Preserve typography mode as a valid alternative.

Acceptance: the saved entrepreneur record receives the returned R2 URL and the AGR report documents the build.

### PH-037D - Template rendering

Owner: Antigravity for HTML/CSS; Codex for generator contract

- Render image logo when `logoMode=IMAGE` and fall back to typography otherwise.
- Use contained dimensions on desktop and mobile.
- Verify Product, Business, and Personal Brand separately.

Acceptance: no ecosystem stretches, clips, or hides a valid logo.

## Execution rules

- Only one backend ticket is active at a time.
- Frontend work starts from a specific AGR request, never directly from this plan.
- Provider tokens remain only in EasyPanel secrets and never enter logs, responses, or repository files.
- No automatic destructive replacement of DNS records, Hostinger subdomains, or public files.
- Every provider mutation requires explicit operator action during the MVP.
- Each ticket receives its own build/test evidence and documentation update.
- PH-036G requires ChatGPT architecture/risk review and Jairo production approval before broad replication.
- PH-037D requires Antigravity visual/accessibility verification, Codex contract verification, and Jairo approval before broad replication.

## Immediate next step

Open PH-036D as a separate backend ticket. Do not implement UI, Prisma changes, publication integration, or production automation as part of PH-036D.
