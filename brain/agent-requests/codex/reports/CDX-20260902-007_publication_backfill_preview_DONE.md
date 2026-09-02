# CDX-20260902-007 — DONE

## Request ID

CDX-20260902-007

## Result

Implemented an authenticated, deterministic and strictly non-mutating preview
for the publication state of existing customer ecosystems. It reads all valid
PublishingTarget v2 records and separates exact current intents into:

- candidates with no durable job;
- already current intents with a SUCCEEDED job;
- already scheduled QUEUED/RUNNING intents;
- FAILED/CANCELLED intents that require an explicit retry decision;
- blocked targets with bounded reason codes.

The preview is available through authenticated `GET
/api/internal/publication-jobs/backfill-preview`. It returns safe target
metadata, hashes, counts and one stable `planHash`; it does not expose owner
UUIDs, lead PII, paths, credentials, tokens or raw dependency/provider errors.

## Safety and isolation

- Candidate selection requires an ACTIVE PAID/CONVERTED activation lead,
  current known entitlement, exact tenant ownership, READY provisioning and the
  same exact source/target/canonical-master validation used by enqueue.
- The approval hash binds activation state and current entitled ecosystems.
- The intent hash binds the exact source, PublishingTarget and canonical master.
- The preview cannot enqueue, retry, cancel or wake a worker.
- It creates no job directory, file, lease or journal and performs no SFTP, DNS
  or provider operation.
- Any production backfill executor is a separate ticket and must revalidate an
  explicitly authorized preview `planHash`.

## Files/modules

- `app/web/server/services/publicationJobService.ts` and focused test
- `app/web/server/services/publicationBackfillPreviewService.ts` and tests
- `app/web/app/api/internal/publication-jobs/backfill-preview/route.ts`
- `app/web/package.json` focused test command
- Request, report and project-state documentation

## Verification

- Publication backfill preview: 5/5 PASS
- Durable publication queue: 10/10 PASS
- Publication events: 7/7 PASS
- Focused ESLint: PASS with zero warnings
- Next.js production build: PASS (38 routes/pages)
- `git diff --check`: PASS

The production build retains the known Turbopack workspace/NFT tracing warning;
compilation, TypeScript, page-data collection and static generation pass. The
lockfile was installed without package updates and this ticket changes no
dependency or lockfile.

## Git

- Branch: `codex/CDX-20260902-007-publication-backfill-preview`
- Implementation commit: `3dd079f`
- PR: pending at report creation

## Follow-up

After deployment, call the authenticated preview and review its counts,
classifications and exact `planHash`. The production backfill executor remains
a separate explicitly authorized ticket; this ticket does not publish or queue
an existing customer.
