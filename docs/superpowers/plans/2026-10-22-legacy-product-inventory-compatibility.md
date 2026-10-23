# Legacy Product inventory compatibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Método y ejecución ya autorizados; no repetir gates humanos.

**Goal:** Unblock valid Business authority reads in the presence of genuine legacy Product sources without rewriting any source.
**Architecture:** Narrow read-time compatibility at the existing global source identity validator. Preserve fail-closed malformed records, explicit Business/Brand identity and all original ownership/target/job gates; existing generator/publisher only.
**Tech Stack:** TypeScript/Zod, Node24 strip-types tests, actual Node20 build; PowerShell locally and sh VPS, never Bash.
**Spec:** brain/agent-requests/codex/requests/CDX-20261022-005_legacy_product_inventory_compatibility.md

## Global Constraints

- Only ecosystemType OMITTED in a valid historical Product identity may default PRODUCT during reading; Business/Personal Brand require explicit type. Explicit invalid/null/empty must reject.
- No edits or publication of other partners; no file/object mutation while interpreting sources; no skipping inventory records.
- No DNS/campaigns/credentials/auth/DB/dependency/Docker/asset/pin/010/011/publication changes. Preserve all existing identity/ownership/root conflict/job/measurement gates and GA4/Meta=false.
- Source owner modifies only preview service and its existing tests (measurement authority test if needed); controller owns ticket/report/LIVE/status. One index writer at a time.

## Review Focus

1. Unrelated valid legacy Product should not disable Claudia authority; test actual service snapshot/input, not just schema parse.
2. Explicit invalid types must not be coerced by existing normalizeEcosystemType fallback; test null, empty, unknown/non-string and missing-type Business/Brand identities.
3. Invalid filename/site.id/domain or corrupt inventory must remain blocking; retain/regress real service cases.
4. Wrong-owner/domain/root collision and malformed jobs must remain closed; existing suite plus concrete focused assertions, no policy changes.
5. Read-time compatibility must not mutate original legacy objects/bytes; compare frozen/serialized fixtures before/after.

### Task1: Read-only legacy identity compatibility and regressions

Files: modify app/web/server/services/masterSitesBusinessPreviewService.ts and masterSitesBusinessPreviewService.test.ts; optional existing businessMeasurementAuthority.test.ts consumer case only.

Review-led scope amendment: masterSitesBusinessRoutes.test.ts fixture only, for measured baseline500!=202 from missing approved measurement fixture/default snapshot store. Reuse existing command-test helper/wiring, preserve productionroute, assertions/auth/error expectations. Ledger records ruling and cost; cover route and full relatedrun after fixture correction.
Interfaces: consume existing PRODUCT-default generation contract and global inventory; produce unchanged get/getPartner/getMeasurementAuthoritySnapshot signatures and valid existing snapshot for legacy case.

- [ ] Baseline focused existing preview/measurement suites, then add regression with unrelated Product source lacking ecosystemType and a ready valid Business partner; assert no SOURCE_INVENTORY_INVALID, correct Business input, original source unchanged. Observe expected RED against current code and retain log.
- [ ] Add required negative cases/immutability checks from Review Focus; make smallest validator change, no refactor/exports/new production helpers without need. Observe GREEN.
- [ ] Run focused full preview + measurement + Business input/route/content and related generation tests using repo alias harness; use project test aggregate if one exists (there is no npm test in prior main); report exact actual counts/skips/warnings. ActualNode20 production build and lint once; no unrelated suite replay.
- [ ] Inspect diff; commit only allowed source/tests. Write task report with commands, RED/GREEN/build/lint evidence and limitations. Controller dispatches task reviewer with full diff, fixes via same owner if needed, then final branch reviewer.

## Integration and operation

Controller adds documentation, pushes/opens PR/merges after review, observes actual main auto-deploy and checks source/runtime and confirmed OPEN without repeating master migration. Fresh entitlement/identity/source/jobs and Product hashes, existing local generator at configured PORT80 with approved master CTA/VSL labels/SEO, original worker and freshjobSUCCEEDED; public desktop/mobile consent/CTA/VSL/FAQ validation. No other partner writes/publication and no provider measurement activation.

Self-review: single source task/one validator-consumer interface, tests cover all five focus classes. Product behavior changes only in interpretation, not mutation. Product publishing/publication protocol changes excluded. Operational delivery is already-approved003 continuation, not a new implementation subsystem in005.
