# CDX-20260902-006 — DONE

## Request ID

CDX-20260902-006

## Result

Implemented the post-commit event bridge from approved activation and explicit
source generation/update operations to the durable publication queue. Future
eligible customer changes no longer require an operator to call the internal
publication-job endpoint.

Only ACTIVE leads in PAID or CONVERTED state qualify. The bridge recomputes the
current entitlement, verifies tenant ownership and selects only entitled
PublishingTarget v2 records in provisioning state READY. Activation events may
enqueue every eligible target owned by that lead; source events are restricted
to the exact changed site.

## Safety and isolation

- Queue identity and deduplication remain pinned to exact source, target and
  canonical master hashes.
- Unpaid, cancelled and archived leads do not enqueue.
- Cross-owner, unentitled and non-READY targets do not enqueue.
- Missing source/target/master artifacts produce bounded safe metadata without
  failing the already committed activation/source write.
- A failed lead-to-source synchronization never republishes an older source.
- The worker regenerates directly through the service layer, so its own work
  does not recursively trigger another event job.
- Responses contain counts and stable codes only; no credentials, filesystem
  paths, owner identity or provider messages are exposed.
- No existing-customer scan, backfill, enqueue, SFTP call or publication was
  executed by this ticket.

## Files/modules

- `app/web/server/services/publicationEventEnqueueService.ts` and focused tests
- Internal activation-lead PATCH route
- Internal product-page generate and source-update routes
- `app/web/package.json` focused test command
- Request, report and project-state documentation

## Verification

- Publication event orchestration: 7/7 PASS
- Durable publication queue: 9/9 PASS
- Publication worker: 4/4 PASS
- Partner entitlement: 11/11 PASS
- Activation/WhatsApp persistence regressions: 5/5 PASS
- Focused TypeScript check: PASS
- Focused ESLint: PASS with zero warnings
- Next.js production build: PASS (37 routes/pages)
- `git diff --check`: PASS

The production build retains the known Turbopack NFT tracing warning for the
publication worker. Compilation, TypeScript, page-data collection and static
generation all pass. `npm ci` reported 13 pre-existing high-severity audit
findings in the locked dependency tree; this ticket changed no dependency or
lockfile, and remediation requires a separate security ticket.

## Git

- Branch: `codex/CDX-20260902-006-publication-event-enqueue`
- Implementation commit: `ab3783b`
- PR: pending at report creation

## Follow-up

The next separate ticket must produce a non-mutating, hash-pinned backfill
preview for existing active customers. Production backfill/enqueue remains a
separate explicit authorization and must not be combined with this release.

Merging this ticket triggers EasyPanel autodeploy and enables automatic
enqueueing for future eligible activation/source events.
