# Git Branching and Release Policy

## Source of truth

- `origin/main` is the canonical integration branch.
- Only code merged into `main` is considered releasable and eligible for deployment.
- Local `main` must be synchronized with `origin/main` using fast-forward updates only.

## Branch ownership

### Antigravity: frontend and UX

Every frontend, React, Tailwind, UX, navigation, or visual task must use one new branch created from the latest `origin/main`:

```text
antigravity/AGR-YYYYMMDD-###-short-slug
```

The branch ID must match the request file and completion report under `brain/agent-requests/antigravity/`.

### Codex: backend and infrastructure

Backend, API, database, Docker, deployment, SFTP, R2, authentication, and infrastructure work must use a separate branch created from the latest `origin/main`:

```text
codex/PH-###-short-slug
```

Codex must not place frontend implementation on a backend branch, and Antigravity must not modify backend or infrastructure code.

## Pull request lifecycle

1. Fetch the remote state before starting:

   ```powershell
   git fetch origin
   git switch main
   git pull --ff-only origin main
   ```

2. Create exactly one feature branch for the request from updated `main`.
3. Keep one request, one branch, and one pull request. Do not reuse a branch whose name belongs to a completed request.
4. Run the relevant verification before opening the PR.
5. Open the PR with base `main` and merge only after review/build checks pass.
6. Deploy from the merged `main` line, never from a stale feature branch.
7. After merge, stop work on that branch. Delete it only after confirming no open PR or pending work depends on it.

## Current reconciliation

- `AGR-20260805-001` is already represented in `origin/main` through its merged PR.
- The current branch `antigravity/agr-20260805-001-partners-referrals-ui` contains commit `AGR-20260805-002`; the branch name is therefore legacy/inconsistent.
- `AGR-20260805-002` must be reviewed and merged as its own PR before starting another request. New work must use a fresh branch named with its own request ID.
- Historical `codex/*` branches remain archival references unless a new ticket explicitly reopens one through a new branch from `main`.

## Orchestration responsibility

Codex is responsible for checking branch base, branch naming, request/report ID alignment, PR target, merge status, and deployment source before reporting a task as complete. If any of these do not match, the task is not considered integrated.
