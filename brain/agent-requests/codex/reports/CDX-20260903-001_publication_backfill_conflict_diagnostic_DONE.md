# CDX-20260903-001 - DONE

## Request ID

CDX-20260903-001

## Result

Hardened the publication backfill executor blocked response for the no-job
HTTP 409 case seen after the second authorized backfill attempt.

When enqueueing the first candidate fails, the executor now returns a bounded,
safe failure code such as `PUBLICATION_JOB_IDEMPOTENCY_CONFLICT` instead of the
generic `PUBLICATION_BACKFILL_PARTIAL_ENQUEUE`. The response also includes the
safe failed candidate identity already present in the reviewed preview:
`siteId`, `ecosystemType`, `publicHost` and `intentHash`.

If at least one job was created or reused before a later failure, the executor
still reports `PUBLICATION_BACKFILL_PARTIAL_ENQUEUE`, adds the safe underlying
code, wakes the worker only when a queued/running job is present, and requires a
fresh preview plus fresh authorization before continuing.

## Safety

- No production POST, retry, cancel, SFTP, DNS or publication was executed.
- Raw dependency errors remain redacted to
  `PUBLICATION_BACKFILL_ENQUEUE_FAILED`.
- Operator identity, owner IDs, paths, credentials and tokens are not returned.
- Existing plan-hash and intent-hash guards remain unchanged.

## Files/modules

- `app/web/server/services/publicationBackfillExecutorService.ts`
- `app/web/server/services/publicationBackfillExecutorService.test.ts`
- `brain/agent-requests/codex/requests/CDX-20260903-001_publication_backfill_conflict_diagnostic.md`
- `brain/agent-requests/codex/reports/CDX-20260903-001_publication_backfill_conflict_diagnostic_DONE.md`

## Verification

- Publication backfill executor: 7/7 PASS
- Publication backfill preview: 5/5 PASS
- Durable publication queue: 11/11 PASS
- Focused ESLint: PASS with zero warnings
- Next.js production build: PASS (39 routes/pages)
- `git diff --check`: PASS

The build retains existing Turbopack workspace/NFT tracing warnings; TypeScript
and route generation pass.

## Git

- Branch: `codex/CDX-20260903-001-backfill-conflict-diagnostic`
- Base: `origin/main` at merge PR #193 (`23b8440`)
- Commit/PR: pending at report creation

## Follow-up

Merge and deploy this diagnostic hardening. After deployment, rerun only the
authenticated backfill POST that Jairo authorizes from a fresh preview. If it
still returns 409, the response should now expose the safe blocked reason that
determines the next repair without exposing secrets.
