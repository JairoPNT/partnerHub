# CDX-20260911-001 — Personal Brand runtime template packaging

Owner: Codex

Scope: Package the complete allowlisted Personal Brand canonical template and its two read-only maintenance scripts in the final runtime image.

Allowed files: `Dockerfile`, `app/web/package.json`, `app/web/scripts/personal-brand-runtime-packaging.test.mjs`, this request, and its completion report.

Excluded files: React, templates and their contents, Personal Brand generation/publication logic, DNS, SFTP, Hostinger, Cloudflare, credentials, remote files, provider calls, and deployment configuration outside `Dockerfile`.

Dependencies: CDX-20260910-003 merged and deployed; production preview returned `PERSONAL_BRAND_CANONICAL_TEMPLATE_MISSING_OR_UNREADABLE`.

Parallel-safe with: frontend-only tickets and backend tickets that do not modify `Dockerfile` or the allowed package/script files.

Integration: after deployment, the operator re-runs only `maintenance:jairo-personal-brand-master-package`. A successful preview remains non-mutating and is a separate gate from package APPLY, target/DNS/SFTP, and publication.

## Acceptance criteria

- The runner image contains `/app/plantillas-de-pagina/personal-brand/` from the canonical repository source.
- The runner image explicitly copies the Personal Brand master-package and publication-preview maintenance scripts to `/app/scripts/`.
- A repository test fails if any of those runtime `COPY` contracts is removed.
- No provider or deployment action is executed by this ticket.
