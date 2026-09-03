# CDX-20260902-008 — DONE

## Request ID

CDX-20260902-008

## Result

Implemented a dormant, authenticated and hash-pinned production backfill
executor. `POST /api/internal/publication-jobs/backfill` accepts only the exact
mode, confirmation phrase and reviewed `expectedPlanHash`, recomputes the full
CDX-20260902-007 preview before writing, and enqueues only its current
`candidates` entries.

Each job creation is additionally bound to the candidate's immutable
`intentHash`. Source, target or master-package drift therefore fails before
that job can be created. Existing exact jobs remain idempotent and
FAILED/CANCELLED jobs are never retried by the backfill executor.

## Safety and recovery

- Cloudflare Access authentication remains mandatory.
- The operator subject is only passed to the queue, which persists its hash;
  it is never returned by the executor.
- Safe responses contain only job hashes, site/ecosystem/public-host metadata,
  counts, bounded status/reason codes and the reviewed plan hash.
- The executor itself performs no DNS, SFTP or direct provider operation.
- The existing worker is woken only after an authorized QUEUED/RUNNING job is
  safely present.
- A partial multi-candidate enqueue stops with a bounded result and requires a
  new preview plus a new explicit authorization for the remaining state.
- No production APPLY, enqueue, worker wake or customer publication was
  executed while implementing this ticket.

## Files/modules

- `app/web/server/services/publicationJobService.ts` and focused test
- `app/web/server/services/publicationBackfillExecutorService.ts` and test
- `app/web/app/api/internal/publication-jobs/backfill/route.ts`
- `app/web/package.json`
- Request, report and project-state documentation

## Verification

- Publication backfill executor: 6/6 PASS
- Durable publication queue: 11/11 PASS
- Publication backfill preview: 5/5 PASS
- Publication events: 7/7 PASS
- Publication worker: 4/4 PASS
- Total focused/regression tests: 33/33 PASS
- Focused ESLint: PASS with zero warnings
- Next.js production build: PASS (39 routes/pages)
- `git diff --check`: PASS

The build retains the pre-existing Turbopack workspace/NFT tracing warnings;
compilation, TypeScript, page-data collection and static generation pass.

## Git

- Branch: `codex/CDX-20260902-008-publication-backfill-executor`
- Implementation commit: `9b9ebbb`
- PR: pending at report creation

## Follow-up

Merge and deploy this dormant executor. After deployment, obtain a fresh
authenticated preview. Production APPLY remains blocked until Jairo explicitly
authorizes that preview's exact current `planHash`; deployment alone does not
enqueue or publish any customer.
