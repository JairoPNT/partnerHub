# LIVE PROJECT STATE

OFFICIAL_PROJECT_ROOT = `D:\Proyectos multi agentes\PartnerHub`

## Work checkpoint — 2026-10-21

- CDX-20261021-008: corrección independiente de contrato Master Sites Business a `negocio.ganomaster.pro` (enlace, dominio de formulario, lookup backend e inventario), conservando ID `ganomaster-business`, Product/Brand y alias histórico. Verificación del inventario Business exige evidencia del host exacto; la del antiguo no certifica el nuevo. 6+17 pruebas frescas PASS, lint/build PASS39rutas; revisión/scoped sin hallazgos abiertos. Reporte `brain/agent-requests/codex/reports/CDX-20261021-008_business_master_host_DONE.md`. Este cambio no publica plantilla, migra targets ni toca hosting; DRAFT235 de consentimiento sigue separado y no debe fusionarse como consecuencia de este ajuste.

- Jairo approved consent contract PR #228 and technical plans PR #229 (merged ba3b699) on 2026-10-21. Separate backend CDX-005 and frontend-runtime AGR-004 subagents use tests-first and independent task reviews. Backend Tasks1/2 passed re-reviews after fixing RUNNING-worker authority and capture/authorization binding (head b5ee305; registry still empty, no partial main activation). Runtime Task1 passed re-review; Task2 is NOT approved: both storage mutations failing can restore a stale grant on reload. Premium privacy review confirms a contract amendment is needed; Jairo was asked whether to require fresh consent per document (recommended) or retain180d and block measurement for redesign. No answer is assumed.
- External AGR-001 bb2f3c7 was independently reviewed; two P2s (hero media not rendered and Claudia dedication in shared hero) were fixed/reviewed in AGR-00647b84d5. Exact approved FAQ AGR-003fc47b4d is also reviewed. DRAFT PR #230 contains001+006+003; controller browser/template/package8/8 zero skips and lint pass. No merge/publication; known backend old-headline assertion remains integration maintenance. Existing partner dedication profiles retain precedence, so verify Claudia's source separately before cutover. Consent UI AGR-005 and offline integration CDX-006 wait the privacy decision and reviewed backend/runtime. No component activation, provider events or public consent verification is claimed. Only proposed, not-activated release flags remain false; public verification is NOT_RUN, and inherited public Meta tagging was not inspected or disabled in this execution. The deleted periodic monitor remains deleted.
- DRAFT PR #231 preserves backend CDX005 at b5ee305; controller post-fix Node20 71/71 and named generation/TS155/155 pass with zero skips. It must not merge alone (empty registry needs compatible runtime/UI release). DRAFT PR #232 preserves runtime AGR004 at02339c with explicit REVIEW FAILED / NOT COMPLETE. All three component PRs remain unmerged; no code deployment/cutover is claimed.

