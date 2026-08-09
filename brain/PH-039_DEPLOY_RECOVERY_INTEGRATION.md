# PH-039 - Deploy recovery integration

Status: Ready for PR
Date: 2026-08-09
Owner: Codex
Model tier: Premium (production recovery and authentication)

## Incident

PRs #87 through #90 were merged, but the shared working directory contained untracked backend modules during frontend/template builds. `origin/main` consequently contains imports and UI calls whose backend implementation was never committed:

- publication imports `publicationTargetService`;
- verification imports `subdomainProvisioningService` and `publicationTargetResolver`;
- Domains UI calls `GET /api/internal/domains`.

A clean GitHub/Easypanel build cannot resolve those contracts.

## Single outcome

Restore a clean, reproducible `main` build by integrating only the already implemented and tested PH-036A through PH-036G and PH-038A backend contracts.

## Allowed files

- `app/web/app/api/internal/domains/**`
- `app/web/app/api/internal/publishing-targets/**`
- `app/web/server/auth/**`
- `app/web/server/integrations/**`
- the PH-036/PH-038 backend service files and focused tests under `app/web/server/services/`
- `app/web/package.json` and `app/web/package-lock.json`
- PH-036, PH-038, and PH-039 documentation in `brain/`
- current/live status files only for recovery state

## Excluded files

- Frontend and template implementation.
- `output/`, `tmp/`, `plantilla-waiver/`, image/video/reference folders.
- `app/web/tsconfig.tsbuildinfo`.
- Unrelated governance/model-policy edits.
- Easypanel, Cloudflare, Hostinger, DNS, SFTP, or production mutation.

## Verification

- All focused PH-036/PH-038 tests.
- Targeted ESLint.
- Clean `npm ci` dependency contract.
- Next.js production build.
- Root Docker image build when Docker is available.
- Staged-file audit proving excluded paths are absent.

## Acceptance criteria

- [x] Every import present in `origin/main` resolves from tracked files.
- [x] Domains API and provisioning API compile.
- [x] Authentication and provisioning tests pass.
- [x] Production build passes from the recovery branch.
- [x] No secret value is committed.
- [x] No excluded local artifact is staged.
- [ ] Recovery commit and PR target `main`.

## Verification evidence

- Clean `npm ci --no-audit --no-fund`: passed (308 packages installed from lockfile).
- Focused backend tests: 31/31 passed.
- Targeted ESLint: passed.
- `npm.cmd run build`: passed with 31 routes and the two pre-existing workspace/NFT warnings.
- Staged secret-pattern scan: no findings.
- Staged-file audit: no excluded local artifact present.
- Docker CLI is not installed on this workstation; root Docker image verification is deferred to the PR/Easypanel builder.
