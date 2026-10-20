# CDX-20261020-010 — Business manual commands and HTTP routes

- Owner: Codex, Backend Lead.
- Status: implementation / local verification; independent review required.
- Approved authority: CDX-20261020-006 and `docs/superpowers/specs/2026-10-20-business-master-sites-manual-delivery-design.md`; task 4 of its approved implementation plan.
- Outcome: authenticated single-partner review/prepare/publish APIs reusing the reviewed preview, input, coordinator, durable operation store, generator, Hostinger-only provisioning and publication queue.
- Branch: `codex/CDX-20261020-010-master-sites-business-commands`.
- Isolated checkout: `C:/Users/jairo/.codex/worktrees/cdx-20261019-005-drift-integration/PartnerHub`.
- Base: `d1dcf52c79a3ade5f717a3024f086dd74a5b2610` (preserve controller plan-split commit).
- Model tier: premium justified by authentication/tenant isolation, durable effect recovery and publication authority; no model escalation for documentation.

## Non-overlap contract

- Allowed: new `masterSitesBusinessCommandService.ts` and test; new `masterSitesBusinessRouteHandlers.ts` factory and `masterSitesBusinessRoutes.test.ts`; three new API route wrappers under `app/web/app/api/internal/master-sites/business/`; this request and matching report.
- Excluded: auth/DTO/preview/input/store/coordinator foundations; generator/source/jobs/worker/provisioner modules; UI/React/templates; Prisma/config/deploy/production; shared project-status/brain controller outputs.
- Dependencies: reviewed CDX-20261020-007, 008, 009, 012 integrated at `origin/main` `262c1ebea6536f41e371e7eca19047bd38978e27`.
- Parallel-safe: AGR-20261020-001 frontend; unrelated CDX-20261020-020 routing only in its own checkout. No shared file writes.
- Integration notes: frontend consumes frozen shared v1 DTOs. CDX-011 owns final all-script/integration/production gates; controller owns independent review and integration.

## Required guarantees

Auth precedes payload parsing/dependency creation. All handled responses use no-store and safe schemas. Fresh under-site-lock revision/identity/entitlement checks precede generation/provisioning/enqueue. No Product/apex provisioning or automatic trigger changes. READY target is a no-op; CURRENT needs explicit update; active jobs do not regenerate. Bind each request to actor/action/partner/review/updateExisting. Durable phase/pins precede effects; exact committed rename is reread after ambiguous storage errors. Uncheckpointed generation/provisioning remains uncertain and fails closed. Enqueue recovery uses exact pinned artifacts/intent; jobs and journals are never rewritten by commands. Worker progression is accepted only with the reviewed CURRENT evidence predicate and pinned job.

## Verification and handoff

TDD with real temp-file services, fake providers/network only; auth uses signed local JWTs. Run command/routes plus relevant foundation, Hostinger-only, Business generation and job/worker/event suites, lint/build/diff check. No real provider calls, credentials, production/customer mutation, push or merge. Return local SDD task-4 report and durable matching DONE with exact commits/evidence/remaining gates.