- Jairo approved the Business landing-content contract and implementation plans. Backend `CDX-20261021-001` is implemented and independently reviewed (PR #226): guarded content GET/PUT, authoritative profile preservation and legacy bypass fixes. Final focused tests: 34 pass/1 Windows skip; build/global lint pass. Do not confuse backend integration with deploy verification or a public landing update.
- `CDX-20261021-002` consent/measurement audit merged in PR #224. Main's Business generator injects Meta PageView without an identified consent gate; canonical GA4/CTA handlers are not proven installed. Runtime master/public event receipt was not inspected by this audit. Consent enforcement and tracking restoration need separately scoped work before claiming paid-traffic readiness.
- `CDX-20261021-003` discovery and PH-044 clarification merged in PR #225: Analytics only monitors already-active campaigns/results; it never creates, edits, activates or pauses campaigns, budgets or bids. Reporting adapters and tenant/account bindings are not implemented by these documentation changes.
- Antigravity owns `AGR-20261021-001` (generic paid-traffic template) and `AGR-20261021-002` (Master Sites content editor). The first request contains verified findings on `cc73cff`: remove Claudia identity from the shared master, consume `businessLandingContent`, retain mandatory disclosure, and do not ship the Master style dock to partner pages. No new public-template verification is recorded here.
- No DNS/SFTP, site publication, campaign/account changes or advertising spend in this checkpoint. The October 20 public check below remains historical evidence only.

## Live checkpoint — 2026-10-20

- Completed: CDX-20261020-002, Claudia Business automatic publication.
- URL: https://negocio.claudiacalero.pro/ ; worker SUCCEEDED/COMPLETE, publication READY, DNS RESOLVED, SSL READY.
- PR #210 merged/deployed; migrated publishing runtime verified, full Business content and Product-derived poster preserved.
- Public page, all five WhatsApp CTAs, video playback and the MP4 audio stream verified. No ads launched; Product/apex and other partners untouched.
- Report: `brain/agent-requests/codex/reports/CDX-20261020-002_claudia_business_publication_DONE.md`.
- Next: campaign measurement/content review; separate Antigravity caption correction. Historical Jairo state below must not be presented as fresh hosting-migration verification.

## Historical completed ticket

`CDX-20260910-003 - Personal Brand apex package preview` (completed;
read-only verification recorded in the ticket report)

## Current state

PartnerHub is past the first validated Business ecosystem publication pilot.

The current production checkpoint is:

- `jairo-pinto-business`
- `BUSINESS`
- `negocio.jairopinto.pro`
- provisioning `READY`
- DNS `RESOLVED`
- SSL `READY`
- publication current
- durable backfill closed with `alreadyCurrent=1` and `candidates=0`

The latest checked GitHub state on 2026-09-09:

- `origin/main`: `c5dd8efbc88d97e5251fcee2151ad5ab70a1c6e9`
- latest merged PR: #194
- open PRs: none observed

## Recently completed chain

- Business target provisioning was recovered safely after Hostinger DNS conflict diagnostics.
- A Hostinger-managed ALIAS route was recognized as the valid DNS shape.
- SFTP capability proof was hardened, renewed, verified, and cleaned up using owned temporary paths.
- Business master package generation was added and applied locally.
- Guarded Business publication reached `negocio.jairopinto.pro`.
- Publication jobs were made durable.
- Future eligible activation/source events can enqueue publication automatically.
- Existing-customer backfill preview and executor were added behind authenticated, hash-pinned gates.
- Publication-job Cloudflare Access audience and machine identity handling were isolated.
- Backfill for `jairo-pinto-business` was executed and completed successfully.
- A final read-only preview confirmed no remaining backfill work for current targets.

## Active correction

This file, `brain/01_CURRENT_SPRINT.md`, `brain/02_CURRENT_STATUS.md`, and `brain/03_NEXT_MISSION.md` were stale compared with `.project-status/status.json`. CDX-20260909-001 updates the durable repo memory so future agents do not restart from obsolete PH-003/PH-039 instructions.

## Personal Brand diagnostic

`CDX-20260909-002` is complete. The canonical Personal Brand template,
generation resolver and generic durable publisher already support
`PERSONAL_BRAND`. The blocker is not publication machinery: the current target
contract forces Personal Brand to `brand.<domain>`, which conflicts with the
approved three-ecosystem rule that assigns the partner apex to Personal Brand.

## Completed backend contract

`CDX-20260909-003` now owns the deterministic partner route policy and the
pre-provider Personal Brand apex gate. Personal Brand serves the partner apex
when active; Business and Product keep their fixed subdomains and each serves
an active requested subdomain even if another active ecosystem has higher apex
priority. Existing target identities and legacy migration behavior remain
unchanged. The earlier incomplete local dependency record is historical; the
final ticket report records all required checks passing. No provider, DNS,
SFTP, Cloudflare, EasyPanel, deployment, publication, or production mutation
was performed.

## Personal Brand preview checkpoint

`CDX-20260910-003` completed deterministic local master-package and apex
publication previews. The Personal Brand apex is not public and no
infrastructure mutation occurred. The previews do not create a target, use
SFTP, call a provider, publish, deploy, or mutate production.
Final scoped review approved `397c129`: 72 focused Personal Brand tests,
target/hostname suites, exact ESLint, and diff check passed. The prior passing
application build remains historical evidence because the post-fix scope is
standalone `.mjs` scripts/tests excluded from TypeScript/global lint.

## Next step

Open separate guarded authorization tickets for: local Personal Brand
master-package apply; apex target/DNS/SSL provisioning; SFTP capability proof;
and publication enqueue/apply. Each requires fresh review and authorization.

Expected Personal Brand outcome:

- determine whether current Personal Brand templates and package generation are complete enough for publication;
- implement only missing backend/package/publication gates;
- preserve the Business-proven preview/apply authorization pattern;
- leave production publication blocked until Jairo approves a fresh exact plan hash.

## Parallel visual identity stream

PartnerHub visual identity remains pending and should be opened as an Antigravity request. Codex may write the request, but Antigravity owns implementation.

## Current holds

- No active production apply/publish operation.
- No open PRs observed at this checkpoint.
- No unresolved current backfill candidate.
- No secrets, passwords, tokens, AUD values, or raw provider responses should be stored in repo memory.
