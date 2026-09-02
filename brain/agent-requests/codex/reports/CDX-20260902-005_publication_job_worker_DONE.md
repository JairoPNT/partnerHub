# CDX-20260902-005 — DONE

## Request ID

CDX-20260902-005

## Result

Implemented the automatic backend worker that drains durable publication jobs
without operator shell commands. One leased job now regenerates the exact
customer package from the canonical ecosystem master, creates a fresh scoped
SFTP rename proof, publishes through the guarded two-rename commit, verifies the
public HTTPS package and records immutable terminal evidence.

The generic probe no longer contains a Jairo-specific allowlist. Publication
supports PRODUCT, BUSINESS and PERSONAL_BRAND, including later updates to
targets already marked `READY`. Journals are versioned by plan, and a committed
job can recover after a process crash without repeating the remote mutation.

Job identity now includes the exact canonical master package hash. Therefore a
new master version creates a new replication intent; duplicate clicks for the
same source/target/master version remain idempotent.

## Security and isolation

- Exact owner, site, ecosystem, canonical hostname, source, target, master,
  generated package, capability, protected sibling and remote-baseline hashes.
- Fresh job-scoped probe paths with host-key fingerprint pinning.
- Exclusive expiring queue leases and remote ownership claims.
- Recoverable destination backup/restore and public HTTPS verification before
  terminal commit.
- No raw SFTP username/password, Access JWT, email or raw lease token persisted
  or returned.
- Existing customers were not enqueued, contacted or published.

## Files/modules

- `app/web/server/services/publicationJobWorkerService.ts` and tests
- `app/web/server/services/publicationJobService.ts` and tests
- `app/web/instrumentation.ts`
- authenticated publication job enqueue route
- generic guarded publisher/probe and tests
- focused runtime module declarations and package test command
- request, project-state and architecture decision documentation

## Verification

- Generic SFTP capability probe: 11/11 PASS
- Guarded ecosystem publication: 23/23 PASS
- Durable publication jobs: 9/9 PASS
- Publication worker: 4/4 PASS, including full in-memory pipeline and
  post-commit crash recovery
- Isolated SFTP runtime packaging: PASS
- Focused ESLint: PASS
- Production Next build: PASS
- `git diff --check`: PASS

Build retains the known Turbopack NFT tracing warning and adds the same warning
for the worker instrumentation output; compilation, TypeScript and static page
generation all pass. No dependency upgrade was performed.

## Git

- Branch: `codex/CDX-20260902-005-publication-job-worker`
- Implementation commit: `ccc26cf`
- PR: pending at report creation

## Production and follow-up

No deploy, enqueue, backfill, SFTP connection, remote write or customer
publication was executed by this ticket. Merge will trigger EasyPanel
autodeploy and therefore requires explicit CEO release authorization.

Next separate work:

1. Connect approved activation/source-change events to durable enqueueing.
2. Produce a read-only backfill preview for current active customers.
3. Execute any production backfill only under a separately reviewed plan.
