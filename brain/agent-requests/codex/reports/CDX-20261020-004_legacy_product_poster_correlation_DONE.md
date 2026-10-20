# CDX-20261020-004 — Legacy Product poster correlation

- Owner: Codex. Branch: `codex/CDX-20261020-004-legacy-product-poster`.
- Base: `38fef7ea757baf66492426946c3f5e387c0375b2` (fresh origin/main, PR209 merged).
- Change: Business poster correlation can read an owner's legacy Product source using the Business inventory ownerKey and the activation lead's authoritative siteId/assigned domain. Explicit PRODUCT type, matching source identity and base/product hostname are required. Existing unique Product v2 target path keeps precedence; ambiguous Product/Business inventory and foreign ownership fail closed. No slug inference, tenant source writes, or Product/apex mutations.
- Files: `businessProductHeroCorrelationService.ts`, `businessLegacyProductHeroCorrelation.test.ts`, own request/report.
- RED: before implementation, new real-file regression suite had 2 failures/5 passes. Exact failures: legacy desktop returned `{}` and canonical Product-host desktop returned `undefined`.
- GREEN: 27/27 tests passed across legacy correlation, existing correlation, VSL poster, Product hero propagation core/execution. Ten new tests include owner/domain/source mismatch, absent lead, duplicate identities, ambiguous inventory, foreign Product targets and normal-path precedence. Uses isolated temporary files and confirms legacy source bytes are unchanged.
- `npm run lint`: passed, zero errors/warnings. `git diff --check`: passed.
- Existing Node experimental-loader/typeless-module notices remain; no dependency/package changes.
- Production/provider calls: none. No production state edits, push, PR, merge or deployment.
- Integration: parallel-safe with CDX-20261020-003 generation correction. Main orchestrator cherry-picks commits, obtains independent tenant-boundary review and runs combined build before PR/merge. Standalone full build deferred to combined integration; no default `npm test` script exists in app/web.
- Limitation: legacy fallback deliberately requires a saved activation lead domain equal to Business target.baseDomain. Missing/mismatched assignment returns placeholder until corrected through authoritative partner data. Future legacy Product hero updates do not gain automatic cross-site propagation in this ticket; generation/regeneration resolves the current hero.
